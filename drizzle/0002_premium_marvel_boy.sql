DROP INDEX "idx_results_user";--> statement-breakpoint
DROP INDEX "idx_results_test";--> statement-breakpoint
DROP INDEX "idx_results_type";--> statement-breakpoint
ALTER TABLE "leaderboard" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_provider_account_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_expires_idx" ON "session" USING btree ("token","expires_at");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_expires_idx" ON "verification" USING btree ("identifier","expires_at");--> statement-breakpoint
CREATE INDEX "verification_expires_at_idx" ON "verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "tests_status_idx" ON "tests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tests_admin_id_idx" ON "tests" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "tests_type_status_idx" ON "tests" USING btree ("type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_leaderboard_test_user" ON "leaderboard" USING btree ("test_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_leaderboard_test_score" ON "leaderboard" USING btree ("test_id","best_score");--> statement-breakpoint
CREATE INDEX "idx_results_user_id" ON "results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_results_test_id" ON "results" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "idx_results_user_test" ON "results" USING btree ("user_id","test_id");--> statement-breakpoint
CREATE INDEX "idx_results_user_type" ON "results" USING btree ("user_id","type");