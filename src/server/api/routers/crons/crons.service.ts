import { and, eq, gt, isNull, lt, lte, or } from "drizzle-orm";
import { env } from "~/env";
import { db } from "~/server/db";
import { subscription, user } from "~/server/db/schema";
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
};
