const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configure your email service here
    // For development, you can use Gmail or SendGrid
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD, // Use app password for Gmail
      },
    });
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP email
  async sendOTPEmail(email, otp, name = 'User') {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@chamapay.com',
      to: email,
      subject: 'ChamaPay - Email Verification Code',
      html: this.getOTPEmailTemplate(otp, name),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  // Email template for OTP
  getOTPEmailTemplate(otp, name) {
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
            <p>© 2024 ChamaPay. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
