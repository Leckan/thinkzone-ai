import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { subscriptionPlans } from "@/db/schema";
import { accountHasCurrentSubscription, getOrCreateCreditAccount, getOrCreateStripeCustomer } from "@/lib/billing/accounts";
import { billingEnvironmentReady, getBillingUser } from "@/lib/billing/session";
import { getBillingBaseUrl, getStripe } from "@/lib/billing/stripe";
import { getStripePlanPrice } from "@/lib/billing/stripe-prices";
import { getDb } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  planKey: z.string().trim().min(1).max(64),
  idempotencyKey: z.string().uuid(),
});

export async function POST(request: Request) {
  if (!billingEnvironmentReady()) {
    return NextResponse.json({ error: "Billing requires PostgreSQL, authentication, and Stripe configuration." }, { status: 503 });
  }
  const user = await getBillingUser(request);
  if (!user) return NextResponse.json({ error: "Sign in before starting a subscription." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription request." }, { status: 400 });

  try {
    const db = getDb();
    const [plan] = await db.select().from(subscriptionPlans)
      .where(and(eq(subscriptionPlans.key, parsed.data.planKey), eq(subscriptionPlans.active, true)))
      .limit(1);
    if (!plan || plan.monthlyPriceCents <= 0 || plan.includedCreditAtoms <= 0n) {
      return NextResponse.json({ error: "That subscription plan is unavailable." }, { status: 404 });
    }

    const account = await getOrCreateCreditAccount(user.id);
    if (await accountHasCurrentSubscription(account.id)) {
      return NextResponse.json({ error: "An active subscription already exists. Use Manage subscription to change or cancel it." }, { status: 409 });
    }
    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(stripe, user, account);
    const activePlans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, true));
    const planPrices = await Promise.all(activePlans.map(async (activePlan) => ({
      id: activePlan.id,
      price: await getStripePlanPrice(stripe, activePlan),
    })));
    const price = planPrices.find((candidate) => candidate.id === plan.id)?.price;
    if (!price) return NextResponse.json({ error: "Unable to configure Stripe pricing for that plan." }, { status: 502 });
    const baseUrl = getBillingBaseUrl();
    const metadata = {
      accountId: account.id,
      userId: user.id,
      planId: plan.id,
      includedCreditAtoms: plan.includedCreditAtoms.toString(),
      purpose: "subscription",
    };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: account.id,
      line_items: [{ price: price.id, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
      success_url: `${baseUrl}/?billing=success`,
      cancel_url: `${baseUrl}/?billing=cancelled`,
    }, { idempotencyKey: `tz-sub-${user.id}-${parsed.data.idempotencyKey}` });

    if (!session.url) return NextResponse.json({ error: "Stripe did not return a Checkout URL." }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Unable to start subscription checkout." }, { status: 502 });
  }
}
