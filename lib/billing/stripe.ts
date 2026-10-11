import "server-only";
import Stripe from "stripe";
import { stripeSecretKeyAllowed } from "@/lib/billing/webhook-utils";

let stripeClient: Stripe | null = null;

export function stripeSecretAllowedInCurrentEnvironment() {
  return stripeSecretKeyAllowed(process.env.STRIPE_SECRET_KEY, process.env.NODE_ENV);
}

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  if (!stripeSecretAllowedInCurrentEnvironment()) throw new Error("Live Stripe keys are disabled outside production.");
  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

export function getBillingBaseUrl(): string {
  const configured = process.env.APP_URL || "http://localhost:3000";
  const url = new URL(configured);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("APP_URL must use HTTPS outside local development.");
  }
  return url.origin;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  return secret;
}
