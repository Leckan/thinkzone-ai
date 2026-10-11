import "server-only";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { subscriptionPlans } from "@/db/schema";
import { getDb } from "@/lib/db/client";

type Plan = typeof subscriptionPlans.$inferSelect;

function priceMatchesPlan(price: Stripe.Price, plan: Plan) {
  return price.active
    && price.unit_amount === plan.monthlyPriceCents
    && price.currency === plan.currency.toLowerCase()
    && price.recurring?.interval === "month"
    && price.metadata.planId === plan.id
    && price.metadata.includedCreditAtoms === plan.includedCreditAtoms.toString();
}

export async function getStripePlanPrice(stripe: Stripe, plan: Plan) {
  if (plan.stripePriceId) {
    try {
      const current = await stripe.prices.retrieve(plan.stripePriceId);
      if (priceMatchesPlan(current, plan)) return current;
    } catch {
      // A deactivated or deleted Stripe price is replaced below.
    }
  }

  let productId = plan.stripeProductId;
  if (productId) {
    try {
      const product = await stripe.products.retrieve(productId);
      if ("deleted" in product && product.deleted) productId = null;
      else if (!("active" in product) || !product.active) productId = null;
    } catch {
      productId = null;
    }
  }
  if (!productId) {
    const product = await stripe.products.create({
      name: `Think Zone ${plan.name}`,
      active: true,
      metadata: { planId: plan.id, planKey: plan.key },
    }, { idempotencyKey: `tz-product-${plan.id}` });
    productId = product.id;
    await getDb().update(subscriptionPlans).set({ stripeProductId: productId }).where(eq(subscriptionPlans.id, plan.id));
  }

  const price = await stripe.prices.create({
    product: productId,
    currency: plan.currency.toLowerCase(),
    unit_amount: plan.monthlyPriceCents,
    recurring: { interval: "month" },
    metadata: { planId: plan.id, planKey: plan.key, includedCreditAtoms: plan.includedCreditAtoms.toString() },
  }, {
    idempotencyKey: `tz-price-${plan.id}-${plan.monthlyPriceCents}-${plan.currency.toLowerCase()}-${plan.includedCreditAtoms.toString()}`,
  });
  await getDb().update(subscriptionPlans).set({ stripeProductId: productId, stripePriceId: price.id })
    .where(eq(subscriptionPlans.id, plan.id));
  if (plan.stripePriceId && plan.stripePriceId !== price.id) {
    try { await stripe.prices.update(plan.stripePriceId, { active: false }); } catch { /* Keep checkout available if an old price was already removed. */ }
  }
  return price;
}
