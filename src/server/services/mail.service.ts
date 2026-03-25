import { Resend } from "resend";
import { env } from "~/env";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

type BroadcastInput = {
  emails: string[];
  subject: string;
  html: string;
  batchSize?: number;
};

export class EmailService {
  private resend: Resend;
  private defaultFrom: string;

  constructor(key: string) {
    this.resend = new Resend(key);
    this.defaultFrom = "onboarding@resend.dev";
  }

  async sendEmail(input: SendEmailInput) {
    const { to, subject, html, from } = input;

    try {
      return await this.resend.emails.send({
        from: from || this.defaultFrom,
        to,
        subject,
        html,
      });
    } catch (err) {
      console.error("Email send failed:", err);
      throw new Error("Failed to send email");
    }
  }

  async sendBulk(input: BroadcastInput) {
    const { emails, subject, html } = input;

    try {
      const res = await this.resend.batch.send(
        emails.map((email) => ({
          from: this.defaultFrom,
          to: email,
          subject,
          html,
        })),
      );

      return {
        total: emails.length,
        success: res.data?.length ?? 0,
        errors: res.error ?? null,
      };
    } catch (err) {
      console.error("Bulk email failed:", err);
      throw new Error("Bulk email failed");
    }
  }

  async broadcast(input: BroadcastInput) {
    return this.sendBulk(input);
  }

  async sendPaymentSubmitted(to: string) {
    return this.sendEmail({
      to,
      subject: "📩 Payment Received — Under Review",
      html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6; max-width:600px; margin:auto;">
        <h2>Thanks for your submission 🙌</h2>

        <p>We’ve received your payment proof and our team is reviewing it.</p>

        <div style="margin:16px 0; padding:12px; background:#f6f8fa; border-radius:8px;">
          ⏳ <strong>Verification usually takes a few hours.</strong>
        </div>

        <p>You’ll be notified once it's approved.</p>

        <a href="${env.APP_URL}/user" 
           style="display:inline-block; margin-top:16px; padding:10px 16px; background:#000; color:#fff; text-decoration:none; border-radius:6px;">
          Go to Dashboard
        </a>

        <p style="margin-top:20px;">— Team</p>
      </div>
    `,
    });
  }

  async sendPaymentApproved(to: string) {
    return this.sendEmail({
      to,
      subject: "🎉 You're In! Subscription Activated",
      html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6; max-width:600px; margin:auto;">
        <h2>🎉 Welcome aboard!</h2>

        <p>Your payment has been successfully verified.</p>

        <div style="margin:16px 0; padding:12px; background:#ecfdf5; border-radius:8px;">
          ✅ <strong>Your subscription is now active.</strong>
        </div>

        <p>You now have full access to all premium features.</p>

        <a href="${env.APP_URL}/user" 
           style="display:inline-block; margin-top:16px; padding:12px 18px; background:#16a34a; color:#fff; text-decoration:none; border-radius:6px;">
          Start Using Now →
        </a>

        <p style="margin-top:20px;">Let’s get you moving 🚀</p>

        <p>— Team</p>
      </div>
    `,
    });
  }

  async sendPaymentRejected(to: string, reason?: string) {
    return this.sendEmail({
      to,
      subject: "⚠️ Payment Verification Issue",
      html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6; max-width:600px; margin:auto;">
        <h2>We couldn’t verify your payment</h2>

        <p>Something didn’t match during verification.</p>

        ${
          reason
            ? `
          <div style="margin:16px 0; padding:12px; background:#fff3f3; border-radius:8px;">
            <strong>Reason:</strong> ${reason}
          </div>
        `
            : ""
        }

        <p>Please re-submit your payment details.</p>

        <a href="${env.APP_URL}/user" 
           style="display:inline-block; margin-top:16px; padding:10px 16px; background:#dc2626; color:#fff; text-decoration:none; border-radius:6px;">
          Try Again
        </a>

        <p style="margin-top:20px;">
          If this seems incorrect, contact support.
        </p>

        <p>— Team</p>
      </div>
    `,
    });
  }
}

export const emailService = new EmailService(env.RESEND_API_KEY);
