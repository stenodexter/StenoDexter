CREATE TYPE "public"."typing_attempt_stage" AS ENUM('writing', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."typing_attempt_type" AS ENUM('test', 'practice');--> statement-breakpoint
CREATE TABLE "typing_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"test_id" text NOT NULL,
	"type" "typing_attempt_type" NOT NULL,
	"stage" "typing_attempt_stage" DEFAULT 'writing' NOT NULL,
	"answer_draft" text,
	"answer_final" text,
	"writing_started_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"is_submitted" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "typing_results" (
	"id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"user_id" text NOT NULL,
	"full_mistakes" integer NOT NULL,
	"half_mistakes" integer NOT NULL,
	"gross_errors" integer NOT NULL,
	"error_strokes" integer NOT NULL,
	"total_strokes" integer NOT NULL,
	"net_strokes" integer NOT NULL,
	"gross_wpm" integer NOT NULL,
	"net_wpm" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"net_dph" integer NOT NULL,
	"marks_out_of_50_x100" integer NOT NULL,
	"transcription_time_seconds" integer NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "typing_results_attempt_id_unique" UNIQUE("attempt_id")
);
--> statement-breakpoint
CREATE TABLE "typing_tests" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"correct_transcription" text NOT NULL,
	"duration_seconds" integer NOT NULL,
	"admin_id" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "typing_attempts" ADD CONSTRAINT "typing_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_attempts" ADD CONSTRAINT "typing_attempts_test_id_typing_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."typing_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_results" ADD CONSTRAINT "typing_results_attempt_id_typing_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."typing_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_results" ADD CONSTRAINT "typing_results_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "typing_tests" ADD CONSTRAINT "typing_tests_admin_id_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin"("id") ON DELETE set default ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "typing_attempts_user_test_idx" ON "typing_attempts" USING btree ("user_id","test_id");--> statement-breakpoint
CREATE INDEX "typing_attempts_active_idx" ON "typing_attempts" USING btree ("user_id","stage") WHERE is_submitted = false;--> statement-breakpoint
CREATE INDEX "typing_results_user_idx" ON "typing_results" USING btree ("user_id");