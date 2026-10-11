CREATE TABLE "credit_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"price_cents" integer NOT NULL,
	"credit_atoms" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_packages_key_unique" UNIQUE("key"),
	CONSTRAINT "credit_packages_price_positive" CHECK ("credit_packages"."price_cents" > 0),
	CONSTRAINT "credit_packages_credits_positive" CHECK ("credit_packages"."credit_atoms" > 0)
);
