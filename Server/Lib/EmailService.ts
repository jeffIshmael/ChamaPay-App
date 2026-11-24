import nodemailer, { Transporter } from "nodemailer";
import crypto from "crypto";
import { configDotenv } from "dotenv";
import { Resend } from "resend";
import * as v2 from "./emailV2";

configDotenv();

const resendApi = process.env.RESEND_API_KEY;
if (!resendApi) {
  throw new Error("The resend api is not set.");
}
const resend = new Resend(resendApi);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_APP_URL = "https://chamapay.xyz";

// The footer of every email says "just reply to this email", so replies must
// land in a real inbox (several sender addresses are noreply-style).
// Set EMAIL_REPLY_TO in your env to change it.
const REPLY_TO = process.env.EMAIL_REPLY_TO || "jeff.muchiri@chamapay.xyz";

// M-Pesa withdrawal processing fee (2.5%)
const MPESA_WITHDRAWAL_FEE_RATE = 0.025;

const { INK, MUTED, BORDER, SURFACE, BRAND, TEXT, FONT, MONO } = v2;

// Interface for email send result
interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface BulkEmailResult {
  success: boolean;
  sent: number;
  failed: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

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

/** Escape anything user-controlled before it goes into email HTML. */
function esc(value: string | number | null | undefined): string {
  return escapeEmailHtml(String(value ?? ""));
}

/** Bold, dark inline emphasis (escaped). */
function strong(value: string | number): string {
  return `<strong style="color:${INK};">${esc(value)}</strong>`;
}

function plural(n: number, one: string, many: string = `${one}s`): string {
  return n === 1 ? one : many;
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

function formatEmailDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

/** "2,000 KES (approx. 15.385 USDC)" or "15.385 USDC" */
function formatMoney(amountKES: string | null, amountUSDC: string): string {
  const usdc = `${Number(amountUSDC).toFixed(3)} USDC`;
  return amountKES ? `${amountKES} KES (approx. ${usdc})` : usdc;
}

/** Parse "1,500.50" style strings safely. Returns null when not a number. */
function parseAmount(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(String(value).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** 0712345678 -> •••• 5678 */
function maskPhone(phone: string): string {
  const digits = String(phone ?? "");
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : digits;
}

/** Plain-text version of an email body (links kept, tables flattened). */
function htmlToText(html: string): string {
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, "");
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(
      /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
      (_m, href: string, label: string) => {
        const text = stripTags(label).replace(/\s+/g, " ").trim();
        return text && text !== href ? `${text}: ${href}` : href;
      },
    )
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|tr|table|li)>/gi, "\n")
    .replace(/<\/td>/gi, "  ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/^[ \t]+/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Extra building blocks (on top of the v2 design system)
// ---------------------------------------------------------------------------

type Tone = "success" | "warning" | "error" | "info";

const TONES: Record<Tone, { icon: string; color: string }> = {
  success: { icon: "&#10003;", color: BRAND },
  warning: { icon: "!", color: "#B45309" },
  error: { icon: "&#10005;", color: "#B42318" },
  info: { icon: "i", color: MUTED },
};

interface CardRow {
  label: string;
  value: string;
  highlight?: boolean;
}

/**
 * Bordered summary card. Optional title row with a tone icon
 * (tick, warning, cross or info). Values are escaped here, pass raw strings.
 */
function statusCard(
  rows: CardRow[],
  title?: string,
  tone: Tone = "success",
): string {
  const t = TONES[tone];
  const titleRow = title
    ? `
        <tr>
          <td colspan="2" style="padding:16px 20px; border-bottom:1px solid ${BORDER}; font-family:${FONT}; font-size:15px; font-weight:600; color:${INK};">
            <span style="color:${t.color}; font-weight:700;">${t.icon}</span>&nbsp; ${esc(title)}
          </td>
        </tr>`
    : "";

  const rowsHtml = rows
    .map((row, i) => {
      const border =
        i === rows.length - 1 ? "" : `border-bottom:1px solid ${BORDER};`;
      return `
        <tr>
          <td style="padding:14px 20px; ${border} font-family:${FONT}; font-size:14px; color:${MUTED};">${esc(row.label)}</td>
          <td align="right" style="padding:14px 20px 14px 12px; ${border} font-family:${FONT}; font-size:${row.highlight ? "16px" : "14px"}; font-weight:${row.highlight ? "700" : "600"}; color:${row.highlight ? BRAND : INK};">${esc(row.value)}</td>
        </tr>`;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:0 0 28px 0; border:1px solid ${BORDER}; border-radius:8px; border-collapse:separate;">
      ${titleRow}
      ${rowsHtml}
    </table>`;
}

function progressBar(percentage: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(percentage)));
  const cell = (width: number, color: string) =>
    `<td width="${width}%" height="8" bgcolor="${color}" style="height:8px; line-height:8px; font-size:0;">&nbsp;</td>`;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border-radius:4px; overflow:hidden; border-collapse:separate;">
      <tr>
        ${pct > 0 ? cell(pct, BRAND) : ""}
        ${pct < 100 ? cell(100 - pct, "#E5E5E5") : ""}
      </tr>
    </table>`;
}

/** Big percentage + progress bar card used by goal emails. Pass raw strings. */
function progressCard(opts: {
  percentage: number;
  label?: string;
  saved?: string;
  target?: string;
  footer?: string;
}): string {
  const pct = Math.max(0, Math.min(100, Math.round(opts.percentage)));
  const savedRow =
    opts.saved && opts.target
      ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
            <tr>
              <td style="font-family:${FONT}; font-size:13px; color:${MUTED};">Saved ${esc(opts.saved)}</td>
              <td align="right" style="font-family:${FONT}; font-size:13px; color:${MUTED};">Target ${esc(opts.target)}</td>
            </tr>
          </table>`
      : "";
  const footer = opts.footer
    ? `<p style="margin:14px 0 0 0; font-family:${FONT}; font-size:14px; line-height:1.5; font-weight:600; color:${INK};">${esc(opts.footer)}</p>`
    : "";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:0 0 28px 0; border:1px solid ${BORDER}; border-radius:8px; border-collapse:separate;">
      <tr>
        <td style="padding:22px 20px;">
          <p style="margin:0 0 4px 0; font-family:${FONT}; font-size:13px; color:${MUTED};">${esc(opts.label ?? "Goal progress")}</p>
          <p style="margin:0 0 14px 0; font-family:${FONT}; font-size:34px; line-height:1.15; font-weight:700; letter-spacing:-0.5px; color:${BRAND};">${pct}%</p>
          ${progressBar(pct)}
          ${savedRow}
          ${footer}
        </td>
      </tr>
    </table>`;
}

/** Verification-code box for OTP emails. */
function codeBox(code: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin:0 0 24px 0; background-color:${SURFACE}; border:1px solid ${BORDER}; border-radius:8px; border-collapse:separate;">
      <tr>
        <td align="center" style="padding:26px 20px; font-family:${MONO}; font-size:34px; font-weight:700; letter-spacing:10px; color:${BRAND};">
          ${esc(code)}
        </td>
      </tr>
    </table>`;
}

/** Quoted message block with a teal edge (for admin updates). Content must be pre-escaped. */
function quoteBlock(safeHtml: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
      <tr>
        <td width="3" bgcolor="${BRAND}" style="width:3px; border-radius:2px;">&nbsp;</td>
        <td style="padding:4px 0 4px 18px; font-family:${FONT}; font-size:16px; line-height:1.65; color:${INK};">
          ${safeHtml}
        </td>
      </tr>
    </table>`;
}

/** Small muted note (13px). Content must be pre-escaped. */
function mutedNote(safeHtml: string): string {
  return `<p style="margin:0 0 20px 0; font-family:${FONT}; font-size:13px; line-height:1.6; color:${MUTED};">${safeHtml}</p>`;
}

/** Simple bullet list. Items must be pre-escaped. */
function bulletList(items: string[]): string {
  return `
    <ul style="margin:0 0 20px 0; padding:0 0 0 22px; font-family:${FONT}; font-size:16px; line-height:1.8; color:${TEXT};">
      ${items.map((item) => `<li style="margin:0 0 2px 0;">${item}</li>`).join("")}
    </ul>`;
}

/** Name + title block for founder / personal emails. */
function signature(name: string, title: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 36px 0;">
      <tr>
        <td style="font-family:${FONT}; font-size:15px; line-height:1.55; color:${INK};">
          <strong>${esc(name)}</strong><br />
          <span style="color:${MUTED};">${esc(title)}</span>
        </td>
      </tr>
    </table>`;
}

/** Green WhatsApp chat button that opens a chat with a specific number. */
function whatsappChatButton(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 32px 0;">
      <tr>
        <td align="center" bgcolor="#25D366" style="border-radius:6px;">
          <a href="${escapeEmailHtml(href)}" target="_blank"
            style="display:inline-block; padding:13px 24px; font-family:${FONT}; font-size:14px; font-weight:600; color:#FFFFFF; text-decoration:none; border-radius:6px;">
            <img src="https://cdn.simpleicons.org/whatsapp/FFFFFF" width="18" height="18" alt=""
              style="vertical-align:middle; margin-right:8px; border:0;" />
            <span style="vertical-align:middle;">${esc(label)}</span>
          </a>
        </td>
      </tr>
    </table>`;
}

/** Primary button with the URL escaped for use inside an attribute. */
function button(label: string, url: string): string {
  return v2.emailActionButton(esc(label), escapeEmailHtml(url));
}

/** Paragraph helper that turns blank lines into paragraphs and \n into <br />. */
function paragraphsFromText(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => v2.paragraph(esc(block.trim()).replace(/\n/g, "<br />")))
    .join("");
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

interface SendOptions {
  label: string; // used in logs, e.g. "welcome email"
  from: string;
  to: string;
  subject: string;
  body: string; // inner HTML (wrapped in the v2 layout for you)
  preheader: string;
  text?: string; // plain-text override; generated from body by default
  replyTo?: string;
}

async function sendEmail(opts: SendOptions): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: opts.from,
      to: opts.to,
      replyTo: opts.replyTo ?? REPLY_TO,
      subject: opts.subject,
      html: v2.wrapEmail(opts.body, { preheader: opts.preheader }),
      text: opts.text ?? htmlToText(opts.body),
    });

    if (error) {
      console.error(`Error sending ${opts.label}:`, error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error(`Error sending ${opts.label}:`, error);
    return { success: false, error: `Failed to send ${opts.label}` };
  }
}

interface BulkOptions {
  label: string;
  from: string;
  emails: string[];
  subject: string;
  body: string;
  preheader: string;
}

async function sendBulk(opts: BulkOptions): Promise<BulkEmailResult> {
  const recipients = Array.from(new Set(opts.emails.filter(Boolean)));
  if (recipients.length === 0) return { success: true, sent: 0, failed: 0 };

  const html = v2.wrapEmail(opts.body, { preheader: opts.preheader });
  const text = htmlToText(opts.body);

  const payload = recipients.map((to) => ({
    from: opts.from,
    to,
    replyTo: REPLY_TO,
    subject: opts.subject,
    html,
    text,
  }));

  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;

  // Resend batch send takes up to 100 emails at a time.
  const chunks: (typeof payload)[] = [];
  for (let i = 0; i < payload.length; i += 100) {
    chunks.push(payload.slice(i, i + 100));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const { error } = await resend.batch.send(chunk);
        if (error) {
          failed += chunk.length;
          lastError = error.message;
          console.error(`Error sending ${opts.label}:`, error);
        } else {
          sent += chunk.length;
        }
      } catch (error) {
        failed += chunk.length;
        lastError = `Failed to send ${opts.label}`;
        console.error(`Error sending ${opts.label}:`, error);
      }
    }),
  );

  return { success: failed === 0, sent, failed, error: lastError };
}

// ---------------------------------------------------------------------------
// Email service
// ---------------------------------------------------------------------------

class EmailService {
  private transporter: Transporter;

  constructor() {
    // Legacy transport, OTP emails now go through Resend.
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // =========================================================================
  // Account and security
  // =========================================================================

  // Generate 6-digit OTP (100000 to 999999 inclusive)
  generateOTP(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  // Send OTP email (legacy, replaced by Resend)
  async sendOTPEmail(
    email: string,
    otp: string,
    name: string = "User",
  ): Promise<EmailResult> {
    return this.sendResendOTPEmail(email, otp);
  }

  async sendResendOTPEmail(email: string, code: string): Promise<EmailResult> {
    const body = `
      ${v2.heading("Your Chamapay verification code")}
      ${v2.paragraph("Use this code to finish signing in to Chamapay. It expires in 10 minutes.")}
      ${codeBox(code)}
      ${mutedNote("Never share this code with anyone. Chamapay will never ask you for it. If you didn't request it, you can safely ignore this email.")}
    `;

    return sendEmail({
      label: "OTP email",
      from: "Chamapay <noreply@chamapay.xyz>",
      to: email,
      subject: "Your Chamapay login code",
      body,
      preheader: `Your Chamapay verification code is ${code}. Expires in 10 minutes.`,
      text: [
        "Your Chamapay verification code is:",
        "",
        code,
        "",
        "Use this code to finish signing in to Chamapay.",
        "This code expires in 10 minutes.",
        "",
        "Never share this code with anyone. Chamapay will never ask you for it.",
        "Didn't request this? You can safely ignore this email.",
      ].join("\n"),
    });
  }

  // 1. New account welcome email
  async sendWelcomeEmail(
    email: string,
    name: string,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const body = `
      ${v2.heading(`Welcome to Chamapay, ${esc(name || "there")}!`)}
      ${v2.paragraph("We're glad to have you here. Chamapay brings traditional rotational savings (ROSCAs) into the digital age and makes saving together simple.")}
      ${v2.paragraph("Here are two good ways to get started:")}
      ${v2.optionList([
        {
          title: "Create a Chama",
          description:
            "Start a merry-go-round with friends or colleagues and save together.",
        },
        {
          title: "Set a savings goal",
          description:
            "Save towards something on your own or as a group, and track your progress.",
        },
      ])}
      ${button("Explore Chamapay", appUrl)}
      ${v2.paragraph("If you have any questions as you get started, just reply to this email. We're happy to help.")}
    `;

    return sendEmail({
      label: "welcome email",
      from: "Chamapay <welcome@chamapay.xyz>",
      to: email,
      subject: "Welcome to Chamapay!",
      body,
      preheader: "Your saving journey starts here. Welcome to Chamapay!",
    });
  }

  // 4. KYC submitted confirmation
  async sendKycSubmittedEmail(
    email: string,
    name: string,
  ): Promise<EmailResult> {
    const body = `
      ${v2.heading("We've received your verification details")}
      ${v2.paragraph(`Hi ${esc(name || "there")}, your identity verification details have been submitted successfully.`)}
      ${statusCard([{ label: "Status", value: "Under review" }], "Verification submitted", "info")}
      ${v2.paragraph("Our team will review the information and we'll email you as soon as there's an update. You don't need to submit your details again unless we ask you to.")}
    `;

    return sendEmail({
      label: "KYC submitted email",
      from: "Chamapay <updates@chamapay.xyz>",
      to: email,
      subject: "Your Chamapay verification is being reviewed",
      body,
      preheader: "We've received your identity verification details.",
    });
  }

  // 5. KYC verified confirmation
  async sendKycVerifiedEmail(
    email: string,
    name: string,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const body = `
      ${v2.heading("Your identity has been verified!")}
      ${v2.paragraph(`Good news, ${esc(name || "there")}! Your identity verification was successful.`)}
      ${statusCard(
        [
          { label: "Status", value: "Verified", highlight: true },
          { label: "Now available", value: "Deposits and withdrawals" },
        ],
        "Identity verified",
        "success",
      )}
      ${v2.paragraph("Head to your account to continue exploring the features available to you.")}
      ${button("Open Chamapay", appUrl)}
    `;

    return sendEmail({
      label: "KYC verified email",
      from: "Chamapay <updates@chamapay.xyz>",
      to: email,
      subject: "Your Chamapay identity is verified",
      body,
      preheader: "Your identity verification was successful.",
    });
  }

  // 6. KYC rejected / action required
  async sendKycRejectedEmail(
    email: string,
    name: string,
    reason: string,
    resubmissionUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const body = `
      ${v2.heading("We couldn't verify your identity")}
      ${v2.paragraph(`Hi ${esc(name || "there")}, we were unable to complete your identity verification.`)}
      ${statusCard(
        [
          { label: "Status", value: "Action needed" },
          { label: "Reason", value: reason },
        ],
        "Verification not completed",
        "warning",
      )}
      ${v2.paragraph("Please review your details and follow the instructions to correct them. If you believe this decision was made in error, just reply to this email and our team will help.")}
      ${button("Review your details", resubmissionUrl)}
    `;

    return sendEmail({
      label: "KYC rejected email",
      from: "Chamapay <updates@chamapay.xyz>",
      to: email,
      subject: "Action needed: Chamapay identity verification",
      body,
      preheader: "Your identity verification needs another look.",
    });
  }

  // =========================================================================
  // Chama lifecycle
  // =========================================================================

  // 2. Chama created confirmation
  async sendChamaCreatedEmail(
    email: string,
    name: string,
    chamaName: string,
    contributionAmount: string,
    contributionFrequency: string,
    appUrl: string = DEFAULT_APP_URL,
    inviteUrl?: string, // shareable link; opening it sends a request to join
  ): Promise<EmailResult> {
    const addMemberOptions = [
      {
        title: "Search by username",
        description:
          "Open your Chama in the app, search for the person's username and add them.",
      },
      ...(inviteUrl
        ? [
            {
              title: "Share your invite link",
              description:
                "Send the link below to anyone you want to save with. They'll send a request to join, and you approve it.",
            },
          ]
        : []),
    ];

    const body = `
      ${v2.heading("Your Chama is ready!")}
      ${v2.paragraph(`Hi ${esc(name || "there")}, you've successfully created ${strong(chamaName)}. Now let's get your members on board.`)}
      ${statusCard(
        [
          { label: "Chama", value: chamaName },
          { label: "Contribution", value: contributionAmount, highlight: true },
          { label: "Frequency", value: contributionFrequency },
        ],
        "Chama created",
        "success",
      )}
      ${v2.subheading("How to add members")}
      ${v2.optionList(addMemberOptions)}
      ${
        inviteUrl
          ? v2.shareSection(
              {
                title: "Your invite link",
                intro:
                  "Anyone who opens this link can request to join your Chama. You approve each request before they become a member.",
                url: inviteUrl,
                whatsappLabel: "Share on WhatsApp",
                whatsappMessage: `Join my Chama "${chamaName}" on Chamapay. Open this link and send a request to join: ${inviteUrl}`,
              },
              escapeEmailHtml,
            )
          : ""
      }
      ${v2.paragraph("Your Chama is private, so only the people you approve can be part of it.")}
      ${button("View your Chama", appUrl)}
    `;

    return sendEmail({
      label: "Chama created email",
      from: "Chamapay <updates@chamapay.xyz>",
      to: email,
      subject: `Your Chama "${chamaName}" has been created`,
      body,
      preheader: `${chamaName} is ready. Add members by username or share your invite link.`,
    });
  }

  async sendMemberAddedToExistingMembersEmail(
    emails: string[],
    chamaName: string,
    newMemberName: string,
    totalMembers: number,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<BulkEmailResult> {
    const body = `
      ${v2.heading("New member joined")}
      ${v2.paragraph(`${strong(newMemberName)} has just been added to ${strong(chamaName)}.`)}
      ${statusCard(
        [
          { label: "Chama", value: chamaName },
          { label: "New member", value: newMemberName },
          { label: "Total members", value: String(totalMembers), highlight: true },
        ],
        "Member added",
        "success",
      )}
      ${button("View your Chama", appUrl)}
    `;

    return sendBulk({
      label: "existing member update emails",
      from: "Chamapay <updates@chamapay.xyz>",
      emails,
      subject: `New member joined — ${chamaName}`,
      body,
      preheader: `${newMemberName} joined ${chamaName}`,
    });
  }

  async sendMemberAddedToNewMemberEmail(
    email: string,
    chamaName: string,
    adminName: string,
    contributionAmountUSDC: string,
    contributionAmountKES: string | null,
    cycleDays: number,
    nextPayoutDate: Date,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const amountDisplay = formatMoney(
      contributionAmountKES,
      contributionAmountUSDC,
    );

    const body = `
      ${v2.heading("You've been added to a Chama")}
      ${v2.paragraph(`Congratulations! ${strong(adminName)} has added you to ${strong(chamaName)}.`)}
      ${statusCard(
        [
          { label: "Chama", value: chamaName },
          { label: "Added by", value: adminName },
          {
            label: "Contribution",
            value: `${amountDisplay} every ${cycleDays} ${plural(cycleDays, "day")}`,
            highlight: true,
          },
          { label: "Next payout date", value: formatEmailDate(nextPayoutDate) },
        ],
        "You're in",
        "success",
      )}
      ${v2.paragraph("Open the Chamapay app to view your Chama details and start contributing.")}
      ${button("View your Chama", appUrl)}
    `;

    return sendEmail({
      label: "new member welcome email",
      from: "Chamapay <welcome@chamapay.xyz>",
      to: email,
      subject: `You have been added to ${chamaName}`,
      body,
      preheader: `You were added to ${chamaName} by ${adminName}`,
    });
  }

  async sendMemberRemovedEmail(
    email: string,
    chamaName: string,
    adminName: string,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const body = `
      ${v2.heading("You've been removed from a Chama")}
      ${v2.paragraph(`You have been removed from ${strong(chamaName)} by the admin, ${strong(adminName)}.`)}
      ${statusCard(
        [
          { label: "Chama", value: chamaName },
          { label: "Removed by", value: adminName },
        ],
        "Removed from Chama",
        "info",
      )}
      ${v2.paragraph("Any funds you had in this Chama have been refunded to your wallet. You can check your balance anytime in the Chamapay app.")}
      ${v2.paragraph(`If you think this was a mistake, please reach out to ${esc(adminName)} directly. You're always welcome to join or create another Chama on Chamapay.`)}
      ${button("Open Chamapay", appUrl)}
    `;

    return sendEmail({
      label: "member removed email",
      from: "Chamapay <welcome@chamapay.xyz>",
      to: email,
      subject: `You have been removed from ${chamaName}`,
      body,
      preheader: `You were removed from ${chamaName} by ${adminName}`,
    });
  }

  async sendBulkChamaUpdateEmails(
    emails: string[],
    chamaName: string,
    message: string,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<BulkEmailResult> {
    const body = `
      ${v2.heading("Chama update")}
      ${v2.paragraph(`There's a new update for ${strong(chamaName)}:`)}
      ${quoteBlock(esc(message).replace(/\n/g, "<br />"))}
      ${button("Open your Chama", appUrl)}
    `;

    return sendBulk({
      label: "bulk update emails",
      from: "Chamapay <updates@chamapay.xyz>",
      emails,
      subject: `Update from ${chamaName}`,
      body,
      preheader: `New update for ${chamaName}`,
    });
  }

  // =========================================================================
  // Payouts and contributions
  // =========================================================================

  async sendPayoutEmail(
    email: string,
    amountUSDC: string,
    amountKES: string | null,
    chamaName: string,
    round: number,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const amountDisplay = formatMoney(amountKES, amountUSDC);

    const body = `
      ${v2.heading("Payout received")}
      ${v2.paragraph(`You've received a payout of ${strong(amountDisplay)} for round ${esc(round)} of ${strong(chamaName)}.`)}
      ${statusCard(
        [
          { label: "Chama", value: chamaName },
          { label: "Round", value: String(round) },
          { label: "Amount", value: amountDisplay, highlight: true },
        ],
        "Payout received",
        "success",
      )}
      ${v2.paragraph("Open the Chamapay app to see your updated wallet balance.")}
      ${button("Open Chamapay", appUrl)}
    `;

    return sendEmail({
      label: "payout email",
      from: "Chamapay <updates@chamapay.xyz>",
      to: email,
      subject: `Payout received — ${chamaName}`,
      body,
      preheader: `You received ${amountUSDC} USDC from ${chamaName}`,
    });
  }

  async sendBulkPayoutCompletedEmails(
    emails: string[],
    chamaName: string,
    cycle: number,
    round: number,
    recipientName: string,
    amountUSDC: string,
    amountKES: string | null,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<BulkEmailResult> {
    const amountDisplay = formatMoney(amountKES, amountUSDC);

    const body = `
      ${v2.heading("Payout completed")}
      ${v2.paragraph(`Cycle ${esc(cycle)}, round ${esc(round)} of ${strong(chamaName)} is complete.`)}
      ${statusCard(
        [
          { label: "Chama", value: chamaName },
          { label: "Cycle", value: String(cycle) },
          { label: "Round", value: String(round) },
          { label: "Recipient", value: recipientName },
          { label: "Amount", value: amountDisplay, highlight: true },
        ],
        "Payout completed",
        "success",
      )}
      ${v2.paragraph("Open the Chamapay app to view the outcome and your updated balance.")}
      ${button("Open Chamapay", appUrl)}
    `;

    return sendBulk({
      label: "bulk payout completed emails",
      from: "Chamapay <updates@chamapay.xyz>",
      emails,
      subject: `Payout completed — ${chamaName}`,
      body,
      preheader: `${recipientName} received ${amountUSDC} USDC from ${chamaName}`,
    });
  }

  async sendBulkRefundEmails(
    emails: string[],
    chamaName: string,
    cycle: number,
    round: number,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<BulkEmailResult> {
    const body = `
      ${v2.heading("Payout skipped, funds refunded")}
      ${v2.paragraph(`Cycle ${esc(cycle)}, round ${esc(round)} of ${strong(chamaName)} didn't go through because some members didn't contribute.`)}
      ${statusCard(
        [
          { label: "Chama", value: chamaName },
          { label: "Cycle", value: String(cycle) },
          { label: "Round", value: String(round) },
          { label: "Status", value: "Contribution refunded" },
        ],
        "Payout skipped",
        "warning",
      )}
      ${v2.paragraph("Your contribution has been refunded to your wallet. Open the Chamapay app to confirm your balance. The next payout date has been updated, so please contribute on time for the next round.")}
      ${button("Open Chamapay", appUrl)}
    `;

    return sendBulk({
      label: "bulk refund emails",
      from: "Chamapay <updates@chamapay.xyz>",
      emails,
      subject: `Refund issued — ${chamaName}`,
      body,
      preheader: `Round ${round} of ${chamaName} was skipped and contributions were refunded`,
    });
  }

  async sendBulkReminderEmails(
    emails: string[],
    chamaName: string,
    daysLeft: number,
    payoutDate?: Date | string,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<BulkEmailResult> {
    const payoutDateLabel = payoutDate ? formatEmailTimestamp(payoutDate) : null;
    const when =
      daysLeft <= 0 ? "today" : `in ${daysLeft} ${plural(daysLeft, "day")}`;

    const body = `
      ${v2.heading(`Payout ${when}`)}
      ${v2.paragraph(`The next payout for ${strong(chamaName)} is ${strong(when)}.`)}
      ${statusCard(
        [
          { label: "Chama", value: chamaName },
          ...(payoutDateLabel
            ? [{ label: "Payout date", value: payoutDateLabel, highlight: true }]
            : []),
        ],
        "Upcoming payout",
        "info",
      )}
      ${v2.paragraph(`Please make sure your contribution is in ${strong("before")} this date and time. Late or missing contributions can cause the payout to be skipped and funds refunded.`)}
      ${button("Contribute now", appUrl)}
    `;

    return sendBulk({
      label: "bulk reminder emails",
      from: "Chamapay <reminders@chamapay.xyz>",
      emails,
      subject: `Payout ${when} — ${chamaName}`,
      body,
      preheader: payoutDateLabel
        ? `${chamaName} payout is on ${payoutDateLabel}`
        : `${chamaName} payout is coming up ${when}`,
    });
  }

  async sendPaidForSomeoneEmail(
    email: string,
    payerName: string,
    amountUSDC: string,
    amountKES: string | null,
    chamaName: string,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const amountDisplay = formatMoney(amountKES, amountUSDC);

    const body = `
      ${v2.heading("A payment was made on your behalf")}
      ${v2.paragraph(`${strong(payerName)} has paid ${strong(amountDisplay)} for your contribution to ${strong(chamaName)}.`)}
      ${statusCard(
        [
          { label: "Paid by", value: payerName },
          { label: "Chama", value: chamaName },
          { label: "Amount", value: amountDisplay, highlight: true },
        ],
        "Contribution paid",
        "success",
      )}
      ${button("View your Chama", appUrl)}
    `;

    return sendEmail({
      label: "paid for someone email",
      from: "Chamapay <updates@chamapay.xyz>",
      to: email,
      subject: `Payment received for ${chamaName}`,
      body,
      preheader: `${payerName} paid your contribution for ${chamaName}`,
    });
  }

  // =========================================================================
  // Wallet: M-Pesa and transfers
  // =========================================================================

  async sendMpesaDepositEmail(
    email: string,
    amountUSDC: string,
    amountKES: string | null,
    receiptNumber: string,
    phoneNumber: string,
    time: string,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const amountDisplay = formatMoney(amountKES, amountUSDC);

    const body = `
      ${v2.heading("M-Pesa deposit confirmed")}
      ${v2.paragraph(`You have successfully deposited ${strong(amountDisplay)} via M-Pesa.`)}
      ${statusCard(
        [
          { label: "Amount", value: amountDisplay, highlight: true },
          { label: "Receipt number", value: receiptNumber },
          { label: "Phone number", value: maskPhone(phoneNumber) },
          { label: "Time", value: time },
        ],
        "Deposit confirmed",
        "success",
      )}
      ${button("Open Chamapay", appUrl)}
    `;

    return sendEmail({
      label: "M-Pesa deposit email",
      from: "Chamapay <deposits@chamapay.xyz>",
      to: email,
      subject: "M-Pesa deposit received",
      body,
      preheader: `${amountKES ? `${amountKES} KES` : `${amountUSDC} USDC`} deposited to your wallet via M-Pesa`,
    });
  }

  async sendMpesaWithdrawEmail(
    email: string,
    amountUSDC: string,
    amountKES: string | null,
    receiptNumber: string,
    phoneNumber: string,
    time: string,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const fmt = (n: number) =>
      n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const kes = parseAmount(amountKES);
    const usdc = `${Number(amountUSDC).toFixed(4)} USDC`;
    const fee =
      kes !== null ? Number((kes * MPESA_WITHDRAWAL_FEE_RATE).toFixed(2)) : 0;

    const amountDisplay = kes !== null ? `${fmt(kes)} KES (${usdc})` : usdc;

    const rows: CardRow[] = [
      {
        label: "Amount withdrawn",
        value: kes !== null ? `${fmt(kes)} KES` : usdc,
      },
      ...(kes !== null
        ? [
            { label: "Processing fee", value: `- ${fmt(fee)} KES` },
            {
              label: "Amount received",
              value: `${fmt(kes - fee)} KES`,
              highlight: true,
            },
          ]
        : []),
      { label: "Phone number", value: maskPhone(phoneNumber) },
      { label: "Receipt number", value: receiptNumber },
      { label: "Time", value: time },
    ];

    const body = `
      ${v2.heading("M-Pesa withdrawal confirmed")}
      ${v2.paragraph(`You have successfully withdrawn ${strong(amountDisplay)} to your M-Pesa.`)}
      ${statusCard(rows, "Withdrawal confirmed", "success")}
      ${button("Open Chamapay", appUrl)}
    `;

    return sendEmail({
      label: "M-Pesa withdrawal email",
      from: "Chamapay <withdrawals@chamapay.xyz>",
      to: email,
      subject: "M-Pesa withdrawal processed",
      body,
      preheader: `${amountKES ? `${amountKES} KES` : `${amountUSDC} USDC`} successfully withdrawn via M-Pesa`,
    });
  }

  async sendUSDCReceivedEmail(
    email: string,
    amountUSDC: string,
    amountKES: string | null,
    senderDisplayName: string,
    time: string,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const amountDisplay = formatMoney(amountKES, amountUSDC);

    const body = `
      ${v2.heading("You received cash")}
      ${v2.paragraph(`You have received ${strong(amountDisplay)} from ${strong(senderDisplayName)}.`)}
      ${statusCard(
        [
          { label: "Amount", value: amountDisplay, highlight: true },
          { label: "Sender", value: senderDisplayName },
          { label: "Time", value: time },
        ],
        "Funds received",
        "success",
      )}
      ${button("Open Chamapay", appUrl)}
    `;

    return sendEmail({
      label: "USDC received email",
      from: "Chamapay <transfers@chamapay.xyz>",
      to: email,
      subject: "USDC received",
      body,
      preheader: `${amountUSDC} USDC received from ${senderDisplayName}`,
    });
  }

  // 10. Failed M-Pesa deposit
  async sendMpesaDepositFailedEmail(
    email: string,
    name: string,
    amountKES: string,
    transactionTime: Date | string,
    reason?: string,
    retryUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const timeLabel = formatEmailTimestamp(transactionTime);

    const body = `
      ${v2.heading("Your M-Pesa deposit didn't go through")}
      ${v2.paragraph(`Hi ${esc(name || "there")}, your attempted deposit of ${strong(`${amountKES} KES`)} was not completed.`)}
      ${statusCard(
        [
          { label: "Amount attempted", value: `${amountKES} KES` },
          { label: "Date and time", value: timeLabel },
          ...(reason ? [{ label: "Reason", value: reason }] : []),
        ],
        "Deposit not completed",
        "error",
      )}
      ${
        reason
          ? ""
          : v2.paragraph("This can happen if the payment prompt was cancelled, timed out, or wasn't approved.")
      }
      ${v2.paragraph("If you still want to make the deposit, you can try again from your Chamapay wallet.")}
      ${button("Try again", retryUrl)}
      ${mutedNote("If money was deducted from your M-Pesa account despite this status, please reply to this email before trying again.")}
    `;

    return sendEmail({
      label: "failed M-Pesa deposit email",
      from: "Chamapay <deposits@chamapay.xyz>",
      to: email,
      subject: "Your M-Pesa deposit was not completed",
      body,
      preheader: `Your attempted deposit of ${amountKES} KES did not complete.`,
    });
  }

  // 11. Failed M-Pesa withdrawal
  async sendMpesaWithdrawFailedEmail(
    email: string,
    name: string,
    amountKES: string,
    transactionTime: Date | string,
    reason?: string,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const timeLabel = formatEmailTimestamp(transactionTime);

    const body = `
      ${v2.heading("Your M-Pesa withdrawal wasn't completed")}
      ${v2.paragraph(`Hi ${esc(name || "there")}, your withdrawal request for ${strong(`${amountKES} KES`)} was not completed.`)}
      ${statusCard(
        [
          { label: "Amount requested", value: `${amountKES} KES` },
          { label: "Date and time", value: timeLabel },
          ...(reason ? [{ label: "Reason", value: reason }] : []),
        ],
        "Withdrawal not completed",
        "error",
      )}
      ${v2.paragraph("If your wallet balance hasn't been updated, or you're unsure about the transaction status, please reply to this email before retrying.")}
      ${button("Open Chamapay", appUrl)}
    `;

    return sendEmail({
      label: "failed M-Pesa withdrawal email",
      from: "Chamapay <withdrawals@chamapay.xyz>",
      to: email,
      subject: "Your M-Pesa withdrawal was not completed",
      body,
      preheader: `Your withdrawal request for ${amountKES} KES was not completed.`,
    });
  }

  // =========================================================================
  // Savings goals
  // =========================================================================

  // 3. Savings goal created confirmation
  async sendGoalCreatedEmail(
    email: string,
    name: string,
    goalName: string,
    targetAmount: string,
    targetDate?: Date | string | null,
    appUrl: string = DEFAULT_APP_URL,
    shareUrl?: string, // link others can open to view the goal / contribute
  ): Promise<EmailResult> {
    const targetDateLabel = targetDate ? formatEmailDate(targetDate) : null;

    const rows: CardRow[] = [
      { label: "Goal", value: goalName },
      { label: "Target amount", value: targetAmount, highlight: true },
      ...(targetDateLabel
        ? [{ label: "Target date", value: targetDateLabel }]
        : []),
    ];

    const body = `
      ${v2.heading("Your savings goal is set!")}
      ${v2.paragraph(`Hi ${esc(name || "there")}, you've created a new goal: ${strong(goalName)}. Every contribution brings you closer to what you're working towards.`)}
      ${statusCard(rows, "Goal created", "success")}
      ${
        shareUrl
          ? v2.shareSection(
              {
                title: "Invite others to contribute",
                intro:
                  "Want friends or family to chip in, or just follow your progress? Share your goal link with them.",
                url: shareUrl,
                whatsappLabel: "Share on WhatsApp",
                whatsappMessage: `Help me reach my goal "${goalName}" on Chamapay: ${shareUrl}`,
              },
              escapeEmailHtml,
            )
          : ""
      }
      ${button("View your goal", appUrl)}
    `;

    return sendEmail({
      label: "goal created email",
      from: "Chamapay <updates@chamapay.xyz>",
      to: email,
      subject: `Your savings goal "${goalName}" has been created`,
      body,
      preheader: `Your ${goalName} savings goal is ready. Let's make it happen.`,
    });
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
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const percentage =
      targetAmount > 0
        ? Math.min(100, Math.max(0, Math.round((totalSaved / targetAmount) * 100)))
        : 0;
    const remaining = Math.max(0, targetAmount - totalSaved);
    const formatAmount = (amount: number) =>
      `${currency} ${amount.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;

    const body = `
      ${v2.heading("Your goal contribution is in!")}
      ${v2.paragraph(`Hi ${esc(name || "there")}, your contribution of ${strong(contributionAmount)} to ${strong(goalName)} was successful. Keep it up!`)}
      ${progressCard({
        percentage,
        saved: formatAmount(totalSaved),
        target: formatAmount(targetAmount),
        footer:
          remaining > 0
            ? `${formatAmount(remaining)} left to reach your goal.`
            : "You've reached your target!",
      })}
      ${button("View your goal", appUrl)}
    `;

    return sendEmail({
      label: "goal contribution email",
      from: "Chamapay <updates@chamapay.xyz>",
      to: email,
      subject: `Contribution added to ${goalName}`,
      body,
      preheader: `Your ${goalName} goal is now ${percentage}% complete.`,
    });
  }

  // 8. Goal milestone celebration (call at 50, 75, or 100 only)
  async sendGoalMilestoneEmail(
    email: string,
    name: string,
    goalName: string,
    milestone: 50 | 75 | 100,
    totalSaved: string,
    targetAmount: string,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const milestoneMessages: Record<50 | 75 | 100, { title: string; message: string }> = {
      50: {
        title: "You're halfway there!",
        message:
          "You've reached 50% of your savings goal. That's real progress. Keep your momentum going, one contribution at a time.",
      },
      75: {
        title: "You're so close!",
        message:
          "You've reached 75% of your savings goal. The finish line is getting closer. Keep going, you've got this!",
      },
      100: {
        title: "You did it! Goal achieved!",
        message:
          "You've reached 100% of your savings goal. Congratulations on seeing it through. Take a moment to celebrate what you've achieved!",
      },
    };
    const content = milestoneMessages[milestone];

    const body = `
      ${v2.heading(content.title)}
      ${v2.paragraph(`Congratulations, ${esc(name || "there")}! You've reached a new milestone for ${strong(goalName)}.`)}
      ${progressCard({
        percentage: milestone,
        label: "Goal completed",
        footer: `Saved ${totalSaved} of ${targetAmount}`,
      })}
      ${v2.paragraph(esc(content.message))}
      ${v2.paragraph(
        milestone === 100
          ? "Thank you for making saving a priority. You can create another goal whenever you're ready."
          : "Every step counts. Keep building your saving habit!",
      )}
      ${button("View your goal", appUrl)}
    `;

    return sendEmail({
      label: "goal milestone email",
      from: "Chamapay <updates@chamapay.xyz>",
      to: email,
      subject: `${milestone === 100 ? "Goal achieved" : `${milestone}% of your goal reached`} — ${goalName}`,
      body,
      preheader: `${goalName}: you've reached ${milestone}% of your target. Congratulations!`,
    });
  }

  // 9. Goal withdrawal confirmation
  async sendGoalWithdrawalEmail(
    email: string,
    name: string,
    goalName: string,
    amountWithdrawn: string,
    transactionTime: Date | string,
    remainingSaved?: string,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const timeLabel = formatEmailTimestamp(transactionTime);

    const body = `
      ${v2.heading("Goal withdrawal completed")}
      ${v2.paragraph(`Hi ${esc(name || "there")}, your withdrawal of ${strong(amountWithdrawn)} from ${strong(goalName)} has been recorded.`)}
      ${statusCard(
        [
          { label: "Goal", value: goalName },
          { label: "Amount withdrawn", value: amountWithdrawn, highlight: true },
          { label: "Date and time", value: timeLabel },
          ...(remainingSaved
            ? [{ label: "Remaining in goal", value: remainingSaved }]
            : []),
        ],
        "Withdrawal recorded",
        "success",
      )}
      ${v2.paragraph("If you didn't make this withdrawal, please reply to this email right away so we can help secure your account.")}
      ${button("View your goal", appUrl)}
    `;

    return sendEmail({
      label: "goal withdrawal email",
      from: "Chamapay <updates@chamapay.xyz>",
      to: email,
      subject: `Withdrawal from ${goalName}`,
      body,
      preheader: `${amountWithdrawn} withdrawn from ${goalName} on ${timeLabel}.`,
    });
  }

  // =========================================================================
  // Reminders
  // =========================================================================

  // 13. Reminder for an inactive Chama (send to each targeted member)
  async sendIdleChamaReminderEmail(
    email: string,
    name: string,
    chamaName: string,
    daysInactive: number,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const body = `
      ${v2.heading("Your Chama is waiting for you")}
      ${v2.paragraph(`Hi ${esc(name || "there")}, it's been ${esc(daysInactive)} ${plural(daysInactive, "day")} since there was activity in ${strong(chamaName)}.`)}
      ${v2.paragraph("A little consistency can make a big difference. Check in with your members, agree on the next step, and keep your shared savings moving.")}
      ${button("Open your Chama", appUrl)}
    `;

    return sendEmail({
      label: "idle Chama reminder",
      from: "Chamapay <reminders@chamapay.xyz>",
      to: email,
      subject: `A reminder about ${chamaName}`,
      body,
      preheader: `It's been a while since ${chamaName} had activity.`,
    });
  }

  // 14. Reminder for an inactive savings goal
  async sendIdleGoalReminderEmail(
    email: string,
    name: string,
    goalName: string,
    savedAmount: string,
    targetAmount: string,
    daysInactive: number,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const body = `
      ${v2.heading("A little progress goes a long way")}
      ${v2.paragraph(`Hi ${esc(name || "there")}, your ${strong(goalName)} goal is still there whenever you're ready to continue.`)}
      ${statusCard(
        [
          { label: "Saved so far", value: savedAmount, highlight: true },
          { label: "Your target", value: targetAmount },
        ],
        undefined,
      )}
      ${v2.paragraph(`It's been ${esc(daysInactive)} ${plural(daysInactive, "day")} since your last activity on this goal. You don't have to do it all at once. Pick up where you left off, at a pace that works for you.`)}
      ${button("Continue saving", appUrl)}
    `;

    return sendEmail({
      label: "idle goal reminder",
      from: "Chamapay <reminders@chamapay.xyz>",
      to: email,
      subject: `Keep going with your ${goalName} goal`,
      body,
      preheader: `Your ${goalName} goal is ready when you are.`,
    });
  }

  // 15. Reminder for a user who has not recently used Chamapay
  async sendInactiveUserReminderEmail(
    email: string,
    name: string,
    daysInactive: number,
    appUrl: string = DEFAULT_APP_URL,
  ): Promise<EmailResult> {
    const body = `
      ${v2.heading("It's been a while!")}
      ${v2.paragraph(`Hi ${esc(name || "there")}, we haven't seen you on Chamapay in ${esc(daysInactive)} ${plural(daysInactive, "day")}. We wanted to check in and let you know your account is here whenever you're ready.`)}
      ${v2.paragraph("Whether you want to continue a savings goal, check on your Chama, or start something new, you can pick up right where you left off.")}
      ${button("Return to Chamapay", appUrl)}
      ${v2.paragraph("If you need a hand with anything, simply reply to this email.")}
    `;

    return sendEmail({
      label: "inactive user reminder",
      from: "Chamapay <reminders@chamapay.xyz>",
      to: email,
      subject: "Your savings journey is still here",
      body,
      preheader: "Come back to Chamapay whenever you're ready.",
    });
  }

  // =========================================================================
  // Founder and personal outreach
  // =========================================================================

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
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
      "Hi Jeff, I need some help with Chamapay.",
    )}`;

    const body = `
      ${v2.paragraph(`Hi ${esc(recipientName || "there")},`)}
      ${paragraphsFromText(message)}
      ${v2.paragraph("If you have any questions or need help, feel free to reach out to me directly on WhatsApp.")}
      ${whatsappChatButton("Chat with me on WhatsApp", whatsappUrl)}
      ${v2.paragraph("Best regards,")}
      ${signature(senderName, senderTitle)}
    `;

    return sendEmail({
      label: "personal follow-up email",
      from: "Jeff from Chamapay <jeff.ishmael@chamapay.xyz>",
      replyTo: "jeff.ishmael@chamapay.xyz",
      to: email,
      subject,
      body,
      preheader: "A personal note from the Chamapay team.",
    });
  }

  async sendTransactionFollowUpEmail(
    email: string,
    recipientName: string,
    whatsappNumber: string = "254757149628",
  ): Promise<EmailResult> {
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
      "Hi Jeff, I received your email about my Chamapay transactions. I'd like to discuss my experience.",
    )}`;

    const body = `
      ${v2.heading("A quick personal check-in")}
      ${v2.paragraph(`Hi ${esc(recipientName || "there")},`)}
      ${v2.paragraph("I'm Jeff, the founder of Chamapay. I noticed you've made several transactions on Chamapay. Some were successful, while others didn't go through.")}
      ${v2.paragraph("I wanted to reach out personally to check how your experience has been so far, and whether you've run into any difficulties while using the platform.")}
      ${v2.paragraph("If something isn't working as expected, or you have any questions, please contact me directly. I'd be happy to help.")}
      ${whatsappChatButton("Chat with me on WhatsApp", whatsappUrl)}
      ${v2.paragraph("Thanks for giving Chamapay a try. I look forward to hearing from you.")}
      ${signature("Jeff", "Founder, Chamapay")}
    `;

    return sendEmail({
      label: "transaction follow-up email",
      from: "Jeff from Chamapay <jeff.muchiri@chamapay.xyz>",
      replyTo: "jeff.muchiri@chamapay.xyz",
      to: email,
      subject: "A quick personal check-in from Chamapay",
      body,
      preheader: "I'd like to hear how your experience has been.",
    });
  }

  async sendUserEngagementFollowUpEmail(
    email: string,
    recipientName: string,
    whatsappNumber: string = "254757149628",
  ): Promise<EmailResult> {
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
      "Hi Jeff, I received your email about my Chamapay experience. I'd like to share some feedback.",
    )}`;

    const body = `
      ${v2.heading("A quick check-in from Jeff")}
      ${v2.paragraph(`Hi ${esc(recipientName || "there")},`)}
      ${v2.paragraph("I'm Jeff, the founder of Chamapay. I noticed you've been exploring the platform, and I wanted to reach out personally to hear how it's been going.")}
      ${v2.paragraph("Whether you've created a Chama, joined a group, invited others, or just looked around, your honest take helps us a lot. I'm especially curious about:")}
      ${bulletList([
        "What you like most so far",
        "Anything that felt confusing",
        "One thing we could do better",
      ])}
      ${v2.paragraph("A short reply to this email works, or if you'd rather chat, message me directly on WhatsApp.")}
      ${whatsappChatButton("Chat with me on WhatsApp", whatsappUrl)}
      ${v2.paragraph("Thanks for giving Chamapay a try. I read every reply.")}
      ${signature("Jeff", "Founder, Chamapay")}
      ${mutedNote("Just reply if you'd prefer not to hear from me again.")}
    `;

    return sendEmail({
      label: "user engagement follow-up email",
      from: "Jeff from Chamapay <jeff.muchiri@chamapay.xyz>",
      replyTo: "jeff.muchiri@chamapay.xyz",
      to: email,
      subject: "A quick check-in from the founder of Chamapay",
      body,
      preheader: "I'd love to hear how Chamapay has been working for you.",
    });
  }
}

export default new EmailService();