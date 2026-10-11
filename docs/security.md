# Security and privacy status

## Current controls

- Provider and payment secrets are not included in the repository.
- Google OAuth credentials and the auth signing secret are read server-side. Google sign-in requires a verified email, and Google-backed user/session records are stored in PostgreSQL.
- Direct provider inference requires a valid Google-authenticated session in addition to remaining disabled in production. Model catalog discovery does not require a session and sends no prompts.
- The mock inference and overview routes only operate in non-production when `AI_PROVIDER_MODE=mock` is explicitly set.
- Direct provider calls and model discovery only operate in non-production when `AI_PROVIDER_MODE=provider-dev` is explicitly set. The browser cannot access provider keys; inference requests require a valid Google session and are sent from the server. This path has no rate limiting, persistent usage log, or Think Zone credit controls and must not be exposed to untrusted users.
- The mock chat request is schema validated and length limited server-side.
- Billing routes require a Google-authenticated account with active status. Checkout requests carry only database keys and idempotency IDs; plan prices and credit amounts are read server-side.
- Stripe webhooks verify the raw request body against `Stripe-Signature`. Payment side effects run in a PostgreSQL transaction, and event IDs, invoice/Checkout grant references, and ledger idempotency keys prevent duplicate credit grants.
- Stripe secret and webhook signing keys are server-only. Hosted Checkout redirects to a Stripe URL; the app does not expose secrets to browser code.
- The request model ID is checked against a hardcoded development mock catalog; the client cannot supply a rate card or credit amount.
- The demo reserves credits before generating the response and releases the reservation if the stream is canceled or fails.
- The Next.js app sends a restrictive baseline CSP and common browser security headers; review the policy against a real deployment before adding external assets or scripts.
- Prompt text is not written to the console or a database. The local in-memory usage view retains a short prompt preview until the server restarts.
- The production security posture is not established; the UI is a development preview and should not be publicly deployed.

## Not implemented

Persistent wallet spending and reservations for production inference, tenant isolation in non-billing request handlers, rate limiting, distributed locking for usage operations, API-key hashing/revocation routes, file scanning/storage, durable application audit trail, retention/deletion controls, CSP/security headers review, and incident response. Refund-driven credit reversals and payment dispute handling are also not implemented. Google OAuth and Stripe webhooks provide the listed controls; they do not make the full product production-ready.

Before production, extend server-side authorization to every sensitive route, connect persistent wallet spending to inference, add privacy disclosures, provider-specific data controls, rate limiting, secret management, and review the security-header policy. Do not claim SOC 2, HIPAA, or other certifications based on this code.
