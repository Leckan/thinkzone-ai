import { NextResponse } from "next/server";
import { z } from "zod";
import { buildMockResponse, estimateMockTokens, getModel } from "@/lib/ai/catalog";
import { customerChargeAtoms, maximumChargeAtoms, providerCostNanoUsd } from "@/lib/credits/accounting";
import { getDemoStore } from "@/lib/server/demo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(4_000),
  modelId: z.enum(["tz-mock-balanced", "tz-mock-reasoning"]),
  idempotencyKey: z.string().uuid(),
});

const encoder = new TextEncoder();
const targetMarginBps = 4_000;
const maximumOutputTokens = 160;

function event(data: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const demo = getDemoStore();
  if (!demo) {
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
