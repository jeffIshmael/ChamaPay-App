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
    ${opts?.preheader
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

function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function formatEmailTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function emailActionButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
      <tr>
        <td style="background-color:${ACCENT}; border-radius:8px;">
          <a href="${escapeEmailHtml(url)}"
             style="display:inline-block; padding:12px 22px; color:#ffffff; text-decoration:none; font-size:14px; line-height:20px; font-weight:600;">
            ${escapeEmailHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
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
    name: string = "User",
  ): Promise<EmailResult> {
    return this.sendResendOTPEmail(email, otp);
  }

  async sendResendOTPEmail(email: string, code: string) {
    try {
      const body = `
        ${heading("Your Chamapay verification code")}
  
        <p style="
          margin:0 0 16px;
          font-size:15px;
          line-height:24px;
          color:${MUTED};
        ">
          Use the verification code below to finish signing in to Chamapay.
          This code expires in 10 minutes.
        </p>
  
        <div style="
          background-color:${SURFACE};
          border-radius:12px;
          padding:24px 20px;
          text-align:center;
          margin:20px 0;
        ">
          <span style="
            display:inline-block;
            font-size:32px;
            font-weight:700;
            letter-spacing:8px;
            color:${ACCENT};
            font-family:monospace;
          ">${code}</span>
        </div>
  
        <p style="
          margin:0;
          font-size:13px;
          line-height:20px;
          color:${MUTED};
        ">
          Didn't request this? You can safely ignore this email.
        </p>
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <noreply@chamapay.xyz>",
        to: email,

        subject: "Your Chamapay login code",

        // Plain-text version for email clients
        text: [
          "Your Chamapay verification code is:",
          "",
          code,
          "",
          "Use this code to finish signing in to Chamapay.",
          "This code expires in 10 minutes.",
          "",
          "Didn't request this? You can safely ignore this email.",
        ].join("\n"),

        // HTML version
        html: wrapEmail(body, {
          preheader: `Your Chamapay verification code is ${code}. Expires in 10 minutes.`,
        }),
      });

      if (error) {
        console.error("Resend error:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      console.error("Error sending OTP email:", error);

      return {
        success: false,
        error: "Failed to send email",
      };
    }
  }

  async sendPayoutEmail(
    email: string,
    amountUSDC: string,
    amountKES: string | null,
    chamaName: string,
    round: number,
  ) {
    try {
      const amountDisplay = amountKES
        ? `${amountKES} KES(approx. ${Number(amountUSDC).toFixed(3)} USDC)`
        : `${Number(amountUSDC).toFixed(3)} USDC`;
      const body = `
        ${heading("Payout received 💰")}
        ${paragraph(
        `You've received a payout of <strong style="color:${INK};">${amountDisplay}</strong> for round ${round} of <strong style="color:${INK};">${chamaName}</strong>.`,
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
              <td style="font-size:13px; color:${SUCCESS}; text-align:right; font-weight:700; padding-top:8px;">${amountDisplay}</td>
            </tr>
          </table>
        </div>
        ${paragraph("Open the Chamapay app to see your updated wallet balance.")}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: `Payout received — ${chamaName}`,
        html: wrapEmail(body, {
          preheader: `You received ${amountUSDC} USDC from ${chamaName}`,
        }),
      });
      if (error) console.error("Resend error:", error);
      return { success: !error };
    } catch (error) {
      console.error("Error sending payout email:", error);
      return { success: false };
    }
  }

  async sendBulkPayoutCompletedEmails(
    emails: string[],
    chamaName: string,
    cycle: number,
    round: number,
    recipientName: string,
    amountUSDC: string,
    amountKES: string | null,
  ) {
    if (emails.length === 0) return { success: true };
    try {
      const amountDisplay = amountKES
        ? `${amountKES} KES(approx. ${Number(amountUSDC).toFixed(3)} USDC)`
        : `${Number(amountUSDC).toFixed(3)} USDC`;
      const body = `
        ${heading("Payout completed")}
        ${paragraph(`Cycle ${cycle}, Round ${round} of <strong style="color:${INK};">${chamaName}</strong> is complete.`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px; color:${MUTED};">Chama</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${chamaName}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Recipient</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${recipientName}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Amount</td>
              <td style="font-size:13px; color:${SUCCESS}; text-align:right; font-weight:700; padding-top:8px;">${amountDisplay}</td>
            </tr>
          </table>
        </div>
        ${paragraph("Open the Chamapay app to view the outcome and your updated balance.")}
      `;

      const payload = emails.map((email) => ({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: `Payout completed — ${chamaName}`,
        html: wrapEmail(body, {
          preheader: `${recipientName} received ${amountUSDC} USDC from ${chamaName}`,
        }),
      }));

      const batches = [];
      for (let i = 0; i < payload.length; i += 100) {
        batches.push(resend.batch.send(payload.slice(i, i + 100)));
      }

      await Promise.all(batches);
      return { success: true };
    } catch (error) {
      console.error("Error sending bulk payout completed emails:", error);
      return { success: false };
    }
  }

  async sendBulkRefundEmails(
    emails: string[],
    chamaName: string,
    cycle: number,
    round: number,
  ) {
    if (emails.length === 0) return { success: true };
    try {
      const body = `
        ${heading("Payout skipped — funds refunded")}
        ${paragraph(
        `Cycle ${cycle}, Round ${round} of <strong style="color:${INK};">${chamaName}</strong> didn't go through because some members didn't contribute.`,
      )}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px; color:${MUTED};">Chama</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${chamaName}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Cycle</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${cycle}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Round</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${round}</td>
            </tr>
          </table>
        </div>
        ${paragraph("Your contribution has been refunded to your wallet. Open the Chamapay app to confirm your balance. The next payout date has been updated — please contribute on time for the next round.")}
      `;

      const payload = emails.map((email) => ({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: `Refund issued — ${chamaName}`,
        html: wrapEmail(body, {
          preheader: `Round ${round} of ${chamaName} was skipped and contributions were refunded`,
        }),
      }));

      const batches = [];
      for (let i = 0; i < payload.length; i += 100) {
        batches.push(resend.batch.send(payload.slice(i, i + 100)));
      }

      await Promise.all(batches);
      return { success: true };
    } catch (error) {
      console.error("Error sending bulk refund emails:", error);
      return { success: false };
    }
  }

  async sendBulkReminderEmails(
    emails: string[],
    chamaName: string,
    daysLeft: number,
    payoutDate?: Date | string,
  ) {
    if (emails.length === 0) return { success: true };
    try {
      const payoutDateLabel = payoutDate
        ? new Date(payoutDate).toLocaleString("en-US", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        : null;

      const body = `
        ${heading(`Payout in ${daysLeft} days`)}
        ${paragraph(
        `The next payout for <strong style="color:${INK};">${chamaName}</strong> is in <strong style="color:${ACCENT_SOFT};">${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong>.`,
      )}
        ${payoutDateLabel
          ? `<div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px; color:${MUTED};">Chama</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${chamaName}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Payout date</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${payoutDateLabel}</td>
            </tr>
          </table>
        </div>`
          : ""
        }
        ${paragraph(
          "Please make sure your contribution is in <strong>before</strong> this date and time. Late or missing contributions can cause the payout to be skipped and funds refunded.",
        )}
      `;

      const payload = emails.map((email) => ({
        from: "Chamapay <reminders@chamapay.xyz>",
        to: email,
        subject: `Payout in ${daysLeft} day${daysLeft === 1 ? "" : "s"} — ${chamaName}`,
        html: wrapEmail(body, {
          preheader: payoutDateLabel
            ? `${chamaName} payout is on ${payoutDateLabel}`
            : `${chamaName} payout is coming up in ${daysLeft} days`,
        }),
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

  async sendBulkChamaUpdateEmails(
    emails: string[],
    chamaName: string,
    message: string,
  ) {
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

  async sendMpesaDepositEmail(
    email: string,
    amountUSDC: string,
    amountKES: string | null,
    receiptNumber: string,
    phoneNumber: string,
    time: string,
  ) {
    try {
      const amountDisplay = amountKES
        ? `${amountKES} KES (${Number(amountUSDC).toFixed(3)} USDC)`
        : `${Number(amountUSDC).toFixed(3)} USDC`;
      const trimmedPhone =
        phoneNumber.length > 4 ? `...${phoneNumber.slice(-4)}` : phoneNumber;
      const body = `
        ${heading("M-Pesa Deposit Confirmed")}
        ${paragraph(`You have successfully deposited <strong style="color:${SUCCESS};">${amountDisplay}</strong> via M-Pesa.`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px; color:${MUTED};">Receipt Number</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${receiptNumber}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Phone Number</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${trimmedPhone}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Time</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${time}</td>
            </tr>
          </table>
        </div>
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <deposits@chamapay.xyz>",
        to: email,
        subject: "M-Pesa deposit received",
        html: wrapEmail(body, {
          preheader: `${amountKES ? `${amountKES} KES` : `${amountUSDC} USDC`} deposited to your wallet via M-Pesa`,
        }),
      });
      if (error) console.error("Resend error:", error);
      return { success: !error };
    } catch (error) {
      console.error("Error sending M-Pesa deposit email:", error);
      return { success: false };
    }
  }

  async sendMpesaWithdrawEmail(
    email: string,
    amountUSDC: string,
    amountKES: string | null,
    receiptNumber: string,
    phoneNumber: string,
    time: string,
  ) {
    try {
      let fee = 0;
      let amountKESNumber = 0;
      if (amountKES) {
        amountKESNumber = parseFloat(amountKES);
        // get the 2.5% fee of the amount
        fee = Number(((2.5 / 100) * amountKESNumber).toFixed(2));
      }

      const amountDisplay = amountKES
        ? `${amountKESNumber.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES (${parseFloat(amountUSDC).toFixed(4)} USDC)`
        : `${parseFloat(amountUSDC).toFixed(3)} USDC`;

      const body = `
        ${heading("M-Pesa Withdrawal Confirmed")}
        ${paragraph(`You have successfully withdrawn <strong style="color:${SUCCESS};">${amountDisplay}</strong> to your M-Pesa.`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px; color:${MUTED};">Amount Withdrawn</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${amountKES ? `${amountKESNumber.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES` : `${parseFloat(amountUSDC).toFixed(4)} USDC`}</td>
            </tr>
            ${amountKES
          ? `
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Processing Fee</td>
              <td style="font-size:13px; color:#d97706; text-align:right; font-weight:600; padding-top:8px;">- ${fee.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Amount Received</td>
              <td style="font-size:13px; color:${SUCCESS}; text-align:right; font-weight:600; padding-top:8px;">${(amountKESNumber - fee).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KES</td>
            </tr>`
          : ""
        }
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Phone Number</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${phoneNumber}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Receipt Number</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${receiptNumber}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Time</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${time}</td>
            </tr>
          </table>
        </div>
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <withdrawals@chamapay.xyz>",
        to: email,
        subject: "M-Pesa withdrawal processed",
        html: wrapEmail(body, {
          preheader: `${amountKES ? `${amountKES} KES` : `${amountUSDC} USDC`} successfully withdrawn via M-Pesa`,
        }),
      });
      if (error) console.error("Resend error:", error);
      return { success: !error };
    } catch (error) {
      console.error("Error sending M-Pesa withdrawal email:", error);
      return { success: false };
    }
  }

  async sendUSDCReceivedEmail(
    email: string,
    amountUSDC: string,
    amountKES: string | null,
    senderDisplayName: string,
    time: string,
  ) {
    try {
      const amountDisplay = amountKES
        ? `${amountKES} KES(approx. ${Number(amountUSDC).toFixed(3)} USDC)`
        : `${Number(amountUSDC).toFixed(3)} USDC`;
      const body = `
        ${heading("Cash Received")}
        ${paragraph(`You have received <strong style="color:${SUCCESS};">${amountDisplay}</strong> from ${senderDisplayName}.`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px; color:${MUTED};">Sender</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${senderDisplayName}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Time</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${time}</td>
            </tr>
          </table>
        </div>
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <transfers@chamapay.xyz>",
        to: email,
        subject: "USDC received",
        html: wrapEmail(body, {
          preheader: `${amountUSDC} USDC received from ${senderDisplayName}`,
        }),
      });
      if (error) console.error("Resend error:", error);
      return { success: !error };
    } catch (error) {
      console.error("Error sending USDC received email:", error);
      return { success: false };
    }
  }
  async sendMemberAddedToExistingMembersEmail(
    emails: string[],
    chamaName: string,
    newMemberName: string,
    totalMembers: number,
  ) {
    try {
      const body = `
        ${heading("New member joined")}
        ${paragraph(
        `<strong style="color:${INK};">${newMemberName}</strong> has just been added to <strong style="color:${INK};">${chamaName}</strong>.`,
      )}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px; color:${MUTED};">Chama</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${chamaName}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Total Members</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${totalMembers}</td>
            </tr>
          </table>
        </div>
      `;

      const payload = emails.map((email) => ({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: `New member joined — ${chamaName}`,
        html: wrapEmail(body, {
          preheader: `${newMemberName} joined ${chamaName}`,
        }),
      }));

      const batches = [];
      for (let i = 0; i < payload.length; i += 100) {
        batches.push(resend.batch.send(payload.slice(i, i + 100)));
      }

      await Promise.all(batches);
      return { success: true };
    } catch (error) {
      console.error("Error sending existing member update emails:", error);
      return { success: false };
    }
  }

  async sendMemberAddedToNewMemberEmail(
    email: string,
    chamaName: string,
    adminName: string,
    contributionAmountUSDC: string,
    contributionAmountKES: string | null,
    cycleDays: number,
    nextPayoutDate: Date,
  ) {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const formattedDate = formatter.format(nextPayoutDate);
      const amountDisplay = contributionAmountKES
        ? ` ${contributionAmountKES} KES(approx. ${Number(contributionAmountUSDC).toFixed(3)} USDC)`
        : `${Number(contributionAmountUSDC).toFixed(3)} USDC`;

      const body = `
        ${heading("You've been added to a Chama 🎉")}
        ${paragraph(
        `Congratulations! You have been added to <strong style="color:${INK};">${chamaName}</strong> by <strong>${adminName}</strong>.`,
      )}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px; color:${MUTED};">Chama</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${chamaName}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Contribution</td>
              <td style="font-size:13px; color:${SUCCESS}; text-align:right; font-weight:700; padding-top:8px;">${amountDisplay} every ${cycleDays} days</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Next Payout Date</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${formattedDate}</td>
            </tr>
          </table>
        </div>
        ${paragraph("Open the Chamapay app to view your Chama details and start contributing!")}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <welcome@chamapay.xyz>",
        to: email,
        subject: `You have been added to ${chamaName}`,
        html: wrapEmail(body, {
          preheader: `You were added to ${chamaName} by ${adminName}`,
        }),
      });
      if (error) console.error("Resend error:", error);
      return { success: !error };
    } catch (error) {
      console.error("Error sending new member welcome email:", error);
      return { success: false };
    }
  }
  async sendPaidForSomeoneEmail(
    email: string,
    payerName: string,
    amountUSDC: string,
    amountKES: string | null,
    chamaName: string,
  ) {
    try {
      const amountDisplay = amountKES
        ? `${amountKES} KES (approx. ${Number(amountUSDC).toFixed(3)} USDC)`
        : `${Number(amountUSDC).toFixed(3)} USDC`;
      const body = `
        ${heading("Payment Received on your behalf")}
        ${paragraph(
        `<strong style="color:${INK};">${payerName}</strong> has paid <strong style="color:${SUCCESS};">${amountDisplay}</strong> for your contribution to <strong style="color:${INK};">${chamaName}</strong>.`,
      )}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: `Payment received for ${chamaName}`,
        html: wrapEmail(body, {
          preheader: `${payerName} paid your contribution for ${chamaName}`,
        }),
      });
      if (error) console.error("Resend error:", error);
      return { success: !error };
    } catch (error) {
      console.error("Error sending paid for someone email:", error);
      return { success: false };
    }
  }
  async sendMemberRemovedEmail(
    email: string,
    chamaName: string,
    adminName: string,
  ) {
    try {
      const body = `
        ${heading("You've been removed from a Chama")}
        ${paragraph(
        `You have been removed from <strong style="color:${INK};">${chamaName}</strong> by the admin, <strong>${adminName}</strong>.`,
      )}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px; color:${MUTED};">Chama</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${chamaName}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Removed by</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${adminName}</td>
            </tr>
          </table>
        </div>
        ${paragraph(
        "Any funds you had in this Chama have been refunded to your wallet. You can check your balance anytime in the Chamapay app.",
      )}
        ${paragraph(
        `If you think this was a mistake, please reach out to ${adminName} directly. You're always welcome to join or create another Chama on Chamapay. 💚`,
      )}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <welcome@chamapay.xyz>",
        to: email,
        subject: `You have been removed from ${chamaName}`,
        html: wrapEmail(body, {
          preheader: `You were removed from ${chamaName} by ${adminName}`,
        }),
      });
      if (error) console.error("Resend error:", error);
      return { success: !error };
    } catch (error) {
      console.error("Error sending member removed email:", error);
      return { success: false };
    }
  }

  // additional emails 
  // Welcome email- sending to a new user
  // created - both for a chama and a goal
  // kyc submitted
  // kyc verified
  // kyc rejected
  // Goal contribution - should show percentage done
  // Goal half, 75% and completely done - More like congratulatory and giving morale
  // Goal withdraw - Should mention that the person withdrew from the goal, the amount and the time.
  // Failed deposit
  // Failed withdrawal. - Should bhave timestamp
  // Personal follow up email
  // Reminder email - idle chama, goals and users
  // 1. New account welcome email
  async sendWelcomeEmail(
    email: string,
    name: string,
    appUrl: string = "https://chamapay.xyz",
  ): Promise<EmailResult> {
    try {
      const safeName = escapeEmailHtml(name || "there");
      const body = `
        ${heading(`Welcome to Chamapay, ${safeName}!`)}
        ${paragraph("We're glad to have you here. Chamapay brings the traditional rotational savings (ROSCAs) into the digital age and makes it easy for group saving.")}
        ${paragraph("You can create a Chama/ merry-go-round with friends or colleagues, or set up a personal/ group's savings goal and track your progress along the way.")}
        ${emailActionButton("Explore Chamapay", appUrl)}
        ${paragraph("If you have any questions as you get started, just reply to this email. We're happy to help.")}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <welcome@chamapay.xyz>",
        to: email,
        subject: "Welcome to Chamapay!",
        html: wrapEmail(body, {
          preheader: "Your saving journey starts here. Welcome to Chamapay!",
        }),
        text: `Hi ${name || "there"},\n\nWelcome to Chamapay! Create a Chama with people you trust or set up a personal/ group savings goal.\n\nExplore Chamapay: ${appUrl}\n\nIf you need help, simply reply to this email.`,
      });

      if (error) {
        console.error("Error sending welcome email:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending welcome email:", error);
      return { success: false, error: "Failed to send welcome email" };
    }
  }

  // 2. Chama created confirmation
  async sendChamaCreatedEmail(
    email: string,
    name: string,
    chamaName: string,
    contributionAmount: string,
    contributionFrequency: string,
    appUrl: string = "https://chamapay.xyz",
  ): Promise<EmailResult> {
    try {
      const safeChamaName = escapeEmailHtml(chamaName);
      const body = `
        ${heading("Your Chama is ready!")}
        ${paragraph(`Hi ${escapeEmailHtml(name || "there")}, you've successfully created <strong style="color:${INK};">${safeChamaName}</strong> chama. You can now invite the people you want to save with.`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px; color:${MUTED};">Chama</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${safeChamaName}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Contribution</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${escapeEmailHtml(contributionAmount)}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Frequency</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${escapeEmailHtml(contributionFrequency)}</td>
            </tr>
          </table>
        </div>
        ${paragraph("Your Chama is private, so only the people you invite can be part of it.")}
        ${emailActionButton("View your Chama", appUrl)}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: `Your Chama "${chamaName}" has been created`,
        html: wrapEmail(body, { preheader: `${chamaName} is ready. Invite your members to get started.` }),
        text: `Hi ${name || "there"},\n\nYour Chama "${chamaName}" has been created.\nContribution: ${contributionAmount}\nFrequency: ${contributionFrequency}\n\nView your Chama: ${appUrl}`,
      });

      if (error) {
        console.error("Error sending Chama created email:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending Chama created email:", error);
      return { success: false, error: "Failed to send Chama created email" };
    }
  }

  // 3. Savings goal created confirmation
  async sendGoalCreatedEmail(
    email: string,
    name: string,
    goalName: string,
    targetAmount: string,
    targetDate?: Date | string | null,
    appUrl: string = "https://chamapay.xyz",
  ): Promise<EmailResult> {
    try {
      const targetDateLabel = targetDate ? formatEmailTimestamp(targetDate) : null;
      const body = `
        ${heading("Your savings goal is set!")}
        ${paragraph(`Hi ${escapeEmailHtml(name || "there")}, you've created a new goal: <strong style="color:${INK};">${escapeEmailHtml(goalName)}</strong>. Every contribution brings you closer to what you're working towards.`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px; color:${MUTED};">Goal</td>
              <td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${escapeEmailHtml(goalName)}</td>
            </tr>
            <tr>
              <td style="font-size:13px; color:${MUTED}; padding-top:8px;">Target amount</td>
              <td style="font-size:13px; color:${ACCENT}; text-align:right; font-weight:700; padding-top:8px;">${escapeEmailHtml(targetAmount)}</td>
            </tr>
            ${targetDateLabel ? `<tr><td style="font-size:13px; color:${MUTED}; padding-top:8px;">Target date</td><td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${escapeEmailHtml(targetDateLabel)}</td></tr>` : ""}
          </table>
        </div>
        ${emailActionButton("View your goal", appUrl)}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: `Your savings goal "${goalName}" has been created`,
        html: wrapEmail(body, { preheader: `Your ${goalName} savings goal is ready. Let's make it happen.` }),
        text: `Hi ${name || "there"},\n\nYour savings goal "${goalName}" has been created.\nTarget: ${targetAmount}${targetDateLabel ? `\nTarget date: ${targetDateLabel}` : ""}\n\nView your goal: ${appUrl}`,
      });

      if (error) {
        console.error("Error sending goal created email:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending goal created email:", error);
      return { success: false, error: "Failed to send goal created email" };
    }
  }

  // 4. KYC submitted confirmation
  async sendKycSubmittedEmail(
    email: string,
    name: string,
  ): Promise<EmailResult> {
    try {
      const body = `
        ${heading("We've received your verification details")}
        ${paragraph(`Hi ${escapeEmailHtml(name || "there")}, your identity verification details have been submitted successfully.`)}
        ${paragraph("Our verification process will review the information. We'll send you another email when there's an update.")}
        ${paragraph("You don't need to submit your details again unless we ask you to.")}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: "Your Chamapay verification is being reviewed",
        html: wrapEmail(body, { preheader: "We've received your identity verification details." }),
        text: `Hi ${name || "there"},\n\nWe've received your identity verification details. We'll email you when there's an update. You don't need to submit them again unless we ask you to.`,
      });

      if (error) {
        console.error("Error sending KYC submitted email:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending KYC submitted email:", error);
      return { success: false, error: "Failed to send KYC submitted email" };
    }
  }

  // 5. KYC verified confirmation
  async sendKycVerifiedEmail(
    email: string,
    name: string,
    appUrl: string = "https://chamapay.xyz",
  ): Promise<EmailResult> {
    try {
      const body = `
        ${heading("Your identity has been verified!")}
        ${paragraph(`Good news, ${escapeEmailHtml(name || "there")}! Your identity verification was successful.`)}
        ${paragraph("You can now deposit and withdraw. Head to your account to continue exploring the features available to you.")}
        ${emailActionButton("Open Chamapay", appUrl)}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: "Your Chamapay identity is verified",
        html: wrapEmail(body, { preheader: "Your identity verification was successful." }),
        text: `Hi ${name || "there"},\n\nYour identity verification was successful. Open Chamapay to continue: ${appUrl}`,
      });

      if (error) {
        console.error("Error sending KYC verified email:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending KYC verified email:", error);
      return { success: false, error: "Failed to send KYC verified email" };
    }
  }

  // 6. KYC rejected / action required
  async sendKycRejectedEmail(
    email: string,
    name: string,
    reason: string,
    resubmissionUrl: string = "https://chamapay.xyz",
  ): Promise<EmailResult> {
    try {
      const body = `
        ${heading("We couldn't verify your identity")}
        ${paragraph(`Hi ${escapeEmailHtml(name || "there")}, we were unable to complete your identity verification.`)}
        ${paragraph(`Reason provided: <strong style="color:${INK};">${escapeEmailHtml(reason)}</strong>`)}
        ${paragraph("Please review the details and follow the instructions to correct them. If you believe this decision was made in error, contact our support team.")}
        ${emailActionButton("Review your details", resubmissionUrl)}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: "Action needed: Chamapay identity verification",
        html: wrapEmail(body, { preheader: "Your identity verification needs another look." }),
        text: `Hi ${name || "there"},\n\nWe couldn't verify your identity.\nReason: ${reason}\n\nPlease review your details: ${resubmissionUrl}\nIf you believe this is an error, contact support.`,
      });

      if (error) {
        console.error("Error sending KYC rejected email:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending KYC rejected email:", error);
      return { success: false, error: "Failed to send KYC rejected email" };
    }
  }

  // 7. Goal contribution confirmation with progress
  async sendGoalContributionEmail(
    email: string,
    name: string,
    goalName: string,
    contributionAmount: string,
    totalSaved: number,
    targetAmount: number,
    currency: string = "KES",
    appUrl: string = "https://chamapay.xyz",
  ): Promise<EmailResult> {
    try {
      const percentage = targetAmount > 0
        ? Math.min(100, Math.max(0, Math.round((totalSaved / targetAmount) * 100)))
        : 0;
      const remaining = Math.max(0, targetAmount - totalSaved);
      const formatAmount = (amount: number) =>
        `${currency} ${amount.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
      const body = `
        ${heading("Your goal contribution is in!")}
        ${paragraph(`Hi ${escapeEmailHtml(name || "there")}, Contribution of <strong style="color:${SUCCESS};">${escapeEmailHtml(contributionAmount)}</strong> to <strong style="color:${INK};">${escapeEmailHtml(goalName)}</strong> was successful. Keep it up!`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:18px 20px; margin:24px 0;">
          <div style="font-size:13px; color:${MUTED}; margin-bottom:8px;">Goal progress</div>
          <div style="font-size:28px; line-height:34px; font-weight:700; color:${ACCENT}; margin-bottom:12px;">${percentage}%</div>
          <div style="height:10px; background-color:#d1d5db; border-radius:99px; overflow:hidden;">
            <div style="height:10px; width:${percentage}%; background-color:${ACCENT}; border-radius:99px;"></div>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            <tr>
              <td style="font-size:12px; color:${MUTED};">Saved: ${formatAmount(totalSaved)}</td>
              <td style="font-size:12px; color:${MUTED}; text-align:right;">Target: ${formatAmount(targetAmount)}</td>
            </tr>
          </table>
          <div style="font-size:13px; color:${INK}; margin-top:12px; font-weight:600;">${remaining > 0 ? `${formatAmount(remaining)} left to reach your goal.` : "You've reached your target!"}</div>
        </div>
        ${emailActionButton("View your goal", appUrl)}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: `Contribution added to ${goalName}`,
        html: wrapEmail(body, { preheader: `Your ${goalName} goal is now ${percentage}% complete.` }),
        text: `Hi ${name || "there"},\n\nYour contribution of ${contributionAmount} was added to ${goalName}.\nProgress: ${percentage}%\nSaved: ${formatAmount(totalSaved)}\nTarget: ${formatAmount(targetAmount)}\nRemaining: ${formatAmount(remaining)}\n\nView your goal: ${appUrl}`,
      });

      if (error) {
        console.error("Error sending goal contribution email:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending goal contribution email:", error);
      return { success: false, error: "Failed to send goal contribution email" };
    }
  }

  // 8. Goal milestone celebration (call at 50, 75, or 100 only)
  async sendGoalMilestoneEmail(
    email: string,
    name: string,
    goalName: string,
    milestone: 50 | 75 | 100,
    totalSaved: string,
    targetAmount: string,
    appUrl: string = "https://chamapay.xyz",
  ): Promise<EmailResult> {
    try {
      const milestoneMessages: Record<50 | 75 | 100, { title: string; message: string }> = {
        50: {
          title: "You're halfway there!",
          message: "You've reached 50% of your savings goal. That's real progress. Keep your momentum going, one contribution at a time.",
        },
        75: {
          title: "You're so close!",
          message: "You've reached 75% of your savings goal. The finish line is getting closer. Keep going, you've got this!",
        },
        100: {
          title: "You did it! Goal achieved!",
          message: "You've reached 100% of your savings goal. Congratulations on seeing it through. Take a moment to celebrate what you've achieved!",
        },
      };
      const milestoneContent = milestoneMessages[milestone];
      const body = `
        ${heading(milestoneContent.title)}
        ${paragraph(`Congratulations, ${escapeEmailHtml(name || "there")}! You've reached a new milestone for <strong style="color:${INK};">${escapeEmailHtml(goalName)}</strong>.`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:20px; margin:24px 0; text-align:center;">
          <div style="font-size:36px; line-height:42px; font-weight:700; color:${ACCENT};">${milestone}%</div>
          <div style="font-size:13px; color:${MUTED}; margin-top:4px;">of your goal completed</div>
          <div style="height:10px; background-color:#d1d5db; border-radius:99px; overflow:hidden; margin-top:16px;">
            <div style="height:10px; width:${milestone}%; background-color:${ACCENT}; border-radius:99px;"></div>
          </div>
          <div style="font-size:13px; color:${INK}; margin-top:14px;">Saved <strong>${escapeEmailHtml(totalSaved)}</strong> of <strong>${escapeEmailHtml(targetAmount)}</strong></div>
        </div>
        ${paragraph(milestoneContent.message)}
        ${milestone === 100 ? paragraph("Thank you for making saving a priority. You can create another goal whenever you're ready.") : paragraph("Every step counts. Keep building your saving habit!")}
        ${emailActionButton("View your goal", appUrl)}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: `${milestone === 100 ? "Goal achieved" : `${milestone}% of your goal reached`} — ${goalName}`,
        html: wrapEmail(body, { preheader: `${goalName}: you've reached ${milestone}% of your target. Congratulations!` }),
        text: `Congratulations ${name || "there"}!\n\n${milestoneContent.title}\nYou've reached ${milestone}% of your ${goalName} goal.\nSaved: ${totalSaved}\nTarget: ${targetAmount}\n\n${milestoneContent.message}\n\nView your goal: ${appUrl}`,
      });

      if (error) {
        console.error("Error sending goal milestone email:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending goal milestone email:", error);
      return { success: false, error: "Failed to send goal milestone email" };
    }
  }

  // 9. Goal withdrawal confirmation
  async sendGoalWithdrawalEmail(
    email: string,
    name: string,
    goalName: string,
    amountWithdrawn: string,
    transactionTime: Date | string,
    remainingSaved?: string,
  ): Promise<EmailResult> {
    try {
      const timeLabel = formatEmailTimestamp(transactionTime);
      const body = `
        ${heading("Goal withdrawal completed")}
        ${paragraph(`Hi ${escapeEmailHtml(name || "there")}, your withdrawal of <strong style="color:${INK};">${escapeEmailHtml(amountWithdrawn)}</strong> from <strong style="color:${INK};">${escapeEmailHtml(goalName)}</strong> has been recorded.`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="font-size:13px; color:${MUTED};">Goal</td><td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${escapeEmailHtml(goalName)}</td></tr>
            <tr><td style="font-size:13px; color:${MUTED}; padding-top:8px;">Amount withdrawn</td><td style="font-size:13px; color:${INK}; text-align:right; font-weight:700; padding-top:8px;">${escapeEmailHtml(amountWithdrawn)}</td></tr>
            <tr><td style="font-size:13px; color:${MUTED}; padding-top:8px;">Date and time</td><td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${escapeEmailHtml(timeLabel)}</td></tr>
            ${remainingSaved ? `<tr><td style="font-size:13px; color:${MUTED}; padding-top:8px;">Remaining in goal</td><td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${escapeEmailHtml(remainingSaved)}</td></tr>` : ""}
          </table>
        </div>
        ${paragraph("If you didn't make this withdrawal, please contact our support team as soon as possible.")}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <updates@chamapay.xyz>",
        to: email,
        subject: `Withdrawal from ${goalName}`,
        html: wrapEmail(body, { preheader: `${amountWithdrawn} withdrawn from ${goalName} on ${timeLabel}.` }),
        text: `Hi ${name || "there"},\n\nA withdrawal of ${amountWithdrawn} was made from ${goalName}.\nDate and time: ${timeLabel}${remainingSaved ? `\nRemaining in goal: ${remainingSaved}` : ""}\n\nIf you didn't make this withdrawal, contact support.`,
      });

      if (error) {
        console.error("Error sending goal withdrawal email:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending goal withdrawal email:", error);
      return { success: false, error: "Failed to send goal withdrawal email" };
    }
  }

  // 10. Failed M-Pesa deposit
  async sendMpesaDepositFailedEmail(
    email: string,
    name: string,
    amountKES: string,
    transactionTime: Date | string,
    reason?: string,
    retryUrl: string = "https://chamapay.xyz",
  ): Promise<EmailResult> {
    try {
      const timeLabel = formatEmailTimestamp(transactionTime);
      const reasonBlock = reason
        ? paragraph(`Reason provided: <strong style="color:${INK};">${escapeEmailHtml(reason)}</strong>`)
        : paragraph("The payment was not completed. This can happen if the payment prompt was cancelled, timed out, or wasn't approved.");
      const body = `
        ${heading("Your M-Pesa deposit didn't go through")}
        ${paragraph(`Hi ${escapeEmailHtml(name || "there")}, your attempted deposit of <strong style="color:${INK};">${escapeEmailHtml(amountKES)} KES</strong> was not completed.`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="font-size:13px; color:${MUTED};">Amount attempted</td><td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${escapeEmailHtml(amountKES)} KES</td></tr>
            <tr><td style="font-size:13px; color:${MUTED}; padding-top:8px;">Date and time</td><td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${escapeEmailHtml(timeLabel)}</td></tr>
          </table>
        </div>
        ${reasonBlock}
        ${paragraph("If you still want to make the deposit, you can try again from your Chamapay wallet.")}
        ${emailActionButton("Try again", retryUrl)}
        ${paragraph("If money was deducted from your M-Pesa account despite this status, please contact us before trying again.")}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <deposits@chamapay.xyz>",
        to: email,
        subject: "Your M-Pesa deposit was not completed",
        html: wrapEmail(body, { preheader: `Your attempted deposit of ${amountKES} KES did not complete.` }),
        text: `Hi ${name || "there"},\n\nYour attempted deposit of ${amountKES} KES was not completed.\nDate and time: ${timeLabel}\n${reason ? `Reason: ${reason}\n` : ""}\nYou can try again: ${retryUrl}\n\nIf money was deducted from M-Pesa despite this status, contact us before trying again.`,
      });

      if (error) {
        console.error("Error sending failed M-Pesa deposit email:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending failed M-Pesa deposit email:", error);
      return { success: false, error: "Failed to send failed deposit email" };
    }
  }

  // 11. Failed M-Pesa withdrawal
  async sendMpesaWithdrawFailedEmail(
    email: string,
    name: string,
    amountKES: string,
    transactionTime: Date | string,
    reason?: string,
    appUrl: string = "https://chamapay.xyz",
  ): Promise<EmailResult> {
    try {
      const timeLabel = formatEmailTimestamp(transactionTime);
      const body = `
        ${heading("Your M-Pesa withdrawal wasn't completed")}
        ${paragraph(`Hi ${escapeEmailHtml(name || "there")}, your withdrawal request for <strong style="color:${INK};">${escapeEmailHtml(amountKES)} KES</strong> was not completed.`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="font-size:13px; color:${MUTED};">Amount requested</td><td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${escapeEmailHtml(amountKES)} KES</td></tr>
            <tr><td style="font-size:13px; color:${MUTED}; padding-top:8px;">Date and time</td><td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${escapeEmailHtml(timeLabel)}</td></tr>
            ${reason ? `<tr><td style="font-size:13px; color:${MUTED}; padding-top:8px;">Reason</td><td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${escapeEmailHtml(reason)}</td></tr>` : ""}
          </table>
        </div>
        ${paragraph("If your wallet balance has not been updated or you're unsure about the transaction status, please contact support before retrying.")}
        ${emailActionButton("Open Chamapay", appUrl)}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <withdrawals@chamapay.xyz>",
        to: email,
        subject: "Your M-Pesa withdrawal was not completed",
        html: wrapEmail(body, { preheader: `Your withdrawal request for ${amountKES} KES was not completed.` }),
        text: `Hi ${name || "there"},\n\nYour withdrawal request for ${amountKES} KES was not completed.\nDate and time: ${timeLabel}${reason ? `\nReason: ${reason}` : ""}\n\nIf your wallet balance has not been updated or you're unsure about the status, contact support before retrying.\n${appUrl}`,
      });

      if (error) {
        console.error("Error sending failed M-Pesa withdrawal email:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending failed M-Pesa withdrawal email:", error);
      return { success: false, error: "Failed to send failed withdrawal email" };
    }
  }

  // 12. Personal follow-up email (founder / support outreach)

  async sendPersonalFollowUpEmail(
    email: string,
    recipientName: string,
    subject: string,
    message: string,
    senderName: string = "Jeff",
    senderTitle: string = "Founder, Chamapay",
    whatsappNumber: string = "254757149628",
  ): Promise<EmailResult> {
    try {
      const cleanNumber = whatsappNumber.replace(/\D/g, "");

      const whatsappMessage = encodeURIComponent(
        "Hi Jeff, I need some help with Chamapay."
      );

      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${whatsappMessage}`;

      const safeName = escapeEmailHtml(recipientName || "there");
      const safeMessage = escapeEmailHtml(message).replace(/\n/g, "<br />");

      const html = `
      <div style="
        font-family: Arial, Helvetica, sans-serif;
        font-size: 15px;
        line-height: 1.7;
        color: #333333;
        max-width: 600px;
      ">
        <p>Hi ${safeName},</p>

        <p>${safeMessage}</p>

        <p>
          If you have any questions or need help, feel free to
          reach out to me directly on WhatsApp.
        </p>

        <table cellpadding="0" cellspacing="0" border="0"
          style="margin: 20px 0;">
          <tr>
            <td bgcolor="#25D366" style="border-radius: 6px;">
              <a href="${whatsappUrl}"
                target="_blank"
                style="
                  display: inline-block;
                  padding: 12px 20px;
                  color: #ffffff;
                  text-decoration: none;
                  font-family: Arial, Helvetica, sans-serif;
                  font-size: 14px;
                  font-weight: bold;
                  border-radius: 6px;
                ">
                <img
                  src="https://cdn.simpleicons.org/whatsapp/FFFFFF"
                  width="18"
                  height="18"
                  alt="WhatsApp"
                  style="
                    vertical-align: middle;
                    margin-right: 8px;
                    border: 0;
                  "
                />
                Chat with me on WhatsApp
              </a>
            </td>
          </tr>
        </table>

        <p>
          Best regards,<br />
          ${escapeEmailHtml(senderName)}<br />
          ${escapeEmailHtml(senderTitle)}
        </p>
      </div>
    `;

      const text = `Hi ${recipientName || "there"},

${message}

If you have any questions or need help, feel free to reach out to me directly on WhatsApp:

${whatsappUrl}

Best regards,
${senderName}
${senderTitle}`;

      const { data, error } = await resend.emails.send({
        from: `Jeff from Chamapay <jeff.ishmael@chamapay.xyz>`,
        to: email,
        subject,
        html,
        text,
      });

      if (error) {
        console.error("Error sending personal follow-up email:", error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending personal follow-up email:", error);
      return {
        success: false,
        error: "Failed to send personal follow-up email",
      };
    }
  }


  async sendTransactionFollowUpEmail(
    email: string,
    recipientName: string,
    whatsappNumber: string = "254757149628",
  ): Promise<EmailResult> {
    try {
      const cleanNumber = whatsappNumber.replace(/\D/g, "");

      const whatsappMessage = encodeURIComponent(
        "Hi Jeff, I received your email about my Chamapay transactions. I'd like to discuss my experience."
      );

      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${whatsappMessage}`;

      const safeName = escapeEmailHtml(recipientName || "there");

      const html = `
      <div style="
        font-family: Arial, Helvetica, sans-serif;
        font-size: 15px;
        line-height: 1.7;
        color: #333333;
        max-width: 600px;
      ">
        <p>Hi ${safeName},</p>

        <p>
          I'm Jeff, the founder of Chamapay.
        </p>

        <p>
          I noticed that you've made several transactions on Chamapay.
          Some were successful, while others didn't go through.
        </p>

        <p>
          I wanted to reach out personally to check how your experience
          has been so far and whether you've encountered any difficulties
          while using the platform.
        </p>

        <p>
          I'd really appreciate hearing from you. If something isn't
          working as expected, or if you have any questions, please
          feel free to contact me directly. I'd be happy to help.
        </p>

        <table cellpadding="0" cellspacing="0" border="0"
          style="margin: 20px 0;">
          <tr>
            <td bgcolor="#25D366" style="border-radius: 6px;">
              <a href="${whatsappUrl}"
                target="_blank"
                style="
                  display: inline-block;
                  padding: 12px 20px;
                  color: #ffffff;
                  text-decoration: none;
                  font-family: Arial, Helvetica, sans-serif;
                  font-size: 14px;
                  font-weight: bold;
                  border-radius: 6px;
                ">
                <img
                  src="https://cdn.simpleicons.org/whatsapp/FFFFFF"
                  width="18"
                  height="18"
                  alt="WhatsApp"
                  style="
                    vertical-align: middle;
                    margin-right: 8px;
                    border: 0;
                  "
                />
                Chat with me on WhatsApp
              </a>
            </td>
          </tr>
        </table>

        <p>
          Thanks for giving Chamapay a try. I look forward to hearing
          from you.
        </p>

        <p>
          Best regards,<br />
          Jeff<br />
          Founder, Chamapay
        </p>
      </div>
    `;

      const text = `Hi ${recipientName || "there"},

I'm Jeff, the founder of Chamapay.

I noticed that you've made several transactions on Chamapay. Some were successful, while others didn't go through.

I wanted to reach out personally to check how your experience has been so far and whether you've encountered any difficulties while using the platform.

I'd really appreciate hearing from you. If something isn't working as expected, or if you have any questions, please feel free to contact me directly. I'd be happy to help.

You can reach me on WhatsApp:
${whatsappUrl}

Thanks for giving Chamapay a try. I look forward to hearing from you.

Best regards,
Jeff
Founder, Chamapay`;

      const { data, error } = await resend.emails.send({
        from: `Jeff from Chamapay <jeff.muchiri@chamapay.xyz>`,
        to: email,
        subject: "A quick personal check-in from Chamapay",
        html,
        text,
      });

      if (error) {
        console.error("Error sending transaction follow-up email:", error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending transaction follow-up email:", error);
      return {
        success: false,
        error: "Failed to send transaction follow-up email",
      };
    }
  }

  // 13. Reminder for an inactive Chama (send to each targeted member)
  async sendIdleChamaReminderEmail(
    email: string,
    name: string,
    chamaName: string,
    daysInactive: number,
    appUrl: string = "https://chamapay.xyz",
  ): Promise<EmailResult> {
    try {
      const body = `
        ${heading("Your Chama is waiting for you")}
        ${paragraph(`Hi ${escapeEmailHtml(name || "there")}, it's been ${daysInactive} days since there was activity in <strong style="color:${INK};">${escapeEmailHtml(chamaName)}</strong>.`)}
        ${paragraph("A little consistency can make a big difference. Check in with your members, agree on the next step, and keep your shared savings moving.")}
        ${emailActionButton("Open your Chama", appUrl)}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <reminders@chamapay.xyz>",
        to: email,
        subject: `A reminder about ${chamaName}`,
        html: wrapEmail(body, { preheader: `It's been a while since ${chamaName} had activity.` }),
        text: `Hi ${name || "there"},\n\nIt's been ${daysInactive} days since there was activity in ${chamaName}. Check in with your members and agree on the next step.\n\nOpen your Chama: ${appUrl}`,
      });

      if (error) {
        console.error("Error sending idle Chama reminder:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending idle Chama reminder:", error);
      return { success: false, error: "Failed to send idle Chama reminder" };
    }
  }

  // 14. Reminder for an inactive savings goal
  async sendIdleGoalReminderEmail(
    email: string,
    name: string,
    goalName: string,
    savedAmount: string,
    targetAmount: string,
    daysInactive: number,
    appUrl: string = "https://chamapay.xyz",
  ): Promise<EmailResult> {
    try {
      const body = `
        ${heading("A little progress goes a long way")}
        ${paragraph(`Hi ${escapeEmailHtml(name || "there")}, your <strong style="color:${INK};">${escapeEmailHtml(goalName)}</strong> goal is still there whenever you're ready to continue.`)}
        <div style="background-color:${SURFACE}; border-radius:12px; padding:16px 20px; margin:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="font-size:13px; color:${MUTED};">Saved so far</td><td style="font-size:13px; color:${INK}; text-align:right; font-weight:600;">${escapeEmailHtml(savedAmount)}</td></tr>
            <tr><td style="font-size:13px; color:${MUTED}; padding-top:8px;">Your target</td><td style="font-size:13px; color:${INK}; text-align:right; font-weight:600; padding-top:8px;">${escapeEmailHtml(targetAmount)}</td></tr>
          </table>
        </div>
        ${paragraph(`It's been ${daysInactive} days since your last activity on this goal. You don't have to do it all at once. Pick up where you left off, at a pace that works for you.`)}
        ${emailActionButton("Continue saving", appUrl)}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <reminders@chamapay.xyz>",
        to: email,
        subject: `Keep going with your ${goalName} goal`,
        html: wrapEmail(body, { preheader: `Your ${goalName} goal is ready when you are.` }),
        text: `Hi ${name || "there"},\n\nYour ${goalName} goal is still waiting for you.\nSaved: ${savedAmount}\nTarget: ${targetAmount}\nIt's been ${daysInactive} days since your last activity. Continue when you're ready.\n\nContinue saving: ${appUrl}`,
      });

      if (error) {
        console.error("Error sending idle goal reminder:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending idle goal reminder:", error);
      return { success: false, error: "Failed to send idle goal reminder" };
    }
  }
  // 15. Reminder for a user who has not recently used Chamapay
  async sendInactiveUserReminderEmail(
    email: string,
    name: string,
    daysInactive: number,
    appUrl: string = "https://chamapay.xyz",
  ): Promise<EmailResult> {
    try {
      const body = `
        ${heading("It's been a while!")}
        ${paragraph(`Hi ${escapeEmailHtml(name || "there")}, we haven't seen you on Chamapay in ${daysInactive} days. We wanted to check in and let you know your account is here whenever you're ready.`)}
        ${paragraph("Whether you want to continue a savings goal, check on your Chama, or start something new, you can pick up right where you left off.")}
        ${emailActionButton("Return to Chamapay", appUrl)}
        ${paragraph("If you need a hand with anything, simply reply to this email.")}
      `;

      const { data, error } = await resend.emails.send({
        from: "Chamapay <reminders@chamapay.xyz>",
        to: email,
        subject: "Your savings journey is still here",
        html: wrapEmail(body, { preheader: "Come back to Chamapay whenever you're ready." }),
        text: `Hi ${name || "there"},\n\nWe haven't seen you on Chamapay in ${daysInactive} days. Your account is here whenever you're ready. Continue a goal, check on your Chama, or start something new.\n\nReturn to Chamapay: ${appUrl}\n\nNeed help? Reply to this email.`,
      });

      if (error) {
        console.error("Error sending inactive user reminder:", error);
        return { success: false, error: error.message };
      }
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending inactive user reminder:", error);
      return { success: false, error: "Failed to send inactive user reminder" };
    }
  }
}

export default new EmailService();
