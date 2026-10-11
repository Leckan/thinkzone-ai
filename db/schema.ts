import {
  bigint, boolean, check, index, integer, jsonb, numeric, pgTable, text, timestamp,
  uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull().default(""),
  displayName: varchar("display_name", { length: 120 }),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  platformRole: varchar("platform_role", { length: 32 }).notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("users_status_check", sql`${table.status} in ('active', 'suspended', 'deleted')`)]);

export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => [index("auth_sessions_user_idx").on(table.userId)]);

export const authAccounts = pgTable("auth_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("auth_accounts_provider_account_uq").on(table.providerId, table.accountId),
  index("auth_accounts_user_idx").on(table.userId),
]);

export const authVerifications = pgTable("auth_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("auth_verifications_identifier_idx").on(table.identifier)]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("organizations_status_check", sql`${table.status} in ('active', 'suspended', 'deleted')`)]);

export const organizationMemberships = pgTable("organization_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 24 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("organization_memberships_org_user_uq").on(table.organizationId, table.userId),
  check("organization_memberships_role_check", sql`${table.role} in ('owner', 'admin', 'member')`),
]);

export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  monthlyPriceCents: integer("monthly_price_cents").notNull(),
  includedCreditAtoms: bigint("included_credit_atoms", { mode: "bigint" }).notNull(),
  stripeProductId: varchar("stripe_product_id", { length: 180 }).unique(),
  stripePriceId: varchar("stripe_price_id", { length: 180 }).unique(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  features: jsonb("features").notNull().default({}),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("subscription_plans_price_nonnegative", sql`${table.monthlyPriceCents} >= 0`),
  check("subscription_plans_credits_nonnegative", sql`${table.includedCreditAtoms} >= 0`),
]);

export const creditPackages = pgTable("credit_packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  creditAtoms: bigint("credit_atoms", { mode: "bigint" }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("credit_packages_price_positive", sql`${table.priceCents} > 0`),
  check("credit_packages_credits_positive", sql`${table.creditAtoms} > 0`),
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => creditAccounts.id),
  planId: uuid("plan_id").notNull().references(() => subscriptionPlans.id),
  paymentCustomerId: varchar("payment_customer_id", { length: 180 }),
  paymentSubscriptionId: varchar("payment_subscription_id", { length: 180 }).unique(),
  status: varchar("status", { length: 24 }).notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("subscriptions_account_idx").on(table.accountId)]);

export const creditAccounts = pgTable("credit_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerType: varchar("owner_type", { length: 24 }).notNull(),
  ownerId: uuid("owner_id").notNull(),
  paymentCustomerId: varchar("payment_customer_id", { length: 180 }).unique(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  cachedAvailableAtoms: bigint("cached_available_atoms", { mode: "bigint" }).notNull().default(sql`0`),
  cachedReservedAtoms: bigint("cached_reserved_atoms", { mode: "bigint" }).notNull().default(sql`0`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("credit_accounts_owner_uq").on(table.ownerType, table.ownerId),
  check("credit_accounts_owner_type_check", sql`${table.ownerType} in ('user', 'organization')`),
  check("credit_accounts_cached_available_nonnegative", sql`${table.cachedAvailableAtoms} >= 0`),
  check("credit_accounts_cached_reserved_nonnegative", sql`${table.cachedReservedAtoms} >= 0`),
]);

export const providers = pgTable("providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  integrationMode: varchar("integration_mode", { length: 32 }).notNull(),
  commercialStatus: varchar("commercial_status", { length: 32 }).notNull().default("pending_review"),
  enabled: boolean("enabled").notNull().default(false),
  complianceNotes: text("compliance_notes"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("providers_commercial_status_check", sql`${table.commercialStatus} in ('pending_review', 'approved', 'rejected', 'suspended')`),
  check("providers_enabled_approved_check", sql`not ${table.enabled} or ${table.commercialStatus} = 'approved'`),
]);

export const modelCatalog = pgTable("model_catalog", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: uuid("provider_id").notNull().references(() => providers.id),
  key: varchar("key", { length: 120 }).notNull().unique(),
  providerModelId: varchar("provider_model_id", { length: 180 }).notNull(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  description: text("description").notNull().default(""),
  capabilities: jsonb("capabilities").notNull().default([]),
  contextTokens: integer("context_tokens"),
  available: boolean("available").notNull().default(false),
  deprecatedAt: timestamp("deprecated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("model_catalog_provider_idx").on(table.providerId)]);

export const rateCards = pgTable("rate_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  modelId: uuid("model_id").notNull().references(() => modelCatalog.id),
  version: integer("version").notNull(),
  inputUsdPerMillion: numeric("input_usd_per_million", { precision: 24, scale: 9 }).notNull(),
  outputUsdPerMillion: numeric("output_usd_per_million", { precision: 24, scale: 9 }).notNull(),
  cachedInputUsdPerMillion: numeric("cached_input_usd_per_million", { precision: 24, scale: 9 }),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  sourceUrl: text("source_url"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("rate_cards_model_version_uq").on(table.modelId, table.version),
  index("rate_cards_effective_idx").on(table.modelId, table.effectiveFrom, table.effectiveTo),
  check("rate_cards_nonnegative_check", sql`${table.inputUsdPerMillion} >= 0 and ${table.outputUsdPerMillion} >= 0`),
]);

export const creditLots = pgTable("credit_lots", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => creditAccounts.id),
  source: varchar("source", { length: 24 }).notNull(),
  originalAtoms: bigint("original_atoms", { mode: "bigint" }).notNull(),
  remainingAtoms: bigint("remaining_atoms", { mode: "bigint" }).notNull(),
  reservedAtoms: bigint("reserved_atoms", { mode: "bigint" }).notNull().default(sql`0`),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  grantReference: varchar("grant_reference", { length: 180 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("credit_lots_account_grant_uq").on(table.accountId, table.grantReference),
  index("credit_lots_available_idx").on(table.accountId, table.expiresAt),
  check("credit_lots_source_check", sql`${table.source} in ('promotional', 'subscription', 'purchased')`),
  check("credit_lots_amounts_check", sql`${table.originalAtoms} > 0 and ${table.remainingAtoms} >= 0 and ${table.reservedAtoms} >= 0 and ${table.remainingAtoms} >= ${table.reservedAtoms}`),
]);

export const usageRequests = pgTable("usage_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => creditAccounts.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  modelId: uuid("model_id").notNull().references(() => modelCatalog.id),
  rateCardId: uuid("rate_card_id").notNull().references(() => rateCards.id),
  idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull(),
  status: varchar("status", { length: 24 }).notNull(),
  usageStatus: varchar("usage_status", { length: 24 }).notNull().default("pending"),
  estimatedProviderCostUsd: numeric("estimated_provider_cost_usd", { precision: 24, scale: 12 }).notNull(),
  actualProviderCostUsd: numeric("actual_provider_cost_usd", { precision: 24, scale: 12 }),
  reservedAtoms: bigint("reserved_atoms", { mode: "bigint" }).notNull(),
  chargedAtoms: bigint("charged_atoms", { mode: "bigint" }),
  inputTokens: bigint("input_tokens", { mode: "bigint" }),
  outputTokens: bigint("output_tokens", { mode: "bigint" }),
  providerRequestId: varchar("provider_request_id", { length: 180 }),
  safeErrorCode: varchar("safe_error_code", { length: 80 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("usage_requests_account_idempotency_uq").on(table.accountId, table.idempotencyKey),
  index("usage_requests_account_created_idx").on(table.accountId, table.createdAt),
  index("usage_requests_reconciliation_idx").on(table.usageStatus, table.createdAt),
  check("usage_requests_status_check", sql`${table.status} in ('reserved', 'streaming', 'settled', 'released', 'failed', 'reconciliation_pending')`),
  check("usage_requests_usage_status_check", sql`${table.usageStatus} in ('pending', 'estimated', 'authoritative', 'reconciled', 'unavailable')`),
  check("usage_requests_nonnegative_check", sql`${table.reservedAtoms} >= 0 and (${table.chargedAtoms} is null or ${table.chargedAtoms} >= 0) and (${table.inputTokens} is null or ${table.inputTokens} >= 0) and (${table.outputTokens} is null or ${table.outputTokens} >= 0)`),
]);

export const creditReservations = pgTable("credit_reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull().unique().references(() => usageRequests.id),
  accountId: uuid("account_id").notNull().references(() => creditAccounts.id),
  amountAtoms: bigint("amount_atoms", { mode: "bigint" }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("reserved"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("credit_reservations_open_idx").on(table.status, table.expiresAt),
  check("credit_reservations_amount_check", sql`${table.amountAtoms} > 0`),
  check("credit_reservations_status_check", sql`${table.status} in ('reserved', 'settled', 'released', 'expired')`),
]);

export const creditReservationAllocations = pgTable("credit_reservation_allocations", {
  reservationId: uuid("reservation_id").notNull().references(() => creditReservations.id),
  lotId: uuid("lot_id").notNull().references(() => creditLots.id),
  reservedAtoms: bigint("reserved_atoms", { mode: "bigint" }).notNull(),
  chargedAtoms: bigint("charged_atoms", { mode: "bigint" }).notNull().default(sql`0`),
}, (table) => [
  uniqueIndex("credit_reservation_allocations_reservation_lot_uq").on(table.reservationId, table.lotId),
  check("credit_reservation_allocations_amount_check", sql`${table.reservedAtoms} > 0 and ${table.chargedAtoms} >= 0 and ${table.chargedAtoms} <= ${table.reservedAtoms}`),
]);

export const creditLedgerEntries = pgTable("credit_ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => creditAccounts.id),
  lotId: uuid("lot_id").references(() => creditLots.id),
  requestId: uuid("request_id").references(() => usageRequests.id),
  paymentEventId: uuid("payment_event_id"),
  kind: varchar("kind", { length: 24 }).notNull(),
  atomsDelta: bigint("atoms_delta", { mode: "bigint" }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 180 }).notNull().unique(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("credit_ledger_account_created_idx").on(table.accountId, table.createdAt),
  check("credit_ledger_kind_check", sql`${table.kind} in ('grant', 'charge', 'refund', 'adjustment', 'reserve', 'release')`),
]);

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerEventId: varchar("provider_event_id", { length: 180 }).notNull().unique(),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("received"),
  accountId: uuid("account_id").references(() => creditAccounts.id),
  safeErrorCode: varchar("safe_error_code", { length: 80 }),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => [check("payment_events_status_check", sql`${table.status} in ('received', 'processed', 'ignored', 'failed')`)]);

export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => creditAccounts.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  kind: varchar("kind", { length: 24 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  checkoutSessionId: varchar("checkout_session_id", { length: 180 }).unique(),
  invoiceId: varchar("invoice_id", { length: 180 }).unique(),
  paymentIntentId: varchar("payment_intent_id", { length: 180 }),
  subscriptionId: varchar("subscription_id", { length: 180 }),
  planId: uuid("plan_id").references(() => subscriptionPlans.id),
  packageId: uuid("package_id").references(() => creditPackages.id),
  amountCents: integer("amount_cents").notNull(),
  creditAtoms: bigint("credit_atoms", { mode: "bigint" }),
  currency: varchar("currency", { length: 3 }).notNull(),
  receiptUrl: text("receipt_url"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("payment_transactions_account_created_idx").on(table.accountId, table.createdAt),
  index("payment_transactions_user_status_idx").on(table.userId, table.status),
  check("payment_transactions_kind_check", sql`${table.kind} in ('subscription', 'top_up')`),
  check("payment_transactions_status_check", sql`${table.status} in ('pending', 'paid', 'failed', 'canceled', 'expired', 'refunded')`),
  check("payment_transactions_amount_nonnegative_check", sql`${table.amountCents} >= 0`),
  check("payment_transactions_credit_atoms_positive_check", sql`${table.creditAtoms} is null or ${table.creditAtoms} > 0`),
]);

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  organizationId: uuid("organization_id").references(() => organizations.id),
  title: varchar("title", { length: 200 }).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("conversations_user_updated_idx").on(table.userId, table.updatedAt)]);

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  requestId: uuid("request_id").references(() => usageRequests.id),
  role: varchar("role", { length: 16 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("messages_conversation_created_idx").on(table.conversationId, table.createdAt), check("messages_role_check", sql`${table.role} in ('user', 'assistant', 'system')`)]);

export const developerApiKeys = pgTable("developer_api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  accountId: uuid("account_id").notNull().references(() => creditAccounts.id),
  name: varchar("name", { length: 100 }).notNull(),
  keyPrefix: varchar("key_prefix", { length: 24 }).notNull(),
  keyHash: varchar("key_hash", { length: 128 }).notNull().unique(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("developer_api_keys_user_idx").on(table.userId)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  organizationId: uuid("organization_id").references(() => organizations.id),
  action: varchar("action", { length: 120 }).notNull(),
  targetType: varchar("target_type", { length: 80 }).notNull(),
  targetId: varchar("target_id", { length: 180 }),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("audit_logs_actor_created_idx").on(table.actorUserId, table.createdAt)]);
