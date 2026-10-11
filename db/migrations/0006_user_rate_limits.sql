CREATE TABLE "api_rate_limits" (
	"user_id" uuid NOT NULL,
	"scope" varchar(64) NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_rate_limits_count_nonnegative_check" CHECK ("api_rate_limits"."request_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "api_rate_limits" ADD CONSTRAINT "api_rate_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_rate_limits_user_scope_uq" ON "api_rate_limits" USING btree ("user_id","scope");--> statement-breakpoint
CREATE INDEX "api_rate_limits_updated_idx" ON "api_rate_limits" USING btree ("updated_at");