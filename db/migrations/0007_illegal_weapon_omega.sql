CREATE TABLE "feedback_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" varchar(32) NOT NULL,
	"subject" varchar(160) NOT NULL,
	"details" text NOT NULL,
	"status" varchar(24) DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_submissions_category_check" CHECK ("feedback_submissions"."category" in ('feature_request', 'feedback', 'bug', 'issue')),
	CONSTRAINT "feedback_submissions_status_check" CHECK ("feedback_submissions"."status" in ('new', 'in_review', 'planned', 'resolved', 'closed')),
	CONSTRAINT "feedback_submissions_subject_length_check" CHECK (char_length("feedback_submissions"."subject") between 3 and 160),
	CONSTRAINT "feedback_submissions_details_length_check" CHECK (char_length("feedback_submissions"."details") between 10 and 5000)
);
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_submissions_user_created_idx" ON "feedback_submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_submissions_status_created_idx" ON "feedback_submissions" USING btree ("status","created_at");