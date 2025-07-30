// controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { getWallets } = require("../Utils/WalletCreation");
const encryptionService = require("../Utils/Encryption");
const emailService = require("../Utils/EmailService");

const prisma = new PrismaClient();

// Step 1: Initial registration request (sends OTP)
exports.requestRegistration = async (req, res) => {
  try {
    const { email, password, userName } = req.body;
    
    // Validation
    if (!email || !password || !userName) {
      return res.status(400).json({ 
        error: "Email, password, and username are required" 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: "Password must be at least 8 characters long" 
      });
    }

    const formattedEmail = email.toLowerCase();
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: formattedEmail },
    });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Check if email is already pending verification
    const existingPending = await prisma.pendingUser.findUnique({
      where: { email: formattedEmail },
      include: { emailVerification: true }
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Calculate expiration times
    const now = new Date();
    const pendingUserExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    // Generate OTP
    const otp = emailService.generateOTP();

    let pendingUser;

    if (existingPending) {
      // Update existing pending user
      pendingUser = await prisma.pendingUser.update({
        where: { id: existingPending.id },
        data: {
          name: userName,
          password: hashedPassword,
          expiresAt: pendingUserExpiry,
          emailVerification: {
            upsert: {
              create: {
                otp,
                expiresAt: otpExpiry,
                attempts: 0,
              },
              update: {
                otp,
                expiresAt: otpExpiry,
                attempts: 0,
                verified: false,
              }
            }
          }
        }
      });
    } else {
      // Create new pending user
      pendingUser = await prisma.pendingUser.create({
        data: {
          email: formattedEmail,
          name: userName,
          password: hashedPassword,
          expiresAt: pendingUserExpiry,
          emailVerification: {
            create: {
              otp,
              expiresAt: otpExpiry,
            }
          }
        }
      });
    }

    // Send OTP email
    const emailResult = await emailService.sendOTPEmail(formattedEmail, otp, userName);
    
    if (!emailResult.success) {
      return res.status(500).json({ 
        error: "Failed to send verification email. Please try again." 
      });
    }

    res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
      pendingUserId: pendingUser.id,
      email: formattedEmail
    });

  } catch (error) {
    console.error("Registration request error:", error);
    res.status(500).json({ 
      error: "Internal server error. Please try again." 
    });
  }
};

// Step 2: Verify OTP and complete registration
exports.verifyEmailAndCompleteRegistration = async (req, res) => {
  try {
    const { pendingUserId, otp } = req.body;
    
    if (!pendingUserId || !otp) {
      return res.status(400).json({ 
        error: "Pending user ID and OTP are required" 
      });
    }

    // Find pending user with verification
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { id: parseInt(pendingUserId) },
      include: { emailVerification: true }
    });

    if (!pendingUser) {
      return res.status(404).json({ error: "Invalid or expired registration request" });
    }

    // Check if pending user has expired
    if (new Date() > pendingUser.expiresAt) {
      await prisma.pendingUser.delete({ where: { id: pendingUser.id } });
      return res.status(400).json({ error: "Registration request expired. Please start over." });
    }

    const verification = pendingUser.emailVerification;
    
    if (!verification) {
      return res.status(400).json({ error: "No verification request found" });
    }

    // Check if OTP has expired
    if (new Date() > verification.expiresAt) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    // Check attempt limit
    if (verification.attempts >= 5) {
      return res.status(400).json({ error: "Too many failed attempts. Please request a new OTP." });
    }

    // Verify OTP
    if (verification.otp !== otp) {
      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: verification.attempts + 1 }
      });
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Generate wallet
    const wallet = await getWallets();
    if (!wallet) {
      return res.status(500).json({ 
        error: "Failed to generate wallet. Please try again." 
      });
    }

    // Encrypt wallet data
    const keyToEncrypt = process.env.JWT_SECRET;
    const encryptedPrivateKey = encryptionService.encrypt(
      wallet.signingKey.privateKey, 
      keyToEncrypt
    );
    const encryptedMnemonic = encryptionService.encrypt(
      wallet.mnemonic.phrase, 
      keyToEncrypt
    );

    // Create actual user
    const user = await prisma.user.create({
      data: {
        email: pendingUser.email,
        name: pendingUser.name,
        password: pendingUser.password,
        address: wallet.address,
        privKey: JSON.stringify(encryptedPrivateKey),
        mnemonics: JSON.stringify(encryptedMnemonic),
      },
    });

    // Clean up pending user
    await prisma.pendingUser.delete({ where: { id: pendingUser.id } });
    res.status(201).json({
      success: true,
      message: "Registration completed successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        address: user.address
      }
    });

  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ 
      error: "Internal server error. Please try again." 
    });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { pendingUserId } = req.body;
    
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { id: parseInt(pendingUserId) },
      include: { emailVerification: true }
    });

    if (!pendingUser) {
      return res.status(404).json({ error: "Invalid registration request" });
    }

    // Generate new OTP
    const otp = emailService.generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update verification
    await prisma.emailVerification.update({
      where: { pendingUserId: pendingUser.id },
      data: {
        otp,
        expiresAt: otpExpiry,
        attempts: 0,
      }
    });

    // Send new OTP
    const emailResult = await emailService.sendOTPEmail(pendingUser.email, otp, pendingUser.name);
    
    if (!emailResult.success) {
      return res.status(500).json({ 
        error: "Failed to resend verification email" 
      });
    }

    res.json({
      success: true,
      message: "New verification code sent to your email"
    });

  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Existing login function
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required" 
      });
    }

    const formattedEmail = email.toLowerCase();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: formattedEmail },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        address: user.address 
      }, 
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        address: user.address
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      error: "Internal server error. Please try again." 
    });
  }
};

// Function to decrypt and return wallet data (for transaction signing)
exports.getWalletData = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.userId; // From JWT middleware

    if (!password) {
      return res.status(400).json({ 
        error: "Password is required to access wallet data" 
      });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Decrypt wallet data
    const encryptedPrivateKey = JSON.parse(user.privKey);
    const encryptedMnemonic = JSON.parse(user.mnemonics);

    const privateKey = encryptionService.decrypt(encryptedPrivateKey, process.env.JWT_SECRET);
    const mnemonic = encryptionService.decrypt(encryptedMnemonic, process.env.JWT_SECRET);

    res.json({
      success: true,
      walletData: {
        address: user.address,
        privateKey,
        mnemonic
      }
    });

  } catch (error) {
    console.error("Wallet data retrieval error:", error);
    
    if (error.message.includes('Decryption failed')) {
      return res.status(401).json({ 
        error: "Invalid password or corrupted wallet data" 
      });
    }

    res.status(500).json({ 
      error: "Failed to retrieve wallet data" 
    });
  }
};

// Function to get only mnemonic (for settings/backup)
exports.getMnemonic = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.userId;

    if (!password) {
      return res.status(400).json({ 
        error: "Password is required to access mnemonic phrase" 
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Decrypt only mnemonic
    const encryptedMnemonic = JSON.parse(user.mnemonics);
    const mnemonic = encryptionService.decrypt(encryptedMnemonic, process.env.JWT_SECRET);

    res.json({
      success: true,
      mnemonic
    });

  } catch (error) {
    console.error("Mnemonic retrieval error:", error);
    
    if (error.message.includes('Decryption failed')) {
      return res.status(401).json({ 
        error: "Invalid password or corrupted data" 
      });
    }

    res.status(500).json({ 
      error: "Failed to retrieve mnemonic phrase" 
    });
  }
};
