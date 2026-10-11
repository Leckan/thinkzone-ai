# Deployment

## Current status

This repository is a local development demo. Do not deploy it for customer use. Production builds disable both demo API routes, but the app has no login or durable account data and is not a production SaaS.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `AI_PROVIDER_MODE=mock` only for local development. The demo routes also check that `NODE_ENV` is not `production`.

## Production prerequisites

Before deployment, implement and verify authentication, PostgreSQL-backed transactional wallet operations, migrations and a backup plan, provider approval and real adapters, authoritative usage reconciliation, Stripe test-mode checkout and verified webhooks, authorization and tenant isolation, rate limiting, operational monitoring, and data deletion/retention. Configure server-only secrets in the deployment environment; do not store them in git or browser variables.

The app has no production secrets in `.env.example`. `DATABASE_URL`, `AUTH_SECRET`, Stripe credentials, provider keys, Redis, object storage, and observability variables are placeholders only. There are no backup/restore or rollback scripts yet.
