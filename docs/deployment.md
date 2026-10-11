# Deployment

## Current status

This repository is a local development demo. Do not deploy it for customer use. Production builds disable mock and direct-provider API modes. Google OAuth can create durable user and session records, but the app is not a production SaaS.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `AI_PROVIDER_MODE=mock` for the local simulation or `AI_PROVIDER_MODE=provider-dev` to send local chat requests to configured provider APIs. Both modes check that `NODE_ENV` is not `production`. For Google OAuth, configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, and `DATABASE_URL`. Register the current app origin plus `/api/auth/callback/google` as an authorized redirect URI in Google Cloud Console. `BETTER_AUTH_URL` can pin the auth origin; otherwise local development accepts localhost ports and uses the request origin. Provider development mode requires a Google session but is not a production gateway: it lacks database-backed reservations, durable usage and cost records, and commercial eligibility review.

## Production prerequisites

Before deployment, implement and verify authentication, PostgreSQL-backed transactional wallet operations, migration rollout and backup plans, provider commercial approval, persistent authoritative usage and cost reconciliation, Stripe test-mode checkout and verified webhooks, authorization and tenant isolation, rate limiting, operational monitoring, and data deletion/retention. The current direct provider adapters are development-only. Configure server-only secrets in the deployment environment; do not store them in git or browser variables.

The app has no production secrets in `.env.example`. OAuth, database, Stripe, provider, Redis, object storage, and observability variables are placeholders only. There are no backup/restore or rollback scripts yet.
