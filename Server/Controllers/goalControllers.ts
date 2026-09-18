import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import "multer";
import { GoalType, GoalWithdrawMode } from "../Blockchain/Constants";
import { bcGetGoalFinance, bcGetTotalGoals } from "../Blockchain/ReadFunctions";
import { bcCreateGoal, bcGoalAddMember, bcGoalContribute, bcGoalSetYieldEnabled, bcGoalWithdraw } from "../Blockchain/WriteFunction";
import { generateUniqueGoalSlug } from "../Lib/HelperFunctions";
import { uploadToPinata } from "../utils/PinataUtils";
import { formatUnits } from "viem";

const prisma = new PrismaClient();

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

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

    // Same pattern as createChama: load user CDP wallet, then EIP-7702 write
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.cdpWalletId) {
      return res
        .status(401)
        .json({ success: false, error: "Unable to get user CDP wallet." });
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
      ? goal.members.some((m) => m.userId === Number(userId))
      : false;
    const isCreator = Number(userId) === Number(goal.creatorId);

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

/** Upload / replace a goal cover (profile) image — creator only */
export const uploadGoalCover = async (
  req: MulterRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No image provided" });
      return;
    }

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const goalId = Number(req.params.id);
    if (!Number.isFinite(goalId) || goalId <= 0) {
      res.status(400).json({ success: false, error: "Invalid goal id" });
      return;
    }

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: { id: true, creatorId: true },
    });

    if (!goal) {
      res.status(404).json({ success: false, error: "Goal not found" });
      return;
    }

    if (goal.creatorId !== userId) {
      res.status(403).json({
        success: false,
        error: "Only the goal creator can change the cover photo",
      });
      return;
    }

    const ext = req.file.mimetype.split("/")[1] || "jpg";
    const fileName = `goal_cover_${goalId}_${Date.now()}.${ext}`;
    const ipfsUrl = await uploadToPinata(
      req.file.buffer,
      fileName,
      req.file.mimetype
    );

    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: { coverImageUrl: ipfsUrl },
      select: {
        id: true,
        slug: true,
        coverImageUrl: true,
      },
    });

    res.json({
      success: true,
      coverImageUrl: ipfsUrl,
      goal: updated,
      message: "Goal cover updated",
    });
  } catch (error) {
    console.error("uploadGoalCover error:", error);
    res.status(500).json({ success: false, error: "Failed to upload cover" });
  }
};

/** Creator toggles Moonwell yield — “put money to work” */
export const setGoalYieldEnabled = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const goalId = Number(req.params.id);
    const enabled = Boolean(req.body?.enabled);

    if (!Number.isFinite(goalId) || goalId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid goal id" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.cdpWalletId) {
      return res
        .status(401)
        .json({ success: false, error: "Unable to get user CDP wallet." });
    }

    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) {
      return res.status(404).json({ success: false, error: "Goal not found" });
    }
    if (goal.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only the goal creator can toggle yield",
      });
    }

    const txHash = await bcGoalSetYieldEnabled(
      user.cdpWalletId,
      BigInt(goal.blockchainId),
      enabled
    );

    await prisma.goal.update({
      where: { id: goalId },
      data: { yieldEnabled: enabled },
    });

    return res.status(200).json({
      success: true,
      yieldEnabled: enabled,
      txHash,
    });
  } catch (error: unknown) {
    console.error("setGoalYieldEnabled error:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to toggle yield";
    return res.status(400).json({ success: false, error: msg });
  }
};

const WITHDRAW_MODE_LABEL: Record<number, string> = {
  [GoalWithdrawMode.All]: "all",
  [GoalWithdrawMode.YieldOnly]: "yield",
  [GoalWithdrawMode.PrincipalOnly]: "principal",
  [GoalWithdrawMode.Amount]: "amount",
};

/** Creator adds an existing Chamapay user as a goal member */
export const addGoalMember = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const goalId = Number(req.params.id);
    const memberId = Number(req.body?.memberId);

    if (!Number.isFinite(goalId) || goalId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid goal id" });
    }
    if (!Number.isFinite(memberId) || memberId <= 0) {
      return res.status(400).json({ success: false, error: "memberId is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.cdpWalletId) {
      return res
        .status(401)
        .json({ success: false, error: "Unable to get user CDP wallet." });
    }

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: { members: true },
    });
    if (!goal) {
      return res.status(404).json({ success: false, error: "Goal not found" });
    }
    if (goal.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only the goal creator can add members",
      });
    }
    if (goal.goalType === "personal") {
      return res.status(400).json({
        success: false,
        error: "Personal goals do not support adding members — share the pay link instead",
      });
    }

    if (goal.members.some((m) => m.userId === memberId)) {
      return res.status(400).json({ success: false, error: "Already a member" });
    }

    const member = await prisma.user.findUnique({ where: { id: memberId } });
    if (!member?.smartAddress) {
      return res.status(400).json({
        success: false,
        error: "Member wallet not found",
      });
    }

    const txHash = await bcGoalAddMember(
      user.cdpWalletId,
      BigInt(goal.blockchainId),
      member.smartAddress
    );

    await prisma.goalMember.create({
      data: {
        goalId,
        userId: memberId,
        txHash: typeof txHash === "string" ? txHash : String(txHash),
      },
    });

    return res.status(200).json({ success: true, txHash });
  } catch (error: unknown) {
    console.error("addGoalMember error:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to add member";
    return res.status(400).json({ success: false, error: msg });
  }
};

/** Creator withdraws from the goal pot */
export const withdrawFromGoal = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const goalId = Number(req.params.id);
    const modeRaw = String(req.body?.mode || "amount").toLowerCase();
    const amount = (req.body?.amount ?? "0").toString();

    if (!Number.isFinite(goalId) || goalId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid goal id" });
    }

    const modeMap: Record<string, 0 | 1 | 2 | 3> = {
      all: GoalWithdrawMode.All,
      yield: GoalWithdrawMode.YieldOnly,
      principal: GoalWithdrawMode.PrincipalOnly,
      amount: GoalWithdrawMode.Amount,
    };
    const mode = modeMap[modeRaw];
    if (mode === undefined) {
      return res.status(400).json({
        success: false,
        error: "mode must be all, yield, principal, or amount",
      });
    }

    if (mode === GoalWithdrawMode.Amount) {
      const n = parseFloat(amount);
      if (!Number.isFinite(n) || n <= 0) {
        return res.status(400).json({ success: false, error: "Invalid amount" });
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.cdpWalletId) {
      return res
        .status(401)
        .json({ success: false, error: "Unable to get user CDP wallet." });
    }

    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) {
      return res.status(404).json({ success: false, error: "Goal not found" });
    }
    if (goal.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only the goal creator can withdraw",
      });
    }

    const txHash = await bcGoalWithdraw(
      user.cdpWalletId,
      BigInt(goal.blockchainId),
      amount,
      mode
    );

    await prisma.goalWithdrawal.create({
      data: {
        goalId,
        amount: mode === GoalWithdrawMode.Amount ? amount : amount || "0",
        mode: WITHDRAW_MODE_LABEL[mode] || modeRaw,
        txHash: typeof txHash === "string" ? txHash : String(txHash),
        creatorId: userId,
      },
    });

    if (mode === GoalWithdrawMode.All) {
      await prisma.goal.update({
        where: { id: goalId },
        data: { status: "closed", yieldEnabled: false },
      });
    }

    return res.status(200).json({ success: true, txHash });
  } catch (error: unknown) {
    console.error("withdrawFromGoal error:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to withdraw";
    return res.status(400).json({ success: false, error: msg });
  }
};

/** Member (or any signed-in user) deposits USDC from their wallet into the goal */
export const contributeToGoal = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const goalId = Number(req.params.id);
    const amount = (req.body?.amount ?? "").toString();
    const amountNum = parseFloat(amount);

    if (!Number.isFinite(goalId) || goalId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid goal id" });
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.cdpWalletId || !user.smartAddress) {
      return res
        .status(401)
        .json({ success: false, error: "Unable to get user CDP wallet." });
    }

    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) {
      return res.status(404).json({ success: false, error: "Goal not found" });
    }
    if (goal.status !== "active") {
      return res.status(400).json({ success: false, error: "Goal is not active" });
    }

    const amountStr = amountNum.toFixed(6);
    const txHash = await bcGoalContribute(
      user.cdpWalletId,
      BigInt(goal.blockchainId),
      amountStr
    );

    await prisma.goalContribution.create({
      data: {
        goalId,
        amount: amountStr,
        contributorAddress: user.smartAddress,
        payerAddress: user.smartAddress,
        contributorUserId: userId,
        payerUserId: userId,
        isGuest: false,
        txHash: typeof txHash === "string" ? txHash : String(txHash),
      },
    });

    return res.status(200).json({ success: true, txHash });
  } catch (error: unknown) {
    console.error("contributeToGoal error:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to deposit";
    return res.status(400).json({ success: false, error: msg });
  }
};
