// This file has all user related functions
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { formatUnits, isAddress } from "viem";
import "multer";
import {
  checkHasPendingRequest,
  getSentRequests,
  registerUserPayment,
  requestToJoin,
  handleRequest,
} from "../Lib/prismaFunctions";
import { uploadToPinata } from "../utils/PinataUtils";
import { getPrivateKey } from "../Lib/HelperFunctions";
import { transferTx } from "../Blockchain/erc20Functions";
import { bcAddMemberToPrivateChama } from "../Blockchain/WriteFunction";
import { getUserBalance } from "../Blockchain/ReadFunctions";

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

// Extend Request type
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  user?: {
    userId: number;
    email: string;
    userName?: string;
  };
}

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

    const userResults = await prisma.user.findUnique({
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

    if (!userResults) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    //check if the user has requests they need to approve
    const sentRequests = await getSentRequests(userResults.id);

    const user = { ...userResults, sentRequests };

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
    const { hashedPassphrase, hashedPrivkey, ...safeUser } = user as any;
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
    const { hashedPassphrase, hashedPrivkey, ...safeUser } = user as any;
    res.status(200).json({ user: safeUser });
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
  console.log("Chama ID for the request:", chamaId);
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
  const { chamaId, requestId, userName, decision } = req.body;
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

    // get the request
    const request = await prisma.chamaRequest.findUnique({
      where: {
        id: Number(requestId),
      }
    });
    if (!request) {
      res
        .status(400)
        .json({ success: false, error: "Unable to get request." });
      return;
    };

    // get admin
    const chama = await prisma.chama.findUnique({
      where: {
        id: chamaId,
      },
      select: {
        adminId: true,
        name: true,
        payOutOrder: true,
        blockchainId: true
      },
    });
    if (!chama) {
      res
        .status(400)
        .json({ success: false, error: "Unable to get chama." });
      return;
    }
    if (userId !== chama.adminId) {
      res
        .status(400)
        .json({ success: false, error: "Only admin can approve." });
      return;
    }
    const isApproved = decision === "approve"; // boolean of whether approved
    // if approved add the member onchain
    if (isApproved) {
      // get the requesting User 
      const requestingUser = await prisma.user.findUnique({
        where: {
          id: request.userId,
        }
      });
      if (!requestingUser) {
        res
          .status(400)
          .json({ success: false, error: `${userName} not found.` });
        return;
      };
      const privateKeyResponse = await getPrivateKey(userId);
      if (!privateKeyResponse.success || privateKeyResponse.privateKey === null) {
        res
          .status(400)
          .json({ success: false, error: `unable to get signing client.` });
        return;
      }
      const chamaBlockchainId = BigInt(Number(chama.blockchainId));
      const addingMemberTx = await bcAddMemberToPrivateChama(privateKeyResponse.privateKey, chamaBlockchainId, requestingUser.smartAddress);
      if (!addingMemberTx) {
        res
          .status(400)
          .json({ success: false, error: `unable to add ${userName} to ${chama.name} onchain.` });
        return;
      }
    }

    const result = await handleRequest(requestId, chama.name, userName, isApproved);

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

// check has request
export const checkHasJoinRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { chamaId } = req.query;
  const { userId } = req.params;
  try {
    if (!userId) {
      res.status(401).json({ message: "No user Id provided." });
      return;
    }

    if (!chamaId) {
      res.status(400).json({ success: false, error: "No chama Id provided." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: Number(userId),
      },
    });

    if (!user) {
      res.status(400).json({ success: false, error: "user not found." });
      return;
    }

    // if user has
    const hasRequest = await checkHasPendingRequest(
      Number(userId),
      Number(chamaId)
    );
    if (hasRequest === null) {
      res
        .status(400)
        .json({ success: false, error: "Error checking if has request." });
      return;
    }

    res.status(200).json({ success: true, hasRequest: hasRequest });
  } catch (error) {
    console.error("sort request error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// share a chama link to user
export const shareChamaLink = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { receiverId, message, chamaLink } = req.body;
  try {
    const userId: number = req.user?.userId as number;
    if (!req.user?.userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    if (!receiverId || !message || !chamaLink) {
      res
        .status(400)
        .json({ success: false, error: "All fields are required" });
      return;
    }

    const notification = await prisma.notification.create({
      data: {
        senderId: userId,
        message: message,
        type: "invite_link",
        sharedLink: chamaLink,
        userId: receiverId,
      },
    });
    if (!notification) {
      res
        .status(400)
        .json({ success: false, error: "Unable to notify the user." });
      return;
    }

    res.status(200).json({ success: true, notification: notification });
  } catch (error) {
    console.error("send invite error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// update phone number
export const updatePhoneNumber = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phoneNo } = req.body;
    const userId: number = req.user?.userId as number;
    if (!req.user?.userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    if (phoneNo !== null && phoneNo !== undefined) {
      if (!Number.isInteger(phoneNo) || phoneNo < 0) {
        res.status(400).json({ error: "Invalid phone number" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { phoneNo },
      select: {
        id: true,
        email: true,
        userName: true,
        phoneNo: true,
        profileImageUrl: true,
        address: true,
        smartAddress: true,
      },
    });

    res.json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export const uploadProfileImage = async (
  req: MulterRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image provided" });
      return;
    }

    const userId: number = req.user?.userId as number;

    if (!req.user?.userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Upload to Pinata IPFS
    const fileName = `profile_${userId}_${Date.now()}.${req.file.mimetype.split("/")[1]
      }`;
    const ipfsUrl = await uploadToPinata(
      req.file.buffer,
      fileName,
      req.file.mimetype
    );

    // Update user in database with IPFS URL
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: ipfsUrl },
      select: {
        id: true,
        email: true,
        userName: true,
        phoneNo: true,
        profileImageUrl: true,
        address: true,
        smartAddress: true,
      },
    });

    res.json({
      success: true,
      profileImageUrl: ipfsUrl,
      user: updatedUser,
      message: "Profile image uploaded to IPFS successfully",
    });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to upload image to IPFS",
    });
  }
};

// transfer USDC
export const transferUSDC = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId: number = req.user?.userId as number;
    if (!req.user?.userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    const { receiver, amount } = req.body;
    if (!receiver || !amount) {
      res
        .status(400)
        .json({ success: false, error: "All fields are required" });
      return;
    }

    // check if receiver is a valid address
    if (!isAddress(receiver)) {
      res.status(400).json({ success: false, error: "Invalid receiver address" });
      return;
    }
    // get the private key
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      res.status(400).json({ success: false, error: "User not found" });
      return;
    }

    const privateKey = await getPrivateKey(user.id);
    if (!privateKey.success || privateKey.privateKey === null) {
      res.status(400).json({ success: false, error: "Failed to get private key" });
      return;
    }

    const txHash = await transferTx(privateKey.privateKey, amount, receiver as `0x${string}`);

    if (!txHash.success) {
      res.status(400).json({ success: false, error: "Failed to transfer USDC" });
      return;
    }

    const payment = await registerUserPayment(
      userId,
      receiver,
      amount,
      "Transfer",
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
    console.error("Transfer USDC error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// transfer USDC
export const getUserUsdcBalance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId: number = req.user?.userId as number;
    if (!req.user?.userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    // get the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      res.status(400).json({ success: false, error: "User not found" });
      return;
    }

    const balance = await getUserBalance(user.smartAddress);
    const formattedBalance = formatUnits(balance, 6);

    res.status(200).json({ success: true, balance: formattedBalance });
  } catch (error) {
    console.error("Get User USDC balance error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
