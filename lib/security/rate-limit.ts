import { sql } from "drizzle-orm";
import { apiRateLimits } from "@/db/schema";
import { getDb } from "@/lib/db/client";

export type RateLimitDecision = {
  allowed: boolean;
  unavailable: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function getRateLimitFailure(decision: RateLimitDecision, action: string) {
  if (decision.allowed) return null;
  return {
    status: decision.unavailable ? 503 as const : 429 as const,
    error: decision.unavailable
      ? `Could not verify request limits. The ${action} was not started.`
      : `Too many ${action} requests. Try again after the indicated delay.`,
    headers: {
      "Cache-Control": "private, no-store",
      ...(decision.unavailable ? {} : { "Retry-After": String(decision.retryAfterSeconds) }),
    },
  };
}

export function rateLimitRetryAfterSeconds(windowStartedAt: Date, windowMs: number, nowMs = Date.now()) {
  return Math.max(1, Math.ceil((windowStartedAt.getTime() + windowMs - nowMs) / 1_000));
}

export async function consumeUserRateLimit(options: {
  userId: string;
  scope: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitDecision> {
  try {
    const [bucket] = await getDb().insert(apiRateLimits).values({
      userId: options.userId,
      scope: options.scope,
      windowStartedAt: sql`now()`,
      requestCount: 1,
      updatedAt: sql`now()`,
    }).onConflictDoUpdate({
      target: [apiRateLimits.userId, apiRateLimits.scope],
      set: {
        windowStartedAt: sql`case when ${apiRateLimits.windowStartedAt} <= now() - (${options.windowMs} * interval '1 millisecond') then now() else ${apiRateLimits.windowStartedAt} end`,
        requestCount: sql`case when ${apiRateLimits.windowStartedAt} <= now() - (${options.windowMs} * interval '1 millisecond') then 1 else least(${apiRateLimits.requestCount} + 1, ${options.limit + 1}) end`,
        updatedAt: sql`now()`,
      },
    }).returning({
      windowStartedAt: apiRateLimits.windowStartedAt,
      requestCount: apiRateLimits.requestCount,
    });

    if (!bucket) return unavailableDecision(options.limit, options.windowMs);
    const allowed = bucket.requestCount <= options.limit;
    return {
      allowed,
      unavailable: false,
      remaining: Math.max(0, options.limit - bucket.requestCount),
      retryAfterSeconds: rateLimitRetryAfterSeconds(bucket.windowStartedAt, options.windowMs),
    };
  } catch {
    return unavailableDecision(options.limit, options.windowMs);
  }
}

function unavailableDecision(limit: number, windowMs: number): RateLimitDecision {
  return {
    allowed: false,
    unavailable: true,
    remaining: 0,
    retryAfterSeconds: Math.ceil(windowMs / 1_000),
  };
}
