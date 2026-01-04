// This file has all user related functions
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import {
  registerUserPayment,
  requestToJoin,
  sortRequest,
} from "../Lib/prismaFunctions";

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
      include: {
        joinRequests: {
          include: {
            chama: true,
          },
        },
        notifications: {
          include: {
            chama: true,
            user: true,
          },
        },
        payments: {
          include: {
            chama: true,
            user: true,
          },
        },
        payOuts: {
          include: {
            chama: true,
            user: true,
          },
        },
      },
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

// function to get all the userdaitls
export const getUserDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        joinRequests: {
          include: {
            chama: true,
          },
        },
        notifications: {
          include: {
            chama: true,
            user: true,
          },
        },
        payments: {
          include: {
            chama: true,
            user: true,
          },
        },
        payOuts: {
          include: {
            chama: true,
            user: true,
          },
        },
        pretiumTransactions: {
          where: {
            isRealesed: true,
            chamaId: null,
            status: "COMPLETE",
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({ user: user });
  } catch (error: unknown) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Function to update user profile
export const updateUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, phoneNo, profileImageUrl }: UpdateProfileRequest =
      req.body;

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
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      res.status(400).json({ error: "Email is already taken" });
      return;
    }

    // Validate phone number if provided
    if (phoneNo !== null && phoneNo !== undefined) {
      if (typeof phoneNo !== "number" || phoneNo < 0) {
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
        profileImageUrl: profileImageUrl || null,
      },
    });

    // Remove sensitive fields from response
    const {
      ...userResponse
    }: {
      [key: string]: any;
    } = updatedUser;

    res.status(200).json({
      message: "Profile updated successfully",
      user: userResponse as UserResponse,
    });
  } catch (error: unknown) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Public endpoint to check if a user exists by email
export const checkUserExists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) {
      res.status(400).json({ success: false, error: "Email is required" });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
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
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });
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

// Check if username is available
export const checkUsernameAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.body as { username?: string };

    if (!username?.trim()) {
      res.status(400).json({ success: false, error: "Username is required" });
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();

    // Check if username is already taken
    const existingUser = await prisma.user.findFirst({
      where: {
        userName: trimmedUsername,
      },
      select: { id: true, userName: true },
    });

    if (existingUser) {
      res.status(200).json({
        success: false,
        available: false,
        message: "Username is already taken",
      });
      return;
    }

    // Check username format (alphanumeric, underscores, hyphens)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      res.status(400).json({
        success: false,
        available: false,
        message:
          "Username can only contain letters, numbers, underscores, and hyphens",
      });
      return;
    }

    // Check minimum length
    if (trimmedUsername.length < 3) {
      res.status(400).json({
        success: false,
        available: false,
        message: "Username must be at least 3 characters long",
      });
      return;
    }

    res.status(200).json({
      success: true,
      available: true,
      message: "Username is available",
    });
  } catch (error: unknown) {
    console.error("Check username availability error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// Search users by username
export const searchUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { query } = req.query as { query?: string };

    if (!query?.trim()) {
      res
        .status(400)
        .json({ success: false, error: "Search query is required" });
      return;
    }

    const trimmedQuery = query.trim().toLowerCase();

    // Search for users by username (case insensitive)
    const users = await prisma.user.findMany({
      where: {
        userName: {
          contains: trimmedQuery,
        },
      },
      select: {
        id: true,
        userName: true,
        email: true,
        address: true,
        profileImageUrl: true,
      },
      take: 10, // Limit to 10 results
    });

    res.status(200).json({
      success: true,
      users: users,
    });
  } catch (error: unknown) {
    console.error("Search users error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// register payment
export const registerPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId: number = req.user?.userId as number;
    if (!req.user?.userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    const { receiver, amount, description, txHash } = req.body;
    if (!receiver || !amount || !description || !txHash) {
      res
        .status(400)
        .json({ success: false, error: "All fields are required" });
      return;
    }
    const payment = await registerUserPayment(
      userId,
      receiver,
      amount,
      description,
      txHash
    );
    if (payment === null) {
      res
        .status(400)
        .json({ success: false, error: "Failed to register payment" });
      return;
    }
    res.status(200).json({ success: true, payment: payment });
  } catch (error) {
    console.error("Register payment error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// send join request
export const sendJoinRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chamaId } = req.query;
  try {
    const userId: number = req.user?.userId as number;
    if (!req.user?.userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    if (!chamaId) {
      res
        .status(400)
        .json({ success: false, error: "All fields are required" });
      return;
    }
    const request = await requestToJoin(userId, Number(chamaId));
    if (request === null) {
      res
        .status(400)
        .json({ success: false, error: "Failed to send request." });
      return;
    }

    // // notify admin
    // const adminId = await prisma.chama.findUnique({
    //   where:{
    //     id: chamaId
    //   },
    //   select:{
    //     adminId: true
    //   }
    // });
    // if(!adminId){
    //   throw new Error("Unable to get admin.");
    // }
    // await notify
    res.status(200).json({ success: true, request: request });
  } catch (error) {
    console.error("Register request error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// handle the request (approve, reject)
export const confirmJoinRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chamaId, requestId, decision } = req.body;
  try {
    const userId: number = req.user?.userId as number;
    if (!req.user?.userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    if (!chamaId || !requestId || !decision) {
      res
        .status(400)
        .json({ success: false, error: "All fields are required" });
      return;
    }

    // get admin
    const adminId = await prisma.chama.findUnique({
      where: {
        id: chamaId,
      },
      select: {
        adminId: true,
      },
    });
    if (!adminId) {
      throw new Error("Unable to get admin.");
    }
    if (userId !== adminId.adminId) {
      res
        .status(400)
        .json({ success: false, error: "Only admin can approve." });
      return;
    }
    const toBeDone = decision === "approve";
    // make it
    const result = await sortRequest(requestId, toBeDone);

    if (!result) {
      res
        .status(400)
        .json({ success: false, error: "Unable to sort and add member." });
      return;
    }
    res.status(200).json({ success: true, request: result });
  } catch (error) {
    console.error("sort request error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
