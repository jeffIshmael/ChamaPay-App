import nodemailer, { SendMailOptions, Transporter } from "nodemailer";
import crypto from "crypto";
import { configDotenv } from "dotenv";
configDotenv();


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

  // Send OTP email
  async sendOTPEmail(
    email: string,
    otp: string,
    name: string = "User"
  ): Promise<EmailResult> {
    const mailOptions: SendMailOptions = {
      from: process.env.EMAIL_FROM || "chamapay37@gmail.com",
      to: email,
      subject: "ChamaPay - Email Verification Code",
      html: this.getAnotherOTPEmailTemplate(otp),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log("OTP email sent successfully:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error sending OTP email:", error);
      return { success: false, error: errorMessage };
    }
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
            <div style="background-color: #ffffff; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
              <h1 style="color: #26a6a2; font-size: 36px; margin: 0; letter-spacing: 8px;">${otp}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p style="color: #ƒ666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          </div>`;
  }
}

export default new EmailService();
