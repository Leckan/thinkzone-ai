# Security and privacy status

## Current controls

- Provider and payment secrets are not included in the repository.
- The mock inference and overview routes only operate in non-production when `AI_PROVIDER_MODE=mock` is explicitly set.
- Direct provider calls and model discovery only operate in non-production when `AI_PROVIDER_MODE=provider-dev` is explicitly set. The browser cannot access provider keys; requests are sent from the server. This path has no authentication, rate limiting, persistent usage log, or Think Zone credit controls and must not be exposed to untrusted users.
- The mock chat request is schema validated and length limited server-side.
- The request model ID is checked against a hardcoded development mock catalog; the client cannot supply a rate card or credit amount.
- The demo reserves credits before generating the response and releases the reservation if the stream is canceled or fails.
- The Next.js app sends a restrictive baseline CSP and common browser security headers; review the policy against a real deployment before adding external assets or scripts.
- Prompt text is not written to the console or a database. The local in-memory usage view retains a short prompt preview until the server restarts.
- The production security posture is not established; the UI is a development preview and should not be publicly deployed.

## Not implemented

Authentication and authorization, tenant isolation in request handlers, CSRF/session protections, rate limiting, distributed locking, provider secret management, payment webhook signature verification, API-key hashing/revocation routes, file scanning/storage, durable audit trail, retention/deletion controls, CSP/security headers review, and incident response.

Before production, add secure sessions and server-side authorization to every sensitive route, privacy disclosures, provider-specific data controls, rate limiting, webhook signature validation, secret management, and a reviewed security-header policy. Do not claim SOC 2, HIPAA, or other certifications based on this code.
