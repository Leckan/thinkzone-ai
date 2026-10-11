# Database

## PostgreSQL and Drizzle

`db/schema.ts` defines the PostgreSQL schema and `drizzle.config.ts` points Drizzle Kit at `db/migrations`. Important tables include users and Better Auth sessions/accounts/verification records, organizations and memberships, plans and credit packages, subscriptions, credit accounts and lots, providers, model catalog, rate cards, usage requests, reservations and lot allocations, immutable credit ledger entries, payment events and transaction history, conversations, messages, developer API-key hashes, and audit logs. Plan rows retain the Stripe Product and Price IDs created for recurring checkout; user credit accounts retain their Stripe customer ID.

The ledger references request, lot, or payment records where applicable. A unique account/idempotency key prevents duplicate usage requests; unique provider event IDs prevent duplicate payment-event processing; unique lot grant references prevent repeated lot creation. Payment transactions snapshot the expected top-up credits and amount so later catalog edits do not change an in-flight checkout. Rate cards carry a model/version and effective time. Model availability and provider commercial approval are separate fields; the schema prevents enabling a provider without an approved status.

Saved conversations use the existing `conversations` and `messages` tables. A transcript is written only after the user explicitly saves it. Conversation API queries scope rows to the active user's ID; messages cascade when the conversation is deleted. Provider-development requests load a bounded recent message context after checking ownership and archive state.

`credit_accounts.cached_available_atoms` and `cached_reserved_atoms` are snapshots only. A production balance check must lock the account and eligible lots in a single transaction, derive spendable balance from remaining lots less reservations, write allocations and ledger rows, and update snapshots in the same transaction. The database schema alone does not implement those transactions.

## Credit source order

The application policy is promotional credits first, then subscription credits, then purchased credits. Lots with an earlier expiry should be consumed before non-expiring lots within a source. The demo ledger enforces the source order in `lib/credits/accounting.ts`. A production SQL service must use the same ordering while holding row locks.

## Migrations

The configured database was checked read-only before its initial migration: it matched the Think Zone project and had no application tables. Migrations `0000` through `0005` are now applied, including Better Auth tables, payment transaction history, Stripe customer and price references, and credit grant snapshots.

Google OAuth users and sessions, billing records, and explicitly saved conversation transcripts use PostgreSQL. Unstored chats and the overview wallet remain in browser memory and process-local development state respectively; provider usage and wallet accounting are not persisted. Conversation persistence uses existing migration `0000`, so the feature adds no migration. To generate and apply later schema changes against the configured database:

```bash
export DATABASE_URL='postgres://user:password@host:5432/think_zone_ai'
npm run db:generate
npm run db:migrate
```

Review generated SQL and take a backup before applying migrations to a non-disposable database. Production schema changes require a rollout and rollback plan.

`db/seeds/development.sql` contains inactive sample plans/top-ups and disabled local-mock catalog rows for a disposable development database. Migration `0003` inserts the initial database-backed Starter/Pro/Power plans and top-up packages, and activates matching development-seed rows without replacing customized prices. These amounts are initial product hypotheses, not provider rates or a live-mode approval. Run development seeds manually only after confirming the database is a development target. It creates no users, payment events, provider credentials, or fake usage.
