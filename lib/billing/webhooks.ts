import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { creditAccounts, creditLedgerEntries, creditLots, creditPackages, paymentEvents, paymentTransactions, subscriptionPlans, subscriptions } from "@/db/schema";
import { getDb } from "@/lib/db/client";
import { shouldGrantSubscriptionInvoice } from "@/lib/billing/webhook-utils";

type RelatedStripeObjects = { subscription?: Stripe.Subscription; invoice?: Stripe.Invoice; price?: Stripe.Price };

export async function wasStripeEventHandled(eventId: string) {
  const [row] = await getDb().select({ status: paymentEvents.status }).from(paymentEvents)
    .where(eq(paymentEvents.providerEventId, eventId)).limit(1);
  return row?.status === "processed" || row?.status === "ignored";
}

function stripeId(value: string | { id: string } | null | undefined): string | null {
  if (typeof value === "string") return value;
  return value?.id ?? null;
}

async function loadSubscriptionAndPrice(stripe: Stripe, subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
  const itemPrice = subscription.items.data[0]?.price;
  const price = typeof itemPrice === "string" ? await stripe.prices.retrieve(itemPrice) : itemPrice;
  return { subscription, price };
}

export async function loadRelatedStripeObjects(event: Stripe.Event, stripe: Stripe): Promise<RelatedStripeObjects> {
  if (event.type.startsWith("customer.subscription.")) {
    const subscription = event.data.object as Stripe.Subscription;
    return loadSubscriptionAndPrice(stripe, subscription.id);
  }
  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = await stripe.invoices.retrieve((event.data.object as Stripe.Invoice).id);
    const parentSubscription = invoice.parent?.subscription_details?.subscription;
    const legacySubscription = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription;
    const subscriptionId = stripeId(parentSubscription) ?? stripeId(legacySubscription);
    return subscriptionId ? { invoice, ...await loadSubscriptionAndPrice(stripe, subscriptionId) } : { invoice };
  }
  if (event.type.startsWith("checkout.session.")) {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = stripeId(session.subscription);
    if (session.mode === "subscription" && subscriptionId) {
      return loadSubscriptionAndPrice(stripe, subscriptionId);
    }
  }
  return {};
}

function subscriptionPeriod(subscription: Stripe.Subscription) {
  const firstItem = subscription.items.data[0];
  return {
    periodStart: firstItem ? new Date(firstItem.current_period_start * 1_000) : null,
    periodEnd: firstItem ? new Date(firstItem.current_period_end * 1_000) : null,
  };
}

function metadataCreditAtoms(subscription: Stripe.Subscription, price?: Stripe.Price): bigint | null {
  const raw = price?.metadata.includedCreditAtoms ?? subscription.metadata.includedCreditAtoms;
  if (!raw || !/^\d+$/.test(raw)) return null;
  const amount = BigInt(raw);
  return amount > 0n ? amount : null;
}

export async function processStripeEvent(event: Stripe.Event, related: RelatedStripeObjects) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [receipt] = await tx.insert(paymentEvents).values({
      providerEventId: event.id,
      eventType: event.type,
      status: "received",
    }).onConflictDoNothing().returning({ id: paymentEvents.id });
    if (!receipt) return { duplicate: true, status: "ignored" as const };

    let accountId: string | null = null;
    let outcome: "processed" | "ignored" = "ignored";

    async function resolveSubscription(subscription: Stripe.Subscription, price?: Stripe.Price) {
      const metadata = subscription.metadata;
      const accountKey = metadata.accountId;
      const userId = metadata.userId;
      const planId = price?.metadata.planId ?? metadata.planId;
      const customerId = stripeId(subscription.customer);
      if (!accountKey || !userId || !planId || !customerId) return null;

      const [account] = await tx.select().from(creditAccounts)
        .where(and(eq(creditAccounts.id, accountKey), eq(creditAccounts.ownerType, "user"), eq(creditAccounts.ownerId, userId)))
        .limit(1).for("update");
      if (!account || account.paymentCustomerId !== customerId) return null;
      const [plan] = await tx.select({ id: subscriptionPlans.id }).from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, planId)).limit(1);
      if (!plan) return null;

      const [previous] = await tx.select({ id: subscriptions.id, accountId: subscriptions.accountId })
        .from(subscriptions).where(eq(subscriptions.paymentSubscriptionId, subscription.id)).limit(1).for("update");
      if (previous && previous.accountId !== account.id) return null;

      const period = subscriptionPeriod(subscription);
      await tx.insert(subscriptions).values({
        accountId: account.id,
        planId: plan.id,
        paymentCustomerId: customerId,
        paymentSubscriptionId: subscription.id,
        status: subscription.status,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: subscriptions.paymentSubscriptionId,
        set: {
          accountId: account.id,
          planId: plan.id,
          paymentCustomerId: customerId,
          status: subscription.status,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          updatedAt: new Date(),
        },
      });
      accountId = account.id;
      return { account, userId, planId: plan.id, creditAtoms: metadataCreditAtoms(subscription, price) };
    }

    async function grantCredits(input: {
      accountId: string;
      atoms: bigint;
      source: "subscription" | "purchased";
      reference: string;
      expiresAt?: Date | null;
      metadata: Record<string, string>;
    }) {
      const [lot] = await tx.insert(creditLots).values({
        accountId: input.accountId,
        source: input.source,
        originalAtoms: input.atoms,
        remainingAtoms: input.atoms,
        grantReference: input.reference,
        expiresAt: input.expiresAt ?? null,
      }).onConflictDoNothing().returning({ id: creditLots.id });
      if (!lot) return false;

      await tx.insert(creditLedgerEntries).values({
        accountId: input.accountId,
        lotId: lot.id,
        paymentEventId: receipt.id,
        kind: "grant",
        atomsDelta: input.atoms,
        idempotencyKey: input.reference,
        metadata: input.metadata,
      });
      await tx.update(creditAccounts).set({
        cachedAvailableAtoms: sql`${creditAccounts.cachedAvailableAtoms} + ${input.atoms}`,
      }).where(eq(creditAccounts.id, input.accountId));
      return true;
    }

    async function processPaidTopUp(session: Stripe.Checkout.Session) {
      const [transaction] = await tx.select().from(paymentTransactions)
        .where(eq(paymentTransactions.checkoutSessionId, session.id)).limit(1).for("update");
      if (!transaction || transaction.kind !== "top_up" || !transaction.packageId || !transaction.creditAtoms) return false;
      const customerId = stripeId(session.customer);
      const metadata = session.metadata;
      if (metadata?.accountId !== transaction.accountId || metadata.userId !== transaction.userId
        || metadata.packageId !== transaction.packageId || !customerId) return false;
      const [account] = await tx.select().from(creditAccounts)
        .where(and(eq(creditAccounts.id, transaction.accountId), eq(creditAccounts.ownerType, "user"), eq(creditAccounts.ownerId, transaction.userId)))
        .limit(1).for("update");
      if (!account || account.paymentCustomerId !== customerId) return false;
      if (session.amount_total !== transaction.amountCents || session.currency?.toLowerCase() !== transaction.currency.toLowerCase()) return false;
      const [creditPackage] = await tx.select({ id: creditPackages.id }).from(creditPackages)
        .where(eq(creditPackages.id, transaction.packageId)).limit(1);
      if (!creditPackage) return false;

      await tx.update(paymentTransactions).set({
        status: "paid",
        paymentIntentId: stripeId(session.payment_intent),
        paidAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(paymentTransactions.id, transaction.id));
      await grantCredits({
        accountId: account.id,
        atoms: transaction.creditAtoms,
        source: "purchased",
        reference: `stripe:checkout:${session.id}`,
        metadata: { provider: "stripe", checkoutSessionId: session.id, packageId: creditPackage.id },
      });
      accountId = account.id;
      return true;
    }

    async function updatePendingTopUp(session: Stripe.Checkout.Session, status: "failed" | "canceled" | "expired") {
      const [transaction] = await tx.select({ id: paymentTransactions.id, accountId: paymentTransactions.accountId, kind: paymentTransactions.kind })
        .from(paymentTransactions).where(eq(paymentTransactions.checkoutSessionId, session.id)).limit(1).for("update");
      if (!transaction || transaction.kind !== "top_up") return false;
      await tx.update(paymentTransactions).set({ status, updatedAt: new Date() })
        .where(and(eq(paymentTransactions.id, transaction.id), eq(paymentTransactions.status, "pending")));
      accountId = transaction.accountId;
      return true;
    }

    async function upsertInvoiceTransaction(input: {
      invoice: Stripe.Invoice;
      subscription: Stripe.Subscription;
      resolved: NonNullable<Awaited<ReturnType<typeof resolveSubscription>>>;
      status: "paid" | "failed";
      grantedAtoms: bigint | null;
    }) {
      const { invoice, subscription, resolved, status, grantedAtoms } = input;
      const [existing] = await tx.select().from(paymentTransactions)
        .where(eq(paymentTransactions.invoiceId, invoice.id)).limit(1).for("update");
      if (existing && (existing.accountId !== resolved.account.id || existing.userId !== resolved.userId)) return false;

      const values = {
        accountId: resolved.account.id,
        userId: resolved.userId,
        kind: "subscription" as const,
        status,
        invoiceId: invoice.id,
        subscriptionId: subscription.id,
        planId: resolved.planId,
        amountCents: status === "paid" ? invoice.amount_paid : invoice.amount_due,
        creditAtoms: grantedAtoms,
        currency: invoice.currency.toLowerCase(),
        receiptUrl: invoice.hosted_invoice_url,
        paidAt: status === "paid" ? new Date(invoice.status_transitions.paid_at ? invoice.status_transitions.paid_at * 1_000 : Date.now()) : null,
        updatedAt: new Date(),
      };
      if (existing) {
        await tx.update(paymentTransactions).set(values).where(eq(paymentTransactions.id, existing.id));
      } else {
        await tx.insert(paymentTransactions).values(values);
      }
      accountId = resolved.account.id;
      return true;
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") {
        if (session.payment_status === "paid") outcome = await processPaidTopUp(session) ? "processed" : "ignored";
      } else if (session.mode === "subscription" && related.subscription) {
        const resolved = await resolveSubscription(related.subscription, related.price);
        const metadata = session.metadata;
        if (resolved && metadata?.accountId === resolved.account.id && metadata.userId === resolved.userId
          && metadata.planId === resolved.planId) outcome = "processed";
      }
    } else if (event.type === "checkout.session.async_payment_failed") {
      outcome = await updatePendingTopUp(event.data.object as Stripe.Checkout.Session, "failed") ? "processed" : "ignored";
    } else if (event.type === "checkout.session.expired") {
      outcome = await updatePendingTopUp(event.data.object as Stripe.Checkout.Session, "expired") ? "processed" : "ignored";
    } else if (event.type.startsWith("customer.subscription.") && related.subscription) {
      outcome = await resolveSubscription(related.subscription, related.price) ? "processed" : "ignored";
    } else if ((event.type === "invoice.paid" || event.type === "invoice.payment_failed") && related.invoice && related.subscription) {
      const invoice = related.invoice;
      const subscription = related.subscription;
      const resolved = await resolveSubscription(subscription, related.price);
      if (resolved && invoice.status === "paid") {
        const grantAmount = shouldGrantSubscriptionInvoice(invoice) ? resolved.creditAtoms : null;
        const transactionStored = await upsertInvoiceTransaction({
          invoice, subscription, resolved, status: "paid", grantedAtoms: grantAmount,
        });
        if (transactionStored) {
          if (grantAmount) {
            const periodEnd = subscriptionPeriod(subscription).periodEnd ?? new Date(invoice.period_end * 1_000);
            await grantCredits({
              accountId: resolved.account.id,
              atoms: grantAmount,
              source: "subscription",
              reference: `stripe:invoice:${invoice.id}`,
              expiresAt: periodEnd,
              metadata: { provider: "stripe", invoiceId: invoice.id, subscriptionId: subscription.id },
            });
          }
          outcome = "processed";
        }
      } else if (resolved && event.type === "invoice.payment_failed" && invoice.status !== "paid") {
        const transactionStored = await upsertInvoiceTransaction({ invoice, subscription, resolved, status: "failed", grantedAtoms: null });
        outcome = transactionStored ? "processed" : "ignored";
      }
    }

    await tx.update(paymentEvents).set({
      status: outcome,
      accountId,
      processedAt: new Date(),
    }).where(eq(paymentEvents.id, receipt.id));
    return { duplicate: false, status: outcome };
  });
}
