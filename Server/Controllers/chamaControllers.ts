// This file has all chama related functions
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { contractAddress } from "../Blockchain/Constants";
import {
  bcGetTotalChamas,
  getEachMemberBalance,
  getUserChamaBalance,
} from "../Blockchain/ReadFunctions";
import {
  bcAddMemberToPrivateChama,
  bcAdminSetPayoutOrder,
  bcCreateChama,
  bcCreateChamaMonthly,
  bcDepositFundsForMember,
  bcDepositFundsToChama,
  bcUpdateChamaDetails,
  bcUpdateChamaBundle,
  bcWithdrawFundsFromChama,
  bcLeaveChama,
} from "../Blockchain/WriteFunction";
import { approveTx } from "../Blockchain/erc20Functions";
import emailService from "../Lib/EmailService";
import {
  sendExpoNotificationToAllChamaMembers,
  sendExpoNotificationToAUser,
} from "../Lib/ExpoNotificationFunctions";
import { getPrivateKey, generateUniqueSlug } from "../Lib/HelperFunctions";
import {
  addMemberToPayout,
  notifyAllChamaMembers,
} from "../Lib/prismaFunctions";

import { getCached, setCache } from "../Lib/cache";
import {
  buildPayoutSchedule,
  fallsOnPayDayUtc,
  PayoutOrder,
  removeMemberFromPayoutSchedule,
} from "../Lib/PayDateUtils";

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
  payoutDayOfMonth?: number; // 1-28 = fixed day of month, omitted = days-based cycle
}

// create a chama
export const createChama = async (
  req: Request<{}, {}, CreateChamaRequestBody>,
  res: Response,
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
      payoutDayOfMonth,
    } = chamaData;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // get the cdp wallet of user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.cdpWalletId) {
      return res
        .status(401)
        .json({ success: false, error: "Unable to get user CDP wallet." });
    }

    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid start date." });
    }
    const startDateInSecs = Math.floor(startDateObj.getTime() / 1000);

    // Fixed day-of-month chama (e.g. every 15th). null = classic days-based cycle.
    const payDay = payoutDayOfMonth ? Number(payoutDayOfMonth) : null;
    if (payDay !== null) {
      if (!Number.isInteger(payDay) || payDay < 1 || payDay > 28) {
        return res
          .status(400)
          .json({ success: false, error: "Pay day must be between 1 and 28." });
      }
      // The contract checks the day in UTC, so we must too, otherwise the tx reverts.
      if (startDateObj.getUTCDate() !== payDay) {
        return res.status(400).json({
          success: false,
          error: `The first payout date must fall on day ${payDay} of the month (UTC). Try a different payout time.`,
        });
      }
    }
    // the blockchain Id
    const blockchainId = await bcGetTotalChamas();

    // if its a public we need to first approve spending
    if (collateralRequired) {
      const approveTxHash = await approveTx(
        user.cdpWalletId,
        (Number(amount) * maxNo).toString(),
        contractAddress as `0x${string}`,
      );
      if (!approveTxHash) {
        return res
          .status(401)
          .json({ success: false, error: "Approve transaction failed." });
      }
    }

    // register in the blockchain
    // fixed pay day -> createPrivateChamaMonthly, otherwise the original days-based function
    const creationTxHash = payDay
      ? await bcCreateChamaMonthly(
          user.cdpWalletId,
          amount,
          BigInt(startDateInSecs),
          payDay,
        )
      : await bcCreateChama(
          user.cdpWalletId,
          amount,
          BigInt(Number(cycleTime)),
          BigInt(startDateInSecs),
          BigInt(Number(maxNo)),
          collateralRequired,
        );
    if (!creationTxHash) {
      return res
        .status(401)
        .json({ success: false, error: "Failed to register onchain." });
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
        cycleTime: payDay ? 30 : cycleTime, // the contract fixes duration at 30 for monthly chamas
        payDay: payDay, // null = days-based
        maxNo: maxNo || 15,
        slug: uniqueSlug,
        payDate: new Date(startDate),
        status: "active",
        blockchainId: blockchainId,
        round: 1,
        cycle: 1,
        admin: { connect: { id: userId } },
        txHash: creationTxHash,
      },
    });
    if (!chama) {
      return res
        .status(401)
        .json({ success: false, error: "Failed to save chama to database." });
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
        txHash: creationTxHash,
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
    return res
      .status(500)
      .json({ success: false, error: "Failed to create chama" });
  }
};

// Helper for BigInt serialization
const bigIntReplacer = (_key: string, value: any) =>
  typeof value === "bigint" ? value.toString() : value;

// On-chain reads go through a short "fresh" cache and a longer "last good" copy. If the RPC
// fails (e.g. the public Base node rate-limits us), we serve the last good value instead of
// failing the whole request.
const BALANCE_FRESH_TTL_MS = 30_000;
const BALANCE_STALE_TTL_MS = 10 * 60_000;

async function cachedOnchainRead<T>(
  key: string,
  read: () => Promise<T>,
): Promise<{ value: T; stale: boolean }> {
  const fresh = getCached<T>(key);
  if (fresh !== undefined && fresh !== null)
    return { value: fresh, stale: false };

  try {
    const value = await read();
    setCache(key, value, BALANCE_FRESH_TTL_MS);
    setCache(`${key}:last-good`, value, BALANCE_STALE_TTL_MS);
    return { value, stale: false };
  } catch (err) {
    const lastGood = getCached<T>(`${key}:last-good`);
    if (lastGood !== undefined && lastGood !== null) {
      console.warn(
        `[chama] on-chain read failed for ${key}; serving last known value`,
      );
      return { value: lastGood, stale: true };
    }
    throw err;
  }
}

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
          },
          refunds: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
          roundOutcome: {
            where: { disburse: false },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      }),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (!chama) {
      return res.status(404).json({ success: false, error: "Chama not found" });
    }

    // add the blockchain details. The two reads are independent: if one fails we still return the
    // chama (from the database) with the last known value, or a placeholder if there never was one.
    const chainChamaId = BigInt(Number(chama.blockchainId));
    const [userBalanceRes, memberBalancesRes] = await Promise.allSettled([
      cachedOnchainRead(
        `chama-user-balance-${Number(chama.blockchainId)}-${user.smartAddress}`,
        async () =>
          JSON.parse(
            JSON.stringify(
              await getUserChamaBalance(user.smartAddress, chainChamaId),
              bigIntReplacer,
            ),
          ),
      ),
      // keyed per chama (not per user) so every member shares one read
      cachedOnchainRead(
        `chama-member-balances-${Number(chama.blockchainId)}`,
        async () =>
          JSON.parse(
            JSON.stringify(
              await getEachMemberBalance(chainChamaId),
              bigIntReplacer,
            ),
          ),
      ),
    ]);

    if (userBalanceRes.status === "rejected") {
      console.warn(
        "Failed to fetch user chama balance:",
        userBalanceRes.reason,
      );
    }
    if (memberBalancesRes.status === "rejected") {
      console.warn(
        "Failed to fetch member balances:",
        memberBalancesRes.reason,
      );
    }

    const finalChama = {
      ...chama,
      userBalance:
        userBalanceRes.status === "fulfilled"
          ? userBalanceRes.value.value
          : "0",
      eachMemberBalance:
        memberBalancesRes.status === "fulfilled"
          ? memberBalancesRes.value.value
          : [],
    };

    return res.status(200).json({
      success: true,
      chama: finalChama,
      // ok=false means the value is a placeholder (0 / []); stale=true means it is the last known value
      onchain: {
        userBalanceOk: userBalanceRes.status === "fulfilled",
        memberBalancesOk: memberBalancesRes.status === "fulfilled",
        stale:
          (userBalanceRes.status === "fulfilled" &&
            userBalanceRes.value.stale) ||
          (memberBalancesRes.status === "fulfilled" &&
            memberBalancesRes.value.stale),
      },
    });
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
    return res
      .status(500)
      .json({ success: false, error: "Failed to get messages" });
  }
};

// get chama payments paginated
export const getChamaPayments = async (req: Request, res: Response) => {
  try {
    const { chamaId } = req.params;
    const { cursor } = req.query;

    const offset = cursor ? Number(cursor) : 0;
    const limit = 20;

    const transactions = await prisma.$queryRaw`
      SELECT 
        'payment' AS type, p.id, p.amount, p.description, p."doneAt", p."txHash", p."userId", NULL::int as cycle, NULL::int as round,
        u."smartAddress" as "userSmartAddress", u."userName" as "userUserName", u."profileImageUrl" as "userProfileImageUrl"
      FROM "Payment" p
      LEFT JOIN "User" u ON p."userId" = u.id
      WHERE p."chamaId" = ${Number(chamaId)}

      UNION ALL

      SELECT 
        'payout' AS type, po.id, po.amount, NULL as description, po."doneAt", po."txHash", po."userId", NULL::int as cycle, NULL::int as round,
        u."smartAddress" as "userSmartAddress", u."userName" as "userUserName", u."profileImageUrl" as "userProfileImageUrl"
      FROM "PayOut" po
      LEFT JOIN "User" u ON po."userId" = u.id
      WHERE po."chamaId" = ${Number(chamaId)}

      UNION ALL

      SELECT
        'refund' AS type, o.id, NULL as amount,
        CONCAT('Cycle ', o."chamaCycle", ' Round ', o."chamaRound", ' refund') as description,
        o."createdAt" as "doneAt", NULL as "txHash", NULL::int as "userId", o."chamaCycle" as cycle, o."chamaRound" as round,
        NULL as "userSmartAddress", NULL as "userUserName", NULL as "userProfileImageUrl"
      FROM "roundOutcome" o
      WHERE o."chamaId" = ${Number(chamaId)} AND o.disburse = false

      ORDER BY "doneAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const formattedPayments = (transactions as any[]).map((t) => ({
      type: t.type,
      id: t.id,
      amount: t.amount,
      description: t.description,
      doneAt: t.doneAt,
      txHash: t.txHash,
      cycle: t.cycle,
      round: t.round,
      user: t.userId
        ? {
            id: t.userId,
            smartAddress: t.userSmartAddress,
            userName: t.userUserName,
            profileImageUrl: t.userProfileImageUrl,
          }
        : null,
    }));

    const nextCursor =
      formattedPayments.length === limit ? offset + limit : null;
    return res
      .status(200)
      .json({ success: true, payments: formattedPayments, nextCursor });
  } catch (error) {
    console.error("Failed to get payments:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to get payments" });
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
          },
        };
      }),
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
    let targetUserName: string | null = null;
    let callerUserName: string | null = null;

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

      const callerUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      const targetUser = await prisma.user.findUnique({
        where: { id: memberForId },
      });

      if (!targetUser || !targetUser.smartAddress) {
        return res
          .status(404)
          .json({
            success: false,
            error: "Target user smart address not found",
          });
      }

      targetUserId = memberForId;
      targetUserName = targetUser.userName;
      callerUserName = callerUser?.userName || "Unknown";
      description = `Deposited by @${callerUserName} on behalf of @${targetUserName}`;
      memberForAddress = targetUser.smartAddress;
    }

    const callerUserForDeposit = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!callerUserForDeposit || !callerUserForDeposit.cdpWalletId) {
      return res
        .status(401)
        .json({ success: false, error: "Unable to get user CDP wallet." });
    }

    // do the batched approve and deposit onchain
    let depositTxHash;
    if (memberForId && memberForAddress) {
      depositTxHash = await bcDepositFundsForMember(
        callerUserForDeposit.cdpWalletId,
        BigInt(Number(blockchainId)),
        memberForAddress,
        amount,
      );
    } else {
      depositTxHash = await bcDepositFundsToChama(
        callerUserForDeposit.cdpWalletId,
        BigInt(Number(blockchainId)),
        amount,
      );
    }

    if (!depositTxHash) {
      return res
        .status(401)
        .json({ success: false, error: "Failed to deposit for chama." });
    }

    // Record against the payer's wallet (money left their account).
    await prisma.payment.create({
      data: {
        amount: amount,
        description: memberForId
          ? `Deposited for @${targetUserName || "member"}`
          : description,
        txHash: depositTxHash,
        chamaId: parseInt(chamaId),
        userId: userId,
      },
    });

    // If paying on behalf, also keep a beneficiary bookkeeping row
    // (excluded from wallet recent activity — money never left their wallet).
    if (memberForId) {
      await prisma.payment.create({
        data: {
          amount: amount,
          description,
          txHash: depositTxHash,
          chamaId: parseInt(chamaId),
          userId: targetUserId,
        },
      });

      const targetUser = await prisma.user.findUnique({
        where: { id: memberForId },
      });
      if (targetUser && targetUser.emailNotify) {
        const amountKES =
          targetUser.location === "KE"
            ? (
                parseFloat(amount) *
                parseFloat(process.env.CHAMAPAY_RATE || "132")
              ).toFixed(2)
            : null;
        await emailService.sendPaidForSomeoneEmail(
          targetUser.email,
          callerUserName || "Someone",
          amount.toString(),
          amountKES,
          chama.name,
        );
      }
    }

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
        id: Number(userId),
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: "User not found." });
    }

    const memberBeingAdded = await prisma.user.findUnique({
      where: {
        id: Number(memberId),
      },
    });

    if (!memberBeingAdded) {
      return res
        .status(400)
        .json({ success: false, error: "Member not found." });
    }

    const chama = await prisma.chama.findUnique({
      where: {
        id: Number(chamaId),
      },
      include: {
        members: {
          include: { user: true },
        },
      },
    });
    if (!chama) {
      return res
        .status(400)
        .json({ success: false, error: "Chama not found." });
    }
    if (chama.round !== 1) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Cannot add user in the middle of cycle.",
        });
    }

    // check whether the one requesting is the admin
    const isAdmin = user.id === chama.adminId;
    if (!isAdmin) {
      return res
        .status(400)
        .json({
          success: false,
          error: "You are not the admin of this chama.",
        });
    }
    if (!user.cdpWalletId) {
      return res
        .status(400)
        .json({ success: false, error: "Unable to get user CDP wallet." });
    }
    // the main function of adding the member
    const chamaBlockchainId = BigInt(Number(chama.blockchainId));
    const addingTxHash = await bcAddMemberToPrivateChama(
      user.cdpWalletId,
      chamaBlockchainId,
      memberBeingAdded.smartAddress as `0x${string}`,
    );
    if (!addingTxHash) {
      return res
        .status(400)
        .json({
          success: false,
          error: `Unable to add ${user.userName} to ${chama.name} chama onchain.`,
        });
    }

    const chamaMember = await prisma.chamaMember.create({
      data: {
        userId: memberId,
        chamaId: parseInt(chamaId),
        payDate: new Date(),
        txHash: addingTxHash,
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
      memberBeingAdded.id,
    );

    await sendExpoNotificationToAllChamaMembers(
      `New member joined.`,
      `A new member has joined ${chama.name} chama.`,
      parseInt(chamaId),
      [memberBeingAdded.id],
    );

    const emails = chama.members.map((m: any) => m.user.email);
    if (emails.length > 0) {
      await emailService.sendMemberAddedToExistingMembersEmail(
        emails,
        chama.name,
        memberBeingAdded.userName,
        chama.members.length + 1,
      );
    }

    if (memberBeingAdded.email) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const adminName = user?.userName || "the Admin";
      const amountKES =
        memberBeingAdded.location === "KE"
          ? (
              parseFloat(chama.amount) *
              parseFloat(process.env.CHAMAPAY_RATE || "132")
            ).toFixed(2)
          : null;
      await emailService.sendMemberAddedToNewMemberEmail(
        memberBeingAdded.email,
        chama.name,
        adminName,
        chama.amount,
        amountKES,
        chama.cycleTime,
        chama.payDate,
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
        id: Number(chamaId),
      },
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
      Number(userId),
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
      return res
        .status(400)
        .json({ success: false, error: "Chama ID is required" });
    }

    const member = await prisma.chamaMember.findFirst({
      where: {
        chamaId: Number(chamaId),
        userId: Number(userId),
      },
    });

    if (!member) {
      return res
        .status(404)
        .json({ success: false, error: "Member not found" });
    }

    await prisma.chamaMember.update({
      where: {
        id: member.id,
      },
      data: {
        lastReadTime: new Date(),
      },
    });

    return res
      .status(200)
      .json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to mark messages as read" });
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
      return res
        .status(400)
        .json({ success: false, error: "Chama ID and amount are required" });
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
    if (!user || !user.cdpWalletId) {
      return res
        .status(400)
        .json({ success: false, error: "Unable to get user CDP wallet." });
    }

    const withdrawTxHash = await bcWithdrawFundsFromChama(
      user.cdpWalletId,
      Number(chama.blockchainId),
      amount,
    );
    if (!withdrawTxHash) {
      return res
        .status(400)
        .json({ success: false, error: "Unable to withdraw from chama." });
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
      return res
        .status(400)
        .json({ success: false, error: "Unable to record withdrawal." });
    }

    return res.status(200).json({ success: true, withdrawal: payment });
  } catch (error) {
    console.error("Error withdrawing from chama:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to withdraw from chama" });
  }
};

// update chama details, optionally the fixed pay day and the payout order.
// Details + pay day + payout order are sent to the contract in ONE atomic
// transaction (updateChamaDetails -> setPayDayOfMonth -> setPayoutOrder).
const ordinalOf = (n: number) => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] || "th"}`;
};

export const updateChamaDetailsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      chamaId,
      newName,
      newAmount,
      newDuration,
      newCycle,
      newRound,
      newPayDate, // ms timestamp (as sent by ChamaEditModal)
      newPayoutDayOfMonth, // undefined = unchanged, null/0 = days-based, 1-28 = fixed day
      payoutOrder, // optional: member smart addresses in the new payout order
    } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (
      !chamaId ||
      !newAmount ||
      !newDuration ||
      !newCycle ||
      !newRound ||
      !newPayDate
    ) {
      return res
        .status(400)
        .json({ success: false, error: "All fields except name are required" });
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
        members: { include: { user: true } },
      },
    });

    if (!chama) {
      return res.status(404).json({ success: false, error: "Chama not found" });
    }

    // Check if the user is the admin of the chama
    const isAdmin = chama.adminId === Number(userId);
    if (!isAdmin) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Only the admin can update chama details",
        });
    }

    // Get the user's private key
    if (!user.cdpWalletId) {
      return res
        .status(400)
        .json({ success: false, error: "Unable to get user CDP wallet." });
    }

    // ---- 1. Work out the effective values -------------------------------
    let newPayDateObj = new Date(Number(newPayDate));
    if (isNaN(newPayDateObj.getTime())) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid pay date." });
    }
    // The edit form only has minute precision. If the pay date is the same minute as
    // the stored one, keep the stored value (with its seconds) so a save that did not
    // touch the date is not treated as a pay date change.
    const storedPayDate = new Date(chama.payDate);
    if (
      Math.floor(newPayDateObj.getTime() / 60000) ===
      Math.floor(storedPayDate.getTime() / 60000)
    ) {
      newPayDateObj = storedPayDate;
    }

    const currentPayDay: number | null = chama.payDay ?? null;
    let effectivePayDay: number | null = currentPayDay;
    if (newPayoutDayOfMonth !== undefined) {
      effectivePayDay = newPayoutDayOfMonth
        ? Number(newPayoutDayOfMonth)
        : null;
    }
    if (effectivePayDay !== null) {
      if (
        !Number.isInteger(effectivePayDay) ||
        effectivePayDay < 1 ||
        effectivePayDay > 28
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Pay day must be between 1 and 28." });
      }
      // The contract validates the day in UTC. It must also stay in sync with the
      // pay date, otherwise the next payout silently jumps to the old day.
      if (!fallsOnPayDayUtc(newPayDateObj, effectivePayDay)) {
        return res.status(400).json({
          success: false,
          error: `The pay date must fall on day ${effectivePayDay} of the month (UTC). Try a different payout time.`,
        });
      }
    }
    // The contract fixes duration at 30 for fixed-day chamas.
    const effectiveCycleTime = effectivePayDay ? 30 : Number(newDuration);

    // ---- 2. What actually changed? (compared with the DB, not trusting the client)
    const nameChanged = !!newName && newName !== chama.name;
    // compare at the contract's 6 decimals so float noise is not a change
    const amountChanged =
      Math.round(Number(newAmount) * 1e6) !==
      Math.round(Number(chama.amount) * 1e6);
    const effectiveAmount = amountChanged ? newAmount.toString() : chama.amount;
    const cycleTimeChanged = effectiveCycleTime !== chama.cycleTime;
    const cycleChanged = Number(newCycle) !== chama.cycle;
    const roundChanged = Number(newRound) !== chama.round;
    const payDateChanged =
      newPayDateObj.getTime() !== new Date(chama.payDate).getTime();
    const payDayChanged = effectivePayDay !== currentPayDay;
    // name is DB-only; these are the fields updateChamaDetails writes on-chain
    const detailsOnchainChanged =
      amountChanged ||
      cycleTimeChanged ||
      cycleChanged ||
      roundChanged ||
      payDateChanged;

    // ---- 3. Payout order (optional) -------------------------------------
    const existingOrder: { userAddress: string }[] = chama.payOutOrder
      ? JSON.parse(chama.payOutOrder)
      : [];
    let newOrderAddresses: `0x${string}`[] | null = null;
    if (payoutOrder !== undefined && payoutOrder !== null) {
      if (!Array.isArray(payoutOrder)) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Payout order must be a list of addresses.",
          });
      }
      const memberAddresses = chama.members.map((m: any) =>
        (m.user.smartAddress || "").toLowerCase(),
      );
      const orderLower = payoutOrder.map((a: string) =>
        String(a).toLowerCase(),
      );

      if (orderLower.some((a: string) => !memberAddresses.includes(a))) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Payout order contains addresses that are not members of this chama.",
          });
      }
      if (
        new Set(orderLower).size !== orderLower.length ||
        orderLower.length !== memberAddresses.length
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Payout order must include every current member exactly once.",
          });
      }

      const existingLower = existingOrder.map((o) =>
        o.userAddress.toLowerCase(),
      );
      const orderDiffers =
        orderLower.length !== existingLower.length ||
        orderLower.some((a: string, i: number) => a !== existingLower[i]);
      if (orderDiffers) {
        newOrderAddresses = payoutOrder as `0x${string}`[];
      }
    }
    const orderChanged = newOrderAddresses !== null;

    // ---- 4. Blockchain --------------------------------------------------
    const onchainChanged =
      detailsOnchainChanged || payDayChanged || orderChanged;
    if (onchainChanged && chama.round !== 1) {
      return res.status(400).json({
        success: false,
        error:
          "Amount, schedule and payout order can only be changed during round 1 of a cycle.",
      });
    }

    let txHash: string | undefined;
    if (onchainChanged) {
      txHash = await bcUpdateChamaBundle(
        user.cdpWalletId,
        BigInt(Number(chama.blockchainId)),
        {
          ...(detailsOnchainChanged
            ? {
                details: {
                  newAmount: effectiveAmount,
                  newCycle: Number(newCycle),
                  newRound: Number(newRound),
                  newPayDate: Math.floor(newPayDateObj.getTime() / 1000), // contract uses seconds
                  newDuration: effectiveCycleTime,
                },
              }
            : {}),
          ...(payDayChanged ? { payDay: effectivePayDay ?? 0 } : {}),
          ...(newOrderAddresses ? { payoutOrder: newOrderAddresses } : {}),
        },
      );
      if (!txHash) {
        return res
          .status(400)
          .json({ success: false, error: "Unable to update chama onchain." });
      }
    } else if (!nameChanged) {
      return res.status(200).json({ success: true, unchanged: true, chama });
    }

    // ---- 5. Database ----------------------------------------------------
    // Rebuild the per-member payout dates whenever the order or the schedule changes.
    // (Safe: edits only happen in round 1, so nobody has been paid yet.)
    const finalOrderAddresses: string[] = newOrderAddresses
      ? newOrderAddresses
      : existingOrder.map((o) => o.userAddress);
    let payOutOrderJson: string | undefined;
    if (
      finalOrderAddresses.length > 0 &&
      (orderChanged || payDateChanged || cycleTimeChanged || payDayChanged)
    ) {
      const dates = buildPayoutSchedule(
        newPayDateObj,
        finalOrderAddresses.length,
        effectiveCycleTime,
        effectivePayDay,
      );
      payOutOrderJson = JSON.stringify(
        finalOrderAddresses.map((address, i) => ({
          userAddress: address,
          payDate: dates[i],
          paid: false,
          amount: "0",
        })),
      );
    }

    const updatedChama = await prisma.chama.update({
      where: { id: Number(chamaId) },
      data: {
        ...(nameChanged ? { name: newName } : {}),
        amount: effectiveAmount,
        cycleTime: effectiveCycleTime,
        payDay: effectivePayDay,
        cycle: Number(newCycle),
        round: Number(newRound),
        payDate: newPayDateObj,
        ...(payOutOrderJson ? { payOutOrder: payOutOrderJson } : {}),
      },
    });

    // ---- 6. Notifications -----------------------------------------------
    const changes: string[] = [];
    const adminName = user.userName || "The admin";

    if (nameChanged) {
      changes.push(
        `${adminName} changed the name of the chama from "${chama.name}" to "${newName}"`,
      );
    }
    if (amountChanged) {
      changes.push(
        `${adminName} changed the contribution amount from ${(Number(chama.amount) * 132).toFixed(2)} KES to ${(Number(newAmount) * 132).toFixed(2)} KES.`,
      );
    }
    if (payDayChanged) {
      changes.push(
        effectivePayDay
          ? `${adminName} switched payouts to the ${ordinalOf(effectivePayDay)} of every month`
          : `${adminName} switched payouts to every ${effectiveCycleTime} days`,
      );
    } else if (cycleTimeChanged) {
      changes.push(
        `${adminName} changed the cycle time from ${chama.cycleTime} days to ${effectiveCycleTime} days`,
      );
    }
    if (cycleChanged) {
      changes.push(
        `${adminName} changed the cycle from ${chama.cycle} to ${newCycle}`,
      );
    }
    if (roundChanged) {
      changes.push(
        `${adminName} changed the round from ${chama.round} to ${newRound}`,
      );
    }
    if (payDateChanged) {
      const oldPayDateStr = new Date(chama.payDate).toISOString().split("T")[0];
      const newPayDateStr = newPayDateObj.toISOString().split("T")[0];
      if (oldPayDateStr !== newPayDateStr) {
        changes.push(
          `${adminName} changed the pay date from ${oldPayDateStr} to ${newPayDateStr}`,
        );
      }
    }
    if (orderChanged) {
      changes.push(`${adminName} updated the payout order`);
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
        notificationMessage,
      );
    }

    // Send Push Notifications
    await sendExpoNotificationToAllChamaMembers(
      "Chama Details Updated",
      notificationMessage,
      Number(chamaId),
    );

    return res
      .status(200)
      .json({
        success: true,
        txHash,
        chama: updatedChama,
        orderUpdated: orderChanged,
      });
  } catch (error: any) {
    console.error("Error updating chama details:", error);
    return res
      .status(500)
      .json({
        success: false,
        error: error.message || "Failed to update chama details",
      });
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
      return res
        .status(400)
        .json({
          success: false,
          error: "Chama ID and payout order are required",
        });
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
            user: true,
          },
        },
      },
    });
    if (!chama) {
      return res.status(404).json({ success: false, error: "Chama not found" });
    }
    const isAdmin = user.id === chama.adminId;
    if (!isAdmin) {
      return res
        .status(400)
        .json({
          success: false,
          error: "You are not the admin of this chama.",
        });
    }

    // Ensure all provided addresses are members of the chama
    const memberAddresses = chama.members.map(
      (member: any) => member.user.smartAddress,
    );
    const invalidMembers = payoutOrder.filter(
      (address: string) => !memberAddresses.includes(address),
    );

    if (invalidMembers.length > 0) {
      return res
        .status(400)
        .json({
          success: false,
          error:
            "Payout order contains addresses that are not members of this chama.",
        });
    }

    if (payoutOrder.length !== memberAddresses.length) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Payout order must include all current members of the chama.",
        });
    }

    if (!user.cdpWalletId) {
      return res
        .status(400)
        .json({ success: false, error: "Unable to get user CDP wallet." });
    }
    // The contract only allows (re)setting the order in round 1 of a cycle.
    if (chama.round !== 1) {
      return res
        .status(400)
        .json({
          success: false,
          error:
            "The payout order can only be changed during round 1 of a cycle.",
        });
    }
    const formattedBcOrder = payoutOrder.map(
      (address: string) => address as `0x${string}`,
    );
    const payoutOrderTxHash = await bcAdminSetPayoutOrder(
      user.cdpWalletId,
      Number(chama.blockchainId),
      formattedBcOrder,
    );
    if (!payoutOrderTxHash) {
      return res
        .status(400)
        .json({ success: false, error: "Unable to set payout order onchain." });
    }

    // Format and save the payout order into the database
    // payDay-aware schedule (fixed day of month, or every cycleTime days)
    const scheduleDates = buildPayoutSchedule(
      new Date(chama.payDate),
      payoutOrder.length,
      chama.cycleTime,
      chama.payDay,
    );
    const formattedPayoutOrder = payoutOrder.map(
      (address: string, index: number) => ({
        userAddress: address,
        payDate: scheduleDates[index],
        paid: false,
        amount: "0",
      }),
    );

    await prisma.chama.update({
      where: { id: chama.id },
      data: { payOutOrder: JSON.stringify(formattedPayoutOrder) },
    });

    const firstAddress = payoutOrder[0];
    const firstMember = chama.members.find(
      (m: any) => m.user.smartAddress === firstAddress,
    );
    const firstName = firstMember ? firstMember.user.userName : "Someone";

    await notifyAllChamaMembers(
      chama.id,
      `Great news! The payout order for ${chama.name} is officially set. ${firstName} is up first! 🚀`,
    );

    await sendExpoNotificationToAllChamaMembers(
      `Payout Order Ready! 🎉`,
      `${firstName} will receive the first payout in ${chama.name} chama. Tap to view the full order!`,
      chama.id,
      firstMember?.user.id,
    );

    await sendExpoNotificationToAUser(
      firstMember?.user.id!,
      `Payout Order Ready! 🎉`,
      `You are the first in the payout order for ${chama.name} chama. Tap to view the full order!`,
    );

    return res.status(200).json({ success: true, payoutOrderTxHash });
  } catch (error) {
    console.error("Error setting payout order:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to set payout order" });
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
    return res
      .status(500)
      .json({ success: false, error: "Failed to get payouts" });
  }
};

// leave chama or remove member called by admin
export const leaveChamaController = async (req: Request, res: Response) => {
  try {
    const { chamaId, memberUserId } = req.body;
    const requesterId = req.user?.userId;

    if (!requesterId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    if (!chamaId) {
      return res.status(400).json({
        success: false,
        error: "Chama ID is required",
      });
    }

    const requester = await prisma.user.findUnique({
      where: { id: Number(requesterId) },
    });

    if (!requester || !requester.smartAddress) {
      return res.status(404).json({
        success: false,
        error: "User not found or missing wallet",
      });
    }

    const chama = await prisma.chama.findUnique({
      where: { id: Number(chamaId) },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        admin: true,
      },
    });

    if (!chama) {
      return res.status(404).json({
        success: false,
        error: "Chama not found",
      });
    }

    // ---------------------------------------------------------
    // Determine whether this is:
    // 1. A member leaving themselves
    // 2. The admin removing another member
    // ---------------------------------------------------------

    const isAdmin = chama.adminId === Number(requesterId);

    let targetUserId: number;

    if (memberUserId !== undefined && memberUserId !== null) {
      // Someone is being explicitly removed.
      // Only the admin can do this.
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: "Only the admin can remove another member",
        });
      }

      targetUserId = Number(memberUserId);
    } else {
      // No target supplied means the authenticated user
      // is leaving themselves.
      if (isAdmin) {
        return res.status(400).json({
          success: false,
          error: "Admin cannot leave the chama",
        });
      }

      targetUserId = Number(requesterId);
    }

    // ---------------------------------------------------------
    // Admin cannot be removed
    // ---------------------------------------------------------

    if (targetUserId === chama.adminId) {
      return res.status(400).json({
        success: false,
        error: "Admin cannot be removed from the chama",
      });
    }

    // ---------------------------------------------------------
    // Only allow removal during round 1
    // ---------------------------------------------------------

    if (chama.round > 1) {
      return res.status(400).json({
        success: false,
        error: "Cannot leave or remove a member during an active payout cycle",
      });
    }

    // ---------------------------------------------------------
    // Find the target member
    // ---------------------------------------------------------

    const targetMember = chama.members.find(
      (member) => member.userId === targetUserId,
    );

    if (!targetMember) {
      return res.status(400).json({
        success: false,
        error: "User is not a member of this chama",
      });
    }

    const targetUser = targetMember.user;

    if (!targetUser.smartAddress) {
      return res.status(400).json({
        success: false,
        error: "Member does not have a wallet address",
      });
    }

    // ---------------------------------------------------------
    // Blockchain removal
    //
    // deleteMember() now handles:
    // - refunding the member
    // - removing them from members[]
    // - removing them from payoutOrder[]
    //
    // Therefore we DO NOT call setPayoutOrder afterwards.
    // ---------------------------------------------------------

    const adminUser = chama.admin;

    if (!adminUser.cdpWalletId) {
      throw new Error("Admin CDP wallet not found");
    }

    const txHash = await bcLeaveChama(
      adminUser.cdpWalletId,
      targetUser.smartAddress,
      BigInt(Number(chama.blockchainId)),
    );

    // ---------------------------------------------------------
    // Remove member from database
    // ---------------------------------------------------------

    await prisma.chamaMember.deleteMany({
      where: {
        chamaId: Number(chamaId),
        userId: targetUserId,
      },
    });

    // ---------------------------------------------------------
    // Rebuild payout schedule
    // ---------------------------------------------------------

    let payoutOrder: PayoutOrder[] = [];

    if (chama.payOutOrder) {
      try {
        payoutOrder = JSON.parse(chama.payOutOrder);
      } catch (error) {
        console.error("Failed to parse payout order:", error);

        return res.status(500).json({
          success: false,
          error: "Invalid payout order data",
          txHash,
        });
      }
    }

    const firstPayDate =
      payoutOrder.length > 0
        ? new Date(payoutOrder[0].payDate)
        : new Date(chama.payDate);

    const updatedPayoutOrder = removeMemberFromPayoutSchedule(
      payoutOrder,
      targetUser.smartAddress,
      firstPayDate,
      chama.cycleTime,
      chama.payDay,
    );

    // ---------------------------------------------------------
    // Update payout schedule in database only.
    //
    // No blockchain setPayoutOrder call here.
    // ---------------------------------------------------------

    await prisma.chama.update({
      where: {
        id: Number(chamaId),
      },
      data: {
        payOutOrder: JSON.stringify(updatedPayoutOrder),
      },
    });

    // ---------------------------------------------------------
    // Notifications
    // ---------------------------------------------------------

    const isSelfLeave = targetUserId === Number(requesterId);

    const notificationMessage = isSelfLeave
      ? `${targetUser.userName} has left the chama.`
      : `${targetUser.userName} has been removed from the chama.`;

    const remainingEmails = chama.members
      .filter((member) => member.userId !== targetUserId && member.user.email)
      .map((member) => member.user.email!);

    if (remainingEmails.length > 0) {
      await emailService.sendBulkChamaUpdateEmails(
        remainingEmails,
        chama.name,
        notificationMessage,
      );
    }

    // notify the one who has been removed
    await emailService.sendMemberRemovedEmail(
      targetUser.email,
      chama.name,
      adminUser.userName,
    );

    await sendExpoNotificationToAllChamaMembers(
      isSelfLeave ? "Member Left" : "Member Removed",
      notificationMessage,
      Number(chamaId),
    );

    return res.status(200).json({
      success: true,
      txHash,
    });
  } catch (error: any) {
    console.error("Error leaving/removing member:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to leave or remove member",
    });
  }
};
