CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"organization_id" uuid,
	"action" varchar(120) NOT NULL,
	"target_type" varchar(80) NOT NULL,
	"target_id" varchar(180),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid,
	"title" varchar(200) NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" varchar(24) NOT NULL,
	"owner_id" uuid NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"cached_available_atoms" bigint DEFAULT 0 NOT NULL,
	"cached_reserved_atoms" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_accounts_owner_type_check" CHECK ("credit_accounts"."owner_type" in ('user', 'organization')),
	CONSTRAINT "credit_accounts_cached_available_nonnegative" CHECK ("credit_accounts"."cached_available_atoms" >= 0),
	CONSTRAINT "credit_accounts_cached_reserved_nonnegative" CHECK ("credit_accounts"."cached_reserved_atoms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "credit_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"lot_id" uuid,
	"request_id" uuid,
	"payment_event_id" uuid,
	"kind" varchar(24) NOT NULL,
	"atoms_delta" bigint NOT NULL,
	"idempotency_key" varchar(180) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_entries_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "credit_ledger_kind_check" CHECK ("credit_ledger_entries"."kind" in ('grant', 'charge', 'refund', 'adjustment', 'reserve', 'release'))
);
--> statement-breakpoint
CREATE TABLE "credit_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"source" varchar(24) NOT NULL,
	"original_atoms" bigint NOT NULL,
	"remaining_atoms" bigint NOT NULL,
	"reserved_atoms" bigint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"grant_reference" varchar(180) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_lots_source_check" CHECK ("credit_lots"."source" in ('promotional', 'subscription', 'purchased')),
	CONSTRAINT "credit_lots_amounts_check" CHECK ("credit_lots"."original_atoms" > 0 and "credit_lots"."remaining_atoms" >= 0 and "credit_lots"."reserved_atoms" >= 0 and "credit_lots"."remaining_atoms" >= "credit_lots"."reserved_atoms")
);
--> statement-breakpoint
CREATE TABLE "credit_reservation_allocations" (
	"reservation_id" uuid NOT NULL,
	"lot_id" uuid NOT NULL,
	"reserved_atoms" bigint NOT NULL,
	"charged_atoms" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "credit_reservation_allocations_amount_check" CHECK ("credit_reservation_allocations"."reserved_atoms" > 0 and "credit_reservation_allocations"."charged_atoms" >= 0 and "credit_reservation_allocations"."charged_atoms" <= "credit_reservation_allocations"."reserved_atoms")
);
--> statement-breakpoint
CREATE TABLE "credit_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"amount_atoms" bigint NOT NULL,
	"status" varchar(16) DEFAULT 'reserved' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_reservations_request_id_unique" UNIQUE("request_id"),
	CONSTRAINT "credit_reservations_amount_check" CHECK ("credit_reservations"."amount_atoms" > 0),
	CONSTRAINT "credit_reservations_status_check" CHECK ("credit_reservations"."status" in ('reserved', 'settled', 'released', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "developer_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"key_prefix" varchar(24) NOT NULL,
	"key_hash" varchar(128) NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "developer_api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"request_id" uuid,
	"role" varchar(16) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_role_check" CHECK ("messages"."role" in ('user', 'assistant', 'system'))
);
--> statement-breakpoint
CREATE TABLE "model_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"key" varchar(120) NOT NULL,
	"provider_model_id" varchar(180) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"context_tokens" integer,
	"available" boolean DEFAULT false NOT NULL,
	"deprecated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_catalog_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(24) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_memberships_role_check" CHECK ("organization_memberships"."role" in ('owner', 'admin', 'member'))
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_status_check" CHECK ("organizations"."status" in ('active', 'suspended', 'deleted'))
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_event_id" varchar(180) NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"status" varchar(24) DEFAULT 'received' NOT NULL,
	"account_id" uuid,
	"safe_error_code" varchar(80),
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "payment_events_provider_event_id_unique" UNIQUE("provider_event_id"),
	CONSTRAINT "payment_events_status_check" CHECK ("payment_events"."status" in ('received', 'processed', 'ignored', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"integration_mode" varchar(32) NOT NULL,
	"commercial_status" varchar(32) DEFAULT 'pending_review' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"compliance_notes" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "providers_key_unique" UNIQUE("key"),
	CONSTRAINT "providers_commercial_status_check" CHECK ("providers"."commercial_status" in ('pending_review', 'approved', 'rejected', 'suspended')),
	CONSTRAINT "providers_enabled_approved_check" CHECK (not "providers"."enabled" or "providers"."commercial_status" = 'approved')
);
--> statement-breakpoint
CREATE TABLE "rate_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"input_usd_per_million" numeric(24, 9) NOT NULL,
	"output_usd_per_million" numeric(24, 9) NOT NULL,
	"cached_input_usd_per_million" numeric(24, 9),
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"source_url" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_cards_nonnegative_check" CHECK ("rate_cards"."input_usd_per_million" >= 0 and "rate_cards"."output_usd_per_million" >= 0)
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"monthly_price_cents" integer NOT NULL,
	"included_credit_atoms" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_key_unique" UNIQUE("key"),
	CONSTRAINT "subscription_plans_price_nonnegative" CHECK ("subscription_plans"."monthly_price_cents" >= 0),
	CONSTRAINT "subscription_plans_credits_nonnegative" CHECK ("subscription_plans"."included_credit_atoms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"payment_customer_id" varchar(180),
	"payment_subscription_id" varchar(180),
	"status" varchar(24) NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_payment_subscription_id_unique" UNIQUE("payment_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "usage_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"rate_card_id" uuid NOT NULL,
	"idempotency_key" varchar(180) NOT NULL,
	"status" varchar(24) NOT NULL,
	"usage_status" varchar(24) DEFAULT 'pending' NOT NULL,
	"estimated_provider_cost_usd" numeric(24, 12) NOT NULL,
	"actual_provider_cost_usd" numeric(24, 12),
	"reserved_atoms" bigint NOT NULL,
	"charged_atoms" bigint,
	"input_tokens" bigint,
	"output_tokens" bigint,
	"provider_request_id" varchar(180),
	"safe_error_code" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	CONSTRAINT "usage_requests_status_check" CHECK ("usage_requests"."status" in ('reserved', 'streaming', 'settled', 'released', 'failed', 'reconciliation_pending')),
	CONSTRAINT "usage_requests_usage_status_check" CHECK ("usage_requests"."usage_status" in ('pending', 'estimated', 'authoritative', 'reconciled', 'unavailable')),
	CONSTRAINT "usage_requests_nonnegative_check" CHECK ("usage_requests"."reserved_atoms" >= 0 and ("usage_requests"."charged_atoms" is null or "usage_requests"."charged_atoms" >= 0) and ("usage_requests"."input_tokens" is null or "usage_requests"."input_tokens" >= 0) and ("usage_requests"."output_tokens" is null or "usage_requests"."output_tokens" >= 0))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"display_name" varchar(120),
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"platform_role" varchar(32) DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'suspended', 'deleted'))
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_lot_id_credit_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."credit_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_request_id_usage_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."usage_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_lots" ADD CONSTRAINT "credit_lots_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_reservation_allocations" ADD CONSTRAINT "credit_reservation_allocations_reservation_id_credit_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."credit_reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_reservation_allocations" ADD CONSTRAINT "credit_reservation_allocations_lot_id_credit_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."credit_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_reservations" ADD CONSTRAINT "credit_reservations_request_id_usage_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."usage_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_reservations" ADD CONSTRAINT "credit_reservations_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_api_keys" ADD CONSTRAINT "developer_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_api_keys" ADD CONSTRAINT "developer_api_keys_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_request_id_usage_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."usage_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_catalog" ADD CONSTRAINT "model_catalog_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_cards" ADD CONSTRAINT "rate_cards_model_id_model_catalog_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."model_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_requests" ADD CONSTRAINT "usage_requests_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_requests" ADD CONSTRAINT "usage_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_requests" ADD CONSTRAINT "usage_requests_model_id_model_catalog_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."model_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_requests" ADD CONSTRAINT "usage_requests_rate_card_id_rate_cards_id_fk" FOREIGN KEY ("rate_card_id") REFERENCES "public"."rate_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "conversations_user_updated_idx" ON "conversations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_accounts_owner_uq" ON "credit_accounts" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_account_created_idx" ON "credit_ledger_entries" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_lots_account_grant_uq" ON "credit_lots" USING btree ("account_id","grant_reference");--> statement-breakpoint
CREATE INDEX "credit_lots_available_idx" ON "credit_lots" USING btree ("account_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_reservation_allocations_reservation_lot_uq" ON "credit_reservation_allocations" USING btree ("reservation_id","lot_id");--> statement-breakpoint
CREATE INDEX "credit_reservations_open_idx" ON "credit_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "developer_api_keys_user_idx" ON "developer_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "model_catalog_provider_idx" ON "model_catalog" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_memberships_org_user_uq" ON "organization_memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_cards_model_version_uq" ON "rate_cards" USING btree ("model_id","version");--> statement-breakpoint
CREATE INDEX "rate_cards_effective_idx" ON "rate_cards" USING btree ("model_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "subscriptions_account_idx" ON "subscriptions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_requests_account_idempotency_uq" ON "usage_requests" USING btree ("account_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "usage_requests_account_created_idx" ON "usage_requests" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_requests_reconciliation_idx" ON "usage_requests" USING btree ("usage_status","created_at");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_credit_ledger_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'credit_ledger_entries is append-only; write a compensating entry instead';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER credit_ledger_entries_append_only
BEFORE UPDATE OR DELETE ON credit_ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_credit_ledger_mutation();
