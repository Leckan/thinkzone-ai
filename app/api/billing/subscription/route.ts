import { NextResponse } from "next/server";
import { billingEnvironmentReady, getBillingUser } from "@/lib/billing/session";
import { getBillingSnapshot } from "@/lib/billing/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!billingEnvironmentReady()) {
    return NextResponse.json({ error: "Billing requires PostgreSQL, authentication, and Stripe configuration." }, { status: 503 });
  }
  try {
    const user = await getBillingUser(request);
    if (!user) return NextResponse.json({ error: "Sign in to view billing." }, { status: 401 });
    const billing = await getBillingSnapshot(user.id);
    return NextResponse.json(billing, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load billing details." }, { status: 500 });
  }
}
