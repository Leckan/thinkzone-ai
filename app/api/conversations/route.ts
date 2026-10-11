import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { conversations, messages } from "@/db/schema";
import { getDb } from "@/lib/db/client";
import { getActiveUser } from "@/lib/auth/session";
import { createConversationSchema } from "@/lib/conversations/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const user = await getActiveUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to view saved conversations." }, { status: 401, headers: privateHeaders });

  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  const rows = await getDb()
    .select({
      id: conversations.id,
      title: conversations.title,
      archivedAt: conversations.archivedAt,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      messageCount: sql<number>`count(${messages.id})::int`,
    })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(and(eq(conversations.userId, user.id), includeArchived ? undefined : isNull(conversations.archivedAt)))
    .groupBy(conversations.id)
    .orderBy(desc(conversations.updatedAt))
    .limit(100);

  return NextResponse.json({ conversations: rows }, { headers: privateHeaders });
}

export async function POST(request: Request) {
  const user = await getActiveUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to save conversations." }, { status: 401, headers: privateHeaders });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: privateHeaders });
  }
  const parsed = createConversationSchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "Invalid conversation." }, { status: 400, headers: privateHeaders });

  const firstPrompt = parsed.data.messages.find((message) => message.role === "user")?.content ?? "";
  const title = firstPrompt.replace(/\s+/g, " ").trim().slice(0, 200) || "New conversation";
  const now = Date.now();

  const result = await getDb().transaction(async (tx) => {
    const [conversation] = await tx.insert(conversations).values({
      userId: user.id,
      title,
      createdAt: new Date(now),
      updatedAt: new Date(now + parsed.data.messages.length),
    }).returning({
      id: conversations.id,
      title: conversations.title,
      archivedAt: conversations.archivedAt,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    });

    await tx.insert(messages).values(parsed.data.messages.map((message, index) => ({
      conversationId: conversation.id,
      role: message.role,
      content: message.content,
      createdAt: new Date(now + index + 1),
    })));

    return conversation;
  });

  return NextResponse.json({ conversation: result }, { status: 201, headers: privateHeaders });
}
