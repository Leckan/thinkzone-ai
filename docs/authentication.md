# Authentication

## Google OAuth and account access

The app uses Better Auth with the existing PostgreSQL and Drizzle database. Google OAuth is configured with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; `AUTH_SECRET` signs and encrypts auth data. OAuth access, refresh, and ID tokens are encrypted before storage in the auth accounts table.

Configure a Google OAuth Web application and register this authorized redirect URI for the origin running the app:

```text
http://localhost:3000/api/auth/callback/google
```

For another local port, register that exact URI as well (for example, `http://localhost:3301/api/auth/callback/google`). Set `BETTER_AUTH_URL` to pin the base URL if needed; otherwise local development resolves the request origin from an allowlist limited to localhost and 127.0.0.1. Only Google accounts with a verified email are accepted.

The public landing page is at `/`. `/sign-in` and `/sign-up` both use Google OAuth; a first successful sign-in creates the account, and subsequent sign-ins return to the same account. The workspace at `/workspace` redirects visitors without an active account to `/sign-in`. Chat, model catalog, overview, saved-conversation, and billing APIs also require an active Google-authenticated user. Better Auth endpoints and the Stripe webhook remain public for OAuth and payment callbacks.

The workspace header provides account and sign-out controls. Both the local mock and direct provider development modes require a valid active session. Saved conversations and billing records are scoped to the signed-in user's database identity.

## Current limits

Google sign-in persists identity and session records. It does not create a subscription or grant credits. The mock wallet remains process-local, while saved conversations and billing records are account-scoped. Production inference is disabled and production security controls remain incomplete.
