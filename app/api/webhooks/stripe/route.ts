import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { loadRelatedStripeObjects, processStripeEvent, wasStripeEventHandled } from "@/lib/billing/webhooks";
import { getStripe, getWebhookSecret, stripeSecretAllowedInCurrentEnvironment } from "@/lib/billing/stripe";
import { verifyStripeWebhookEvent } from "@/lib/billing/webhook-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL || !stripeSecretAllowedInCurrentEnvironment() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhooks are not configured." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = verifyStripeWebhookEvent(getStripe(), body, signature, getWebhookSecret());
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature or payload." }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    if (await wasStripeEventHandled(event.id)) return NextResponse.json({ received: true, duplicate: true });
    const related = await loadRelatedStripeObjects(event, stripe);
    const result = await processStripeEvent(event, related);
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch {
    // Returning a server error lets Stripe retry; all database side effects are transactional.
    return NextResponse.json({ error: "Stripe event processing failed." }, { status: 500 });
  }
}
