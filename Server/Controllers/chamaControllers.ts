// This file has all chama related functions
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { generateUniqueSlug, getPrivateKey } from "../Lib/HelperFunctions";
import { bcCreateChama, bcDepositFundsToChama, bcJoinPublicChama } from "../Blockchain/WriteFunction";
import { approveTx } from "../Blockchain/erc20Functions";
import { contractAddress } from "../Blockchain/Constants";
import { bcGetTotalChamas, getUserChamaBalance, getEachMemberBalance } from "../Blockchain/ReadFunctions";

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
  collateralRequired: boolean;
}

// create a chama
export const createChama = async (
  req: Request<{}, {}, CreateChamaRequestBody>,
  res: Response
) => {
  const chamaData = req.body;
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
      collateralRequired,
    } = chamaData;
    console.log("the chama data", chamaData);

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // get the private key of user
    const result = await getPrivateKey(userId);
    if (!result.success || result.privateKey == null) {
      return res.status(401).json({ success: false, error: "Unable to get private key." });
    }


    const startDateInSecs = new Date(startDate).getTime() / 1000;
    // the blockchain Id
    const blockchainId = await bcGetTotalChamas();

    // if its a public we need to first approve spending
    if (collateralRequired) {
      const approveTxHash = await approveTx(result.privateKey, (Number(amount) * maxNo).toString(), contractAddress as `0x${string}`);
      if (!approveTxHash) {
        return res.status(401).json({ success: false, error: "Approve transaction failed." });
      }
    }

    // register in the blockchain
    const creationTxHash = await bcCreateChama(result.privateKey, amount, BigInt(Number(cycleTime)), BigInt(startDateInSecs), BigInt(Number(maxNo)), collateralRequired);
    if (!creationTxHash) {
      return res.status(401).json({ success: false, error: "Failed to register onchain." });
    }

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
        admin: { connect: { id: userId } },
      },
    });
    if (!chama) {
      return res.status(401).json({ success: false, error: "Failed to save chama to database." });
    }

    // Then, make the admin a member
    await prisma.chamaMember.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
        chama: {
          connect: { id: chama.id },
        },
        payDate: new Date(),
      },
    });

    // Handle collateral payment for public chamas that require it
    if (type === "Public" && collateralRequired) {
      await prisma.payment.create({
        data: {
          amount: (parseFloat(amount) * maxNo).toString(), // amount in string
          txHash: creationTxHash,
          description: "Locked.",
          chamaId: chama.id,
          userId: userId,
        },
      });
    }

    return res.status(201).json({
      success: true,
      chama: {
        chama,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: "Failed to create chama" });
  }
};

// get chama by slug
export const getChamaBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const chama = await prisma.chama.findUnique({
      where: { slug: slug },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        payments: {
          include: {
            user: true,
          },
          orderBy: {
            doneAt: "desc",
          },
        },
        messages: {
          include: {
            sender: true,
          },
        },
        admin: true,
      },
    });
    if (!chama) {
      return res.status(404).json({ success: false, error: "Chama not found" });
    }
    // add the blockchain details
    const userBalance = await getUserChamaBalance(user.smartAddress, BigInt(Number(chama.blockchainId)));
    const eachMemberBalance = await getEachMemberBalance(BigInt(Number(chama.blockchainId)));

    const finalChama = {
      ...chama,
      userBalance: JSON.stringify(userBalance),
      eachMemberBalance: JSON.stringify(eachMemberBalance),
    };

    return res.status(200).json({ success: true, chama: finalChama });
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
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "No user id found." });
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
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
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
      include: {
        members: true,
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
    const { amount, blockchainId, chamaId } = req.body;
    const userId = req.user?.userId;


    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!amount || !blockchainId || !chamaId) {
      return res.status(400).json({
        success: false,
        error: "All fields are required.",
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

    // get the private key of user
    const result = await getPrivateKey(userId);
    if (!result.success || result.privateKey == null) {
      return res.status(401).json({ success: false, error: "Unable to get private key." });
    }

    // approve transaction
    const approveTxHash = await approveTx(result.privateKey, amount, contractAddress as `0x${string}`);
    if (!approveTxHash) {
      return res.status(401).json({ success: false, error: "deposit approve transaction failed." });
    }

    // do the deposit onchain
    const depositTxHash = await bcDepositFundsToChama(result.privateKey, BigInt(Number(blockchainId)), amount);
    if (!depositTxHash) {
      return res.status(401).json({ success: false, error: "Failed to deposit for chama." });
    }

    // Record the payment in the database
    await prisma.payment.create({
      data: {
        amount: amount,
        description: `deposited`,
        txHash: depositTxHash,
        chamaId: parseInt(chamaId),
        userId: userId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Deposit successful",
      txHash: depositTxHash,
      amount: amount,
    });
  } catch (error) {
    console.error("Deposit error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process deposit",
    });
  }
};

// add a member to a chama
export const addMemberToChama = async (req: Request, res: Response) => {
  try {
    const { chamaId, isPublic, memberId, amount, txHash } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (!chamaId || !isPublic || !memberId) {
      return res
        .status(400)
        .json({ success: false, error: "All fields are required" });
    }

    // ensure user exists
    const user = await prisma.user.findUnique({
      where: {
        id: Number(userId)
      }
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, error: "User not found." });

    }
    const chama = await prisma.chama.findUnique({
      where: {
        id: Number(chamaId)
      }
    });
    if (!chama) {
      return res
        .status(400)
        .json({ success: false, error: "Chama not found." });
    }

    if (isPublic) {
      // we need to approve spending because there is collateral required
      const privateKey = await getPrivateKey(user.id);
      if (!privateKey.success || privateKey.privateKey === null) {
        return res
          .status(400)
          .json({ success: false, error: "Unable to get signing client." });
      }
      const approveTxHash = await approveTx(privateKey.privateKey, amount, contractAddress);
      if (!approveTxHash) {
        return res
          .status(400)
          .json({ success: false, error: "Unable to approve transaction." });
      }
      // the main function of joining
      const chamaBlockchainId = BigInt(Number(Number(chama.blockchainId)));
      const joinTxHash = await bcJoinPublicChama(privateKey.privateKey, chamaBlockchainId, amount);
      if (!joinTxHash) {
        return res
          .status(400)
          .json({ success: false, error: `Unable to join ${chama.name} chama onchain.` });
      }
      await prisma.payment.create({
        data: {
          amount: amount,
          description: `Joining collateral`,
          txHash: joinTxHash,
          chamaId: parseInt(chamaId),
          userId: memberId,
        },
      });
    }

    const chamaMember = await prisma.chamaMember.create({
      data: {
        userId: memberId,
        chamaId: parseInt(chamaId),
        payDate: new Date(),
      },
    });

    if (!chamaMember) {
      return res
        .status(400)
        .json({ success: false, error: "Failed to add member" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Member added successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: "Failed to add member to chama",
    });
  }
};

// send message
export const sendChamaMessage = async (req: Request, res: Response) => {
  try {
    const { chamaId, message } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (!chamaId) {
      return res
        .status(400)
        .json({ success: false, error: "All fields are required" });
    }

    const messages = await prisma.message.create({
      data: {
        chamaId: chamaId,
        text: message,
        senderId: userId,
      },
    });

    return res
      .status(200)
      .json({ success: true, message: "Message successfully sent." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: "Failed to add member to chama",
    });
  }
};
