// controllers/authController.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import emailService from "../Lib/EmailService";
import { sendWhatsAppOTP } from "../Lib/WhatsAppService";
import { createUserWallet } from "../Lib/walletService";
import Encryption from "../Lib/Encryption";
import crypto from "crypto";
import { createSmartAccount } from "../Blockchain/SmartAccount";

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

// In-memory store for verification codes (use Redis in production)
const verificationCodes = new Map<
  string,
  { code: string; expiresAt: number }
>();

// Helper to exclude sensitive fields from user object
const excludeSensitiveData = (user: any) => {
  const { hashedPrivkey, hashedPassphrase, ...userResponse } = user;
  return userResponse;
};

// Send verification code to email
export const sendVerificationCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    console.log("the email received", email);

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    const formattedEmail = email.toLowerCase().trim();

    // Generate 6-digit code
    const code = await emailService.generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    console.log("the code", code);
    console.log("the formatted email", email);

    // Store code
    verificationCodes.set(formattedEmail, { code, expiresAt });

    const sendingResult = await emailService.sendOTPEmail(formattedEmail, code);
    if (!sendingResult.success) {
      res.status(500).json({
        success: false,
        message: "Unable to send verification email.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Verification code sent to email",
    });
  } catch (error) {
    console.error("Send code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send verification code",
    });
  }
};

// Verify email code
export const verifyEmailCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({
        success: false,
        message: "Email and code are required",
      });
      return;
    }

    const formattedEmail = email.toLowerCase().trim();
    const storedData = verificationCodes.get(formattedEmail);

    if (!storedData) {
      res.status(400).json({
        success: false,
        message: "No verification code found. Please request a new one.",
      });
      return;
    }

    if (Date.now() > storedData.expiresAt) {
      verificationCodes.delete(formattedEmail);
      res.status(400).json({
        success: false,
        message: "Verification code expired. Please request a new one.",
      });
      return;
    }

    if (storedData.code !== code) {
      res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
      return;
    }

    // Code is valid, remove it
    verificationCodes.delete(formattedEmail);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: formattedEmail },
    });

    if (existingUser) {
      // User exists, authenticate them
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET not configured");
      }

      const token = jwt.sign(
        { userId: existingUser.id, email: existingUser.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const refreshToken = jwt.sign(
        { userId: existingUser.id, email: existingUser.email },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.status(200).json({
        success: true,
        message: "Email verified successfully",
        token,
        refreshToken,
        user: excludeSensitiveData(existingUser),
        isNewUser: false,
      });
    } else {
      // New user - they'll need to complete registration
      res.status(200).json({
        success: true,
        message: "Email verified successfully",
        isNewUser: true,
      });
    }
  } catch (error) {
    console.error("Verify code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify code",
    });
  }
};

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
      res.status(500).json({
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

// Google/Apple OAuth authentication for existing users
export const oauthAuthenticate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, provider } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    const formattedEmail = email.toLowerCase().trim();

    // Find existing user
    const user = await prisma.user.findUnique({
      where: { email: formattedEmail },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found. Please complete registration first.",
      });
      return;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Generate tokens
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(200).json({
      success: true,
      message: `${provider} authentication successful`,
      token,
      refreshToken,
      user: excludeSensitiveData(user),
    });
  } catch (error) {
    console.error("OAuth authenticate error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Register new user (with username and wallet setup)
export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {

    const { email, userName, profileImageUrl } = req.body;

    // getting user's location
    let country = "";
    if (req.headers["cf-ipcountry"]) {
      const theCountry = req.headers["cf-ipcountry"];
      // if its string [] get the first element
      if (theCountry instanceof Array) {
        country = theCountry[0];
      } else {
        country = theCountry;
      }
    }
    if (!email || !userName) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    const formattedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: formattedEmail }, { userName }],
      },
    });

    if (existingUser) {
      if (existingUser.email === formattedEmail) {
        res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      } else if (existingUser.userName === userName) {
        res.status(409).json({
          success: false,
          message: "Username already taken",
        });
      } else {
        res.status(409).json({
          success: false,
          message: "Wallet address already registered",
        });
      }
      return;
    }

    // create the wallet
    const newWallet = await createUserWallet();

    const { safeSmartAccount } = await createSmartAccount(newWallet.privateKey);

    if (!safeSmartAccount) {
      res.status(500).json({
        success: false,
        message: "Failed to create smart account",
      });
      return;
    }

    const masterKey = process.env.ENCRYPTION_SECRET;
    if (!masterKey) {
      throw new Error("ENCRYPTION_MASTER_KEY not configured");
    }

    // Create composite encryption key: hash(email + masterKey)
    const encryptionKey = crypto
      .createHash("sha256")
      .update(`${formattedEmail}:${masterKey}`)
      .digest("hex");
    const passphrase = newWallet.mnemonic?.phrase ?? "";
    const encryptedPassphrase = Encryption.encrypt(passphrase, encryptionKey);
    const encryptedPrivkey = Encryption.encrypt(
      newWallet.privateKey,
      encryptionKey
    );

    const hashedPassphrase = Encryption.encodeEncryptedText(JSON.stringify(encryptedPassphrase));
    const hashedPrivkey = Encryption.encodeEncryptedText(JSON.stringify(encryptedPrivkey));

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: formattedEmail,
        userName,
        address: newWallet.address,
        smartAddress: safeSmartAccount.address,
        profileImageUrl: profileImageUrl || null,
        hashedPrivkey: hashedPrivkey,
        hashedPassphrase: hashedPassphrase,
        location: country,
      },
    });

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Generate tokens
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      refreshToken,
      user: excludeSensitiveData(newUser),
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// Refresh access token
export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Verify refresh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: number;
      email: string;
    };

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Generate new tokens
    const newToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
      user: excludeSensitiveData(user),
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};
