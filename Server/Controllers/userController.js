// this file has all ser related functions
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// function to get a user
exports.getUser = async (req, res) => {
  try {
    console.log("endpoint caught.")
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    const formattedResponse = { user };


    res.status(200).json(formattedResponse);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// function to update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, email, phoneNo, profileImageUrl } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!name?.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!email?.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: email.trim(),
        NOT: { id: userId }
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email is already taken" });
    }

    // Validate phone number if provided
    if (phoneNo !== null && phoneNo !== undefined) {
      if (typeof phoneNo !== 'number' || phoneNo < 0) {
        return res.status(400).json({ error: "Please enter a valid phone number" });
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phoneNo: phoneNo,
        profileImageUrl: profileImageUrl || null
      }
    });

    // Remove sensitive fields from response
    const { password, privKey, mnemonics, ...userResponse } = updatedUser;

    res.status(200).json({ 
      message: "Profile updated successfully",
      user: userResponse 
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

