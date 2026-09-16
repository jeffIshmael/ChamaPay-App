import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { GoalType } from "../Blockchain/Constants";
import { bcGetGoalFinance, bcGetTotalGoals } from "../Blockchain/ReadFunctions";
import { bcCreateGoal } from "../Blockchain/WriteFunction";
import { generateUniqueGoalSlug } from "../Lib/HelperFunctions";
import { formatUnits } from "viem";

const prisma = new PrismaClient();

const GOAL_TYPE_MAP: Record<string, 0 | 1 | 2> = {
  personal: GoalType.Personal,
  invite: GoalType.Invite,
  public: GoalType.Public,
};

function mapGoalType(input: string): 0 | 1 | 2 | null {
  const key = (input || "").toLowerCase();
  return key in GOAL_TYPE_MAP ? GOAL_TYPE_MAP[key] : null;
}

function goalTypeLabel(t: 0 | 1 | 2): string {
  return t === 0 ? "personal" : t === 1 ? "invite" : "public";
}

export const createGoal = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const {
      name,
      description,
      goalType,
      targetAmount,
      endDate,
      yieldEnabled,
      notifyPhone,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, error: "Name is required" });
    }

    const typeNum = mapGoalType(goalType);
    if (typeNum === null) {
      return res.status(400).json({
        success: false,
        error: "goalType must be personal, invite, or public",
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.cdpWalletId || !user.smartAddress) {
      return res
        .status(400)
        .json({ success: false, error: "User wallet not ready" });
    }

    const target = (targetAmount ?? "0").toString();
    const targetNum = parseFloat(target);
    if (Number.isNaN(targetNum) || targetNum < 0) {
      return res.status(400).json({ success: false, error: "Invalid target amount" });
    }

    let endDateUnix = 0;
    let endDateObj: Date | null = null;
    if (endDate) {
      endDateObj = new Date(endDate);
      if (Number.isNaN(endDateObj.getTime()) || endDateObj <= new Date()) {
        return res
          .status(400)
          .json({ success: false, error: "End date must be in the future" });
      }
      endDateUnix = Math.floor(endDateObj.getTime() / 1000);
    }

    // Public goals always start with yield off (contract also enforces this)
    const yieldOn = typeNum === GoalType.Public ? false : Boolean(yieldEnabled);

    const blockchainId = await bcGetTotalGoals();
    const txHash = await bcCreateGoal(
      user.cdpWalletId,
      target,
      endDateUnix,
      yieldOn,
      typeNum
    );

    if (!txHash) {
      return res.status(400).json({ success: false, error: "On-chain create failed" });
    }

    const slug = await generateUniqueGoalSlug(name.trim());

    const goal = await prisma.goal.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        goalType: goalTypeLabel(typeNum),
        targetAmount: target,
        endDate: endDateObj,
        yieldEnabled: yieldOn,
        blockchainId,
        createTxHash: txHash,
        status: "active",
        notifyPhone: notifyPhone?.trim() || null,
        creatorId: userId,
        members: {
          create: {
            userId,
            txHash,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                userName: true,
                profileImageUrl: true,
                smartAddress: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            userName: true,
            profileImageUrl: true,
            smartAddress: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      goal,
      payLink: `https://chamapay.com/goal/${goal.slug}`,
    });
  } catch (error) {
    console.error("createGoal error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create goal",
    });
  }
};

export const getMyGoals = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const memberships = await prisma.goalMember.findMany({
      where: { userId },
      include: {
        goal: {
          include: {
            creator: {
              select: {
                id: true,
                userName: true,
                profileImageUrl: true,
                smartAddress: true,
              },
            },
            _count: { select: { members: true, contributions: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const goals = memberships.map((m) => m.goal);

    return res.status(200).json({ success: true, goals });
  } catch (error) {
    console.error("getMyGoals error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch goals" });
  }
};

export const getGoalBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.userId;

    const goal = await prisma.goal.findUnique({
      where: { slug },
      include: {
        creator: {
          select: {
            id: true,
            userName: true,
            profileImageUrl: true,
            smartAddress: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                userName: true,
                profileImageUrl: true,
                smartAddress: true,
              },
            },
          },
        },
        contributions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            contributorUser: {
              select: { id: true, userName: true, profileImageUrl: true },
            },
          },
        },
        withdrawals: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!goal) {
      return res.status(404).json({ success: false, error: "Goal not found" });
    }

    let finance: {
      idleUsdc: string;
      moonwellUsdc: string;
      totalBalance: string;
      principalRemaining: string;
      yieldEarned: string;
      maxWithdrawable: string;
      yieldEnabled: boolean;
      active: boolean;
    } | null = null;

    try {
      const raw = (await bcGetGoalFinance(BigInt(goal.blockchainId))) as any;
      finance = {
        idleUsdc: formatUnits(raw.idleUsdc ?? raw[0], 6),
        moonwellUsdc: formatUnits(raw.moonwellUsdc ?? raw[1], 6),
        totalBalance: formatUnits(raw.totalBalance ?? raw[2], 6),
        principalRemaining: formatUnits(raw.principalRemaining ?? raw[3], 6),
        yieldEarned: formatUnits(raw.yieldEarned ?? raw[4], 6),
        maxWithdrawable: formatUnits(raw.maxWithdrawable ?? raw[5], 6),
        yieldEnabled: Boolean(raw.yieldEnabled ?? raw[10]),
        active: Boolean(raw.active ?? raw[11]),
      };
    } catch (err) {
      console.error("getGoalFinance failed:", err);
    }

    const isMember = userId
      ? goal.members.some((m) => m.userId === userId)
      : false;
    const isCreator = userId === goal.creatorId;

    return res.status(200).json({
      success: true,
      goal,
      finance,
      isMember,
      isCreator,
      payLink: `https://chamapay.com/goal/${goal.slug}`,
    });
  } catch (error) {
    console.error("getGoalBySlug error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch goal" });
  }
};
