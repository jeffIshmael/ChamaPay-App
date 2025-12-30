import { JoinedChama } from "@/constants/mockData";
import { serverUrl } from "@/constants/serverUrl";
import { formatTimeRemaining } from "@/Utils/helperFunctions";

// User service functions
export const checkUsernameAvailability = async (
  username: string
): Promise<{
  success: boolean;
  available?: boolean;
  message?: string;
  error?: string;
}> => {
  try {
    const response = await fetch(
      `${serverUrl}/user/checkUsernameAvailability`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking username availability:", error);
    return {
      success: false,
      error: "Failed to check username availability",
    };
  }
};

export const searchUsers = async (
  query: string
): Promise<{
  success: boolean;
  users?: Array<{
    id: number;
    userName: string;
    email: string;
    address: string;
    profileImageUrl: string | null;
  }>;
  error?: string;
}> => {
  try {
    const response = await fetch(
      `${serverUrl}/user/search?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching users:", error);
    return {
      success: false,
      error: "Failed to search users",
    };
  }
};

export interface UserDetailsResponse {
  success: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    profileImageUrl?: string;
    address?: string;
  };
}

export interface ChamaMember {
  id: number;
  userId: number;
  chamaId: number;
  joinedAt: Date;
  user: {
    id: number;
    name?: string;
    userName?: string;
    email: string;
    profileImageUrl?: string;
    address?: string;
  };
}

export interface BackendChama {
  id: number;
  name: string;
  description: string;
  type: string;
  amount: string;
  cycleTime: number;
  maxNo: number;
  slug: string;
  startDate: Date;
  started: boolean;
  adminTerms: string | null;
  payDate: Date;
  blockchainId: string;
  round: number;
  cycle: number;
  payOutOrder: string;
  rating?: number;
  raterCount?: number;
  admin: {
    id: number;
    name?: string;
    userName?: string;
    email: string;
    address?: string;
  };
  members: ChamaMember[];
  payments?: any[];
  _count?: {
    members: number;
  };
}

export interface ChamaResponse {
  success: boolean;
  chamas?: BackendChama[];
  chama?: BackendChama;
  error?: string;
}

interface RegisterChamaRequestBody {
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

export interface UserDetails {
  id: number;
  name: string;
  email: string;
  profileImageUrl?: string;
  address?: string;
}

// get user details
export const checkUserDetails = async (
  email: string
): Promise<UserDetailsResponse> => {
  try {
    const response = await fetch(`${serverUrl}/user/checkUserExists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user details:", error);
    return {
      success: false,
      user: { id: 0, name: "", email: "", profileImageUrl: "", address: "" },
    };
  }
};

// register user
export const registerUser = async (
  email: string,
  name: string,
  profileImageUrl: string
): Promise<UserDetailsResponse> => {
  try {
    const response = await fetch(`${serverUrl}/user/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, profileImageUrl }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error registering user:", error);
    return {
      success: false,
      user: { id: 0, name: "", email: "", profileImageUrl: "", address: "" },
    };
  }
};

// Get chamas that the user is a member of
export const getUserChamas = async (token: string): Promise<ChamaResponse> => {
  try {
    const response = await fetch(`${serverUrl}/chama/my-chamas`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("the response", response);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user chamas:", error);
    return { success: false, error: "Failed to fetch chamas" };
  }
};

// Get chama by slug
export const getChamaBySlug = async (
  slug: string,
  token: string
): Promise<ChamaResponse> => {
  try {
    const response = await fetch(`${serverUrl}/chama/${slug}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching chama:", error);
    return { success: false, error: "Failed to fetch chama" };
  }
};

// Get public chamas user is not a member of
export const getPublicChamas = async (
  token: string
): Promise<ChamaResponse> => {
  try {
    const response = await fetch(`${serverUrl}/chama/public-chamas`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching public chamas:", error);
    return { success: false, error: "Failed to fetch public chamas" };
  }
};

// function to get user from userID
export const getUserFromUserId = async (
  userId: number,
  token: string
): Promise<UserDetailsResponse> => {
  try {
    const response = await fetch(`${serverUrl}/user/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user from userId:", error);
    return {
      success: false,
      user: { id: 0, name: "", email: "", profileImageUrl: "", address: "" },
    };
  }
};

// Transform backend chama data to frontend format
export const transformChamaData = (
  backendChama: BackendChama,
  userAddress: string
): JoinedChama => {
  const memberCount =
    backendChama._count?.members || backendChama.members?.length || 0;

  // Parse payout order array safely
  const payoutArray = backendChama.payOutOrder
    ? JSON.parse(backendChama.payOutOrder)
    : [];

  // --------- GET USER POSITION IN PAYOUT ORDER ---------
  const myPosition = payoutArray.length
    ? payoutArray.findIndex(
        (entry: any) =>
          entry.userAddress?.toLowerCase() === userAddress.toLowerCase()
      ) + 1 // +1 so position starts at 1 instead of index 0
    : null;

  // --------- GET MY PAY DATE FROM PAYOUT ORDER ---------
  const myTurnDate =
    payoutArray.length && myPosition
      ? payoutArray[myPosition - 1].payDate
      : backendChama.payDate;

  // --------- GET NEXT PAYOUT DATE (first unpaid or first in array) ---------
  const nextPayoutIndex = payoutArray.findIndex((p: any) => !p.paid);

  // If all are paid or payoutArray is empty, fallback to 0
  const safeNextPayoutIndex = nextPayoutIndex !== -1 ? nextPayoutIndex : 0;

  // Get the actual entry
  const nextPayoutEntry = payoutArray[safeNextPayoutIndex];

  // Next payout date
  const nextPayoutDate = nextPayoutEntry
    ? nextPayoutEntry.payDate
    : backendChama.payDate;

  return {
    id: backendChama.id,
    slug: backendChama.slug,
    name: backendChama.name,
    description: backendChama.description,
    currency: "USDC",

    totalMembers: memberCount,
    maxMembers: backendChama.maxNo,
    contribution: parseFloat(backendChama.amount),
    totalContributions: parseFloat(backendChama.amount) * memberCount,

    startDate: backendChama.startDate,

    // Time formatting
    nextPayoutDate: formatTimeRemaining(nextPayoutDate),
    myTurnDate: new Date(myTurnDate).toISOString().split("T")[0],

    nextPayoutAmount: parseFloat(backendChama.amount) * memberCount,

    // Current turn member = entry with first unpaid or fallback to first
    currentTurnMember:
      (nextPayoutEntry &&
        backendChama.members?.find(
          (m) =>
            m.user.address?.toLowerCase() ===
            nextPayoutEntry.userAddress?.toLowerCase()
        )?.user?.userName) ||
      "Not assigned",
    currentTurnMemberPosition: safeNextPayoutIndex + 1,

    contributionDueDate: backendChama.payDate,

    hasOutstandingPayment: false, // optional feature

    frequency: `${backendChama.cycleTime} days`,
    duration: `${backendChama.cycleTime} days`,

    rating: backendChama.rating || 0,
    raterCount: backendChama.raterCount || 0,

    category: backendChama.type,
    location: "Nairobi",
    adminTerms: backendChama.adminTerms
      ? typeof backendChama.adminTerms === "string"
        ? JSON.parse(backendChama.adminTerms)
        : backendChama.adminTerms
      : [],

    collateralAmount: parseFloat(backendChama.amount) * backendChama.maxNo,

    nextPayout: nextPayoutDate
      ? new Date(nextPayoutDate).toISOString().split("T")[0]
      : null,

    // --------- MY POSITION IN PAYOUT CYCLE ---------
    myTurn: myPosition === 1,
    myPosition: myPosition || null,

    nextTurnMember: backendChama.members?.[1]?.user?.userName || "Not assigned",

    status: (backendChama.started ? "active" : "not started") as
      | "active"
      | "not started",

    unreadMessages: 0,
    isPublic: backendChama.type === "Public",
    blockchainId: backendChama.blockchainId,

    messages: [],

    payoutSchedule: payoutArray,

    members:
      backendChama.members?.map((member) => ({
        id: member.user.id,
        name: member.user.userName || "Unknown Member",
        phone: "",
        email: member.user.email,
        role: member.user.id === backendChama.admin.id ? "Admin" : "Member",
        contributions: parseFloat(backendChama.amount),
        address: member.user.address || "",
      })) || [],

    recentTransactions:
      backendChama.payments?.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        type: payment.description ? "contribution" : "payment",
        date: payment.doneAt,
        status: "completed",
        description: payment.description || "Contribution",
        txHash: payment.txHash,
        userId: payment.userId,
        user: {
          id: payment.user.id,
          name: payment.user.userName,
          email: payment.user.email,
          profileImageUrl: payment.user.profileImageUrl,
          address: payment.user.smartAddress,
        },
      })) || [],
  };
};

// register chama to the database
export const registerChamaToDatabase = async (
  chamaData: RegisterChamaRequestBody,
  token: string
): Promise<ChamaResponse> => {
  try {
    const response = await fetch(`${serverUrl}/chama/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(chamaData),
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Error registering chama to database:", error);
    return { success: false, error: "Failed to register chama to database" };
  }
};

// add a member to a chama
export const addMemberToChama = async (
  chamaId: number,
  isPublic: boolean,
  memberId: number,
  amount: string,
  txHash: string,
  token: string
): Promise<ChamaResponse> => {
  try {
    const response = await fetch(`${serverUrl}/chama/add-member`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ chamaId, isPublic, memberId, amount, txHash }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error adding member to chama:", error);
    return { success: false, error: "Failed to add member to chama" };
  }
};

// function to save a chama's message
export const saveMessageToDb = async (
  token: string,
  userId: number,
  message: string,
  chamaId: number
) => {
  try {
    const response = await fetch(`${serverUrl}/chama/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ chamaId, userId, message }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error adding member to chama:", error);
    return { success: false, error: "Failed to add member to chama" };
  }
};
