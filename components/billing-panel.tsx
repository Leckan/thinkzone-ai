"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, Clock3, CreditCard, RefreshCw, ShieldCheck } from "lucide-react";
import { formatTzc } from "@/lib/credits/accounting";

type Plan = {
  id: string;
  key: string;
  name: string;
  monthlyPriceCents: number;
  includedCreditAtoms: string;
  currency: string;
};

type CreditPackage = {
  id: string;
  key: string;
  name: string;
  priceCents: number;
  creditAtoms: string;
  currency: string;
};

type BillingData = {
  availableAtoms: string;
  plans: Plan[];
  packages: CreditPackage[];
  subscription: null | {
    planName: string;
    status: string;
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    canManage: boolean;
  };
  transactions: Array<{
    id: string;
    kind: string;
    status: string;
    amountCents: number;
    currency: string;
    receiptUrl: string | null;
    createdAt: string;
    itemName: string;
  }>;
};

function formatPrice(cents: number, currency: string, interval = "") {
  const price = new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  return interval ? `${price}${interval}` : price;
}

export function BillingPanel() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/subscription", { cache: "no-store" });
      const result = await response.json() as BillingData & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to load billing information.");
      setData(result);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load billing information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const billingStatus = new URLSearchParams(window.location.search).get("billing");
    if (billingStatus === "success") setNotice("Checkout returned successfully. Your balance updates after Stripe verifies the payment webhook.");
    if (billingStatus === "cancelled") setNotice("Checkout was canceled. No credits were added and no subscription was started.");
  }, [refresh]);

  async function startCheckout(path: string, body: { planKey?: string; packageKey?: string }, key: string) {
    setPending(key);
    setError(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, idempotencyKey: crypto.randomUUID() }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Unable to start checkout.");
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start checkout.");
      setPending(null);
    }
  }

  async function openPortal() {
    setPending("portal");
    setError(null);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Unable to open billing management.");
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to open billing management.");
      setPending(null);
    }
  }

  return <div className="billing-panel">
    {notice && <div className="billing-notice"><CheckCircle2 size={15} /> <span>{notice}</span></div>}
    {error && <div className="billing-error" role="alert">{error}{error.toLowerCase().includes("sign in") && <span> Use Continue with Google in the header first.</span>}</div>}

    {loading ? <section className="panel billing-loading"><RefreshCw size={15} className="billing-spin" /> Loading billing details…</section> : data ? <>
      <section className="panel billing-balance">
        <div>
          <div className="panel-title">Credit wallet</div>
          <div className="panel-caption">PostgreSQL balance · changes after verified payment events</div>
        </div>
        <div className="billing-balance-value">{formatTzc(BigInt(data.availableAtoms))}<span> TZC</span></div>
      </section>

      <div className="billing-safety"><ShieldCheck size={15} /><span>Stripe webhooks—not the success redirect—confirm payments and add credits. This build’s local chat demo does not yet spend this persisted wallet.</span></div>

      {data.subscription ? <section className="panel billing-current">
        <div className="billing-current-copy">
          <div className="panel-title">{data.subscription.planName} plan</div>
          <div className="panel-caption">Status: <strong>{data.subscription.status.replaceAll("_", " ")}</strong>{data.subscription.periodEnd ? ` · Renews or ends ${new Date(data.subscription.periodEnd).toLocaleDateString()}` : ""}{data.subscription.cancelAtPeriodEnd ? " · Cancellation scheduled" : ""}</div>
        </div>
        {data.subscription.canManage && <button className="button-secondary" type="button" disabled={pending !== null} onClick={() => void openPortal()}>{pending === "portal" ? "Opening…" : "Manage subscription"}<ArrowUpRight size={13} /></button>}
      </section> : <section className="panel billing-section">
        <div className="panel-head"><div><div className="panel-title">Monthly plans</div><div className="panel-caption">A monthly payment adds the included credits after each paid invoice.</div></div></div>
        {data.plans.length ? <div className="billing-cards">{data.plans.map((plan) => <article className="billing-card" key={plan.id}>
          <div className="billing-card-title">{plan.name}</div>
          <div className="billing-card-price">{formatPrice(plan.monthlyPriceCents, plan.currency, "/mo")}</div>
          <div className="billing-card-detail">{formatTzc(BigInt(plan.includedCreditAtoms))} TZC each billing period</div>
          <button className="button-primary" type="button" disabled={pending !== null} onClick={() => void startCheckout("/api/billing/checkout", { planKey: plan.key }, `plan:${plan.key}`)}>
            {pending === `plan:${plan.key}` ? "Opening checkout…" : "Choose plan"}
          </button>
        </article>)}</div> : <p className="billing-empty">No active paid plans are configured in the database.</p>}
      </section>}

      <section className="panel billing-section">
        <div className="panel-head"><div><div className="panel-title">Credit top-ups</div><div className="panel-caption">One-time purchases; credits never expire.</div></div><CreditCard size={15} /></div>
        {data.packages.length ? <div className="billing-cards billing-cards-small">{data.packages.map((item) => <article className="billing-card" key={item.id}>
          <div className="billing-card-title">{item.name}</div>
          <div className="billing-card-price">{formatPrice(item.priceCents, item.currency)}</div>
          <div className="billing-card-detail">{formatTzc(BigInt(item.creditAtoms))} TZC</div>
          <button className="button-secondary" type="button" disabled={pending !== null} onClick={() => void startCheckout("/api/billing/top-ups/checkout", { packageKey: item.key }, `top-up:${item.key}`)}>
            {pending === `top-up:${item.key}` ? "Opening checkout…" : "Buy credits"}
          </button>
        </article>)}</div> : <p className="billing-empty">No active top-up packages are configured in the database.</p>}
      </section>

      <section className="panel billing-section">
        <div className="panel-head"><div><div className="panel-title">Payment history</div><div className="panel-caption">Recent Stripe transactions and receipts</div></div><Clock3 size={15} /></div>
        {data.transactions.length ? data.transactions.map((transaction) => <div className="billing-transaction" key={transaction.id}>
          <div><div className="setting-label">{transaction.itemName}</div><div className="setting-detail">{new Date(transaction.createdAt).toLocaleDateString()} · {transaction.status.replaceAll("_", " ")}</div></div>
          <div className="billing-transaction-amount">{formatPrice(transaction.amountCents, transaction.currency)}{transaction.receiptUrl && <a className="text-link" href={transaction.receiptUrl} target="_blank" rel="noreferrer">Receipt <ArrowUpRight size={11} /></a>}</div>
        </div>) : <p className="billing-empty">No transactions yet.</p>}
      </section>
    </> : null}
  </div>;
}
