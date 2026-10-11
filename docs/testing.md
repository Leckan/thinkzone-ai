# Testing

Run the available checks with:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`tests/credits.test.ts` covers target-margin rounding, token-rate calculation, input validation, credit-source allocation, over-reservation, idempotent reserve/settlement, excess-charge rejection, and release after cancellation. `tests/billing-webhooks.test.ts` verifies Stripe signature checking with generated test-only signatures and limits subscription credit grants to paid create/renewal invoices. These are deterministic unit tests and do not call Stripe or charge a payment method.

`tests/provider-mode.test.ts` verifies the mock catalog and production restrictions without making provider calls. No live streaming, database-backed concurrent wallet operations, full Stripe CLI delivery, payment checkout, or browser end-to-end flow has been tested. Do not run tests against production provider or payment credentials.

`tests/conversations.test.ts` covers transcript, context, and title bounds. `tests/rate-limit.test.ts` covers fixed-window retry calculations and `429`/fail-closed `503` responses. The shared PostgreSQL upsert is atomic by construction, but concurrency behavior still needs a database-backed integration test.
