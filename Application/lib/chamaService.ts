import { serverUrl } from '@/constants/serverUrl';

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
export const checkUserDetails = async (email: string): Promise<UserDetailsResponse> => {
  try {
    const response = await fetch(`${serverUrl}/user/checkUserExists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user details:', error);
    return { success: false, user: { id: 0, name: '', email: '', profileImageUrl: '', address: '' } };
  }
};

// register user
export const registerUser = async (email: string, name: string, profileImageUrl: string): Promise<UserDetailsResponse> => {
  try {
    const response = await fetch(`${serverUrl}/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, profileImageUrl }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, user: { id: 0, name: '', email: '', profileImageUrl: '', address: '' } };
  }
};

// Get chamas that the user is a member of
export const getUserChamas = async (token: string): Promise<ChamaResponse> => {
  try {
    const response = await fetch(`${serverUrl}/chama/my-chamas`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log("the response", response);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user chamas:', error);
    return { success: false, error: 'Failed to fetch chamas' };
  }
};

// Get chama by slug
export const getChamaBySlug = async (slug: string, token: string): Promise<ChamaResponse> => {
  try {
    const response = await fetch(`${serverUrl}/chama/${slug}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching chama:', error);
    return { success: false, error: 'Failed to fetch chama' };
  }
};

// Get public chamas user is not a member of
export const getPublicChamas = async (token: string): Promise<ChamaResponse> => {
  try {
    const response = await fetch(`${serverUrl}/chama/public-chamas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching public chamas:', error);
    return { success: false, error: 'Failed to fetch public chamas' };
  }
};

// function to get user from userID
export const getUserFromUserId = async (userId: number, token: string): Promise<UserDetailsResponse> => {
  try {
    const response = await fetch(`${serverUrl}/user/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user from userId:', error);
    return { success: false, user: { id: 0, name: '', email: '', profileImageUrl: '', address: '' } };
  }
};

// Transform backend chama data to frontend format
export const transformChamaData = (backendChama: BackendChama) => {
  const memberCount = backendChama._count?.members || backendChama.members?.length || 0;
  
  return {
    id: backendChama.id, // Use id as ID for routing
    slug: backendChama.slug, // Include slug for navigation
    name: backendChama.name,
    description: backendChama.description,
    currency: "cUSD", // Default currency
    totalMembers: memberCount,
    maxMembers: backendChama.maxNo,
    contribution: parseFloat(backendChama.amount),
    totalContributions: parseFloat(backendChama.amount) * memberCount,
    myContributions: parseFloat(backendChama.amount), // Assuming user has made at least one contribution
    nextPayoutDate: backendChama.payDate ? new Date(backendChama.payDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    nextPayoutAmount: parseFloat(backendChama.amount) * memberCount,
    currentTurnMember: backendChama.members?.[0]?.user?.name || backendChama.members?.[0]?.user?.userName || "Not assigned",
    myTurnDate: backendChama.payDate ? new Date(backendChama.payDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    contributionDueDate: backendChama.startDate ? new Date(backendChama.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    hasOutstandingPayment: false, // Would need to check payment status
    frequency: `${backendChama.cycleTime} days`, // Convert cycle time to frequency string
    duration: `${backendChama.cycleTime} days`, // Convert cycle time to duration
    rating: backendChama.rating || 0, // Default rating
    raterCount: backendChama.raterCount || 0, // Default rater count
    category: backendChama.type,
    location: "Nairobi", // Default location
    adminTerms: backendChama.adminTerms ? (typeof backendChama.adminTerms === 'string' ? JSON.parse(backendChama.adminTerms) : backendChama.adminTerms) : [],
    collateralAmount: parseFloat(backendChama.amount) * memberCount,
    nextPayout: backendChama.payDate ? new Date(backendChama.payDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    myTurn: false, // Would need to calculate based on current position
    myPosition: 1, // Default position
    nextTurnMember: backendChama.members?.[1]?.user?.name || backendChama.members?.[1]?.user?.userName || "Not assigned",
    status: backendChama.started ? "active" : "not started", // Default status
    unreadMessages: 0, // Would need to implement message tracking
    isPublic: backendChama.type === "Public",
    blockchainId: backendChama.blockchainId,
    messages: [], // Empty for now
    payoutSchedule: JSON.stringify(backendChama.payOutOrder) ? JSON.parse(backendChama.payOutOrder) : [], // Would need to generate based on cycle
    members: backendChama.members?.map(member => ({
      id: member.user.id,
      name: member.user.name || member.user.userName || "Unknown Member",
      phone: "", // Not available in backend
      email: member.user.email,
      role: member.user.id === backendChama.admin.id ? "Admin" : "Member",
      contributions: parseFloat(backendChama.amount), // Default contribution
    })) || [],
    recentTransactions: backendChama.payments?.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      type: payment.description ? "contribution" : "payment",
      date: payment.doneAt,
      status: "completed", // Add missing status property
      description: payment.description || "Contribution",
      txHash: payment.txHash,
      userId: payment.userId,
      user: {
        id: payment.user.id,
        name: payment.user.userName,
        email: payment.user.email,
        profileImageUrl: payment.user.profileImageUrl,
        address: payment.user.address,
      },
    })) || [],
  };
}; 

// register chama to the database
export const registerChamaToDatabase = async (chamaData: RegisterChamaRequestBody, token: string): Promise<ChamaResponse> => {
  try {
    const response = await fetch(`${serverUrl}/chama/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(chamaData),
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error('Error registering chama to database:', error);
    return { success: false, error: 'Failed to register chama to database' };
  }
};

// add a member to a chama
export const addMemberToChama = async (chamaId: number, isPublic: boolean, memberId: number, amount: string, txHash: string, token: string): Promise<ChamaResponse> => {
  try {
    const response = await fetch(`${serverUrl}/chama/add-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ chamaId, isPublic, memberId, amount, txHash }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error adding member to chama:', error);
    return { success: false, error: 'Failed to add member to chama' };
  }
};




