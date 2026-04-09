import { emailService } from "~/server/services/mail.service";

export async function sendResetPasswordEmail(
  user: { email: string },
  url: string,
) {
  await emailService.sendEmail({
    to: user.email,
    subject: "Steno Dexter — Reset your password",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:auto;">
        <h2>Reset your password</h2>
        <p>Click below to set a new password. This link expires in 1 hour.</p>
        <a href="${url}"
           style="display:inline-block;margin-top:16px;padding:10px 18px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password →
        </a>
        <p style="margin-top:20px;color:#666;font-size:13px;">
          If you didn't request this, ignore this email.
        </p>
        <p>— Team</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(
  user: { email: string },
  url: string,
) {
  await emailService.sendEmail({
    to: user.email,
    subject: "Steno Dexter — Verify your email",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:auto;">
        <h2>Verify your email</h2>
        <p>Click below to confirm your email address.</p>
        <a href="${url}"
           style="display:inline-block;margin-top:16px;padding:10px 18px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
          Verify Email →
        </a>
        <p style="margin-top:20px;color:#666;font-size:13px;">
          If you didn't create an account, ignore this.
        </p>
        <p>— Team</p>
      </div>
    `,
  });
}
