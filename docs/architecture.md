# Architecture and implementation status

## Current runtime

The repository is a Next.js App Router application. The root route renders the workspace UI. `components/workspace.tsx` owns presentation state and talks to two server routes. `/api/chat` validates a demo prompt, reserves credits from an in-memory wallet, runs the development mock adapter, streams SSE deltas, and settles estimated mock usage. `/api/overview` returns the current demo wallet and usage snapshot.

The mock routes are guarded by `getDemoStore()`: they return unavailable when `NODE_ENV=production` or `AI_PROVIDER_MODE` is not exactly `mock`. The seeded demo balance and ledger are process-local and are not a substitute for persisted accounting.

## Domain boundaries

- `lib/ai/catalog.ts`: explicitly simulated catalog entries and mock response generation.
- `lib/credits/accounting.ts`: integer pricing, lot precedence, reservation, settlement, release, and an append-only in-memory event ledger.
- `lib/server/demo-store.ts`: local demonstration state, request history, and the development-only feature gate.
- `db/schema.ts` and `db/migrations`: PostgreSQL tables for users, organizations, plans, subscriptions, model/provider eligibility, versioned rate cards, credit accounts/lots, usage, reservations, ledger, payment event idempotency, API-key hashes, conversations, and audit records.

The PostgreSQL schema is a foundation only. There is no production repository/service layer connecting the chat route to PostgreSQL, no authentication implementation, and no worker or webhook processor. In production, these gaps must be completed before enabling access.

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
| PostgreSQL / Drizzle schema and initial migration | Included; not connected or executed |
| Authentication, sessions, email verification | Not implemented |
| Real providers and authoritative usage reconciliation | Not implemented; commercial review pending |
| Stripe subscriptions, checkout, webhooks, top-ups | Not implemented |
| Durable queue, API keys, organizations, file processing | Schema/UI foundations only or not implemented |
| Public marketing/legal pages and admin console | Not implemented |
