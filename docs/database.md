# Database

## PostgreSQL and Drizzle

`db/schema.ts` defines the initial PostgreSQL schema and `drizzle.config.ts` points Drizzle Kit at `db/migrations`. Important tables include users, organizations and memberships, plans and credit packages, subscriptions, credit accounts and lots, providers, model catalog, rate cards, usage requests, reservations and lot allocations, immutable credit ledger entries, payment events, conversations, messages, developer API-key hashes, and audit logs.

The ledger references request, lot, or payment records where applicable. A unique account/idempotency key prevents duplicate usage requests; unique provider event IDs prevent duplicate payment-event processing; unique lot grant references prevent repeated lot creation. Rate cards carry a model/version and effective time. Model availability and provider commercial approval are separate fields; the schema prevents enabling a provider without an approved status.

`credit_accounts.cached_available_atoms` and `cached_reserved_atoms` are snapshots only. A production balance check must lock the account and eligible lots in a single transaction, derive spendable balance from remaining lots less reservations, write allocations and ledger rows, and update snapshots in the same transaction. The database schema alone does not implement those transactions.

## Credit source order

The application policy is promotional credits first, then subscription credits, then purchased credits. Lots with an earlier expiry should be consumed before non-expiring lots within a source. The demo ledger enforces the source order in `lib/credits/accounting.ts`. A production SQL service must use the same ordering while holding row locks.

## Migrations

A remote `DATABASE_URL` was configured, but it did not identify a Think Zone database and a read-only catalog check could not connect. Migrations were not run. Use an explicitly provisioned Think Zone development database:

```bash
export DATABASE_URL='postgres://user:password@host:5432/think_zone_ai'
npm run db:generate
npm run db:migrate
```

Review generated SQL and take a backup before applying migrations to a non-disposable database. Production schema changes require a rollout and rollback plan.

`db/seeds/development.sql` contains inactive sample plans/top-ups and disabled local-mock catalog rows for a disposable development database. Run it manually only after confirming the database is a development target. It creates no users, payment events, provider credentials, or fake usage.
