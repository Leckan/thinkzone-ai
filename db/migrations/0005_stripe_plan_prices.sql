ALTER TABLE "subscription_plans" ADD COLUMN "stripe_product_id" varchar(180);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "stripe_price_id" varchar(180);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_stripe_product_id_unique" UNIQUE("stripe_product_id");--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_stripe_price_id_unique" UNIQUE("stripe_price_id");