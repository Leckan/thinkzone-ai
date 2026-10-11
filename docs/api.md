# API status

The implemented routes are local development endpoints. The mock wallet endpoints require `AI_PROVIDER_MODE=mock`; the live provider catalog and inference path require `AI_PROVIDER_MODE=provider-dev`. Both modes are disabled in production. Neither mode provides authentication or production authorization.

## `GET /api/models`

- In mock mode, returns the two simulated development profiles.
- In direct provider development mode, queries model-list endpoints for configured provider keys and returns text-generation model IDs, names, and provider names. Catalog results are cached in process for 60 seconds. Provider error details and credentials are not returned.
- Returns `503` in production or when no local mode is selected.

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

The route accepts prompts up to 4,000 characters. In mock mode it accepts only the two development mock IDs and reserves a conservative maximum charge before creating an SSE response. `data:` events contain `delta`, then a final `done` event with simulated token counts, sample provider cost, and demo credit charge. These values are not provider-reported usage. `402` indicates insufficient sample credits, `409` indicates an already-used idempotency key or reservation conflict, and `503` indicates the mock gateway is disabled.

In direct provider development mode, `modelId` must be an exact model in the server-fetched catalog. The route streams the provider response and returns provider-reported input/output token counts when available. It disables automatic SDK retries and aborts the upstream request when the client cancels. The route does not reserve or deduct demo credits, estimate provider cost, persist a request, or charge through Think Zone. A request may still incur provider charges if canceled after processing begins.

The route is not a production inference API: it has no account authentication, database persistence, live provider, developer key, or distributed idempotency. Production API routes listed in the original product requirements remain unimplemented.
