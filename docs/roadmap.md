# Roadmap and limitations

## Highest priority before private beta

1. Complete account lifecycle, route-level authorization, tenant isolation, and production security controls.
2. Connect persistent credit lots to inference with transactional account/lot locking, reservations, settlements, reconciliation, and idempotency.
3. Complete provider commercial review, implement one provider adapter, freeze verified rate cards, and reconcile authoritative usage.
4. Validate Stripe test mode, portal price mapping, failed-payment behavior, and event retries; add refunds and credit reversals.
5. Add request logs, automatic transcript retention/export controls, rate limiting, security-header review, and operational logging. Account-scoped saved conversations with explicit save and user deletion are implemented; provider request/usage logs and automatic retention are still pending.
6. Add database, provider, webhook, concurrency, and browser end-to-end tests.
7. Build admin tools, real plan/package management, and a production API-key flow only after the financial core is reliable.

## Explicitly out of scope for this slice

Multi-model compare, intelligent routing, file uploads, team invitations, SSO, organization budgets, developer API keys, public legal/marketing pages, and admin screens. Stripe Checkout and basic subscription/top-up credit grants now exist, but are not production-ready until persistent wallet inference and refund paths are connected.
