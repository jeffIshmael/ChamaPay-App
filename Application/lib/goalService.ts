import { serverUrl } from "@/constants/serverUrl";

export type GoalType = "personal" | "invite" | "public";

export interface GoalCreator {
  id: number;
  userName: string;
  profileImageUrl?: string | null;
  smartAddress: string;
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
  contributions?: Array<{
    id: number;
    amount: string;
    isGuest: boolean;
    guestDisplayName?: string | null;
    contributorUser?: { id: number; userName: string } | null;
    createdAt: string;
  }>;
  _count?: { members: number; contributions: number };
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

export function goalTypeLabel(type: string): string {
  if (type === "personal") return "Personal";
  if (type === "invite") return "Invite circle";
  if (type === "public") return "Public / Harambee";
  return type;
}
