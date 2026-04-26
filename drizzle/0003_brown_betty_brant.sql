CREATE TYPE "public"."plan_type" AS ENUM('app', 'typing', 'full');--> statement-breakpoint
ALTER TABLE "subscription" DROP CONSTRAINT "subscription_user_id_unique";--> statement-breakpoint
DROP INDEX "one_active_subscription_per_user";--> statement-breakpoint
ALTER TABLE "payment_proof" ADD COLUMN "plan" "plan_type" DEFAULT 'app' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "plan" "plan_type" DEFAULT 'app' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_sub_per_user_per_plan" ON "subscription" USING btree ("user_id","plan") WHERE status = 'active';