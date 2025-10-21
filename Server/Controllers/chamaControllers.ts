// This file has all chama related functions
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { generateUniqueSlug } from "../Utils/HelperFunctions";

const prisma = new PrismaClient();

interface CreateChamaRequestBody {
  name: string;
  description: string;
  type: string;
  adminTerms: string;
  amount: string;
  cycleTime: number;
  maxNo: number;
  startDate: Date;
  promoCode: string;
  collateralRequired: boolean;
  blockchainId: string;
  adminId: number;
  txHash: string;
}

// create a chama
export const createChama = async (
  req: Request<{}, {}, CreateChamaRequestBody>,
  res: Response
) => {
  const chamaData = req.body;
  console.log(chamaData);
  try {
    const {
      name,
      description,
      type,
      adminTerms,
      amount,
      cycleTime,
      maxNo,
      startDate,
      promoCode,
      collateralRequired,
      blockchainId,
      adminId,
      txHash,
    } = chamaData;

    // Generate unique slug from name
    const uniqueSlug = await generateUniqueSlug(name);

    const chama = await prisma.chama.create({
      data: {
        name: name,
        description: description,
        adminTerms: adminTerms,
        type: type,
        amount: amount, // amount in string
        cycleTime: cycleTime,
        maxNo: maxNo || 15,
        slug: uniqueSlug,
        startDate: new Date(startDate),
        payDate: new Date(
          new Date(startDate).getTime() + cycleTime * 24 * 60 * 60 * 1000
        ),
        blockchainId: blockchainId,
        round: 1,
        cycle: 1,
        // Note: admin connection needs proper implementation based on your auth system
        admin: { connect: { id: req.user?.userId } },
      },
    });

    if (chama) {
      // Then, make the admin a member
      await prisma.chamaMember.create({
        data: {
          user: {
            connect: {
              id: req.user?.userId,
            },
          },
          chama: {
            connect: { id: chama.id },
          },
          payDate: new Date(),
        },
      });

      // Handle collateral payment for public chamas that require it
      if (type === "Public" && collateralRequired && txHash) {
        await prisma.payment.create({
          data: {
            amount: amount, // amount in string
            txHash: txHash,
            description: "Chama creation collateral payment.",
            chamaId: chama.id,
            userId: req.user?.userId || 0,
          },
        });
      }
    }

    res.status(201).json({
      success: true,
      chama: {
        chama,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: "Failed to create chama" });
  }
};

// get chama by slug
export const getChamaBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const chama = await prisma.chama.findUnique({
      where: { slug: slug },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        payments: true,
        admin: true,
      },
    });
    if (!chama) {
      return res.status(404).json({ success: false, error: "Chama not found" });
    }
    return res.status(200).json({ success: true, chama: chama });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to get chama" });
  }
};

// get chamas user is a member of
export const getChamasUserIsMemberOf = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    console.log("the user id is", userId);
    if (!userId) {
      return res.status(401).json({ success: false, error: "No user id found." });
    }
    const chamas = await prisma.chamaMember.findMany({
      where: {
        userId: userId,
      },
      include: {
        chama: {
          include: {
            admin: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    });
    console.log("the chamas", chamas);
    return res.status(200).json({ success: true, chamas: chamas });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: "Failed to get chamas user is a member of",
    });
  }
};

// get public chamas a user is not member of
export const getPublicChamasUserIsNotMemberOf = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const chamas = await prisma.chama.findMany({
      where: {
        type: "Public",
        members: {
          none: {
            userId: userId,
          },
        },
      },
    });
    return res.status(200).json({ success: true, chamas: chamas });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: "Failed to get public chamas user is not member of",
    });
  }
};

// deposit funds to a chama
export const depositToChama = async (req: Request, res: Response) => {
  try {
    const { amount, blockchainId, txHash, chamaId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!amount || !blockchainId || !txHash) {
      return res.status(400).json({
        success: false,
        error: "Amount, blockchainId, and txHash are required",
      });
    }

    // Validate that the user is a member of this chama
    const chamaMember = await prisma.chamaMember.findFirst({
      where: {
        chamaId: parseInt(chamaId),
        userId: userId,
      },
    });

    if (!chamaMember) {
      return res.status(403).json({
        success: false,
        error: "You are not a member of this chama",
      });
    }

    // Get the chama details
    const chama = await prisma.chama.findUnique({
      where: { id: parseInt(chamaId) },
    });

    if (!chama) {
      return res.status(404).json({
        success: false,
        error: "Chama not found",
      });
    }

    // Calculate 2% transaction fee
    const paymentAmount = parseFloat(amount);
    const transactionFee = paymentAmount * 0.02; // 2% fee
    const totalAmount = paymentAmount + transactionFee;

    // Record the payment in the database
    await prisma.payment.create({
      data: {
        amount: amount,
        description: `Deposit to ${chama.name} (including 2% fee: ${transactionFee.toFixed(4)} cUSD)`,
        txHash: txHash,
        chamaId: parseInt(chamaId),
        userId: userId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Deposit successful",
      txHash: txHash,
      amount: amount,
      transactionFee: transactionFee.toFixed(3),
      totalAmount: totalAmount.toFixed(3),
    });
  } catch (error) {
    console.error("Deposit error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process deposit",
    });
  }
};
