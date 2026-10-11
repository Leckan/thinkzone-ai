# Testing

Run the available checks with:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`tests/credits.test.ts` covers target-margin rounding, token-rate calculation, input validation, credit-source allocation, over-reservation, idempotent reserve/settlement, excess-charge rejection, and release after cancellation. These are deterministic in-memory unit tests.

No PostgreSQL integration tests, provider adapter tests, payment webhook tests, or browser end-to-end tests exist yet. The app has no external credentials or database in this workspace, so those paths cannot be honestly reported as tested. Do not run tests against production provider or payment credentials.
