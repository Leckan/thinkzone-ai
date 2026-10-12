import { NextResponse } from "next/server";
import { feedbackSubmissions } from "@/db/schema";
import { getActiveUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { feedbackSubmissionSchema } from "@/lib/feedback/validation";
import { consumeUserRateLimit, getRateLimitFailure } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const user = await getActiveUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to send feedback." }, { status: 401, headers: privateHeaders });

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 24_000) {
    return NextResponse.json({ error: "Feedback request is too large." }, { status: 413, headers: privateHeaders });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: privateHeaders });
  }

  const parsed = feedbackSubmissionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a category and provide a short summary and details (10–5,000 characters)." }, { status: 400, headers: privateHeaders });
  }

  const limit = await consumeUserRateLimit({ userId: user.id, scope: "feedback-submit", limit: 3, windowMs: 60 * 60_000 });
  const limitFailure = getRateLimitFailure(limit, "feedback submission");
  if (limitFailure) return NextResponse.json({ error: limitFailure.error }, { status: limitFailure.status, headers: { ...privateHeaders, ...limitFailure.headers } });

  try {
    const [submission] = await getDb().insert(feedbackSubmissions).values({
      userId: user.id,
      category: parsed.data.category,
      subject: parsed.data.subject,
      details: parsed.data.details,
    }).returning({ id: feedbackSubmissions.id, createdAt: feedbackSubmissions.createdAt });

    if (!submission) return NextResponse.json({ error: "Could not save your feedback. Try again later." }, { status: 503, headers: privateHeaders });
    return NextResponse.json({ submission }, { status: 201, headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: "Could not save your feedback. Try again later." }, { status: 503, headers: privateHeaders });
  }
}
