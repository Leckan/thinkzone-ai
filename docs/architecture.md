# Architecture and implementation status

## Current runtime

The repository is a Next.js App Router application. The root route renders the workspace UI. `components/workspace.tsx` owns presentation state and talks to the model, chat, and overview routes. Better Auth handles Google OAuth and PostgreSQL-backed user/session records; the direct provider development chat route requires a valid session. In mock mode, `/api/chat` reserves credits from an in-memory wallet, streams a simulated response, and settles estimated mock usage. In direct provider development mode, `/api/models` discovers configured text models and `/api/chat` uses AI SDK provider adapters to stream provider responses and returns provider-reported token usage when available.

The mock routes are guarded by `getDemoStore()`: they return unavailable when `NODE_ENV=production` or `AI_PROVIDER_MODE` is not exactly `mock`. Direct provider development routes also return unavailable in production. That path bypasses the mock wallet and does not persist usage or calculate actual provider cost. The seeded demo balance and ledger are process-local and are not a substitute for persisted accounting.

## Domain boundaries

- `lib/ai/catalog.ts`: explicitly simulated catalog entries and mock response generation.
- `lib/credits/accounting.ts`: integer pricing, lot precedence, reservation, settlement, release, and an append-only in-memory event ledger.
- `lib/server/demo-store.ts`: local demonstration state, request history, and the development-only feature gate.
- `lib/auth.ts` and `app/api/auth/[...all]/route.ts`: Google OAuth, encrypted OAuth-token storage, and session handling with Better Auth.
- `db/schema.ts` and `db/migrations`: PostgreSQL tables for auth and users, organizations, plans, subscriptions, model/provider eligibility, versioned rate cards, credit accounts/lots, usage, reservations, ledger, payment event idempotency, API-key hashes, conversations, and audit records.

PostgreSQL stores Google auth, billing records, and user-opted-in conversation transcripts. Conversation routes bind every read and write to the active user's ID. In provider-development mode, a saved conversation's recent user/assistant messages become request context; unsaved chats pass bounded browser-held history. The chat route still has no production repository/service layer connecting inference to the persistent wallet, and no background worker. These gaps must be completed before enabling customer access.

## Data and request path

```text
Browser -> POST /api/chat -> input validation -> demo model lookup
       -> in-memory credit reservation -> simulated streamed response
       -> mock usage calculation -> settlement -> demo overview refresh
```

The production design should replace the local store with one database transaction that locks the credit account and eligible lots, checks spendable balance, creates the request/reservation/allocations, and commits before provider submission. Settlement, release, payment event handling, and credit grants must each be idempotent database transactions.

## Current feature status

| Capability | Status |
|---|---|
| Responsive workspace, dashboard, local chat, model selector, usage view | Implemented for local demo |
| Streaming response UX and cancellation | Implemented for local mock only |
| Integer credit pricing and lot-order ledger | Implemented and unit tested in memory |
| PostgreSQL / Drizzle schema and migrations | Applied to the configured Think Zone database; auth and billing data use PostgreSQL while chat usage remains in memory |
| Google OAuth, sessions, verified-email check | Implemented with Better Auth and PostgreSQL; billing routes bind sessions to user-owned credit accounts |
| Stripe hosted subscriptions, top-ups, Billing Portal, signed webhook grants | Implemented as a billing foundation; requires test-mode checkout validation and Stripe Portal configuration |
| Direct local adapters for OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek, Groq, and xAI | Implemented for development; provider-account billing only |
| Explicitly saved conversations, account-scoped history, rename/archive/restore/delete | Implemented using existing conversation tables; users opt in before transcripts are stored |
| Account-scoped rate limits for provider chat and conversation writes | Implemented with atomic PostgreSQL fixed-window counters; production network-level abuse controls and monitoring remain pending |
| Persistent provider usage, actual cost calculation, and reconciliation | Not implemented; commercial review and verified rate cards pending |
| Persistent-wallet inference, refunds, automatic tax, and payment disputes | Not implemented |
| Durable queue, API keys, organizations, file processing | Schema/UI foundations only or not implemented |
| Public marketing/legal pages and admin console | Not implemented |
