# Billing and credits

## Units and exact arithmetic

`1 TZC = 1,000 credit atoms`. The customer charge denomination is `$0.001` per TZC, so `$0.000001` per atom. Provider rates are expressed as integer nano-USD per million tokens. Token costs are rounded up to the next nano-USD for each usage category; target-margin charges use integer basis points and ceiling division; customer charges are rounded up to whole credit atoms. No floating-point arithmetic is used in the demo pricing path.

For a target gross margin `m` in basis points:

```text
providerCostNano = ceil(inputTokens × inputRateNano / 1,000,000)
                 + ceil(outputTokens × outputRateNano / 1,000,000)
customerChargeNano = ceil(providerCostNano × 10,000 / (10,000 − m))
chargeAtoms = ceil(customerChargeNano / 1,000)
```

Margins must be in `[0, 9,999]` basis points. Model prices in the demo catalog are sample numbers and are not current provider prices.

## Ledger and lifecycle

The in-memory ledger grants credits by lot, reserves from eligible lots in disclosed source order, and subtracts only settled charge entries from lot balances. Reservations reduce spendable balance without changing the amount remaining in a lot. Settlement consumes up to the reserved amount and releases the unused reservation; cancellation releases all reserved amounts. Repeated settlement is accepted only when its final amount matches the original settlement. Historical ledger entries are returned as copies and are not edited in place.

The demo store is single-process memory and resets on restart. It does not provide durable concurrency control across server instances. The PostgreSQL schema provides uniqueness and check constraints, but a transactional production service still needs implementation.

## Stripe billing implementation

The authenticated billing screen reads active plans and top-up packages from PostgreSQL. The initial database configuration uses the product's pricing hypotheses (Starter `$15`, Pro `$30`, Power `$60` monthly; top-ups `$5`, `$10`, `$25`) and can be changed by updating the database records. Plan and package prices are never accepted from browser input. Monthly Stripe Products and Prices are created lazily from those records and saved on the plan row; top-ups use server-created one-time Checkout line items.

Checkout sessions redirect to Stripe-hosted Checkout. A Google-authenticated active user can view their current subscription, transaction history, wallet balance, purchase top-ups, and open the Stripe Billing Portal. The Portal must be enabled in Stripe Dashboard. To expose plan changes there, enable the configured Think Zone products and prices in the Portal settings.

`POST /api/webhooks/stripe` validates the raw request body and signature. The event receipt, subscription/payment transaction, credit lot, immutable ledger grant, and cached wallet increment run in a single database transaction. A unique Stripe event ID, checkout/invoice lot grant reference, and ledger idempotency key prevent replayed deliveries from issuing credits twice. Top-up credit amounts are snapshotted when Checkout is created; subscription credit amounts are recorded in Stripe Price metadata. Subscription credits expire at period end, while purchased credits do not expire.

The user interface success redirect only displays a pending confirmation message. It does not grant funds. Stripe test mode and Stripe CLI should be used for local validation. Do not use live keys until the product's prices and provider commercial terms are approved.

The current local mock chat and direct-provider development path do not spend the persisted billing wallet. Database billing balance and model usage are therefore not connected end to end yet. Refund-driven credit reversals, automatic tax, discount codes, and automatic recharge are not implemented. Keep plan switching disabled in the Stripe Portal until its configured price mapping and wallet policy have been validated.

## Production requirements still open

- Persist wallet, lot allocation, request, reservation, settlement, and refund operations in PostgreSQL transactions.
- Implement reservation expiry and an idempotent recovery worker.
- Resolve and persist an immutable rate-card version before the provider call.
- Add provider-specific authoritative usage and a reconciliation state machine.
- Treat ambiguous provider timeouts as reconciliation work, never as a safe automatic retry by default.
- Connect persistent wallet reservations and settlements to inference before selling credits for model usage.
- Keep provider cost, customer charge, and infrastructure overhead in separate fields.
- Define customer-visible refund, failed-stream, and delayed-usage policies before launch.
