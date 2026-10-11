import { NextResponse } from "next/server";
import { z } from "zod";
import { streamText, type ModelMessage } from "ai";
import { and, desc, eq, isNull } from "drizzle-orm";
import { conversations, messages } from "@/db/schema";
import { getDb } from "@/lib/db/client";
import { getActiveUser } from "@/lib/auth/session";
import { consumeUserRateLimit, getRateLimitFailure } from "@/lib/security/rate-limit";
import { buildMockResponse, estimateMockTokens, getModel } from "@/lib/ai/catalog";
import { resolveProviderModel } from "@/lib/ai/providers";
import { customerChargeAtoms, maximumChargeAtoms, providerCostNanoUsd } from "@/lib/credits/accounting";
import { getDemoStore } from "@/lib/server/demo-store";
import { conversationHistorySchema } from "@/lib/conversations/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(4_000),
  modelId: z.string().min(3).max(220),
  idempotencyKey: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  history: conversationHistorySchema.default([]),
}).superRefine((body, context) => {
  if (body.conversationId && body.history.length > 0) {
    context.addIssue({ code: "custom", message: "Saved conversations provide their own context." });
  }
});

const encoder = new TextEncoder();
const targetMarginBps = 4_000;
const maximumOutputTokens = 160;
const maximumProviderOutputTokens = 512;

function event(data: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const user = await getActiveUser(request);
  if (!user) return NextResponse.json({ error: "Sign in with Google before using Think Zone AI." }, { status: 401 });

  const providerDevEnabled = process.env.NODE_ENV !== "production" && process.env.AI_PROVIDER_MODE === "provider-dev";
  const demo = getDemoStore();
  if (!providerDevEnabled && !demo) {
    return NextResponse.json({ error: "AI inference is unavailable. Configure authentication, PostgreSQL accounting, and an approved provider integration first." }, { status: 503 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "Invalid chat request.", details: parsed.error.flatten() }, { status: 400 });

  if (providerDevEnabled) {
    const limit = await consumeUserRateLimit({ userId: user.id, scope: "provider-chat", limit: 10, windowMs: 60_000 });
    const limitFailure = getRateLimitFailure(limit, "provider chat");
    if (limitFailure) return NextResponse.json({ error: limitFailure.error }, { status: limitFailure.status, headers: limitFailure.headers });

    const resolved = await resolveProviderModel(parsed.data.modelId);
    if (!resolved) return NextResponse.json({ error: "That model is unavailable for the configured provider credentials." }, { status: 404 });

    let context: ModelMessage[];
    if (parsed.data.conversationId) {
      const [conversation] = await getDb().select({ id: conversations.id })
        .from(conversations)
        .where(and(
          eq(conversations.id, parsed.data.conversationId),
          eq(conversations.userId, user.id),
          isNull(conversations.archivedAt),
        ))
        .limit(1);
      if (!conversation) return NextResponse.json({ error: "Saved conversation not found or archived." }, { status: 404 });

      const recent = await getDb().select({ role: messages.role, content: messages.content })
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(24);
      const latest = recent[0];
      if (latest?.role !== "user" || latest.content !== parsed.data.prompt) {
        return NextResponse.json({ error: "Save the latest message before requesting a response." }, { status: 409 });
      }

      let totalCharacters = 0;
      const selected = [];
      for (const message of recent) {
        if (message.role !== "user" && message.role !== "assistant") continue;
        if (selected.length >= 24 || totalCharacters + message.content.length > 60_000) break;
        selected.push(message);
        totalCharacters += message.content.length;
      }
      context = selected.reverse().map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }));
    } else {
      context = [
        ...parsed.data.history.map((message) => ({ role: message.role, content: message.content })),
        { role: "user", content: parsed.data.prompt },
      ];
    }

    const abortController = new AbortController();
    const abortFromRequest = () => abortController.abort(request.signal.reason);
    request.signal.addEventListener("abort", abortFromRequest, { once: true });
    const generation = streamText({
      model: resolved.model,
      messages: context,
      maxOutputTokens: maximumProviderOutputTokens,
      maxRetries: 0,
      abortSignal: abortController.signal,
    });
    let cancelled = false;
    const providerStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const text of generation.textStream) {
            if (cancelled) return;
            controller.enqueue(event({ type: "delta", text }));
          }
          const usage = await generation.usage;
          if (!cancelled) {
            controller.enqueue(event({
              type: "done",
              mode: "direct-provider-development",
              provider: resolved.provider,
              modelId: parsed.data.modelId,
              usage: {
                inputTokens: usage.inputTokens ?? null,
                outputTokens: usage.outputTokens ?? null,
                status: usage.inputTokens != null || usage.outputTokens != null ? "provider-reported" : "unavailable",
              },
            }));
            controller.close();
          }
        } catch {
          if (!cancelled) {
            try {
              controller.enqueue(event({ type: "error", error: "The provider request failed. Check model access and credentials in the server environment." }));
              controller.close();
            } catch {
              // The client may have disconnected while the provider stream was ending.
            }
          }
        } finally {
          request.signal.removeEventListener("abort", abortFromRequest);
        }
      },
      cancel() {
        cancelled = true;
        abortController.abort();
        request.signal.removeEventListener("abort", abortFromRequest);
      },
    });

    return new Response(providerStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  if (!demo) {
    return NextResponse.json({ error: "The local demo wallet is unavailable." }, { status: 503 });
  }
  const model = getModel(parsed.data.modelId);
  if (!model || model.availability !== "development-mock") return NextResponse.json({ error: "Model is not available." }, { status: 404 });

  const inputLimit = BigInt(Math.ceil(parsed.data.prompt.length / 2));
  const maxCharge = maximumChargeAtoms(inputLimit, BigInt(maximumOutputTokens), model.rateCard, targetMarginBps);
  let requestId: string;
  try {
    const result = demo.reserve(parsed.data.idempotencyKey, maxCharge);
    if (result.duplicate) return NextResponse.json({ error: "This idempotency key has already been used.", requestId: result.requestId }, { status: 409 });
    requestId = result.requestId;
  } catch (error) {
    if (error instanceof Error && error.name === "InsufficientCreditsError") {
      return NextResponse.json({ error: "Insufficient available demo credits. No request was submitted." }, { status: 402 });
    }
    return NextResponse.json({ error: "Unable to reserve credits." }, { status: 409 });
  }

  const responseText = buildMockResponse(parsed.data.prompt, model);
  const inputTokens = estimateMockTokens(parsed.data.prompt);
  const outputTokens = estimateMockTokens(responseText);
  const costNano = providerCostNanoUsd(BigInt(inputTokens), BigInt(outputTokens), model.rateCard);
  const chargeAtoms = customerChargeAtoms(costNano, targetMarginBps);
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const chunks = responseText.match(/\s+|\S+/g) ?? [responseText];
        for (const chunk of chunks) {
          if (cancelled) return;
          controller.enqueue(event({ type: "delta", text: chunk }));
          await new Promise((resolve) => setTimeout(resolve, 7));
        }
        if (cancelled) return;
        demo.settle({
          requestId,
          modelId: model.id,
          promptPreview: parsed.data.prompt.slice(0, 90),
          inputTokens,
          outputTokens,
          providerCostNanoUsd: costNano,
          customerChargeAtoms: chargeAtoms,
          status: "simulated",
          createdAt: Date.now(),
        });
        controller.enqueue(event({
          type: "done",
          requestId,
          usage: { inputTokens, outputTokens, providerCostNanoUsd: costNano.toString(), customerChargeAtoms: chargeAtoms.toString(), status: "simulated" },
        }));
        controller.close();
      } catch {
        demo.release(requestId);
        try {
          controller.enqueue(event({ type: "error", error: "The local demo response could not be completed; its reservation was released." }));
          controller.close();
        } catch {
          // The client may have canceled the stream while the reservation was being released.
        }
      }
    },
    cancel() {
      cancelled = true;
      demo.release(requestId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Request-Id": requestId,
    },
  });
}
