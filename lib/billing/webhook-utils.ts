import type Stripe from "stripe";

export function stripeSecretKeyAllowed(secretKey: string | undefined, nodeEnv: string | undefined) {
  if (!secretKey) return false;
  const isLiveKey = secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_");
  return nodeEnv === "production" || !isLiveKey;
}

export function verifyStripeWebhookEvent(stripe: Stripe, rawBody: string, signature: string, endpointSecret: string) {
  return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
}

export function shouldGrantSubscriptionInvoice(invoice: Pick<Stripe.Invoice, "status" | "billing_reason">) {
  return invoice.status === "paid"
    && (invoice.billing_reason === "subscription_create" || invoice.billing_reason === "subscription_cycle");
}
