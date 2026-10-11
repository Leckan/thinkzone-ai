CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(24) NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"checkout_session_id" varchar(180),
	"invoice_id" varchar(180),
	"payment_intent_id" varchar(180),
	"subscription_id" varchar(180),
	"plan_id" uuid,
	"package_id" uuid,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"receipt_url" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_checkout_session_id_unique" UNIQUE("checkout_session_id"),
	CONSTRAINT "payment_transactions_invoice_id_unique" UNIQUE("invoice_id"),
	CONSTRAINT "payment_transactions_kind_check" CHECK ("payment_transactions"."kind" in ('subscription', 'top_up')),
	CONSTRAINT "payment_transactions_status_check" CHECK ("payment_transactions"."status" in ('pending', 'paid', 'failed', 'canceled', 'expired', 'refunded')),
	CONSTRAINT "payment_transactions_amount_nonnegative_check" CHECK ("payment_transactions"."amount_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "credit_accounts" ADD COLUMN "payment_customer_id" varchar(180);--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_package_id_credit_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."credit_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_transactions_account_created_idx" ON "payment_transactions" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_transactions_user_status_idx" ON "payment_transactions" USING btree ("user_id","status");--> statement-breakpoint
ALTER TABLE "credit_accounts" ADD CONSTRAINT "credit_accounts_payment_customer_id_unique" UNIQUE("payment_customer_id");
--> statement-breakpoint
-- Initial database-backed launch configuration from the product's pricing hypotheses.
-- Existing development-seed rows are activated without replacing any customized prices.
INSERT INTO subscription_plans (key, name, monthly_price_cents, included_credit_atoms, currency, features, active)
VALUES
	('starter', 'Starter', 1500, 15000000, 'USD', '{"audience":"occasional"}'::jsonb, true),
	('pro', 'Pro', 3000, 32000000, 'USD', '{"audience":"professional"}'::jsonb, true),
	('power', 'Power', 6000, 70000000, 'USD', '{"audience":"heavy-use"}'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET active = true
WHERE subscription_plans.features->>'environment' = 'development-seed';
--> statement-breakpoint
INSERT INTO credit_packages (key, name, price_cents, credit_atoms, currency, active)
VALUES
	('small-demo', 'Small top-up', 500, 5000000, 'USD', true),
	('medium-demo', 'Medium top-up', 1000, 10000000, 'USD', true),
	('large-demo', 'Large top-up', 2500, 25000000, 'USD', true)
ON CONFLICT (key) DO UPDATE SET active = true
WHERE credit_packages.active = false;
