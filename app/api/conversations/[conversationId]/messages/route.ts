import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { conversations, messages } from "@/db/schema";
import { getDb } from "@/lib/db/client";
import { getActiveUser } from "@/lib/auth/session";
import { appendConversationMessageSchema } from "@/lib/conversations/validation";
import { consumeUserRateLimit, getRateLimitFailure } from "@/lib/security/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store" };
const paramsSchema = z.object({ conversationId: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const user = await getActiveUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to update saved conversations." }, { status: 401, headers: privateHeaders });

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) return NextResponse.json({ error: "Conversation not found." }, { status: 404, headers: privateHeaders });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: privateHeaders });
  }
  const parsed = appendConversationMessageSchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "Invalid conversation message." }, { status: 400, headers: privateHeaders });

  const limit = await consumeUserRateLimit({ userId: user.id, scope: "conversation-write", limit: 24, windowMs: 60_000 });
  const limitFailure = getRateLimitFailure(limit, "conversation write");
  if (limitFailure) return NextResponse.json({ error: limitFailure.error }, { status: limitFailure.status, headers: limitFailure.headers });

  const result = await getDb().transaction(async (tx) => {
    const [conversation] = await tx.select({ id: conversations.id, updatedAt: conversations.updatedAt })
      .from(conversations)
      .where(and(
        eq(conversations.id, parsedParams.data.conversationId),
        eq(conversations.userId, user.id),
        isNull(conversations.archivedAt),
      ))
      .for("update")
      .limit(1);
    if (!conversation) return null;

    const createdAt = new Date(Math.max(Date.now(), conversation.updatedAt.getTime() + 1));
    await tx.update(conversations)
      .set({ updatedAt: createdAt })
      .where(eq(conversations.id, conversation.id));

    const [message] = await tx.insert(messages).values({
      conversationId: conversation.id,
      role: parsed.data.role,
      content: parsed.data.content,
      createdAt,
    }).returning({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    });
    return message;
  });

  if (!result) return NextResponse.json({ error: "Conversation not found or archived." }, { status: 404, headers: privateHeaders });
  return NextResponse.json({ message: result }, { status: 201, headers: privateHeaders });
}
