ALTER TABLE "user" ALTER COLUMN "user_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD COLUMN "audio_skipped" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD COLUMN "transcription_time" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD COLUMN "total_words_typed" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_user_code_unique" UNIQUE("user_code");