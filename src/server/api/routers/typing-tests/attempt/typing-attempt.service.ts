// typing-attempt.service.ts
import { and, desc, eq } from "drizzle-orm";
import {
  typingAttempts,
  typingTests,
  typingResults,
  typingLeaderboard,
  user,
} from "~/server/db/schema";
import type {
  CreateTypingAttemptInput,
  SyncTypingAttemptInput,
  SubmitTypingAttemptInput,
} from "./typing-attempt.schema";

import type { db as dbInstance } from "~/server/db";
type Db = typeof dbInstance;

export function createTypingAttemptService(db: Db) {
  return {
    async create(input: CreateTypingAttemptInput, userId: string) {
      const [test] = await Promise.all([
        db.query.typingTests.findFirst({
          where: eq(typingTests.id, input.testId),
        }),
      ]);

      if (!test) throw new Error("Test not found");

      const priorSubmitted = await db.query.typingAttempts.findFirst({
        where: and(
          eq(typingAttempts.userId, userId),
          eq(typingAttempts.testId, input.testId),
          eq(typingAttempts.isSubmitted, true),
        ),
      });

      const type: "test" | "practice" = priorSubmitted ? "practice" : "test";

      const [attempt] = await db
        .insert(typingAttempts)
        .values({
          userId,
          testId: input.testId,
          type,
          stage: "writing",
          writingStartedAt: new Date(),
        })
        .returning();

      return attempt!;
    },

    async sync(input: SyncTypingAttemptInput, userId: string) {
      const attempt = await db.query.typingAttempts.findFirst({
        where: and(
          eq(typingAttempts.id, input.attemptId),
          eq(typingAttempts.userId, userId),
        ),
      });
      if (!attempt) throw new Error("Attempt not found");
      if (attempt.isSubmitted) throw new Error("Already submitted");

      const patch: Partial<typeof typingAttempts.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.answerDraft !== undefined)
        patch.answerDraft = input.answerDraft;
      if (input.markWritingStarted && !attempt.writingStartedAt)
        patch.writingStartedAt = new Date();

      await db
        .update(typingAttempts)
        .set(patch)
        .where(eq(typingAttempts.id, input.attemptId));

      return { ok: true };
    },

    async getResume(attemptId: string, userId: string) {
      const attempt = await db.query.typingAttempts.findFirst({
        where: and(
          eq(typingAttempts.id, attemptId),
          eq(typingAttempts.userId, userId),
        ),
        with: { test: true },
      });
      if (!attempt) throw new Error("Attempt not found");

      const now = Date.now();
      const writingStarted = attempt.writingStartedAt?.getTime() ?? null;
      const elapsed = writingStarted
        ? Math.floor((now - writingStarted) / 1000)
        : 0;
      const secondsLeft = Math.max(0, attempt.test.durationSeconds - elapsed);

      return {
        attempt: {
          id: attempt.id,
          type: attempt.type,
          stage: attempt.stage,
          answerDraft: attempt.answerDraft,
          isSubmitted: attempt.isSubmitted,
          writingStartedAt: attempt.writingStartedAt,
        },
        test: {
          id: attempt.test.id,
          title: attempt.test.title,
          correctTranscription: attempt.test.correctTranscription,
          durationSeconds: attempt.test.durationSeconds,
        },
        secondsLeft,
        elapsedSeconds: elapsed,
      };
    },

    async submit(input: SubmitTypingAttemptInput, userId: string) {
      return db.transaction(async (tx) => {
        const attempt_user = await tx.query.user.findFirst({
          where: eq(user.id, userId),
        });

        const attempt = await tx.query.typingAttempts.findFirst({
          where: and(
            eq(typingAttempts.id, input.attemptId),
            eq(typingAttempts.userId, userId),
          ),
          with: { test: true },
        });

        if (!attempt) throw new Error("Attempt not found");
        if (attempt.isSubmitted) return { attempt, evaluation: null };

        const now = new Date();
        const durationSeconds = attempt.writingStartedAt
          ? Math.min(
              Math.floor(
                (now.getTime() - attempt.writingStartedAt.getTime()) / 1000,
              ),
              attempt.test.durationSeconds,
            )
          : attempt.test.durationSeconds;

        const evaluation = evaluateTypingTest(
          attempt.test.correctTranscription,
          input.answerFinal,
          durationSeconds,
        );

        await tx
          .update(typingAttempts)
          .set({
            answerFinal: input.answerFinal,
            isSubmitted: true,
            submittedAt: now,
            stage: "submitted",
            updatedAt: now,
          })
          .where(eq(typingAttempts.id, input.attemptId));

        const [result] = await tx
          .insert(typingResults)
          .values({
            attemptId: attempt.id,
            userId,
            fullMistakes: evaluation.fullMistakes,
            halfMistakes: evaluation.halfMistakes,
            grossErrors: Math.round(evaluation.grossErrors * 2),
            errorStrokes: Math.round(evaluation.errorStrokes),
            totalStrokes: evaluation.totalStrokes,
            netStrokes: evaluation.netStrokes,
            grossWpm: evaluation.grossWpm,
            netWpm: evaluation.netWpm,
            accuracy: evaluation.accuracy,
            netDph: evaluation.netDph,
            marksOutOf50: Math.round(evaluation.marksOutOf50 * 100),
            transcriptionTimeSeconds: durationSeconds,
            submittedAt: now,
          })
          .returning();

        if (attempt.type === "test" && !attempt_user?.isDemo) {
          await tx
            .insert(typingLeaderboard)
            .values({
              testId: attempt.testId,
              resultId: result!.id,
              userId,
              netDph: evaluation.netDph,
              marksOutOf50: Math.round(evaluation.marksOutOf50 * 100),
              accuracy: evaluation.accuracy,
              fullMistakes: evaluation.fullMistakes,
              transcriptionTimeSeconds: durationSeconds,
              attemptedAt: now,
            })
            .onConflictDoNothing();
        }

        return { attempt, result: result!, evaluation };
      });
    },

    async getResult(attemptId: string, userId: string) {
      const attempt = await db.query.typingAttempts.findFirst({
        where: and(
          eq(typingAttempts.id, attemptId),
          eq(typingAttempts.userId, userId),
        ),
        with: { test: true, result: true },
      });
      if (!attempt) throw new Error("Attempt not found");
      if (!attempt.isSubmitted) throw new Error("Not submitted");
      if (!attempt.result) throw new Error("Result not found");

      const diff = compareTranscriptions(
        attempt.test.correctTranscription,
        attempt.answerFinal ?? "",
      );

      return {
        attempt: {
          id: attempt.id,
          type: attempt.type,
          submittedAt: attempt.submittedAt,
          answerFinal: attempt.answerFinal,
        },
        test: {
          id: attempt.test.id,
          title: attempt.test.title,
          correctTranscription: attempt.test.correctTranscription,
          durationSeconds: attempt.test.durationSeconds,
        },
        result: attempt.result,
        diff,
      };
    },

    async getResultAdmin(attemptId: string) {
      const attempt = await db.query.typingAttempts.findFirst({
        where: eq(typingAttempts.id, attemptId),
        with: { test: true, result: true },
      });
      if (!attempt) throw new Error("Attempt not found");
      if (!attempt.isSubmitted) throw new Error("Not submitted");
      if (!attempt.result) throw new Error("Result not found");

      const diff = compareTranscriptions(
        attempt.test.correctTranscription,
        attempt.answerFinal ?? "",
      );

      return {
        attempt: {
          id: attempt.id,
          type: attempt.type,
          submittedAt: attempt.submittedAt,
          answerFinal: attempt.answerFinal,
        },
        test: {
          id: attempt.test.id,
          title: attempt.test.title,
          correctTranscription: attempt.test.correctTranscription,
          durationSeconds: attempt.test.durationSeconds,
        },
        result: attempt.result,
        diff,
      };
    },

    async getUserAttempts(testId: string, userId: string) {
      return db.query.typingAttempts
        .findMany({
          where: and(
            eq(typingAttempts.testId, testId),
            eq(typingAttempts.userId, userId),
            eq(typingAttempts.isSubmitted, true),
          ),
          columns: { id: true, submittedAt: true },
          orderBy: desc(typingAttempts.submittedAt),
        })
        .then((rows) => rows.map((r) => ({ attemptId: r.id })));
    },
  };
}

import { db } from "~/server/db";
import {
  compareTranscriptions,
  evaluateTypingTest,
} from "~/server/services/typing-scoring.service";
export const typingAttemptService = createTypingAttemptService(db);
