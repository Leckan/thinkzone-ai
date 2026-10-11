# Think Zone AI

Think Zone AI is an early, local-only product slice for a multi-model AI workspace. It includes an interactive dashboard, a streaming development mock chat, integer credit pricing, a reservation and settlement ledger, a PostgreSQL/Drizzle schema, and accounting unit tests.

**This is not ready for customers or public deployment.** The current app has no authentication, connected PostgreSQL database, payment processor, real AI provider, persistent conversations, or production credit service. Its sample wallet and usage live in server memory and reset when the local server restarts.

## Local development

Prerequisites: Node.js 20.9 or newer and npm. The checked workspace used Node 22.18.0. Dependency installation needs a package registry connection unless packages are already cached.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The local mock adapter is enabled by `AI_PROVIDER_MODE=mock`; it is disabled in production even if that variable is set. Requests are labeled simulated and use a development-only sample rate card. They do not reach an external provider and do not create a payment or a real bill.

## Commands

```bash
npm run dev        # local development server
npm run typecheck  # strict TypeScript check
npm run lint       # Next.js ESLint checks
npm test           # credit-pricing and ledger tests
npm run build      # production build
```

Database commands require a configured PostgreSQL database:

```bash
npm run db:generate
npm run db:migrate
```

The schema and migration files establish a production-oriented foundation, but no database server was available during this build. The local demo routes do not use PostgreSQL. Do not infer database readiness from the mock wallet working.

## Local demo behavior

- `/api/overview` returns sample wallet and usage data only in non-production development mode.
- `/api/chat` accepts only the two development mock model IDs, applies input validation, reserves a conservative amount, streams a visibly simulated answer, estimates token counts from character length, settles sample credits, and updates the session ledger.
- Reservations are released when the local stream is canceled or fails.
- The ledger uses integer credit atoms. `1 TZC = 1,000 atoms`; for the example pricing conversion, one atom represents `$0.000001` of customer charge.
- The demo wallet is in-memory only. It is not safe for multiple processes, persistence, or real customer balances.
- Conversation messages stay in browser memory and disappear when the page reloads.
- Subscription, top-up, API-key, organization, file, admin, and real provider flows are not enabled.

## Environment variables

See [.env.example](.env.example). Only `AI_PROVIDER_MODE=mock` is used by the current app, and only during local development. `DATABASE_URL` is used by Drizzle migration tooling when configured; it is not used by the demo runtime. The other entries are reserved for future integrations and are not wired up. Never put credentials in `NEXT_PUBLIC_*` variables.

## Read next

- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [Billing and credits](docs/billing-and-credits.md)
- [Provider compliance](docs/provider-compliance.md)
- [Security](docs/security.md)
- [API](docs/api.md)
- [Deployment](docs/deployment.md)
- [Testing](docs/testing.md)
- [Roadmap](docs/roadmap.md)
