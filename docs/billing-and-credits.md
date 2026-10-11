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

## Production requirements still open

- Persist wallet, lot allocation, request, reservation, settlement, and refund operations in PostgreSQL transactions.
- Implement reservation expiry and an idempotent recovery worker.
- Resolve and persist an immutable rate-card version before the provider call.
- Add provider-specific authoritative usage and a reconciliation state machine.
- Treat ambiguous provider timeouts as reconciliation work, never as a safe automatic retry by default.
- Issue subscription and purchased lots only after verified, idempotent payment events.
- Keep provider cost, customer charge, and infrastructure overhead in separate fields.
- Define customer-visible refund, failed-stream, and delayed-usage policies before launch.
