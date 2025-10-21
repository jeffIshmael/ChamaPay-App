// This file has all user related functions
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

// Interface for update profile request body
interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phoneNo?: number | null;
  profileImageUrl?: string | null;
}

// Interface for user response (excluding sensitive fields)
interface UserResponse {
  id: number;
  email: string;
  name: string | null;
  phoneNo: number | null;
  address: string;
  role: string | null;
  profile: string | null;
  profileImageUrl: string | null;
}

// (removed duplicate inline checkUserExists in favor of typed version below)

// Function to get a user
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    
    if (!req.user?.userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Remove sensitive fields from response
    const { ...userResponse } = user;
    
    res.status(200).json({ user: userResponse });
  } catch (error: unknown) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Function to update user profile
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phoneNo, profileImageUrl }: UpdateProfileRequest = req.body;
    
    if (!req.user?.userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    const userId: number = req.user.userId;

    // Validate required fields
    if (!name?.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    if (!email?.trim()) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Validate email format
    const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Please enter a valid email address" });
      return;
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: email.trim(),
        NOT: { id: userId }
      }
    });

    if (existingUser) {
      res.status(400).json({ error: "Email is already taken" });
      return;
    }

    // Validate phone number if provided
    if (phoneNo !== null && phoneNo !== undefined) {
      if (typeof phoneNo !== 'number' || phoneNo < 0) {
        res.status(400).json({ error: "Please enter a valid phone number" });
        return;
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        userName: name.trim(),
        email: email.trim().toLowerCase(),
        phoneNo: phoneNo,
        profileImageUrl: profileImageUrl || null
      }
    });

    // Remove sensitive fields from response
    const { ...userResponse }: { 
      [key: string]: any; 
    } = updatedUser;

    res.status(200).json({ 
      message: "Profile updated successfully",
      user: userResponse as UserResponse
    });
  } catch (error: unknown) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}; 

// Public endpoint to check if a user exists by email
export const checkUserExists = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) {
      res.status(400).json({ success: false, error: "Email is required" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      res.status(200).json({ success: false });
      return;
    }
    const { ...safeUser } = user as any;
    res.status(200).json({ success: true, user: safeUser });
  } catch (error: unknown) {
    console.error("Check user exists error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// function to get user by userId
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }
    res.status(200).json({ user: user });
  } catch (error: unknown) {
    console.error("Get user by userId error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};