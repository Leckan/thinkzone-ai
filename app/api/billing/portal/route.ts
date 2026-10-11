import { NextResponse } from "next/server";
import { getOrCreateCreditAccount } from "@/lib/billing/accounts";
import { billingEnvironmentReady, getBillingUser } from "@/lib/billing/session";
import { getBillingBaseUrl, getStripe } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!billingEnvironmentReady()) {
    return NextResponse.json({ error: "Billing requires PostgreSQL, authentication, and Stripe configuration." }, { status: 503 });
  }
  const user = await getBillingUser(request);
  if (!user) return NextResponse.json({ error: "Sign in before managing billing." }, { status: 401 });

  try {
    const account = await getOrCreateCreditAccount(user.id);
    if (!account.paymentCustomerId) return NextResponse.json({ error: "No Stripe customer is linked to this account yet." }, { status: 404 });
    const session = await getStripe().billingPortal.sessions.create({
      customer: account.paymentCustomerId,
      return_url: getBillingBaseUrl(),
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Unable to open the Stripe billing portal. Check its Dashboard configuration." }, { status: 502 });
  }
}
