# Testing

Run the available checks with:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`tests/credits.test.ts` covers target-margin rounding, token-rate calculation, input validation, credit-source allocation, over-reservation, idempotent reserve/settlement, excess-charge rejection, and release after cancellation. These are deterministic in-memory unit tests.

`tests/provider-mode.test.ts` verifies the mock catalog and production restrictions without making provider calls. A local catalog check returned chat models from six configured providers; Google Gemini returned HTTP 401. No billable inference request was sent, so live streaming and provider usage parsing have not been end-to-end tested. No PostgreSQL integration tests, payment webhook tests, or browser end-to-end tests exist yet. Do not run tests against production provider or payment credentials.
