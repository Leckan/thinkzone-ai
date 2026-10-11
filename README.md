# Think Zone AI

Think Zone AI is an early, local-only product slice for a multi-model AI workspace. It includes an interactive dashboard, a streaming development mock chat, integer credit pricing, a reservation and settlement ledger, a PostgreSQL/Drizzle schema, and accounting unit tests.

**This is not ready for customers or public deployment.** The app has a development-only direct provider path, but no authentication, connected PostgreSQL database, payment processor, persistent conversations, production credit service, durable provider usage, or cost reconciliation. Its mock wallet and usage live in server memory and reset when the local server restarts.

## Local development

Prerequisites: Node.js 20.9 or newer and npm. The checked workspace used Node 22.18.0. Dependency installation needs a package registry connection unless packages are already cached.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The local mock adapter is enabled by `AI_PROVIDER_MODE=mock`; it is disabled in production even if that variable is set. Requests are labeled simulated and use a development-only sample rate card. They do not reach an external provider and do not create a payment or a real bill.

To use your provider accounts locally, set `AI_PROVIDER_MODE=provider-dev` in `.env` and restart the server. The app discovers text models for configured OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek, Groq, and xAI keys. Submitting a prompt sends it to the selected provider, which bills the account behind that key. This path does not reserve or deduct Think Zone credits, calculate a platform charge, or persist transcripts or usage. It is disabled in production.

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

The configured Think Zone PostgreSQL database was verified empty and the included migrations were applied. The local chat and wallet routes still do not use PostgreSQL; authentication and transactional wallet services are not implemented. Do not infer runtime database readiness from the schema or migration status.

## Local demo behavior

- `/api/overview` returns sample wallet and usage data only in non-production development mode.
- `/api/chat` in mock mode accepts only the two development mock model IDs, reserves a conservative amount, streams a visibly simulated answer, estimates token counts from character length, settles sample credits, and updates the session ledger.
- In `provider-dev` mode, `/api/models` discovers models for configured providers and `/api/chat` streams a direct provider response. Provider-returned token usage is displayed when available; the provider account is billed directly and the Think Zone demo wallet is bypassed.
- Reservations are released when the local stream is canceled or fails.
- The ledger uses integer credit atoms. `1 TZC = 1,000 atoms`; for the example pricing conversion, one atom represents `$0.000001` of customer charge.
- The demo wallet is in-memory only. It is not safe for multiple processes, persistence, or real customer balances.
- Conversation messages stay in browser memory and disappear when the page reloads.
- Subscription, top-up, API-key, organization, file, admin, and real provider flows are not enabled.

## Environment variables

See [.env.example](.env.example). `AI_PROVIDER_MODE=mock` runs the local simulation; `AI_PROVIDER_MODE=provider-dev` enables direct local model calls. The development catalog fetches provider model lists when the app opens, and inference happens only after a prompt is submitted. `DATABASE_URL`, `REDIS_URL`, authentication, payment, storage, and observability entries are not used by the current runtime. Never put credentials in `NEXT_PUBLIC_*` variables.

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
