import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { conversations, messages } from "@/db/schema";
import { getDb } from "@/lib/db/client";
import { getActiveUser } from "@/lib/auth/session";
import { renameConversationSchema } from "@/lib/conversations/validation";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store" };
const paramsSchema = z.object({ conversationId: z.string().uuid() });

type RouteContext = { params: Promise<{ conversationId: string }> };

async function getConversationId(params: RouteContext["params"]) {
  const parsed = paramsSchema.safeParse(await params);
  return parsed.success ? parsed.data.conversationId : null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getActiveUser(_request);
  if (!user) return NextResponse.json({ error: "Sign in to view saved conversations." }, { status: 401, headers: privateHeaders });

  const conversationId = await getConversationId(params);
  if (!conversationId) return NextResponse.json({ error: "Conversation not found." }, { status: 404, headers: privateHeaders });

  const [conversation] = await getDb().select({
    id: conversations.id,
    title: conversations.title,
    archivedAt: conversations.archivedAt,
    createdAt: conversations.createdAt,
    updatedAt: conversations.updatedAt,
  }).from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id))).limit(1);
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404, headers: privateHeaders });

  const recentMessages = await getDb().select({
    id: messages.id,
    role: messages.role,
    content: messages.content,
    createdAt: messages.createdAt,
  }).from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(201);
  const hasMoreMessages = recentMessages.length > 200;
  const visibleMessages = recentMessages.slice(0, 200).reverse();

  return NextResponse.json({ conversation, messages: visibleMessages, hasMoreMessages }, { headers: privateHeaders });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getActiveUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to update saved conversations." }, { status: 401, headers: privateHeaders });

  const conversationId = await getConversationId(params);
  if (!conversationId) return NextResponse.json({ error: "Conversation not found." }, { status: 404, headers: privateHeaders });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: privateHeaders });
  }

  const bodySchema = z.object({
    title: renameConversationSchema.shape.title.optional(),
    archived: z.boolean().optional(),
  }).refine((body) => body.title !== undefined || body.archived !== undefined);
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "Invalid conversation update." }, { status: 400, headers: privateHeaders });

  const [conversation] = await getDb().update(conversations).set({
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.archived !== undefined ? { archivedAt: parsed.data.archived ? new Date() : null } : {}),
    updatedAt: new Date(),
  }).where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id))).returning({
    id: conversations.id,
    title: conversations.title,
    archivedAt: conversations.archivedAt,
    createdAt: conversations.createdAt,
    updatedAt: conversations.updatedAt,
  });

  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404, headers: privateHeaders });
  return NextResponse.json({ conversation }, { headers: privateHeaders });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const user = await getActiveUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to delete saved conversations." }, { status: 401, headers: privateHeaders });

  const conversationId = await getConversationId(params);
  if (!conversationId) return NextResponse.json({ error: "Conversation not found." }, { status: 404, headers: privateHeaders });

  const [deleted] = await getDb().delete(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id)))
    .returning({ id: conversations.id });
  if (!deleted) return NextResponse.json({ error: "Conversation not found." }, { status: 404, headers: privateHeaders });
  return NextResponse.json({ deleted: true }, { headers: privateHeaders });
}
