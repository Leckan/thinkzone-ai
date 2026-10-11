import "server-only";
import { getActiveUser } from "@/lib/auth/session";
import { stripeSecretAllowedInCurrentEnvironment } from "@/lib/billing/stripe";

export async function getBillingUser(request: Request) {
  return getActiveUser(request);
}

export function billingEnvironmentReady() {
  return Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET && process.env.STRIPE_WEBHOOK_SECRET
    && stripeSecretAllowedInCurrentEnvironment());
}
