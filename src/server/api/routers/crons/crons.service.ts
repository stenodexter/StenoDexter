import {
  and,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { env } from "~/env";
import { db } from "~/server/db";
import {
  leaderboard,
  results,
  subscription,
  testAttempts,
  testSpeeds,
  typingAttempts,
  typingLeaderboard,
  typingResults,
  user,
} from "~/server/db/schema";
import { emailService } from "~/server/services/mail.service";

export const cronService = {
  async expireSubscriptions() {
    const now = new Date();

    const result = await db
      .update(subscription)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscription.status, "active"),
          lt(subscription.currentPeriodEnd, now),
        ),
      );

    console.log("Expired subscriptions cron ran");
  },

  async sendExpiryReminders() {
    const now = new Date();

    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);

    const subs = await db
      .select({
        subId: subscription.id,
        userId: subscription.userId,
        email: user.email,
        name: user.name,
        currentPeriodEnd: subscription.currentPeriodEnd,
        lastReminderSentAt: subscription.lastReminderSentAt,
      })
      .from(subscription)
      .innerJoin(user, eq(subscription.userId, user.id))
      .where(
        and(
          eq(subscription.status, "active"),
          lte(subscription.currentPeriodEnd, threeDaysLater),
          gt(subscription.currentPeriodEnd, now),

          or(
            isNull(subscription.lastReminderSentAt),
            lte(
              subscription.lastReminderSentAt,
              new Date(now.getTime() - 24 * 60 * 60 * 1000),
            ),
          ),
        ),
      );

    console.log(`Found ${subs.length} users nearing expiry`);

    for (const sub of subs) {
      try {
        await emailService.sendEmail({
          to: sub.email,
          subject: "Steno Dexter Subscription Expiring Soon",
          html: `
            <div style="font-family: Arial, sans-serif; line-height:1.6; max-width:600px; margin:auto;">
              <h2>Hello ${sub.name || "there"}, 👋</h2>

              <p>Your subscription is about to expire soon.</p>

              <div style="margin:16px 0; padding:12px; background:#fff7ed; border-radius:8px;">
                ⏳ <strong>Expires on:</strong> ${new Date(sub.currentPeriodEnd).toDateString()}
              </div>

              <p>
                To avoid interruption, please renew your subscription.
              </p>

              <a href="${env.APP_URL}/user/payments?openRenew=true" 
                style="display:inline-block; margin-top:16px; padding:12px 18px; background:#f59e0b; color:#fff; text-decoration:none; border-radius:6px;">
                Renew Subscription
              </a>

              <p style="margin-top:20px;">
                You won’t lose your remaining days — they’ll be preserved.
              </p>

              <p>Thanks for being with us 🙏</p>

              <p>— Team</p>
            </div>
        `,
        });

        await db
          .update(subscription)
          .set({ lastReminderSentAt: new Date() })
          .where(eq(subscription.id, sub.subId));
      } catch (err) {
        console.error("Failed to send reminder:", sub.email, err);
      }
    }
  },

  async deleteStaleAttempts() {
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - TWO_HOURS_MS).toISOString();
    // ── 1. dictation test attempts ────────────────────────────────────────────

    const staleTestAttempts = await db
      .select({
        id: testAttempts.id,
      })
      .from(testAttempts)
      .innerJoin(testSpeeds, eq(testAttempts.speedId, testSpeeds.id))
      .where(
        and(
          eq(testAttempts.isSubmitted, false),
          isNotNull(testAttempts.stageStartedAt),
          sql`${testAttempts.stageStartedAt} + make_interval(secs => ${testSpeeds.dictationSeconds} + ${testSpeeds.breakSeconds} + ${testSpeeds.writtenDurationSeconds}) < ${cutoff}`,
        ),
      );

    if (staleTestAttempts.length > 0) {
      const staleTestAttemptIds = staleTestAttempts.map((a) => a.id);

      // Find results linked to these attempts (needed to find leaderboard entries)
      const linkedResults = await db
        .select({ id: results.id })
        .from(results)
        .where(inArray(results.attemptId, staleTestAttemptIds));

      if (linkedResults.length > 0) {
        const linkedResultIds = linkedResults.map((r) => r.id);

        // Delete leaderboard entries first (resultId has onDelete: "restrict")
        await db
          .delete(leaderboard)
          .where(inArray(leaderboard.resultId, linkedResultIds));

        // Delete results next (attemptId has onDelete: "cascade" but being explicit)
        await db.delete(results).where(inArray(results.id, linkedResultIds));
      }

      // Delete attempts last
      await db
        .delete(testAttempts)
        .where(inArray(testAttempts.id, staleTestAttemptIds));

      console.log(
        `Deleted ${staleTestAttempts.length} stale dictation attempt(s) ` +
          `and ${linkedResults?.length ?? 0} associated result(s).`,
      );
    } else {
      console.log("No stale dictation attempts found.");
    }

    // ── 2. typing test attempts ───────────────────────────────────────────────

    const staleTypingAttempts = await db
      .select({ id: typingAttempts.id })
      .from(typingAttempts)
      .where(
        and(
          eq(typingAttempts.isSubmitted, false),
          isNotNull(typingAttempts.writingStartedAt),
          // typing tests have a fixed durationSeconds on the test itself
          sql`${typingAttempts.writingStartedAt} + make_interval(secs => (
              SELECT duration_seconds FROM typing_tests
              WHERE id = ${typingAttempts.testId}
            )) < ${cutoff}`,
        ),
      );

    if (staleTypingAttempts.length > 0) {
      const staleTypingAttemptIds = staleTypingAttempts.map((a) => a.id);

      const linkedTypingResults = await db
        .select({ id: typingResults.id })
        .from(typingResults)
        .where(inArray(typingResults.attemptId, staleTypingAttemptIds));

      if (linkedTypingResults.length > 0) {
        const linkedTypingResultIds = linkedTypingResults.map((r) => r.id);

        // Delete leaderboard entries first (resultId has onDelete: "restrict")
        await db
          .delete(typingLeaderboard)
          .where(inArray(typingLeaderboard.resultId, linkedTypingResultIds));

        // Delete results
        await db
          .delete(typingResults)
          .where(inArray(typingResults.id, linkedTypingResultIds));
      }

      // Delete attempts last
      await db
        .delete(typingAttempts)
        .where(inArray(typingAttempts.id, staleTypingAttemptIds));

      console.log(
        `Deleted ${staleTypingAttempts.length} stale typing attempt(s) ` +
          `and ${linkedTypingResults?.length ?? 0} associated result(s).`,
      );
    } else {
      console.log("No stale typing attempts found.");
    }
  },
};
