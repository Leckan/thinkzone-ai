import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { creditPackages, paymentTransactions } from "@/db/schema";
import { getOrCreateCreditAccount, getOrCreateStripeCustomer } from "@/lib/billing/accounts";
import { billingEnvironmentReady, getBillingUser } from "@/lib/billing/session";
import { getBillingBaseUrl, getStripe } from "@/lib/billing/stripe";
import { getDb } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  packageKey: z.string().trim().min(1).max(64),
  idempotencyKey: z.string().uuid(),
});

export async function POST(request: Request) {
  if (!billingEnvironmentReady()) {
    return NextResponse.json({ error: "Billing requires PostgreSQL, authentication, and Stripe configuration." }, { status: 503 });
  }
  const user = await getBillingUser(request);
  if (!user) return NextResponse.json({ error: "Sign in before purchasing credits." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid credit package request." }, { status: 400 });

  try {
    const db = getDb();
    const [creditPackage] = await db.select().from(creditPackages)
      .where(and(eq(creditPackages.key, parsed.data.packageKey), eq(creditPackages.active, true)))
      .limit(1);
    if (!creditPackage || creditPackage.priceCents <= 0 || creditPackage.creditAtoms <= 0n) {
      return NextResponse.json({ error: "That credit package is unavailable." }, { status: 404 });
    }

    const account = await getOrCreateCreditAccount(user.id);
    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(stripe, user, account);
    const baseUrl = getBillingBaseUrl();
    const metadata = {
      accountId: account.id,
      userId: user.id,
      packageId: creditPackage.id,
      purpose: "top_up",
    };
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      client_reference_id: account.id,
      line_items: [{
        price_data: {
          currency: creditPackage.currency.toLowerCase(),
          unit_amount: creditPackage.priceCents,
          product_data: {
            name: `Think Zone ${creditPackage.name}`,
            description: `${creditPackage.creditAtoms.toString()} credit atoms added after verified payment.`,
          },
        },
        quantity: 1,
      }],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${baseUrl}/?billing=success`,
      cancel_url: `${baseUrl}/?billing=cancelled`,
    }, { idempotencyKey: `tz-topup-${user.id}-${parsed.data.idempotencyKey}` });

    if (!session.url) return NextResponse.json({ error: "Stripe did not return a Checkout URL." }, { status: 502 });
    await db.insert(paymentTransactions).values({
      accountId: account.id,
      userId: user.id,
      kind: "top_up",
      status: "pending",
      checkoutSessionId: session.id,
      packageId: creditPackage.id,
      amountCents: creditPackage.priceCents,
      creditAtoms: creditPackage.creditAtoms,
      currency: creditPackage.currency.toLowerCase(),
    }).onConflictDoNothing();

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Unable to start credit checkout." }, { status: 502 });
  }
}
