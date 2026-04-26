CREATE TYPE "public"."subscription_type" AS ENUM('app', 'typing');--> statement-breakpoint
DROP INDEX "one_active_sub_per_user_per_plan";--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "type" "subscription_type" DEFAULT 'app' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_sub_per_user_per_plan" ON "subscription" USING btree ("user_id","type") WHERE status = 'active';--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "plan";