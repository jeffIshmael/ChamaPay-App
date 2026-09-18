import { serverUrl } from "@/constants/serverUrl";

export type GoalType = "personal" | "invite" | "public";

export interface GoalCreator {
  id: number;
  userName: string;
  profileImageUrl?: string | null;
  smartAddress: string;
}

export interface GoalContribution {
  id: number;
  amount: string;
  contributorAddress?: string;
  payerAddress?: string;
  isGuest?: boolean;
  guestDisplayName?: string | null;
  txHash?: string;
  pretiumTxCode?: string | null;
  createdAt: string;
  contributorUser?: {
    id: number;
    userName: string;
    profileImageUrl?: string | null;
  } | null;
}

export interface GoalWithdrawal {
  id: number;
  amount: string;
  mode: string;
  txHash?: string;
  createdAt: string;
}

export interface GoalRecord {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  goalType: GoalType | string;
  targetAmount: string;
  endDate?: string | null;
  yieldEnabled: boolean;
  blockchainId: string;
  createTxHash?: string | null;
  status: string;
  notifyPhone?: string | null;
  coverImageUrl?: string | null;
  creatorId: number;
  createdAt: string;
  creator?: GoalCreator;
  members?: Array<{
    id: number;
    userId: number;
    user: GoalCreator;
  }>;
  contributions?: GoalContribution[];
  withdrawals?: GoalWithdrawal[];
  _count?: { members: number; contributions: number };
  totalBalance?: string;
}

export interface GoalFinance {
  idleUsdc: string;
  moonwellUsdc: string;
  totalBalance: string;
  principalRemaining: string;
  yieldEarned: string;
  maxWithdrawable: string;
  yieldEnabled: boolean;
  active: boolean;
}

export async function createGoal(
  token: string,
  data: {
    name: string;
    description?: string;
    goalType: GoalType;
    targetAmount: string;
    endDate?: string | null;
    yieldEnabled: boolean;
    notifyPhone?: string;
  }
): Promise<{ success: boolean; goal?: GoalRecord; payLink?: string; error?: string }> {
  try {
    const response = await fetch(`${serverUrl}/goal/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch {
    return { success: false, error: "Failed to create goal" };
  }
}

export async function getMyGoals(
  token: string
): Promise<{ success: boolean; goals?: GoalRecord[]; error?: string }> {
  try {
    const response = await fetch(`${serverUrl}/goal/my-goals`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return { success: false, error: "Failed to fetch goals" };
  }
}

export async function getGoalBySlug(
  slug: string,
  token: string
): Promise<{
  success: boolean;
  goal?: GoalRecord;
  finance?: GoalFinance | null;
  isMember?: boolean;
  isCreator?: boolean;
  payLink?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${serverUrl}/goal/slug/${encodeURIComponent(slug)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.error || "Goal not found" };
    }
    return await response.json();
  } catch {
    return { success: false, error: "Failed to fetch goal" };
  }
}

export async function uploadGoalCover(
  goalId: number,
  imageAsset: { uri: string; fileName?: string; mimeType?: string },
  token: string
): Promise<{ success: boolean; coverImageUrl?: string; error?: string }> {
  try {
    const formData = new FormData();
    const uriParts = imageAsset.uri.split(".");
    const ext = uriParts[uriParts.length - 1] || "jpg";
    formData.append("image", {
      uri: imageAsset.uri,
      name: imageAsset.fileName || `goal_cover_${Date.now()}.${ext}`,
      type: imageAsset.mimeType || `image/${ext}`,
    } as unknown as Blob);

    const response = await fetch(`${serverUrl}/goal/${goalId}/cover`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error:
          (data as { error?: string }).error ||
          (data as { message?: string }).message ||
          "Upload failed",
      };
    }
    return {
      success: true,
      coverImageUrl: (data as { coverImageUrl?: string }).coverImageUrl,
    };
  } catch {
    return { success: false, error: "Upload failed" };
  }
}

export async function setGoalYieldEnabled(
  goalId: number,
  enabled: boolean,
  token: string
): Promise<{ success: boolean; yieldEnabled?: boolean; error?: string }> {
  try {
    const response = await fetch(`${serverUrl}/goal/${goalId}/yield`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: (data as { error?: string }).error || "Failed to toggle yield",
      };
    }
    return {
      success: true,
      yieldEnabled: Boolean((data as { yieldEnabled?: boolean }).yieldEnabled),
    };
  } catch {
    return { success: false, error: "Failed to toggle yield" };
  }
}

export async function addGoalMember(
  goalId: number,
  memberId: number,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${serverUrl}/goal/${goalId}/members`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ memberId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: (data as { error?: string }).error || "Failed to add member",
      };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Failed to add member" };
  }
}

export async function withdrawFromGoal(
  goalId: number,
  opts: { mode: "all" | "yield" | "principal" | "amount"; amount?: string },
  token: string
): Promise<{ success: boolean; error?: string; txHash?: string }> {
  try {
    const response = await fetch(`${serverUrl}/goal/${goalId}/withdraw`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(opts),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: (data as { error?: string }).error || "Withdrawal failed",
      };
    }
    return {
      success: true,
      txHash: (data as { txHash?: string }).txHash,
    };
  } catch {
    return { success: false, error: "Withdrawal failed" };
  }
}

export async function contributeToGoal(
  goalId: number,
  amountUsdc: string,
  token: string
): Promise<{ success: boolean; error?: string; txHash?: string }> {
  try {
    const response = await fetch(`${serverUrl}/goal/${goalId}/contribute`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: amountUsdc }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: (data as { error?: string }).error || "Deposit failed",
      };
    }
    return {
      success: true,
      txHash: (data as { txHash?: string }).txHash,
    };
  } catch {
    return { success: false, error: "Deposit failed" };
  }
}

export function goalTypeLabel(type: string): string {
  if (type === "personal") return "Personal";
  if (type === "invite") return "Invite circle";
  if (type === "public") return "Public / Harambee";
  return type;
}
