# API status

The only implemented routes are development demo endpoints. Both return `503` unless the app is running outside production with `AI_PROVIDER_MODE=mock`.

## `GET /api/overview`

Returns a no-store snapshot of the process-local sample wallet, usage requests, and grant/charge ledger rows. It is not an authenticated user account endpoint and must not be exposed publicly.

## `POST /api/chat`

Request JSON:

```json
{
  "prompt": "Explain a useful way to prioritize a project.",
  "modelId": "tz-mock-balanced",
  "idempotencyKey": "c2cc4436-803e-46cb-bdf5-cc33f0cc3ff6"
}
```

The route accepts prompts up to 4,000 characters and only the two development mock IDs. It reserves a conservative maximum charge before creating an SSE response. `data:` events contain `delta`, then a final `done` event with simulated token counts, sample provider cost, and demo credit charge. These values are not provider-reported usage. `402` indicates insufficient sample credits, `409` indicates an already-used idempotency key or reservation conflict, and `503` indicates the mock gateway is disabled.

The route is not a production inference API: it has no account authentication, database persistence, live provider, developer key, or distributed idempotency. Production API routes listed in the original product requirements remain unimplemented.
