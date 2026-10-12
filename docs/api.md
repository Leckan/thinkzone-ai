# API status

The model, chat, and overview routes remain local development endpoints and require an active authenticated user. Stripe billing routes require an active user, PostgreSQL, and `STRIPE_SECRET_KEY`. Checkout prices are loaded from active database plans and packages. Stripe webhook events are the only mechanism that grants persistent billing credits.

## `GET, POST /api/auth/[...all]`

Better Auth handles Google sign-in, OAuth callbacks, session lookup, and sign-out through this route. It stores Google users and sessions in PostgreSQL. The browser uses `authClient` for the sign-in control; provider secrets and OAuth token encryption remain server-side. Google sign-in is enabled only when the OAuth client ID, client secret, auth secret, and database URL are configured.

All application APIs for models, chat, overview, conversations, and billing return `401` without an active signed-in account. Better Auth routes and the Stripe webhook are public callback endpoints.

## `GET /api/models`

- In mock mode, returns the two simulated development profiles.
- In direct provider development mode, queries model-list endpoints for configured provider keys and returns text-generation model IDs, names, and provider names. Catalog results are cached in process for 60 seconds. Provider error details and credentials are not returned.
- Returns `503` in production or when no local mode is selected.

## `GET /api/overview`

Requires an active signed-in account. Returns a no-store snapshot of the process-local sample wallet, usage requests, and grant/charge ledger rows. The wallet is a local demo and is not a persistent per-account balance.

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

In direct provider development mode, the caller must have a valid authenticated session and `modelId` must be an exact model in the server-fetched catalog. The route allows 10 provider-chat requests per account per minute; `429` includes `Retry-After`. If the shared rate-limit store cannot be reached, it returns `503` without calling the provider. The route streams up to 4,096 output tokens and returns provider-reported input/output token counts and the finish reason when available; if the provider reports its output limit, the chat marks the reply as truncated. It disables automatic SDK retries and aborts the upstream request when the client cancels. The route does not reserve or deduct demo credits, estimate provider cost, persist a request, or charge through Think Zone. A request may still incur provider charges if canceled after processing begins.

For an unsaved chat, optional `history` contains up to 24 prior user/assistant messages and is used only as request context. For a saved chat, send `conversationId` instead; the route verifies ownership and loads recent messages from PostgreSQL. These context messages are sent to the selected provider. The mock route continues to generate a single-turn simulated response.

The route is not a production inference API: it has no durable usage accounting, customer billing, developer key, or distributed idempotency. Production API routes listed in the original product requirements remain unimplemented.

## Saved conversations

Saved-conversation routes require an active authenticated user, scope every lookup and mutation to that user, and return private `no-store` responses. Chat transcripts are stored only after the user chooses Save; later user and assistant messages append to the saved record. Unstored chats remain in browser memory. Users can list, open, rename, archive, restore, and permanently delete their saved conversations.

- `GET /api/conversations` lists up to 100 active conversations. Add `?includeArchived=true` to include archived records.
- `POST /api/conversations` creates a conversation from 1–100 validated user/assistant messages, with a 100,000-character aggregate limit. The title starts from the first user message.
- `GET /api/conversations/{conversationId}` returns metadata and up to the latest 200 messages.
- `PATCH /api/conversations/{conversationId}` accepts a trimmed title and/or an `archived` boolean.
- `DELETE /api/conversations/{conversationId}` permanently deletes the conversation and cascading messages.
- `POST /api/conversations/{conversationId}/messages` appends one validated user/assistant message to an active, unarchived conversation.

Conversation creation is limited to 5 requests per account per minute, message appends to 24 per minute, and rename/archive/restore/delete operations to 20 per minute. Rate limits use atomic PostgreSQL fixed-window counters keyed by account and action. Exceeded requests return `429` with `Retry-After`; if the rate-limit store is unavailable, mutations fail closed with `503`.

Conversation history is not covered by request-log retention because inference request logging is not implemented. Deleting a saved conversation removes its messages from the application database.

## Feedback submissions

`POST /api/feedback` requires an active authenticated account. It accepts a category (`feature_request`, `feedback`, `bug`, or `issue`), a 3–160 character summary, and 10–5,000 characters of details. Submissions are associated with the account and stored in PostgreSQL for review. Each account may submit three reports per hour; exceeded requests return `429`, and unavailable rate-limit storage fails closed with `503`. There is no in-app submission history or email notification in this version.

## `GET /api/billing/subscription`

Requires an authenticated active user and returns the user's persistent wallet balance, active subscription plans, active top-up packages, current subscription, and recent transactions. The response is private and marked `no-store`.

## `POST /api/billing/checkout`

Starts hosted Stripe Checkout for an active monthly plan. The browser sends a `planKey` and UUID `idempotencyKey`; it cannot submit a price or credit amount.

```json
{ "planKey": "starter", "idempotencyKey": "c2cc4436-803e-46cb-bdf5-cc33f0cc3ff6" }
```

Returns `{ "url": "https://checkout.stripe.com/..." }`. An account with a current subscription must use the Billing Portal to manage it.

## `POST /api/billing/top-ups/checkout`

Starts a one-time hosted Checkout session for an active credit package. It accepts `packageKey` and a UUID `idempotencyKey`; the server stores the expected cents and credit amount before returning the Checkout URL. Credits are not granted on redirect.

## `POST /api/billing/portal`

Creates a Stripe Billing Portal session for the signed-in user's Stripe customer. The Stripe Dashboard must have a customer portal configuration enabled.

## `POST /api/webhooks/stripe`

Unauthenticated Stripe webhook endpoint. It verifies the raw request body with `Stripe-Signature` and `STRIPE_WEBHOOK_SECRET`. It handles completed/async Checkout payments, subscription lifecycle updates, paid subscription invoices, and failed invoices. Event receipts, transaction rows, credit lots, ledger entries, and cached wallet increments are committed in one PostgreSQL transaction. Repeated Stripe event deliveries and repeated invoice/Checkout grants are idempotent.

The endpoint requires these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, and `invoice.payment_failed`.

Persistent billing credits are not yet connected to the local chat route's in-memory demo wallet or direct-provider development mode. Do not treat a visible billing balance as spendable by model requests in this build.
