// This file has all chama related functions
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { contractAddress } from "../Blockchain/Constants";
import { bcGetTotalChamas, getEachMemberBalance, getUserChamaBalance } from "../Blockchain/ReadFunctions";
import { bcAddMemberToPrivateChama, bcAdminSetPayoutOrder, bcCreateChama, bcDepositFundsForMember, bcDepositFundsToChama, bcUpdateChamaDetails, bcWithdrawFundsFromChama } from "../Blockchain/WriteFunction";
import { approveTx } from "../Blockchain/erc20Functions";
import emailService from "../Lib/EmailService";
import { sendExpoNotificationToAllChamaMembers, sendExpoNotificationToAUser } from "../Lib/ExpoNotificationFunctions";
import { getPrivateKey, generateUniqueSlug } from "../Lib/HelperFunctions";
import { addMemberToPayout, notifyAllChamaMembers } from "../Lib/prismaFunctions";

import { getCached, setCache } from "../Lib/cache";

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

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // get the cdp wallet of user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedPrivkey) {
      return res.status(401).json({ success: false, error: "Unable to get user CDP wallet." });
    }

    const startDateInSecs = new Date(startDate).getTime() / 1000;
    // the blockchain Id
    const blockchainId = await bcGetTotalChamas();

    // if its a public we need to first approve spending
    if (collateralRequired) {
      const approveTxHash = await approveTx(user.hashedPrivkey as `0x${string}`, (Number(amount) * maxNo).toString(), contractAddress as `0x${string}`);
      if (!approveTxHash) {
        return res.status(401).json({ success: false, error: "Approve transaction failed." });
      }
    }

    // register in the blockchain
    const creationTxHash = await bcCreateChama(user.hashedPrivkey as `0x${string}`, amount, BigInt(Number(cycleTime)), BigInt(startDateInSecs), BigInt(Number(maxNo)), collateralRequired);
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
        payDate: new Date(startDate),
        status: "active",
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

// Helper for BigInt serialization
const bigIntReplacer = (_key: string, value: any) =>
  typeof value === "bigint" ? value.toString() : value;

// get chama by slug
export const getChamaBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const [user, chama] = await Promise.all([
      prisma.user.findUnique({
        where: { id: Number(userId) },
      }),
      prisma.chama.findUnique({
        where: { slug: slug },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  smartAddress: true,
                  userName: true,
                  profileImageUrl: true,
                },
              },
            },
          },
          payments: {
            include: {
              user: {
                select: {
                  id: true,
                  smartAddress: true,
                  userName: true,
                  profileImageUrl: true,
                },
              },
            },
            orderBy: { doneAt: "desc" },
            take: 20,
          },
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  smartAddress: true,
                  userName: true,
                  profileImageUrl: true,
                },
              },
            },
            orderBy: { timestamp: "desc" },
            take: 20,
          },
          admin: {
            select: {
              id: true,
              smartAddress: true,
              userName: true,
              profileImageUrl: true,
            },
          },
          payOuts: {
            include: {
              user: {
                select: {
                  id: true,
                  smartAddress: true,
                  userName: true,
                  profileImageUrl: true,
                },
              },
            },
            orderBy: { doneAt: "desc" },
            take: 20,
          }
        },
      })
    ]);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (!chama) {
      return res.status(404).json({ success: false, error: "Chama not found" });
    }

    // add the blockchain details
    const cacheKey = `chama-balances-${chama.blockchainId}-${user.smartAddress}`;
    let cachedBalances = getCached<any>(cacheKey);

    if (!cachedBalances) {
      const [userBalance, eachMemberBalance] = await Promise.all([
        getUserChamaBalance(user.smartAddress, BigInt(Number(chama.blockchainId))),
        getEachMemberBalance(BigInt(Number(chama.blockchainId))),
      ]);

      cachedBalances = {
        userBalance: JSON.parse(JSON.stringify(userBalance, bigIntReplacer)),
        eachMemberBalance: JSON.parse(JSON.stringify(eachMemberBalance, bigIntReplacer))
      };
      setCache(cacheKey, cachedBalances, 30_000); // cache for 30s
    }

    const finalChama = {
      ...chama,
      userBalance: cachedBalances.userBalance,
      eachMemberBalance: cachedBalances.eachMemberBalance,
    };

    return res.status(200).json({ success: true, chama: finalChama });
  } catch (error) {
    console.error("Failed to get chama:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to get chama" });
  }
};

// get chama messages paginated
export const getChamaMessages = async (req: Request, res: Response) => {
  try {
    const { chamaId } = req.params;
    const { cursor } = req.query;

    const messages = await prisma.message.findMany({
      where: { chamaId: Number(chamaId) },
      take: 20,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: Number(cursor) } : undefined,
      orderBy: { timestamp: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            smartAddress: true,
            userName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    const nextCursor = messages.length === 20 ? messages[19].id : null;
    return res.status(200).json({ success: true, messages, nextCursor });
  } catch (error) {
    console.error("Failed to get messages:", error);
    return res.status(500).json({ success: false, error: "Failed to get messages" });
  }
};

// get chama payments paginated
export const getChamaPayments = async (req: Request, res: Response) => {
  try {
    const { chamaId } = req.params;
    const { cursor } = req.query;

    const payments = await prisma.payment.findMany({
      where: { chamaId: Number(chamaId) },
      take: 20,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: Number(cursor) } : undefined,
      orderBy: { doneAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            smartAddress: true,
            userName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    const nextCursor = payments.length === 20 ? payments[19].id : null;
    return res.status(200).json({ success: true, payments, nextCursor });
  } catch (error) {
    console.error("Failed to get payments:", error);
    return res.status(500).json({ success: false, error: "Failed to get payments" });
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

    const chamasWithUnread = await Promise.all(
      chamas.map(async (member) => {
        const unreadCount = await prisma.message.count({
          where: {
            chamaId: member.chamaId,
            timestamp: {
              gt: member.lastReadTime,
            },
          },
        });
        
        return {
          ...member,
          chama: {
            ...member.chama,
            unreadMessages: unreadCount,
          }
        };
      })
    );

    return res.status(200).json({ success: true, chamas: chamasWithUnread });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: "Failed to get chamas user is a member of",
    });
  }
};


// 
// deposit funds to a chama
export const depositToChama = async (req: Request, res: Response) => {
  try {
    const { amount, blockchainId, chamaId, memberForId } = req.body;
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

    // Validate that the caller is a member of this chama
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

    let targetUserId = userId;
    let description = `deposited`;
    let memberForAddress: string | null = null;

    if (memberForId) {
      const targetMember = await prisma.chamaMember.findFirst({
        where: {
          chamaId: parseInt(chamaId),
          userId: memberForId,
        },
      });

      if (!targetMember) {
        return res.status(403).json({
          success: false,
          error: "Target user is not a member of this chama",
        });
      }

      const callerUser = await prisma.user.findUnique({ where: { id: userId } });
      const targetUser = await prisma.user.findUnique({ where: { id: memberForId } });

      if (!targetUser || !targetUser.smartAddress) {
        return res.status(404).json({ success: false, error: "Target user smart address not found" });
      }

      targetUserId = memberForId;
      description = `Deposited by @${callerUser?.userName || "Unknown"} on behalf of @${targetUser.userName}`;
      memberForAddress = targetUser.smartAddress;
    }

    const callerUserForDeposit = await prisma.user.findUnique({ where: { id: userId } });
    if (!callerUserForDeposit || !callerUserForDeposit.hashedPrivkey) {
      return res.status(401).json({ success: false, error: "Unable to get user CDP wallet." });
    }

    // approve transaction
    const approveTxHash = await approveTx(callerUserForDeposit.hashedPrivkey as `0x${string}`, amount, contractAddress as `0x${string}`);
    if (!approveTxHash) {
      return res.status(401).json({ success: false, error: "deposit approve transaction failed." });
    }

    console.log(" The approveTxHash", approveTxHash);
    console.log("the amount to be", amount);

    // do the deposit onchain
    let depositTxHash;
    if (memberForId && memberForAddress) {
      depositTxHash = await bcDepositFundsForMember(callerUserForDeposit.hashedPrivkey as `0x${string}`, BigInt(Number(blockchainId)), memberForAddress, amount);
    } else {
      depositTxHash = await bcDepositFundsToChama(callerUserForDeposit.hashedPrivkey as `0x${string}`, BigInt(Number(blockchainId)), amount);
    }

    if (!depositTxHash) {
      return res.status(401).json({ success: false, error: "Failed to deposit for chama." });
    }

    // Record the payment in the database
    await prisma.payment.create({
      data: {
        amount: amount,
        description: description,
        txHash: depositTxHash,
        chamaId: parseInt(chamaId),
        userId: targetUserId,
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
    const { chamaId, isPublic, memberId, amount } = req.body;
    // this is the admin if its !public i.e private
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (!chamaId || !memberId) {
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

    const memberBeingAdded = await prisma.user.findUnique({
      where: {
        id: Number(memberId)
      }
    });

    if (!memberBeingAdded) {
      return res
        .status(400)
        .json({ success: false, error: "Member not found." });
    }

    const chama = await prisma.chama.findUnique({
      where: {
        id: Number(chamaId)
      },
      include: {
        members: {
          include: { user: true }
        }
      }
    });
    if (!chama) {
      return res
        .status(400)
        .json({ success: false, error: "Chama not found." });
    }
    if (chama.round !== 1) {
      return res
        .status(400)
        .json({ success: false, error: "Cannot add user in the middle of cycle." });
    }

    // check whether the one requesting is the admin
    const isAdmin = user.id === chama.adminId;
    if (!isAdmin) {
      return res.status(400).json({ success: false, error: "You are not the admin of this chama." });
    }
    if (!user.hashedPrivkey) {
      return res
        .status(400)
        .json({ success: false, error: "Unable to get user CDP wallet." });
    }
    // the main function of adding the member
    const chamaBlockchainId = BigInt(Number(chama.blockchainId));
    const addingTxHash = await bcAddMemberToPrivateChama(user.hashedPrivkey as `0x${string}`, chamaBlockchainId, memberBeingAdded.smartAddress as `0x${string}`);
    if (!addingTxHash) {
      return res
        .status(400)
        .json({ success: false, error: `Unable to add ${user.userName} to ${chama.name} chama onchain.` });
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

    await addMemberToPayout(parseInt(chamaId), memberBeingAdded.id);

    // notify the member has been added
    await notifyAllChamaMembers(
      parseInt(chamaId),
      `A new member has joined ${chama.name} chama.`,
      "join",
      memberBeingAdded.id
    );

    await sendExpoNotificationToAllChamaMembers(
      `New member joined.`,
      `A new member has joined ${chama.name} chama.`,
      parseInt(chamaId),
      [memberBeingAdded.id]
    );

    const emails = chama.members.map((m: any) => m.user.email);
    if (emails.length > 0) {
      await emailService.sendMemberAddedToExistingMembersEmail(
        emails,
        chama.name,
        memberBeingAdded.userName,
        chama.members.length + 1
      );
    }

    if (memberBeingAdded.email) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const adminName = user?.userName || "the Admin";
      await emailService.sendMemberAddedToNewMemberEmail(
        memberBeingAdded.email,
        chama.name,
        adminName,
        chama.amount,
        chama.cycleTime,
        chama.payDate
      );
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

    const messages = await prisma.message.create({
      data: {
        chamaId: chamaId,
        text: message,
        senderId: userId,
      },
    });

    await sendExpoNotificationToAllChamaMembers(
      `New message`,
      `There’s a new message in the ${chama.name} chama.`,
      parseInt(chamaId),
      Number(userId)
    );

    return res
      .status(200)
      .json({ success: true, message: "Message successfully sent." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: "Failed to send message",
    });
  }
};

// MARK MESSAGES AS READ
export const markMessagesRead = async (req: Request, res: Response) => {
  try {
    const { chamaId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!chamaId) {
      return res.status(400).json({ success: false, error: "Chama ID is required" });
    }

    const member = await prisma.chamaMember.findFirst({
      where: {
        chamaId: Number(chamaId),
        userId: Number(userId),
      },
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found" });
    }

    await prisma.chamaMember.update({
      where: {
        id: member.id,
      },
      data: {
        lastReadTime: new Date(),
      },
    });

    return res.status(200).json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return res.status(500).json({ success: false, error: "Failed to mark messages as read" });
  }
};

// withdraw from chama balance
export const withdrawFromChamaBalance = async (req: Request, res: Response) => {
  try {
    const { chamaId, amount } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!chamaId || !amount) {
      return res.status(400).json({ success: false, error: "Chama ID and amount are required" });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: Number(userId),
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const chama = await prisma.chama.findUnique({
      where: {
        id: Number(chamaId),
      },
    });

    if (!chama) {
      return res.status(404).json({ success: false, error: "Chama not found" });
    }

    // the onchain function
    if (!user || !user.hashedPrivkey) {
      return res.status(400).json({ success: false, error: "Unable to get user CDP wallet." });
    }

    const withdrawTxHash = await bcWithdrawFundsFromChama(user.hashedPrivkey as `0x${string}`, Number(chama.blockchainId), amount);
    if (!withdrawTxHash) {
      return res.status(400).json({ success: false, error: "Unable to withdraw from chama." });
    }

    // record the transaction
    const payment = await prisma.payment.create({
      data: {
        amount: amount,
        description: `Withdrawal`,
        txHash: withdrawTxHash,
        chamaId: Number(chamaId),
        userId: Number(userId),
      },
    });

    if (!payment) {
      return res.status(400).json({ success: false, error: "Unable to record withdrawal." });
    }

    return res.status(200).json({ success: true, withdrawal: payment });
  } catch (error) {
    console.error("Error withdrawing from chama:", error);
    return res.status(500).json({ success: false, error: "Failed to withdraw from chama" });
  }
};

// update chama details
export const updateChamaDetailsController = async (req: Request, res: Response) => {
  try {
    const { chamaId, newName, newAmount, newDuration, newCycle, newRound, newPayDate } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!chamaId || !newAmount || !newDuration || !newCycle || !newRound || !newPayDate) {
      return res.status(400).json({ success: false, error: "All fields except name are required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const chama = await prisma.chama.findUnique({
      where: { id: Number(chamaId) },
      include: {
        members: { include: { user: true } }
      },
    });

    if (!chama) {
      return res.status(404).json({ success: false, error: "Chama not found" });
    }

    // Check if the user is the admin of the chama
    const isAdmin = chama.adminId === Number(userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Only the admin can update chama details" });
    }

    // Get the user's private key
    const privKeyData = await getPrivateKey(Number(userId));
    if (!privKeyData.success || !privKeyData.privateKey) {
      return res.status(400).json({ success: false, error: "Unable to get user private key." });
    }

    // Call the blockchain function
    const txHash = await bcUpdateChamaDetails(
      privKeyData.privateKey,
      BigInt(chama.blockchainId),
      newAmount.toString(),
      Number(newCycle),
      Number(newRound),
      Number(newPayDate),
      Number(newDuration)
    );

    if (!txHash) {
      return res.status(400).json({ success: false, error: "Unable to update chama details onchain." });
    }

    // Update the database
    const updatedChama = await prisma.chama.update({
      where: { id: Number(chamaId) },
      data: {
        ...(newName ? { name: newName } : {}),
        amount: newAmount.toString(),
        cycleTime: Number(newDuration),
        cycle: Number(newCycle),
        round: Number(newRound),
        payDate: new Date(newPayDate),
      },
    });

    // Build the dynamic notification message
    const changes: string[] = [];
    const adminName = user.userName || "The admin";

    if (newName && newName !== chama.name) {
      changes.push(`${adminName} changed the name of the chama from "${chama.name}" to "${newName}"`);
    }
    if (newAmount && newAmount.toString() !== chama.amount) {
      changes.push(`${adminName} changed the contribution amount from ${chama.amount} USDC to ${newAmount} USDC`);
    }
    if (newDuration && Number(newDuration) !== chama.cycleTime) {
      changes.push(`${adminName} changed the cycle time from ${chama.cycleTime} days to ${newDuration} days`);
    }
    if (newCycle && Number(newCycle) !== chama.cycle) {
      changes.push(`${adminName} changed the cycle from ${chama.cycle} to ${newCycle}`);
    }
    if (newRound && Number(newRound) !== chama.round) {
      changes.push(`${adminName} changed the round from ${chama.round} to ${newRound}`);
    }
    
    const oldPayDateStr = new Date(chama.payDate).toISOString().split('T')[0];
    const newPayDateStr = new Date(newPayDate).toISOString().split('T')[0];
    if (newPayDate && oldPayDateStr !== newPayDateStr) {
      changes.push(`${adminName} changed the pay date from ${oldPayDateStr} to ${newPayDateStr}`);
    }

    let notificationMessage = "";
    if (changes.length > 0) {
      notificationMessage = changes.join(". ") + ".";
    } else {
      notificationMessage = `The chama details have been updated by ${adminName}.`;
    }

    const emails = chama.members.map((m: any) => m.user.email);
    if (emails.length > 0) {
      await emailService.sendBulkChamaUpdateEmails(
        emails,
        updatedChama.name,
        notificationMessage
      );
    }

    // Send Push Notifications
    await sendExpoNotificationToAllChamaMembers(
      "Chama Details Updated",
      notificationMessage,
      Number(chamaId)
    );

    return res.status(200).json({ success: true, txHash, chama: updatedChama });
  } catch (error: any) {
    console.error("Error updating chama details:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to update chama details" });
  }
};

// for Casis's version only or maybe not
export const adminSetPayoutOrder = async (req: Request, res: Response) => {
  try {
    const { chamaId, payoutOrder } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (!chamaId || !payoutOrder) {
      return res.status(400).json({ success: false, error: "Chama ID and payout order are required" });
    }
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const chama = await prisma.chama.findUnique({
      where: { id: Number(chamaId) },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });
    if (!chama) {
      return res.status(404).json({ success: false, error: "Chama not found" });
    }
    const isAdmin = user.id === chama.adminId;
    if (!isAdmin) {
      return res.status(400).json({ success: false, error: "You are not the admin of this chama." });
    }

    // Ensure all provided addresses are members of the chama
    const memberAddresses = chama.members.map((member: any) => member.user.smartAddress);
    const invalidMembers = payoutOrder.filter((address: string) => !memberAddresses.includes(address));

    if (invalidMembers.length > 0) {
      return res.status(400).json({ success: false, error: "Payout order contains addresses that are not members of this chama." });
    }

    if (payoutOrder.length !== memberAddresses.length) {
      return res.status(400).json({ success: false, error: "Payout order must include all current members of the chama." });
    }

    if (!user.hashedPrivkey) {
      return res.status(400).json({ success: false, error: "Unable to get user CDP wallet." });
    }
    const formattedBcOrder = payoutOrder.map((address: string) => address as `0x${string}`);
    const payoutOrderTxHash = await bcAdminSetPayoutOrder(user.hashedPrivkey as `0x${string}`, Number(chama.blockchainId), formattedBcOrder);
    if (!payoutOrderTxHash) {
      return res.status(400).json({ success: false, error: "Unable to set payout order onchain." });
    }

    // Format and save the payout order into the database
    const formattedPayoutOrder = payoutOrder.map(
      (address: string, index: number) => ({
        userAddress: address,
        payDate: new Date(
          chama.payDate.getTime() +
          chama.cycleTime * 24 * 60 * 60 * 1000 * index
        ),
        paid: false,
        amount: "0",
      })
    );

    await prisma.chama.update({
      where: { id: chama.id },
      data: { payOutOrder: JSON.stringify(formattedPayoutOrder) },
    });

    const firstAddress = payoutOrder[0];
    const firstMember = chama.members.find((m: any) => m.user.smartAddress === firstAddress);
    const firstName = firstMember ? firstMember.user.userName : "Someone";

    await notifyAllChamaMembers(
      chama.id,
      `Great news! The payout order for ${chama.name} is officially set. ${firstName} is up first! 🚀`
    );

    await sendExpoNotificationToAllChamaMembers(
      `Payout Order Ready! 🎉`,
      `${firstName} will receive the first payout in ${chama.name} chama. Tap to view the full order!`,
      chama.id,
      firstMember?.user.id
    );

    await sendExpoNotificationToAUser(
      firstMember?.user.id!,
      `Payout Order Ready! 🎉`,
      `You are the first in the payout order for ${chama.name} chama. Tap to view the full order!`,
    )



    return res.status(200).json({ success: true, payoutOrderTxHash });
  } catch (error) {
    console.error("Error setting payout order:", error);
    return res.status(500).json({ success: false, error: "Failed to set payout order" });
  }
};


// get chama payouts paginated
export const getChamaPayouts = async (req: Request, res: Response) => {
  try {
    const { chamaId } = req.params;
    const { cursor } = req.query;

    const payouts = await prisma.payOut.findMany({
      where: { chamaId: Number(chamaId) },
      take: 20,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: Number(cursor) } : undefined,
      orderBy: { doneAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            smartAddress: true,
            userName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    const nextCursor = payouts.length === 20 ? payouts[19].id : null;
    return res.status(200).json({ success: true, payouts, nextCursor });
  } catch (error) {
    console.error("Failed to get payouts:", error);
    return res.status(500).json({ success: false, error: "Failed to get payouts" });
  }
};
