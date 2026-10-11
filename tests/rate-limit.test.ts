import { describe, expect, it } from "vitest";
import { getRateLimitFailure, rateLimitRetryAfterSeconds } from "@/lib/security/rate-limit";

describe("rate limit responses", () => {
  it("calculates a positive Retry-After from the active fixed window", () => {
    const startedAt = new Date(10_000);
    expect(rateLimitRetryAfterSeconds(startedAt, 60_000, 20_001)).toBe(50);
    expect(rateLimitRetryAfterSeconds(startedAt, 60_000, 70_000)).toBe(1);
  });

  it("returns a private 429 with Retry-After when a user exceeds the limit", () => {
    const failure = getRateLimitFailure({ allowed: false, unavailable: false, remaining: 0, retryAfterSeconds: 17 }, "provider chat");
    expect(failure).toEqual({
      status: 429,
      error: "Too many provider chat requests. Try again after the indicated delay.",
      headers: { "Cache-Control": "private, no-store", "Retry-After": "17" },
    });
  });

  it("fails closed without retry headers when the limiter store is unavailable", () => {
    const failure = getRateLimitFailure({ allowed: false, unavailable: true, remaining: 0, retryAfterSeconds: 60 }, "provider chat");
    expect(failure).toEqual({
      status: 503,
      error: "Could not verify request limits. The provider chat was not started.",
      headers: { "Cache-Control": "private, no-store" },
    });
  });
});
