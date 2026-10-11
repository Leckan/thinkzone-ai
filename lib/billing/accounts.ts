import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type Stripe from "stripe";
import { creditAccounts, creditPackages, paymentTransactions, subscriptionPlans, subscriptions } from "@/db/schema";
import { getDb } from "@/lib/db/client";

export type BillingUser = { id: string; email: string; name: string };

export async function getOrCreateCreditAccount(userId: string) {
  const db = getDb();
  await db.insert(creditAccounts).values({ ownerType: "user", ownerId: userId }).onConflictDoNothing();
  const [account] = await db.select().from(creditAccounts)
    .where(and(eq(creditAccounts.ownerType, "user"), eq(creditAccounts.ownerId, userId)))
    .limit(1);
  if (!account) throw new Error("Unable to create the user's credit account.");
  return account;
}

export async function getOrCreateStripeCustomer(stripe: Stripe, user: BillingUser, account: typeof creditAccounts.$inferSelect) {
  if (account.paymentCustomerId) return account.paymentCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { accountId: account.id, userId: user.id },
  }, { idempotencyKey: `thinkzone-customer-${account.id}` });

  await getDb().update(creditAccounts)
    .set({ paymentCustomerId: customer.id })
    .where(eq(creditAccounts.id, account.id));
  return customer.id;
}

export async function getBillingSnapshot(userId: string) {
  const db = getDb();
  const account = await getOrCreateCreditAccount(userId);
  const [plans, packages, ownedSubscriptions, transactions] = await Promise.all([
    db.select({ id: subscriptionPlans.id, key: subscriptionPlans.key, name: subscriptionPlans.name,
      monthlyPriceCents: subscriptionPlans.monthlyPriceCents, includedCreditAtoms: subscriptionPlans.includedCreditAtoms,
      currency: subscriptionPlans.currency, features: subscriptionPlans.features })
      .from(subscriptionPlans).where(and(eq(subscriptionPlans.active, true)))
      .orderBy(subscriptionPlans.monthlyPriceCents),
    db.select({ id: creditPackages.id, key: creditPackages.key, name: creditPackages.name,
      priceCents: creditPackages.priceCents, creditAtoms: creditPackages.creditAtoms, currency: creditPackages.currency })
      .from(creditPackages).where(eq(creditPackages.active, true)).orderBy(creditPackages.priceCents),
    db.select({ id: subscriptions.id, planId: subscriptions.planId, paymentSubscriptionId: subscriptions.paymentSubscriptionId,
      status: subscriptions.status, periodStart: subscriptions.periodStart, periodEnd: subscriptions.periodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd, planName: subscriptionPlans.name, planKey: subscriptionPlans.key })
      .from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.accountId, account.id)).orderBy(desc(subscriptions.createdAt)).limit(5),
    db.select({ id: paymentTransactions.id, kind: paymentTransactions.kind, status: paymentTransactions.status,
      amountCents: paymentTransactions.amountCents, currency: paymentTransactions.currency,
      receiptUrl: paymentTransactions.receiptUrl, createdAt: paymentTransactions.createdAt,
      paidAt: paymentTransactions.paidAt, planId: paymentTransactions.planId, packageId: paymentTransactions.packageId,
      planName: subscriptionPlans.name, packageName: creditPackages.name })
      .from(paymentTransactions)
      .leftJoin(subscriptionPlans, eq(paymentTransactions.planId, subscriptionPlans.id))
      .leftJoin(creditPackages, eq(paymentTransactions.packageId, creditPackages.id))
      .where(eq(paymentTransactions.accountId, account.id)).orderBy(desc(paymentTransactions.createdAt)).limit(12),
  ]);

  const activeStatuses = new Set(["active", "trialing", "past_due", "incomplete", "unpaid", "paused"]);
  const currentSubscription = ownedSubscriptions.find((subscription) => activeStatuses.has(subscription.status)) ?? null;

  return {
    availableAtoms: account.cachedAvailableAtoms.toString(),
    currency: account.currency,
    plans: plans.filter((plan) => plan.monthlyPriceCents > 0).map((plan) => ({
      id: plan.id,
      key: plan.key,
      name: plan.name,
      monthlyPriceCents: plan.monthlyPriceCents,
      includedCreditAtoms: plan.includedCreditAtoms.toString(),
      currency: plan.currency,
      features: plan.features,
    })),
    packages: packages.map((item) => ({
      id: item.id,
      key: item.key,
      name: item.name,
      priceCents: item.priceCents,
      creditAtoms: item.creditAtoms.toString(),
      currency: item.currency,
    })),
    subscription: currentSubscription ? {
      planName: currentSubscription.planName,
      planKey: currentSubscription.planKey,
      status: currentSubscription.status,
      periodStart: currentSubscription.periodStart?.toISOString() ?? null,
      periodEnd: currentSubscription.periodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: currentSubscription.cancelAtPeriodEnd,
      canManage: Boolean(account.paymentCustomerId),
    } : null,
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      kind: transaction.kind,
      status: transaction.status,
      amountCents: transaction.amountCents,
      currency: transaction.currency,
      receiptUrl: transaction.receiptUrl,
      createdAt: transaction.createdAt.toISOString(),
      paidAt: transaction.paidAt?.toISOString() ?? null,
      itemName: transaction.planName ?? transaction.packageName ?? (transaction.kind === "subscription" ? "Subscription" : "Credit top-up"),
    })),
  };
}

export async function accountHasCurrentSubscription(accountId: string): Promise<boolean> {
  const rows = await getDb().select({ id: subscriptions.id }).from(subscriptions)
    .where(and(
      eq(subscriptions.accountId, accountId),
      inArray(subscriptions.status, ["active", "trialing", "past_due", "incomplete", "unpaid", "paused"]),
    )).limit(1);
  return rows.length > 0;
}
