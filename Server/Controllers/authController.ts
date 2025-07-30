// controllers/authController.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import emailService from "../Utils/EmailService";
import encryptionService from "../Utils/Encryption";
import { getWallets } from "../Utils/WalletCreation";

const prisma = new PrismaClient();

// Interfaces for request bodies
interface RegistrationRequest {
  email: string;
  password: string;
  userName: string;
}

interface VerificationRequest {
  email: string;
  otp: string;
}

interface ResendOTPRequest {
  email: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface GetMnemonicRequest {
  password: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    email: string;
    name: string | null;
    phoneNo: number | null;
    address: string;
    role: string | null;
    profile: string | null;
    profileImageUrl: string | null;
  };
}

interface MnemonicResponse {
  success: boolean;
  mnemonic: string;
}

// Step 1: Initial registration request (sends OTP)
export const requestRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, userName }: RegistrationRequest = req.body;
    
    // Validation
    if (!email || !password || !userName) {
      res.status(400).json({ 
        error: "Email, password, and username are required" 
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ 
        error: "Password must be at least 8 characters long" 
      });
      return;
    }

    const formattedEmail: string = email.toLowerCase();
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: formattedEmail },
    });

    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    // Check if email is already pending verification
    const existingPending = await prisma.pendingUser.findUnique({
      where: { email: formattedEmail },
      include: { emailVerification: true }
    });

    // Hash password
    const hashedPassword: string = await bcrypt.hash(password, 12);
    
    // Calculate expiration times
    const now: Date = new Date();
    const pendingUserExpiry: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    const otpExpiry: Date = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    // Generate OTP
    const otp: string = emailService.generateOTP();

    if (existingPending) {
      // Update existing pending user
      await prisma.pendingUser.update({
        where: { id: existingPending.id },
        data: {
          name: userName,
          password: hashedPassword,
          expiresAt: pendingUserExpiry,
          emailVerification: {
            upsert: {
              create: {
                otp,
                attempts: 0,
                verified: false,
                expiresAt: otpExpiry,
              },
              update: {
                otp,
                attempts: 0,
                verified: false,
                expiresAt: otpExpiry,
              }
            }
          }
        },
        include: { emailVerification: true }
      });
    } else {
      // Create new pending user
      await prisma.pendingUser.create({
        data: {
          email: formattedEmail,
          name: userName,
          password: hashedPassword,
          expiresAt: pendingUserExpiry,
          emailVerification: {
            create: {
              otp,
              attempts: 0,
              verified: false,
              expiresAt: otpExpiry,
            }
          }
        }
      });
    }

    // Send OTP email
    const emailResult = await emailService.sendOTPEmail(formattedEmail, otp, userName);
    
    if (!emailResult.success) {
      console.error("Failed to send OTP email:", emailResult.error);
      res.status(500).json({ 
        error: "Failed to send verification email. Please try again." 
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Registration initiated. Please check your email for verification code.",
      email: formattedEmail
    });

  } catch (error: unknown) {
    console.error("Registration request error:", error);
    res.status(500).json({ 
      error: "Registration failed. Please try again." 
    });
  }
};

// Step 2: Verify email and complete registration
export const verifyEmailAndCompleteRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp }: VerificationRequest = req.body;

    if (!email || !otp) {
      res.status(400).json({ 
        error: "Email and OTP are required" 
      });
      return;
    }

    const formattedEmail: string = email.toLowerCase();
    const formattedOTP: string = otp.trim();

    // Find pending user with email verification
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { email: formattedEmail },
      include: { emailVerification: true }
    });

    if (!pendingUser || !pendingUser.emailVerification) {
      res.status(404).json({ 
        error: "Registration request not found or expired" 
      });
      return;
    }

    const verification = pendingUser.emailVerification;

    // Check if OTP has expired
    if (new Date() > verification.expiresAt) {
      res.status(400).json({ 
        error: "OTP has expired. Please request a new one." 
      });
      return;
    }

    // Check attempt limit
    if (verification.attempts >= 3) {
      res.status(400).json({ 
        error: "Too many failed attempts. Please request a new OTP." 
      });
      return;
    }

    // Verify OTP
    if (verification.otp !== formattedOTP) {
      // Increment attempts
      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: verification.attempts + 1 }
      });

      res.status(400).json({ 
        error: `Invalid OTP. ${2 - verification.attempts} attempts remaining.` 
      });
      return;
    }

    // OTP is valid - create wallet and complete registration
    const wallet = getWallets();
    
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Encrypt wallet data using the user's password and JWT secret
    const encryptedPrivateKey = encryptionService.encrypt(wallet.privateKey, process.env.JWT_SECRET);
    const encryptedMnemonic = encryptionService.encrypt(wallet.mnemonic?.phrase || '', process.env.JWT_SECRET);

    // Create the actual user
    const newUser = await prisma.user.create({
      data: {
        email: formattedEmail,
        name: pendingUser.name,
        password: pendingUser.password,
        address: wallet.address,
        privKey: JSON.stringify(encryptedPrivateKey),
        mnemonics: JSON.stringify(encryptedMnemonic),
        role: "user",
      },
    });

    // Clean up pending user and verification
    await prisma.pendingUser.delete({
      where: { id: pendingUser.id }
    });

    // Generate JWT token
    const token: string = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Remove sensitive data from response
    const { password, privKey, mnemonics, ...userResponse } = newUser;

    res.status(201).json({
      success: true,
      message: "Registration completed successfully",
      token,
      user: userResponse,
    });

  } catch (error: unknown) {
    console.error("Email verification error:", error);
    res.status(500).json({ 
      error: "Verification failed. Please try again." 
    });
  }
};

// Resend OTP
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email }: ResendOTPRequest = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const formattedEmail: string = email.toLowerCase();

    // Find pending user
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { email: formattedEmail },
      include: { emailVerification: true }
    });

    if (!pendingUser) {
      res.status(404).json({ 
        error: "Registration request not found. Please start registration again." 
      });
      return;
    }

    // Check if user has exceeded resend limit (optional rate limiting)
    const now: Date = new Date();
    if (pendingUser.emailVerification && 
        (now.getTime() - pendingUser.emailVerification.createdAt.getTime()) < 60000) { // 1 minute
      res.status(429).json({ 
        error: "Please wait before requesting another OTP" 
      });
      return;
    }

    // Generate new OTP
    const newOTP: string = emailService.generateOTP();
    const otpExpiry: Date = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    // Update verification record
    await prisma.emailVerification.upsert({
      where: { pendingUserId: pendingUser.id },
      create: {
        pendingUserId: pendingUser.id,
        otp: newOTP,
        attempts: 0,
        verified: false,
        expiresAt: otpExpiry,
      },
      update: {
        otp: newOTP,
        attempts: 0,
        verified: false,
        expiresAt: otpExpiry,
      }
    });

    // Send new OTP email
    const emailResult = await emailService.sendOTPEmail(
      formattedEmail, 
      newOTP, 
      pendingUser.name || 'User'
    );
    
    if (!emailResult.success) {
      res.status(500).json({ 
        error: "Failed to send verification email. Please try again." 
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "New OTP sent successfully. Please check your email."
    });

  } catch (error: unknown) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ 
      error: "Failed to resend OTP. Please try again." 
    });
  }
};

// Login function
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const formattedEmail: string = email.toLowerCase();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: formattedEmail },
    });

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Verify password
    const isValidPassword: boolean = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Generate JWT token
    const token: string = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Remove sensitive data from response
    const { password: _, privKey, mnemonics, ...userResponse } = user;

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userResponse,
    } as AuthResponse);

  } catch (error: unknown) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
};

// Get mnemonic phrase (protected route)
export const getMnemonic = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const userId: number = req.user.userId;
    const { password }: GetMnemonicRequest = req.body;

    if (!password) {
      res.status(400).json({ 
        error: "Password is required to access mnemonic phrase" 
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Verify password
    const isValidPassword: boolean = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Decrypt only mnemonic
    const encryptedMnemonic = JSON.parse(user.mnemonics);
    const mnemonic: string = encryptionService.decrypt(encryptedMnemonic, process.env.JWT_SECRET);

    res.json({
      success: true,
      mnemonic
    } as MnemonicResponse);

  } catch (error: unknown) {
    console.error("Mnemonic retrieval error:", error);
    
    if (error instanceof Error && error.message.includes('Decryption failed')) {
      res.status(401).json({ 
        error: "Invalid password or corrupted data" 
      });
      return;
    }

    res.status(500).json({ 
      error: "Failed to retrieve mnemonic phrase" 
    });
  }
}; 