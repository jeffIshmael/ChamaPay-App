// controllers/authController.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import emailService from "../Utils/EmailService";
import { sendWhatsAppOTP } from "../Utils/WhatsAppService";

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

interface GoogleCompleteRequest {
  email: string;
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


// Public endpoint: Send OTP via WhatsApp for phone verification flows
export const sendWhatsAppCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phone }: { phone?: string } = req.body;
    if (!phone) {
      res
        .status(400)
        .json({ success: false, error: "Phone number is required" });
      return;
    }

    // Generate a 6-digit OTP
    const otp = emailService.generateOTP();

    // Send via WhatsApp Cloud API
    const result = await sendWhatsAppOTP(phone, otp);
    if (!result.success) {
      res
        .status(500)
        .json({
          success: false,
          error: result.error || "Failed to send WhatsApp message",
        });
      return;
    }

    // For now, return otp for client-side test; in production, remove this
    res
      .status(200)
      .json({ success: true, message: "OTP sent via WhatsApp", otp });
  } catch (error: unknown) {
    console.error("Send WhatsApp code error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to send OTP via WhatsApp" });
  }
};

// thirdweb auth
export const thirdwebAuth = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      email,
      name,
      profileImageUrl,
      walletAddress,
    }: {
      email: string;
      name?: string;
      profileImageUrl?: string;
      walletAddress: string;
    } = req.body;

    if (!email || !walletAddress) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const formattedEmail: string = email.toLowerCase();

    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { email: formattedEmail },
    });

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }
    // Create a random password hash placeholder
    const randomPassword = await bcrypt.hash(
      jwt.sign({ e: formattedEmail }, process.env.JWT_SECRET),
      12
    );

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: formattedEmail,
          userName: name || "",
          address: walletAddress,
          smartAddress: walletAddress,
          profileImageUrl: profileImageUrl || null,
        },
      });
    } else if (!user.profileImageUrl && profileImageUrl) {
      // Optionally update profile image for existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: { profileImageUrl },
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const token: string = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password, privKey, mnemonics, ...userResponse } = user as any;

    res.status(200).json({
      success: true,
      message: "Authenticated via Google",
      token,
      user: userResponse,
      isNew: !user.userName, // prompt for username if missing
    });
  } catch (error: unknown) {
    console.error("Thirdweb auth error:", error);
    res.status(500).json({ error: "Google authentication failed" });
  }
};

// Google auth complete - for existing users who already have accounts
export const googleAuthComplete = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email }: GoogleCompleteRequest = req.body;

    if (!email) {
      res.status(400).json({ 
        success: false, 
        error: "Email is required" 
      });
      return;
    }

    const formattedEmail: string = email.toLowerCase();

    // Find existing user
    const user = await prisma.user.findUnique({
      where: { email: formattedEmail },
    });

    if (!user) {
      res.status(404).json({ 
        success: false, 
        error: "User not found. Please sign up first." 
      });
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

    // Generate refresh token
    const refreshToken: string = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const { password, privKey, mnemonics, ...userResponse } = user as any;

    res.status(200).json({
      success: true,
      message: "Google authentication completed",
      token,
      refreshToken,
      user: userResponse,
    });
  } catch (error: unknown) {
    console.error("Google auth complete error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Google authentication completion failed" 
    });
  }
};
