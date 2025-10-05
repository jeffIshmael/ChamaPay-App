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
    name: string;
    email: string;
    profileImageUrl?: string;
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
  adminTerms: string | null;
  payDate: Date;
  blockchainId: string;
  round: number;
  cycle: number;
  rating?: number;
  admin: {
    id: number;
    name: string;
    email: string;
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

// Transform backend chama data to frontend format
export const transformChamaData = (backendChama: BackendChama) => {
  const memberCount = backendChama._count?.members || backendChama.members?.length || 0;
  
  return {
    id: backendChama.slug, // Use slug as ID for routing
    slug: backendChama.slug, // Include slug for navigation
    name: backendChama.name,
    description: backendChama.description,
    currency: "KES", // Default currency
    totalMembers: memberCount,
    maxMembers: backendChama.maxNo,
    contribution: parseFloat(backendChama.amount),
    totalContributions: parseFloat(backendChama.amount) * memberCount,
    myContributions: parseFloat(backendChama.amount), // Assuming user has made at least one contribution
    nextPayoutDate: backendChama.payDate ? new Date(backendChama.payDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    nextPayoutAmount: parseFloat(backendChama.amount) * backendChama.maxNo,
    currentTurnMember: backendChama.members?.[0]?.user?.name || "Not assigned",
    myTurnDate: backendChama.payDate ? new Date(backendChama.payDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    contributionDueDate: backendChama.startDate ? new Date(backendChama.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    hasOutstandingPayment: false, // Would need to check payment status
    frequency: "Monthly", // Default frequency
    duration: `${backendChama.cycleTime} days`, // Convert cycle time to duration
    rating: 4.5, // Default rating
    category: backendChama.type,
    location: "Nairobi", // Default location
    adminTerms: backendChama.adminTerms ? JSON.parse(backendChama.adminTerms) : [],
    collateralAmount: 0,
    nextPayout: backendChama.payDate ? new Date(backendChama.payDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    myTurn: false, // Would need to calculate based on current position
    myPosition: 1, // Default position
    nextTurnMember: backendChama.members?.[1]?.user?.name || "Not assigned",
    status: "active", // Default status
    unreadMessages: 0, // Would need to implement message tracking
    isPublic: backendChama.type === "Public",
    messages: [], // Empty for now
    payoutSchedule: [], // Would need to generate based on cycle
    members: backendChama.members?.map(member => ({
      id: member.user.id,
      name: member.user.name,
      phone: "", // Not available in backend
      email: member.user.email,
      role: member.user.id === backendChama.admin.id ? "Admin" : "Member",
      contributions: parseFloat(backendChama.amount), // Default contribution
    })) || [],
    recentTransactions: [], // Would need to implement transaction tracking
  };
}; 