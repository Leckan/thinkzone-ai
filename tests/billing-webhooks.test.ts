import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import { shouldGrantSubscriptionInvoice, stripeSecretKeyAllowed, verifyStripeWebhookEvent } from "@/lib/billing/webhook-utils";

describe("Stripe webhook verification", () => {
  const stripe = new Stripe("sk_test_unit_only");
  const secret = "whsec_unit_only";
  const payload = JSON.stringify({
    id: "evt_unit_test",
    object: "event",
    api_version: "2025-06-30.basil",
    created: 1_760_000_000,
    data: { object: { id: "cs_unit_test", object: "checkout.session" } },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: "checkout.session.completed",
  });

  it("accepts a valid signature over the unmodified request body", () => {
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(verifyStripeWebhookEvent(stripe, payload, signature, secret).id).toBe("evt_unit_test");
  });

  it("rejects a signature made with a different endpoint secret", () => {
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(() => verifyStripeWebhookEvent(stripe, payload, signature, "whsec_other"))
      .toThrow(/signature/i);
  });
});

describe("subscription credit grant events", () => {
  it("grants recurring credits only for paid creation and renewal invoices", () => {
    expect(shouldGrantSubscriptionInvoice({ status: "paid", billing_reason: "subscription_create" })).toBe(true);
    expect(shouldGrantSubscriptionInvoice({ status: "paid", billing_reason: "subscription_cycle" })).toBe(true);
    expect(shouldGrantSubscriptionInvoice({ status: "open", billing_reason: "subscription_cycle" })).toBe(false);
    expect(shouldGrantSubscriptionInvoice({ status: "paid", billing_reason: "subscription_update" })).toBe(false);
    expect(shouldGrantSubscriptionInvoice({ status: "paid", billing_reason: "manual" })).toBe(false);
  });
});

describe("Stripe environment guard", () => {
  it("refuses live secret keys outside production and permits test keys locally", () => {
    expect(stripeSecretKeyAllowed(undefined, "development")).toBe(false);
    expect(stripeSecretKeyAllowed("sk_test_unit_only", "development")).toBe(true);
    expect(stripeSecretKeyAllowed("sk_live_unit_only", "development")).toBe(false);
    expect(stripeSecretKeyAllowed("rk_live_unit_only", "development")).toBe(false);
    expect(stripeSecretKeyAllowed("sk_live_unit_only", "production")).toBe(true);
  });
});
