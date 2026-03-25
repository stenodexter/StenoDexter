CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."payments_type" AS ENUM('renew', 'fresh');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'expired');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('active', 'invalidated', 'expired', 'limit_reached');--> statement-breakpoint
CREATE TYPE "public"."attempt_stage" AS ENUM('audio', 'break', 'writing', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."attempt_type" AS ENUM('assessment', 'practice');--> statement-breakpoint
CREATE TYPE "public"."test_status" AS ENUM('draft', 'active');--> statement-breakpoint
CREATE TYPE "public"."test_type" AS ENUM('legal', 'general', 'special');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"phone" text,
	"profile_url" text,
	"gender" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payment_proof" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"screenshot_key" text NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"type" "payments_type" NOT NULL,
	"verified_by" text,
	"from_upi_id" text NOT NULL,
	"verified_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"payment_proof_id" text,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp with time zone DEFAULT now() NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"last_reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"profile_picture_key" text,
	"is_super" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"invited_by_admin_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "admin_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_by_admin_id" text NOT NULL,
	"max_uses" integer NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"status" "invite_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "admin_invite_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"invite_id" text NOT NULL,
	"used_by_admin_id" text NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_session" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "admin_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "test_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"test_id" text NOT NULL,
	"speed_id" text NOT NULL,
	"type" "attempt_type" NOT NULL,
	"stage" "attempt_stage" DEFAULT 'audio' NOT NULL,
	"stage_started_at" timestamp with time zone DEFAULT now(),
	"audio_progress_seconds" integer DEFAULT 0,
	"last_audio_sync_at" timestamp with time zone,
	"answer_draft" text,
	"answer_final" text,
	"writing_started_at" timestamp with time zone,
	"break_skipped" boolean DEFAULT false,
	"score" integer,
	"skipped_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"is_submitted" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "test_speeds" (
	"id" text PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"wpm" integer NOT NULL,
	"audio_key" text NOT NULL,
	"dictation_seconds" integer NOT NULL,
	"break_seconds" integer NOT NULL,
	"written_duration_seconds" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" "test_type" NOT NULL,
	"matter_pdf_key" text NOT NULL,
	"outline_pdf_key" text,
	"correct_answer" text NOT NULL,
	"status" "test_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"solution_audio_key" text,
	"admin_id" text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard" (
	"id" text PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"result_id" text NOT NULL,
	"speed_id" text NOT NULL,
	"user_id" text NOT NULL,
	"score" integer NOT NULL,
	"wpm" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"mistakes" integer,
	"attempted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_result_id_unique" UNIQUE("result_id")
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "attempt_type" NOT NULL,
	"score" integer NOT NULL,
	"wpm" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"mistakes" integer,
	"submitted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "results_attempt_id_unique" UNIQUE("attempt_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"to" text NOT NULL,
	"seen_by" text[],
	"link" text,
	"is_link_external" boolean,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hall_of_fame" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"photo_key" text,
	"department" text NOT NULL,
	"batch" text,
	"note" text,
	"added_by_id" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proof" ADD CONSTRAINT "payment_proof_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proof" ADD CONSTRAINT "payment_proof_verified_by_admin_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."admin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_payment_proof_id_payment_proof_id_fk" FOREIGN KEY ("payment_proof_id") REFERENCES "public"."payment_proof"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin" ADD CONSTRAINT "admin_invited_by_admin_id_admin_id_fk" FOREIGN KEY ("invited_by_admin_id") REFERENCES "public"."admin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_invite" ADD CONSTRAINT "admin_invite_created_by_admin_id_admin_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_invite_usage" ADD CONSTRAINT "admin_invite_usage_invite_id_admin_invite_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."admin_invite"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_invite_usage" ADD CONSTRAINT "admin_invite_usage_used_by_admin_id_admin_id_fk" FOREIGN KEY ("used_by_admin_id") REFERENCES "public"."admin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_session" ADD CONSTRAINT "admin_session_admin_id_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_speed_id_test_speeds_id_fk" FOREIGN KEY ("speed_id") REFERENCES "public"."test_speeds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_speeds" ADD CONSTRAINT "test_speeds_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_admin_id_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin"("id") ON DELETE set default ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_result_id_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_speed_id_test_speeds_id_fk" FOREIGN KEY ("speed_id") REFERENCES "public"."test_speeds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_attempt_id_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_of_fame" ADD CONSTRAINT "hall_of_fame_added_by_id_admin_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."admin"("id") ON DELETE set default ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_expires_idx" ON "session" USING btree ("token","expires_at");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_expires_idx" ON "verification" USING btree ("identifier","expires_at");--> statement-breakpoint
CREATE INDEX "verification_expires_at_idx" ON "verification" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_pending_payment_per_user" ON "payment_proof" USING btree ("user_id") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "payment_user_idx" ON "payment_proof" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_user_idx" ON "subscription" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_subscription_per_user" ON "subscription" USING btree ("user_id") WHERE status = 'active';--> statement-breakpoint
CREATE INDEX "admin_invited_by_idx" ON "admin" USING btree ("invited_by_admin_id");--> statement-breakpoint
CREATE INDEX "admin_is_super_idx" ON "admin" USING btree ("is_super");--> statement-breakpoint
CREATE INDEX "admin_is_system_idx" ON "admin" USING btree ("is_system");--> statement-breakpoint
CREATE INDEX "admin_invite_created_by_idx" ON "admin_invite" USING btree ("created_by_admin_id");--> statement-breakpoint
CREATE INDEX "admin_invite_status_idx" ON "admin_invite" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_invite_token_status_expires_idx" ON "admin_invite" USING btree ("token","status","expires_at");--> statement-breakpoint
CREATE INDEX "admin_invite_expires_at_idx" ON "admin_invite" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "admin_invite_usage_invite_id_idx" ON "admin_invite_usage" USING btree ("invite_id");--> statement-breakpoint
CREATE INDEX "admin_invite_usage_used_by_idx" ON "admin_invite_usage" USING btree ("used_by_admin_id");--> statement-breakpoint
CREATE INDEX "admin_invite_usage_invite_used_by_idx" ON "admin_invite_usage" USING btree ("invite_id","used_by_admin_id");--> statement-breakpoint
CREATE INDEX "admin_session_token_expires_idx" ON "admin_session" USING btree ("token","expires_at");--> statement-breakpoint
CREATE INDEX "admin_session_admin_id_idx" ON "admin_session" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_session_expires_at_idx" ON "admin_session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_user_test" ON "test_attempts" USING btree ("user_id","test_id");--> statement-breakpoint
CREATE INDEX "idx_active_attempts" ON "test_attempts" USING btree ("user_id","stage") WHERE is_submitted = false;--> statement-breakpoint
CREATE INDEX "idx_unscored" ON "test_attempts" USING btree ("test_id","submitted_at") WHERE is_submitted = true AND score IS NULL;--> statement-breakpoint
CREATE INDEX "idx_attempts_speed_id" ON "test_attempts" USING btree ("speed_id");--> statement-breakpoint
CREATE INDEX "test_speeds_test_id_idx" ON "test_speeds" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "test_speeds_test_wpm_idx" ON "test_speeds" USING btree ("test_id","wpm");--> statement-breakpoint
CREATE INDEX "tests_status_idx" ON "tests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tests_admin_id_idx" ON "tests" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "tests_type_status_idx" ON "tests" USING btree ("type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_leaderboard_test_user" ON "leaderboard" USING btree ("test_id","user_id","speed_id");--> statement-breakpoint
CREATE INDEX "idx_leaderboard_speed_score" ON "leaderboard" USING btree ("speed_id","score");--> statement-breakpoint
CREATE INDEX "idx_leaderboard_speed_id" ON "leaderboard" USING btree ("speed_id");--> statement-breakpoint
CREATE INDEX "idx_results_user_id" ON "results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_results_user_type" ON "results" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "notif_to_idx" ON "notifications" USING btree ("to");--> statement-breakpoint
CREATE INDEX "notif_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "hof_department_idx" ON "hall_of_fame" USING btree ("department");--> statement-breakpoint
CREATE INDEX "hof_created_at_idx" ON "hall_of_fame" USING btree ("created_at");