// controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { getWallets } = require("../Utils/WalletCreation");
const encryptionService = require("../Utils/Encryption");

const prisma = new PrismaClient();

exports.register = async (req, res) => {
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const keyToEncrypt = process.env.JWT_SECRET;

    // Generate wallet
    const wallet = await getWallets();
    if (!wallet) {
      return res.status(500).json({ 
        error: "Failed to generate wallet. Please try again." 
      });
    }

    // Encrypt sensitive wallet data using user's password
    const encryptedPrivateKey = encryptionService.encrypt(
      wallet.signingKey.privateKey, 
      keyToEncrypt
    );
    
    const encryptedMnemonic = encryptionService.encrypt(
      wallet.mnemonic.phrase, 
      keyToEncrypt
    );

    // Create user with encrypted wallet data
    const user = await prisma.user.create({
      data: {
        email: formattedEmail,
        name: userName,
        password: hashedPassword,
        address: wallet.address,
        // encrypted private key as JSON string
        privKey: JSON.stringify(encryptedPrivateKey),
        // encrypted mnemonic as JSON string
        mnemonics: JSON.stringify(encryptedMnemonic),
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        address: user.address 
      }, 
      process.env.JWT_SECRET,
      { expiresIn: "24h" } // Extended to 24h for better UX
    );

    // Return success response (never return sensitive data)
    res.status(201).json({
      success: true,
      token
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      error: "Internal server error. Please try again." 
    });
  }
};

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

    const privateKey = encryptionService.decrypt(encryptedPrivateKey, password);
    const mnemonic = encryptionService.decrypt(encryptedMnemonic, password);

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
    const mnemonic = encryptionService.decrypt(encryptedMnemonic, password);

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