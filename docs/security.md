# Security and privacy status

## Current controls

- Provider and payment secrets are not included in the repository.
- Google OAuth credentials and the auth signing secret are read server-side. Google sign-in requires a verified email, and Google-backed user/session records are stored in PostgreSQL.
- The public landing and Google OAuth pages are separate from the protected `/workspace` route. The workspace redirects visitors without an active Google-authenticated session to `/sign-in`.
- The mock inference and overview routes only operate in non-production when `AI_PROVIDER_MODE=mock` is explicitly set and require an active account.
- Direct provider calls and model discovery only operate in non-production when `AI_PROVIDER_MODE=provider-dev` is explicitly set. The browser cannot access provider keys; inference and model requests require a valid active Google session and are sent from the server. This path has no persistent usage log or Think Zone credit controls and must not be exposed to untrusted users.
- The mock chat request is schema validated and length limited server-side.
- Billing routes require a Google-authenticated account with active status. Checkout requests carry only database keys and idempotency IDs; plan prices and credit amounts are read server-side.
- Saved-conversation routes require an active Google-authenticated user, scope queries and mutations by the session user's database ID, validate bounded message/title input, and mark responses private and `no-store`. Transcripts are written only after an explicit Save action; account owners can archive or permanently delete them.
- Direct provider-development chat is limited to 10 requests per account per minute. Conversation saves, message appends, and management mutations have separate account-scoped limits. PostgreSQL upserts update the fixed-window counters atomically; the provider request fails closed with `503` if the limiter cannot be checked.
- Stripe webhooks verify the raw request body against `Stripe-Signature`. Payment side effects run in a PostgreSQL transaction, and event IDs, invoice/Checkout grant references, and ledger idempotency keys prevent duplicate credit grants.
- Stripe secret and webhook signing keys are server-only. Hosted Checkout redirects to a Stripe URL; the app does not expose secrets to browser code.
- The request model ID is checked against a hardcoded development mock catalog; the client cannot supply a rate card or credit amount.
- The demo reserves credits before generating the response and releases the reservation if the stream is canceled or fails.
- The Next.js app sends a restrictive baseline CSP and common browser security headers; review the policy against a real deployment before adding external assets or scripts.
- Unstored prompt text is not written to the console or database. Explicitly saved transcripts are stored in PostgreSQL with the account's conversations and messages; provider requests include recent messages from that saved transcript as context. There is no automatic retention schedule or audit log for transcript access.
- The local in-memory usage view retains a short prompt preview until the server restarts.
- The production security posture is not established; the UI is a development preview and should not be publicly deployed.

## Not implemented

Persistent wallet spending and reservations for production inference, IP/network-level abuse controls, rate-limit policy tuning and monitoring, distributed locking for usage operations, API-key hashing/revocation routes, file scanning/storage, durable application audit trail, automatic transcript retention, CSP/security headers review, and incident response. User-triggered transcript deletion exists, but automated retention, export, and deletion from provider-side records are not implemented. Refund-driven credit reversals and payment dispute handling are also not implemented. Google OAuth and Stripe webhooks provide the listed controls; they do not make the full product production-ready.

Before production, connect persistent wallet spending to inference, add privacy disclosures, provider-specific data controls, network-level rate limits and monitoring, secret management, and review the security-header policy. Do not claim SOC 2, HIPAA, or other certifications based on this code.
