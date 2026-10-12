# Think Zone AI

Think Zone AI is a product of Think Zone LLC, a Washington State registered company. It is an early product slice for a multi-model AI workspace with an interactive dashboard, a streaming development mock chat, integer credit pricing, a reservation and settlement ledger, email/password and Google sign-in, PostgreSQL/Drizzle persistence, and a Stripe Checkout/webhook billing foundation.

**This is not ready for customers or public deployment.** Stripe can create subscription and top-up Checkout sessions, synchronize subscription status, and grant persistent credits through signed, idempotent webhook events. However, the local chat wallet remains in-memory and the direct provider path is development-only; inference does not spend the persistent billing balance. Do not enable live payments until persistent usage accounting, provider approvals, refund handling, and production authorization are complete.

## Local development

Prerequisites: Node.js 20.9 or newer and npm. The checked workspace used Node 22.18.0. Dependency installation needs a package registry connection unless packages are already cached.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public landing page. Choose **Sign in** or **Get started** to use an email address and password, or choose Google when Google OAuth is configured. Email/password accounts are allowed and do not require email verification because no email delivery service is configured; use an address you control. Sign-up asks for a name, email, and password of 8–128 characters, then signs the user in. If the email already has an account, the page links back to sign-in. Password reset is not available yet. The first successful Google sign-in creates an account, and Google requires a provider-verified email. To add Google to an existing password account, sign in with the password first, then connect Google from Workspace Settings; same-email accounts are not linked automatically. The workspace at `/workspace` and its account APIs require an active signed-in account. The local mock adapter is enabled by `AI_PROVIDER_MODE=mock`; it is disabled in production even if that variable is set. Requests are labeled simulated and use a development-only sample rate card. They do not reach an external provider and do not create a payment or a real bill.

Email/password sign-in and sign-up use `AUTH_SECRET` for authentication data and `DATABASE_URL` for account and session records. Google sign-in is an optional additional method; it also uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. In Google Cloud Console, register `{BETTER_AUTH_URL or APP_URL}/api/auth/callback/google` as an authorized redirect URI. Set `BETTER_AUTH_URL` when the app is served from an origin different from `APP_URL` (for example, a non-default local port). The verified-email requirement applies to Google accounts; email/password accounts do not require email verification.

To use your provider accounts locally, set `AI_PROVIDER_MODE=provider-dev` in `.env` and restart the server. Sign in with an email/password account or Google account first. The app discovers text models for configured OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek, Groq, and xAI keys. Submitting a prompt sends it to the selected provider, which bills the account behind that key. This path does not reserve or deduct Think Zone credits, calculate a platform charge, or persist inference usage. Chats stay in browser memory unless you choose **Save conversation**; saved transcripts are stored in your account and can be renamed, archived, restored, or permanently deleted. It is disabled in production.

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

The configured Think Zone PostgreSQL database now has migrations `0000`–`0007` applied. Authentication accounts and sessions, billing records, explicitly saved conversations, feedback submissions, and account-scoped rate-limit buckets use PostgreSQL. Stripe transactions and credit grants use PostgreSQL, but the local chat and wallet routes do not use that persistent balance for usage metering.

## Local demo behavior

- `/api/overview` returns sample wallet and usage data only in non-production development mode and requires an active signed-in account.
- `/api/chat` requires an active signed-in account in both local modes. In mock mode it accepts only the two development mock model IDs, reserves a conservative amount, streams a visibly simulated answer, estimates token counts from character length, settles sample credits, and updates the session ledger.
- In `provider-dev` mode, `/api/models` discovers models for configured providers and `/api/chat` streams a direct provider response for the signed-in account. Provider-returned token usage is displayed when available; the provider account is billed directly and the Think Zone demo wallet is bypassed.
- Reservations are released when the local stream is canceled or fails.
- The ledger uses integer credit atoms. `1 TZC = 1,000 atoms`; for the example pricing conversion, one atom represents `$0.000001` of customer charge.
- The demo wallet is in-memory only. It is not safe for multiple processes, persistence, or real customer balances.
- Unstored conversation messages stay in browser memory and disappear when the page reloads. Choosing Save writes the transcript to the signed-in account's PostgreSQL records; saved conversations can be deleted from the Conversations page.
- Subscription and top-up checkout require Stripe test credentials, a migrated PostgreSQL database, an authenticated account (email/password or Google), and the configured webhook. Stripe credits are persistent but are not spent by this local chat build.
- API-key, organization, file, admin, refunds, and production inference flows are not enabled.

## Environment variables

See [.env.example](.env.example). `AI_PROVIDER_MODE=mock` runs the local simulation; `AI_PROVIDER_MODE=provider-dev` enables direct local model calls. Both email/password authentication and Google OAuth use `AUTH_SECRET` and `DATABASE_URL`; Google additionally uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and `BETTER_AUTH_URL` can override the base URL derived from `APP_URL`. Stripe billing uses server-side `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `APP_URL`. Hosted Checkout redirects to Stripe's URL; `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is reserved for a future embedded Elements flow and is not read by the current runtime. Never put secret credentials in `NEXT_PUBLIC_*` variables.

## Read next

- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [Billing and credits](docs/billing-and-credits.md)
- [Provider compliance](docs/provider-compliance.md)
- [Security](docs/security.md)
- [Authentication](docs/authentication.md)
- [API](docs/api.md)
- [Deployment](docs/deployment.md)
- [Testing](docs/testing.md)
- [Roadmap](docs/roadmap.md)
