# Authentication

## Email/password and Google account access

The app uses Better Auth with the existing PostgreSQL and Drizzle database. Users can create an account and sign in with an email address and password (8–128 characters), or use Google OAuth when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured. `AUTH_SECRET` signs and encrypts auth data. OAuth access, refresh, and ID tokens are encrypted before storage in the auth accounts table.

Configure a Google OAuth Web application and register this authorized redirect URI for the origin running the app:

```text
http://localhost:3000/api/auth/callback/google
```

For another local port, register that exact URI as well (for example, `http://localhost:3301/api/auth/callback/google`). Set `BETTER_AUTH_URL` to pin the base URL if needed; otherwise local development resolves the request origin from an allowlist limited to localhost and 127.0.0.1. Only Google accounts with a verified email are accepted.

The public landing page is at `/`. `/sign-up` creates email/password accounts and signs the user in; duplicate email addresses receive a clear message with a link to `/sign-in`. Google OAuth creates an account on the first successful sign-in. Google sign-in does not automatically link to an unverified password account, so existing Google users should continue using Google. The workspace at `/workspace` redirects visitors without an active account to `/sign-in`. Chat, model catalog, overview, saved-conversation, and billing APIs require an active authenticated user. Better Auth endpoints and the Stripe webhook remain public for authentication and payment callbacks.

Email/password accounts are not email-verified because no mail delivery service is configured. Password reset by email is also unavailable until one is configured. Users should use an address they control and keep their password safe.

The workspace header provides account and sign-out controls. Both the local mock and direct provider development modes require a valid active session. Saved conversations and billing records are scoped to the signed-in user's database identity.

## Current limits

Google sign-in persists identity and session records. It does not create a subscription or grant credits. The mock wallet remains process-local, while saved conversations and billing records are account-scoped. Production inference is disabled and production security controls remain incomplete.
