# Deployment

## Current status

This repository is a local development demo with a Stripe billing foundation. Do not deploy it for customer use. Production builds disable mock and direct-provider API modes. Stripe checkout and webhooks can persist payment transactions and credit grants, but production inference does not spend that persistent wallet and the app is not a production SaaS.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `AI_PROVIDER_MODE=mock` for the local simulation or `AI_PROVIDER_MODE=provider-dev` to send local chat requests to configured provider APIs. Both modes check that `NODE_ENV` is not `production`. Email/password sign-up uses the existing PostgreSQL database, `AUTH_SECRET`, and Better Auth. To enable Google OAuth as well, configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and register the current app origin plus `/api/auth/callback/google` as an authorized redirect URI in Google Cloud Console. `BETTER_AUTH_URL` can pin the auth origin; otherwise local development accepts localhost ports and uses the request origin. Provider development mode requires an active user session but is not a production gateway: it lacks database-backed reservations, durable usage and cost records, and commercial eligibility review.

### Stripe test mode

The billing migrations are applied to the configured database. Set `APP_URL` to the exact local origin used by the app, then use Stripe **test mode** keys for `STRIPE_SECRET_KEY`. Live Stripe secret keys are refused outside `NODE_ENV=production`. Run `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`; copy the CLI's endpoint signing secret into `STRIPE_WEBHOOK_SECRET` and restart Next.js. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is not required for hosted Checkout; the app redirects to the Checkout URL returned by the server and does not load Stripe.js.

For a Dashboard-managed webhook, use `{APP_URL}/api/webhooks/stripe` and enable `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, and `invoice.payment_failed`. Configure the Stripe Customer Portal separately. Products and recurring Prices for active plans are created from their PostgreSQL records when a subscription Checkout starts; enable those products in Portal settings if plan changes are configured. Keep plan switching disabled until you have validated the configured portal prices and credit policy.

## Production prerequisites

Before deployment, connect persistent wallet reservations and settlements to inference, add migration rollout and backup plans, obtain provider commercial approval, implement authoritative usage and cost reconciliation, add refund and tax handling, strengthen authorization and tenant isolation, add rate limiting and monitoring, and verify data deletion/retention. Run Stripe test-mode Checkout and webhook tests before any production payment. The current direct provider adapters are development-only. Configure server-only secrets in the deployment environment; do not store them in git or browser variables.

The app has no production secrets in `.env.example`. OAuth, database, Stripe, provider, Redis, object storage, and observability variables are placeholders only. There are no backup/restore or rollback scripts yet.
