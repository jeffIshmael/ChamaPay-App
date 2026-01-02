import { JoinedChama } from "@/constants/mockData";
import { serverUrl } from "@/constants/serverUrl";
import { formatTimeRemaining } from "@/Utils/helperFunctions";
import { Notification } from "@/app/(tabs)/notifications";

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

interface allUserDetails {
  user: {
    address: string;
    email: string;
    id: number;
    joinRequests: [];
    notifications: [];
    payOuts: [];
    payments: [];
    phoneNo: null | string;
    profileImageUrl: string;
    smartAddress: string;
    userName: string;
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

// Database notification type
interface DbNotification {
  id: number;
  type: string | null;
  message: string;
  senderId: number | null;
  requestId: number | null;
  userId: number;
  chamaId: number | null;
  read: boolean;
  createdAt: string;
  chama?: {
    id: number;
    name: string;
  } | null;
}

// Database join request type
interface DbJoinRequest {
  id: number;
  status: string;
  createdAt: string;
  userId: number;
  chamaId: number;
  chama: {
    id: number;
    name: string;
    slug: string;
  };
  user: {
    id: number;
    userName: string;
    email: string;
  };
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
    myTurnDate: myTurnDate,

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
    currentTurnMemberAddress: nextPayoutEntry.userAddress,

    contributionDueDate: backendChama.payDate,

    hasOutstandingPayment: false, // optional feature

    frequency: `${backendChama.cycleTime} days`,
    duration: backendChama.cycleTime,

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
      ? nextPayoutDate
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

// function to get all user details
export const getUserDetails = async (
  token: string
): Promise<allUserDetails> => {
  try {
    const response = await fetch(`${serverUrl}/user/details`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching getting user details:", error);
    return {
      user: {
        address: "",
        email: "",
        id: 0,
        joinRequests: [],
        notifications: [],
        payOuts: [],
        payments: [],
        phoneNo: null,
        profileImageUrl: "",
        smartAddress: "",
        userName: "",
      },
    };
  }
};

// Helper function to map notification types from database to UI types
const mapNotificationType = (type: string | null): Notification["type"] => {
  switch (type) {
    case "contribution_due":
      return "contribution_due";
    case "payout_received":
      return "payout_received";
    case "new_message":
      return "new_message";
    case "member_joined":
      return "member_joined";
    case "payout_scheduled":
      return "payout_scheduled";
    case "payment_made":
      return "contribution_due"; // Map to existing type
    case "round_complete":
      return "payout_scheduled";
    default:
      return "other"; // Default fallback
  }
};



// Helper function to generate user-friendly titles
const generateNotificationTitle = (type: string | null): string => {
  switch (type) {
    case "contribution_due":
      return "Contribution Due Soon";
    case "payout_received":
      return "Payout Received!";
    case "new_message":
      return "New Message";
    case "member_joined":
      return "New Member Joined";
    case "payout_scheduled":
      return "Your Payout is Coming Up";
    case "payment_made":
      return "Payment Confirmed";
    case "round_complete":
      return "Round Completed";
    case "request_approved":
      return "Request Approved";
    case "request_rejected":
      return "Request Declined";
    default:
      return "Notification";
  }
};

// function to transform notifications and join requests
export const transformNotification = async (
  notifications: DbNotification[],
  requests: DbJoinRequest[]
): Promise<Notification[]> => {
  try {
    const transformedNotifications: Notification[] = [];

    // Transform regular notifications
    notifications.forEach((notif) => {
      const transformed: Notification = {
        id: notif.id.toString(),
        type: mapNotificationType(notif.type),
        title: generateNotificationTitle(notif.type),
        message: notif.message,
        timestamp: notif.createdAt,
        read: notif.read,
        actionRequired: false,
        chama: notif.chama?.name || "Unknown Chama",
        chamaId: notif.chamaId,
      };

      transformedNotifications.push(transformed);
    });

    // Transform join requests into notifications
    // Only show pending requests as actionable notifications
    const pendingRequests = requests.filter((req) => req.status === "pending");

    pendingRequests.forEach((request) => {
      const transformed: Notification = {
        id: `request-${request.id}`,
        type: "join_request",
        title: "New Join Request",
        message: `${request.user.userName} wants to join ${request.chama.name}`,
        timestamp: request.createdAt,
        read: false, // Pending requests are always unread
        actionRequired: true,
        chama: request.chama.name,
        chamaId: request.chama.id,
        requestId: request.id,
        requestUserId: request.user.id,
        requestUserName: request.user.userName,
      };

      transformedNotifications.push(transformed);
    });

    // Sort by timestamp (most recent first)
    transformedNotifications.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return transformedNotifications;
  } catch (error) {
    console.error("Error transforming notifications:", error);
    return [];
  }
};



// Extended Notification interface (update your existing interface)
export interface ExtendedNotification extends Notification {
  chamaId?: number | null;
  requestId?: number; // For join requests
  requestUserId?: number; // User who made the request
  requestUserName?: string; // Name of user who made the request
}

// Function to handle join request actions
export const handleJoinRequestAction = async (
  requestId: number,
  action: "approve" | "reject",
  token: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/chama/request/${requestId}/${action}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Action failed" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error handling join request:", error);
    return { success: false, error: error.message || "An error occurred" };
  }
};

// Function to mark notification as read
export const markNotificationAsRead = async (
  notificationId: number,
  token: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || "Failed to mark as read",
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: error.message || "An error occurred" };
  }
};
