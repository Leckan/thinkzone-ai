# Roadmap and limitations

## Highest priority before private beta

1. Choose and implement an authentication provider, account lifecycle, secure sessions, and server-side authorization.
2. Provision PostgreSQL; execute and review migrations; implement transactional credit account/lot locking, reservations, settlements, idempotency, and append-only journal writes.
3. Complete provider commercial review, implement one provider adapter, freeze verified rate cards, and reconcile authoritative usage.
4. Integrate Stripe test mode with signed webhook verification and idempotent subscription/top-up credit grants.
5. Add durable conversation persistence, request logs, retention/deletion controls, rate limiting, security headers, and operational logging.
6. Add database, provider, webhook, concurrency, and browser end-to-end tests.
7. Build admin tools, real plan/package management, and a production API-key flow only after the financial core is reliable.

## Explicitly out of scope for this slice

Real AI providers, multi-model compare, intelligent routing, file uploads, team invitations, SSO, organization budgets, subscriptions, top-ups, invoices, developer API keys, public legal/marketing pages, and admin screens.
