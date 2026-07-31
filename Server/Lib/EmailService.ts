import nodemailer, { SendMailOptions, Transporter } from "nodemailer";
import crypto from "crypto";
import { configDotenv } from "dotenv";
import { Resend } from "resend";
configDotenv();

const resendApi = process.env.RESEND_API_KEY;

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

  // Email template for OTP
  private getOTPEmailTemplate(otp: string, name: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ChamaPay Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .otp-code { font-size: 32px; font-weight: bold; color: #059669; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 14px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏦 ChamaPay</h1>
            <p>Digital Circular Savings</p>
          </div>
          <div class="content">
            <h2>Welcome to ChamaPay, ${name}!</h2>
            <p>Thank you for joining our community-based savings platform. To complete your registration, please verify your email address using the code below:</p>
            
            <div class="otp-code">
              ${otp}
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This code will expire in 10 minutes</li>
              <li>Don't share this code with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
            
            <p>Once verified, you'll receive your secure blockchain wallet and can start creating or joining chamas!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ChamaPay. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getAnotherOTPEmailTemplate(otp: string): string {
    return `  <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #26a6a2;">Welcome to ChamaPay!</h2>
            <p>Your verification code is:</p>
            <div style=" background-color: #f0fafa; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
              <h1 style="color: #26a6a2; font-size: 36px; margin: 0; letter-spacing: 8px;">${otp}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p style="color: #ƒ666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          </div>`;
  }

  async sendResendOTPEmail(email: string, code: string) {
    try {
      const { data, error } = await resend.emails.send({
        from: "ChamaPay <noreply@chamapay.xyz>",
        to: email,
        subject: "ChamaPay - Your Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #26a6a2;">Welcome to ChamaPay!</h2>
            <p>Your verification code is:</p>
            <div style="background-color: #d1f6f1; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
              <h1 style="color: #26a6a2; font-size: 36px; margin: 0; letter-spacing: 8px;">${code}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
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
      const { data, error } = await resend.emails.send({
        from: "ChamaPay Updates <updates@chamapay.xyz>",
        to: email,
        subject: `Payout Received - ${chamaName}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #26a6a2;">Payout Received 🎉</h2>
            <p>Great news! You have received a payout of <strong>${amount} USDC</strong> for round ${round} of your chama <strong>${chamaName}</strong>.</p>
            <p>Check your wallet in the ChamaPay app to view your updated balance.</p>
          </div>
        `,
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
      const payload = emails.map((email) => ({
        from: "ChamaPay Reminders <reminders@chamapay.xyz>",
        to: email,
        subject: `Upcoming Payout Reminder - ${chamaName}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #26a6a2;">Payout Approaching ⌛</h2>
            <p>This is a reminder that the payout for your chama <strong>${chamaName}</strong> is in <strong>${daysLeft} days</strong>.</p>
            <p>Please make sure you have contributed your share on time!</p>
          </div>
        `,
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
      const payload = emails.map((email) => ({
        from: "ChamaPay Updates <updates@chamapay.xyz>",
        to: email,
        subject: `Update from ${chamaName}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #26a6a2;">Chama Update 📢</h2>
            <p>There is a new update for your chama <strong>${chamaName}</strong>:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #26a6a2; margin: 15px 0;">
              ${message}
            </div>
          </div>
        `,
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
      const { data, error } = await resend.emails.send({
        from: "ChamaPay Wallet <deposits@chamapay.xyz>",
        to: email,
        subject: "USDC Deposit Received 💰",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #26a6a2;">Deposit Confirmed!</h2>
            <p>Your wallet has successfully received a deposit of <strong>${amount} USDC</strong>.</p>
            <p style="font-size: 12px; color: #666;">Transaction Hash: ${txHash}</p>
          </div>
        `,
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
