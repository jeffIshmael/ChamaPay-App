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

interface RegisterRequest {
  username: string;
  walletAddress: string;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface JWTPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
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

// Register user with username and wallet address
export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, walletAddress }: RegisterRequest = req.body;

    if (!username || !walletAddress) {
      res.status(400).json({ 
        success: false, 
        error: "Username and wallet address are required" 
      });
      return;
    }

    // Check if username already exists
    const existingUser = await prisma.user.findFirst({
      where: { userName: username }
    });

    if (existingUser) {
      res.status(400).json({ 
        success: false, 
        error: "Username already taken" 
      });
      return;
    }

    // Check if wallet address already exists
    const existingWallet = await prisma.user.findFirst({
      where: { 
        OR: [
          { address: walletAddress },
          { smartAddress: walletAddress }
        ]
      }
    });

    if (existingWallet) {
      res.status(400).json({ 
        success: false, 
        error: "Wallet address already registered" 
      });
      return;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        userName: username,
        address: walletAddress,
        smartAddress: walletAddress,
        email: `user_${Date.now()}@temp.com`, // Temporary email, can be updated later
        profileImageUrl: null,
      },
    });

    // Generate access token (24 hours)
    const token: string = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Generate refresh token (30 days)
    const refreshToken: string = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const { password, privKey, mnemonics, ...userResponse } = user as any;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      refreshToken,
      user: userResponse,
    });
  } catch (error: unknown) {
    console.error("User registration error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Registration failed" 
    });
  }
};

// Refresh access token using refresh token
export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    if (!refreshToken) {
      res.status(400).json({ 
        success: false, 
        error: "Refresh token is required" 
      });
      return;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET) as JWTPayload;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
      return;
    }

    // Generate new access token (24 hours)
    const newToken: string = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Generate new refresh token (30 days)
    const newRefreshToken: string = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const { password, privKey, mnemonics, ...userResponse } = user as any;

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      token: newToken,
      refreshToken: newRefreshToken,
      user: userResponse,
    });
  } catch (error: unknown) {
    console.error("Token refresh error:", error);
    res.status(401).json({ 
      success: false, 
      error: "Invalid or expired refresh token" 
    });
  }
};
