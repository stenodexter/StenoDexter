import { and, eq } from "drizzle-orm";
import { db as globalDb } from "~/server/db";
import {
  leaderboard,
  results,
  testAttempts,
  testSpeeds,
  tests,
} from "~/server/db/schema";
import type {
  CreateAttemptInput,
  SyncAttemptInput,
  SubmitAttemptInput,
} from "./attempt.schema";
import R2Service from "~/server/services/r2.service";
import { scoringEngine } from "~/server/services/scoring.service";

// ── Db type ───────────────────────────────────────────────────────────────────

import type { db as dbInstance } from "~/server/db";
import type { AuthUser } from "~/server/better-auth/config";
import { redisService } from "~/server/services/redis.service";
type Db = typeof dbInstance;

// ── factory ───────────────────────────────────────────────────────────────────

const RECHECK_LOCK_KEY = "recheck:lock";
const RECHECK_PROGRESS_KEY = "recheck:progress";
const RECHECK_TTL = 60 * 30;

export function createAttemptService(db: Db) {
  return {
    // ── create ──────────────────────────────────────────────────────────────
    // Determines assessment vs practice:
    //   - Assessment: first ever attempt on this test (any speed) + within 24h window
    //   - Practice: anything else
    // Uses results table (not testAttempts) — only completed attempts count.

    async create(input: CreateAttemptInput, userId: string) {
      const [test, speed] = await Promise.all([
        db.query.tests.findFirst({ where: eq(tests.id, input.testId) }),
        db.query.testSpeeds.findFirst({
          where: and(
            eq(testSpeeds.id, input.speedId),
            eq(testSpeeds.testId, input.testId),
          ),
        }),
      ]);

      if (!test) throw new Error("Test not found");
      if (!speed) throw new Error("Speed variant not found");
      if (test.status !== "active") throw new Error("Test is not active");

      // Resume any existing incomplete attempt for this user+test+speed
      const existingAttempt = await db.query.testAttempts.findFirst({
        where: and(
          eq(testAttempts.userId, userId),
          eq(testAttempts.testId, input.testId),
          eq(testAttempts.speedId, input.speedId),
          eq(testAttempts.isSubmitted, false),
        ),
      });

      if (existingAttempt) return existingAttempt; // resume — type is already set

      // No in-progress attempt — check if they've ever submitted one
      const priorSubmitted = await db.query.testAttempts.findFirst({
        where: and(
          eq(testAttempts.userId, userId),
          eq(testAttempts.testId, input.testId),
          eq(testAttempts.speedId, input.speedId),
          eq(testAttempts.isSubmitted, true),
        ),
      });

      const now = new Date();
      const isWithinWindow =
        now.getTime() - test.createdAt.getTime() <= 24 * 60 * 60 * 1000;

      const type: "assessment" | "practice" =
        !priorSubmitted && isWithinWindow ? "assessment" : "practice";

      const [attempt] = await db
        .insert(testAttempts)
        .values({
          userId,
          testId: input.testId,
          speedId: input.speedId,
          type,
          stage: "audio",
          stageStartedAt: null,
        })
        .returning();

      return attempt!;
    },
    // ── sync ─────────────────────────────────────────────────────────────────
    // Lightweight — called on debounce / stage transitions.

    async sync(input: SyncAttemptInput, userId: string) {
      const attempt = await db.query.testAttempts.findFirst({
        where: and(
          eq(testAttempts.id, input.attemptId),
          eq(testAttempts.userId, userId),
        ),
      });
      if (!attempt) throw new Error("Attempt not found");
      if (attempt.isSubmitted) throw new Error("Attempt already submitted");

      const patch: Partial<typeof testAttempts.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.audioProgressSeconds !== undefined)
        patch.audioProgressSeconds = input.audioProgressSeconds;
      if (input.answerDraft !== undefined)
        patch.answerDraft = input.answerDraft;
      if (input.stage !== undefined) {
        patch.stage = input.stage;
        patch.stageStartedAt = new Date();
      }
      if (input.audioSkipped !== undefined)
        patch.audioSkipped = input.audioSkipped;
      if (input.breakSkipped !== undefined)
        patch.breakSkipped = input.breakSkipped;
      if (input.markAudioStarted && !attempt.stageStartedAt)
        patch.stageStartedAt = new Date();
      if (input.markWritingStarted && !attempt.writingStartedAt)
        patch.writingStartedAt = new Date();

      if (input.audioSkipped !== undefined) {
        patch.audioSkipped = input.audioSkipped;

        if (input.audioSkipped) {
          patch.skippedAt = new Date();

          if (attempt.stage === "audio") {
            patch.stage = "break";
            patch.stageStartedAt = new Date();
          }
        }
      }

      await db
        .update(testAttempts)
        .set(patch)
        .where(eq(testAttempts.id, input.attemptId));

      return { ok: true };
    },

    // ── submit ───────────────────────────────────────────────────────────────
    // One transaction:
    //   1. Mark attempt submitted + store score
    //   2. Insert result row
    //   3. If assessment → insert leaderboard row

    async submit(input: SubmitAttemptInput, user: AuthUser) {
      return db.transaction(async (tx) => {
        const userId = user.id;

        const attempt = await tx.query.testAttempts.findFirst({
          where: and(
            eq(testAttempts.id, input.attemptId),
            eq(testAttempts.userId, userId),
          ),
          with: {
            speed: true,
            test: true,
          },
        });

        if (!attempt) throw new Error("Attempt not found");
        if (attempt.isSubmitted) return attempt; // idempotent

        const now = new Date();

        const durationSeconds = attempt.writingStartedAt
          ? Math.min(
              Math.floor(
                (now.getTime() - attempt.writingStartedAt.getTime()) / 1000,
              ),
              attempt.speed.writtenDurationSeconds,
            )
          : attempt.speed.writtenDurationSeconds;

        const evaluation = scoringEngine.evaluate(
          attempt.test.correctAnswer,
          input.answerFinal,
          durationSeconds,
        );

        const [updated] = await tx
          .update(testAttempts)
          .set({
            answerFinal: input.answerFinal,
            isSubmitted: true,
            submittedAt: now,
            stage: "submitted",
            score: evaluation.score,
            updatedAt: now,
          })
          .where(eq(testAttempts.id, input.attemptId))
          .returning();

        // 2. Insert result
        const [result] = await tx
          .insert(results)
          .values({
            attemptId: attempt.id,
            userId,
            type: attempt.type,
            score: evaluation.score,
            wpm: evaluation.wpm,
            accuracy: Math.round(evaluation.accuracy),
            mistakes: evaluation.mistakes,
            submittedAt: now,
          })
          .returning();

        // 3. Leaderboard — assessment only
        // uniqueIndex on (testId, userId) prevents duplicates at DB level
        if (attempt.type === "assessment" && !user.isDemo) {
          await tx
            .insert(leaderboard)
            .values({
              testId: attempt.testId,
              speedId: attempt.speedId,
              userId,
              resultId: result!.id,
              score: evaluation.score,
              wpm: evaluation.wpm,
              accuracy: Math.round(evaluation.accuracy),
              mistakes: evaluation.mistakes,
              attemptedAt: now,
              totalWordsTyped: input.answerFinal.split(" ").length ?? 0,
              transcriptionTime: durationSeconds * 1000,
            })
            .onConflictDoNothing(); // safety net — uniqueIndex handles it
        }

        return { attempt: updated!, evaluation };
      });
    },

    // ── getResume ─────────────────────────────────────────────────────────────
    // Timing now comes from the chosen speed, not the test directly.
    // Audio URL resolved from speed.audioKey.

    async getResume(attemptId: string, userId: string) {
      const attempt = await db.query.testAttempts.findFirst({
        where: and(
          eq(testAttempts.id, attemptId),
          eq(testAttempts.userId, userId),
        ),
        with: {
          test: true,
          speed: true, // ← timing lives here now
        },
      });
      if (!attempt) throw new Error("Attempt not found");

      const now = Date.now();
      const stageStarted = attempt.stageStartedAt?.getTime() ?? null;
      const { speed } = attempt;

      let secondsLeft = 0;

      if (attempt.stage === "audio") {
        if (stageStarted === null) {
          // Countdown hasn't finished — full dictation time remains
          secondsLeft = speed.dictationSeconds;
        } else {
          const progress = attempt.audioProgressSeconds ?? 0;
          secondsLeft = Math.max(0, speed.dictationSeconds - progress);
        }
      } else if (attempt.stage === "break") {
        const elapsed = stageStarted
          ? Math.floor((now - stageStarted) / 1000)
          : 0;
        secondsLeft = Math.max(0, speed.breakSeconds - elapsed);
      } else if (attempt.stage === "writing") {
        const elapsed = stageStarted
          ? Math.floor((now - stageStarted) / 1000)
          : 0;
        secondsLeft = Math.max(0, speed.writtenDurationSeconds - elapsed);
      }

      const elapsedSeconds = stageStarted
        ? Math.floor((now - stageStarted) / 1000)
        : 0;

      return {
        attempt,
        test: attempt.test,
        speed: {
          ...speed,
          audioUrl: R2Service.getPublicUrl(speed.audioKey)!,
        },
        secondsLeft,
        elapsedSeconds,
      };
    },

    async recheck(attemptId: string) {
      console.log("RECHECKING :: ", attemptId);

      return db.transaction(async (tx) => {
        const attempt = await tx.query.testAttempts.findFirst({
          where: and(eq(testAttempts.id, attemptId)),
          with: { speed: true, test: true },
        });

        if (!attempt) throw new Error("Attempt not found");
        if (!attempt.isSubmitted) throw new Error("Attempt not submitted");

        const answerFinal = attempt.answerFinal ?? "";

        const durationSeconds =
          attempt.writingStartedAt && attempt.submittedAt
            ? Math.min(
                Math.floor(
                  (attempt.submittedAt.getTime() -
                    attempt.writingStartedAt.getTime()) /
                    1000,
                ),
                attempt.speed.writtenDurationSeconds,
              )
            : attempt.speed.writtenDurationSeconds;

        const evaluation = scoringEngine.evaluate(
          attempt.test.correctAnswer,
          answerFinal,
          durationSeconds,
        );

        const now = new Date();

        // 1. Update attempt score
        await tx
          .update(testAttempts)
          .set({ score: evaluation.score, updatedAt: now })
          .where(eq(testAttempts.id, attemptId));

        // 2. Update result row (joined via attemptId)
        await tx
          .update(results)
          .set({
            score: evaluation.score,
            wpm: evaluation.wpm,
            accuracy: Math.round(evaluation.accuracy),
            mistakes: evaluation.mistakes,
          })
          .where(eq(results.attemptId, attemptId));

        // 3. Leaderboard — assessment only, update if record exists
        // uniqueIndex is (testId, userId, speedId) — must match all 3
        if (attempt.type === "assessment") {
          const existing = await tx.query.leaderboard.findFirst({
            where: and(
              eq(leaderboard.testId, attempt.testId),
              eq(leaderboard.userId, attempt.userId),
              eq(leaderboard.speedId, attempt.speedId),
            ),
          });

          if (existing) {
            await tx
              .update(leaderboard)
              .set({
                score: evaluation.score,
                wpm: evaluation.wpm,
                accuracy: Math.round(evaluation.accuracy),
                mistakes: evaluation.mistakes,
              })
              .where(eq(leaderboard.id, existing.id)); // PK update — safe
          }
        }

        return { attemptId, evaluation };
      });
    },

    async recheckAll() {
      // Prevent concurrent runs
      const locked = await redisService.get<boolean>(RECHECK_LOCK_KEY);
      if (locked) throw new Error("recheckAll already in progress");

      await redisService.set(RECHECK_LOCK_KEY, true, RECHECK_TTL);
      await redisService.set(
        RECHECK_PROGRESS_KEY,
        { status: "running", total: 0, succeeded: 0, failed: [] },
        RECHECK_TTL,
      );

      try {
        const allSubmitted = await db.query.testAttempts.findMany({
          where: eq(testAttempts.isSubmitted, true),
          with: { speed: true, test: true },
        });

        const progress = {
          status: "running" as "running" | "done",
          total: allSubmitted.length,
          succeeded: 0,
          failed: [] as { attemptId: string; error: string }[],
        };

        // Update total now that we know it
        await redisService.set(RECHECK_PROGRESS_KEY, progress, RECHECK_TTL);

        const outcomes = await Promise.allSettled(
          allSubmitted.map((attempt) =>
            createAttemptService(db)
              .recheck(attempt.id)
              .then((res) => {
                progress.succeeded++;
                void redisService.set(
                  RECHECK_PROGRESS_KEY,
                  progress,
                  RECHECK_TTL,
                );
                return res;
              })
              .catch((err: unknown) => {
                progress.failed.push({
                  attemptId: attempt.id,
                  error: err instanceof Error ? err.message : "unknown",
                });
                void redisService.set(
                  RECHECK_PROGRESS_KEY,
                  progress,
                  RECHECK_TTL,
                );
                throw err;
              }),
          ),
        );

        progress.status = "done";
        await redisService.set(RECHECK_PROGRESS_KEY, progress, RECHECK_TTL);

        return progress;
      } finally {
        await redisService.del(RECHECK_LOCK_KEY);
      }
    },

    async recheckAllProgress() {
      return redisService.get<{
        status: "running" | "done";
        total: number;
        succeeded: number;
        failed: { attemptId: string; error: string }[];
      }>(RECHECK_PROGRESS_KEY);
    },
  };
}

// ── default export ────────────────────────────────────────────────────────────

export const attemptService = createAttemptService(globalDb);
