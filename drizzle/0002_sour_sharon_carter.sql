CREATE TABLE "typing_leaderboard" (
	"id" text PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"result_id" text NOT NULL,
	"user_id" text NOT NULL,
	"net_dph" integer NOT NULL,
	"marks_out_of_50_x100" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"full_mistakes" integer NOT NULL,
	"transcription_time_seconds" integer NOT NULL,
	"attempted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "typing_leaderboard_result_id_unique" UNIQUE("result_id")
);
--> statement-breakpoint
ALTER TABLE "typing_leaderboard" ADD CONSTRAINT "typing_leaderboard_test_id_typing_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."typing_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_leaderboard" ADD CONSTRAINT "typing_leaderboard_result_id_typing_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."typing_results"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_leaderboard" ADD CONSTRAINT "typing_leaderboard_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "typing_leaderboard_test_user_idx" ON "typing_leaderboard" USING btree ("test_id","user_id");--> statement-breakpoint
CREATE INDEX "typing_leaderboard_test_rank_idx" ON "typing_leaderboard" USING btree ("test_id","full_mistakes","net_dph");--> statement-breakpoint
CREATE INDEX "typing_attempts_test_id_idx" ON "typing_attempts" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "typing_results_attempt_idx" ON "typing_results" USING btree ("attempt_id");