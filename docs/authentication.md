# Authentication

## Google OAuth for local development

The app uses Better Auth with the existing PostgreSQL and Drizzle database. Google OAuth is configured with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; `AUTH_SECRET` signs and encrypts auth data. OAuth access, refresh, and ID tokens are encrypted before storage in the auth accounts table.

Configure a Google OAuth Web application and register this authorized redirect URI for the origin running the app:

```text
http://localhost:3000/api/auth/callback/google
```

For another local port, register that exact URI as well (for example, `http://localhost:3301/api/auth/callback/google`). Set `BETTER_AUTH_URL` to pin the base URL if needed; otherwise local development resolves the request origin from an allowlist limited to localhost and 127.0.0.1. Only Google accounts with a verified email are accepted.

The workspace header provides sign-in and sign-out controls. Direct provider inference in `provider-dev` mode requires a valid Google session. The mock demo remains available without signing in and uses only its in-memory sample wallet.

## Current limits

Google sign-in persists identity and session records. It does not create a subscription, grant credits, persist conversations, or enable customer billing. The mock wallet is not tied to the authenticated user. Production authorization and tenant isolation remain incomplete, and production inference is disabled.
