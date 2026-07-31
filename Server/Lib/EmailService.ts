import nodemailer, { SendMailOptions, Transporter } from "nodemailer";
import crypto from "crypto";
import { configDotenv } from "dotenv";
import { Resend } from "resend";
configDotenv();

const resendApi = process.env.RESEND_API_KEY;
  /**
 * Shared layout for all Chamapay transactional emails.
 * Keeps every email visually consistent: logo header, one accent color
 * used sparingly, plenty of whitespace, muted footer. Inline styles +
 * a table-based wrapper for reliable rendering across email clients
 * (Gmail, Outlook, Apple Mail all strip <style> blocks unpredictably).
 */
const LOGO_URL = "https://chamapay.xyz/images/logo.png";

// Brand palette — pulled from tailwind.config.js `downy` scale, plus the
// standard gray/emerald tokens the app already uses for neutral text and
// success states, so these emails match the in-app look exactly.
const ACCENT = "#1c8584"; // downy-600, primary brand color (buttons/icons in-app)
const ACCENT_SOFT = "#26a6a2"; // downy-500, lighter accent for less prominent highlights
const SUCCESS = "#059669"; // emerald-600, reserved for "money received" confirmations
const INK = "#111827"; // gray-900
const MUTED = "#6b7280"; // gray-500
const BORDER = "#e5e7eb"; // gray-200
const SURFACE = "#f1fcfa"; // downy-50, brand-tinted light background

if (!resendApi) {
  throw new Error("The resend api is not set.");
}
const resend = new Resend(resendApi);

// Interface for email send result
interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function wrapEmail(bodyHtml: string, opts?: { preheader?: string }) {
  return `
  <div style="background-color:#f4f5f7; padding:40px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${
      opts?.preheader
        ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>`
        : ""
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto;">
      <tr>
        <td style="background-color:#ffffff; border:1px solid ${BORDER}; border-radius:16px; overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:32px 32px 24px; text-align:center;">
                <img src="${LOGO_URL}" alt="Chamapay" height="28" style="height:28px; width:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px; color:${INK};">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 8px 0; text-align:center;">
          <p style="margin:0; font-size:12px; line-height:18px; color:${MUTED};">
            Chamapay &middot; Save together, grow together.
          </p>
          <p style="margin:4px 0 0; font-size:12px; line-height:18px; color:${MUTED};">
            You're receiving this because you have a Chamapay account.
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}

function heading(text: string) {
  return `<h1 style="margin:0 0 12px; font-size:20px; line-height:28px; font-weight:600; color:${INK};">${text}</h1>`;
}

function paragraph(text: string) {
  return `<p style="margin:0 0 16px; font-size:15px; line-height:22px; color:#374151;">${text}</p>`;
}

class EmailService {
  private transporter: Transporter;

  constructor() {
    // Configure your email service here
    // For development, you can use Gmail or SendGrid
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Generate 6-digit OTP
  generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Send OTP email (legacy, replacing with Resend)
  async sendOTPEmail(
    email: string,
    otp: string,
    name: string = "User"
  ): Promise<EmailResult> {
    return this.sendResendOTPEmail(email, otp);
  }


  async sendResendOTPEmail(email: string, code: string) {
    try {
      const body = `
        ${heading("Verify it's you")}
        ${paragraph("Use the code below to finish signing in to Chamapay. It expires in 10 minutes.")}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:20px; text-align:center; margin:24px 0;">
          <span style="font-size:32px; font-weight:700; letter-spacing:8px; color:${ACCENT};">${code}</span>
        </div>
        <p style="margin:0; font-size:13px; line-height:20px; color:${MUTED};">
          Didn't request this? You can safely ignore this email.
        </p>
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <noreply@chamapay.xyz>",
        to: email,
        subject: "Your Chamapay verification code",
        html: wrapEmail(body, { preheader: `Your verification code is ${code}` }),
      });

      if (error) {
        console.error("Resend error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending OTP email:", error);
      return { success: false, error: "Failed to send email" };
    }
  }

  async sendPayoutEmail(email: string, amount: string, chamaName: string, round: number) {
    try {
      const body = `
        ${heading("Payout received")}
        ${paragraph(
          `You've received a payout of <strong style="color:${INK};">${amount} USDC</strong> for round ${round} of <strong style="color:${INK};">${chamaName}</strong>.`
        )}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px; color:${MUTED};">Chama</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${chamaName}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Round</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${round}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Amount</td>
              <td style="font-size:13px; color:${SUCCESS}; text-align:right; font-weight:700; padding-top:8px;">${amount} USDC</td>
            </tr>
          </table>
        </div>
        ${paragraph("Open the Chamapay app to see your updated wallet balance.")}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: `Payout received — ${chamaName}`,
        html: wrapEmail(body, { preheader: `You received ${amount} USDC from ${chamaName}` }),
      });
      if (error) console.error("Resend error:", error);
      return { success: !error };
    } catch (error) {
      console.error("Error sending payout email:", error);
      return { success: false };
    }
  }

  async sendBulkReminderEmails(emails: string[], chamaName: string, daysLeft: number) {
    if (emails.length === 0) return { success: true };
    try {
      const body = `
        ${heading("Payout approaching")}
        ${paragraph(
          `The next payout for <strong style="color:${INK};">${chamaName}</strong> is in <strong style="color:${ACCENT_SOFT};">${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong>. Make sure your contribution is in on time.`
        )}
      `;

      const payload = emails.map((email) => ({
        from: "Chamapay <reminders@chamapay.xyz>",
        to: email,
        subject: `Payout in ${daysLeft} day${daysLeft === 1 ? "" : "s"} — ${chamaName}`,
        html: wrapEmail(body, { preheader: `${chamaName} payout is coming up in ${daysLeft} days` }),
      }));

      // Resend batch send takes up to 100 emails at a time.
      const batches = [];
      for (let i = 0; i < payload.length; i += 100) {
        batches.push(resend.batch.send(payload.slice(i, i + 100)));
      }

      await Promise.all(batches);
      return { success: true };
    } catch (error) {
      console.error("Error sending bulk reminder emails:", error);
      return { success: false };
    }
  }

  async sendBulkChamaUpdateEmails(emails: string[], chamaName: string, message: string) {
    if (emails.length === 0) return { success: true };
    try {
      const body = `
        ${heading("Chama update")}
        ${paragraph(`There's a new update for <strong style="color:${INK};">${chamaName}</strong>:`)}
        <div style="background-color:${SURFACE}; border-left:3px solid ${ACCENT}; border-radius:0 8px 8px 0; padding:14px 18px; margin:16px 0; font-size:14px; line-height:21px; color:${INK};">
          ${message}
        </div>
      `;

      const payload = emails.map((email) => ({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: `Update from ${chamaName}`,
        html: wrapEmail(body, { preheader: `New update for ${chamaName}` }),
      }));

      const batches = [];
      for (let i = 0; i < payload.length; i += 100) {
        batches.push(resend.batch.send(payload.slice(i, i + 100)));
      }

      await Promise.all(batches);
      return { success: true };
    } catch (error) {
      console.error("Error sending bulk update emails:", error);
      return { success: false };
    }
  }

  async sendUSDCReceivedEmail(email: string, amount: string, txHash: string) {
    try {
      const shortHash = txHash.length > 18 ? `${txHash.slice(0, 10)}…${txHash.slice(-8)}` : txHash;
      const body = `
        ${heading("Deposit confirmed")}
        ${paragraph(`Your wallet just received <strong style="color:${SUCCESS};">${amount} USDC</strong>.`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <p style="margin:0; font-size:12px; color:${MUTED};">Transaction hash</p>
          <p style="margin:4px 0 0; font-size:13px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; color:${INK}; word-break:break-all;">${shortHash}</p>
        </div>
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <deposits@chamapay.xyz>",
        to: email,
        subject: "USDC deposit received",
        html: wrapEmail(body, { preheader: `${amount} USDC deposited to your wallet` }),
      });
      if (error) console.error("Resend error:", error);
      return { success: !error };
    } catch (error) {
      console.error("Error sending USDC received email:", error);
      return { success: false };
    }
  }
}

export default new EmailService();
