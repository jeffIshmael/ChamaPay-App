export interface Member {
  id: number;
  name: string;
  phone: string;
  email: string;
  smartAddress: string;
  role: string;
  contributions: number;
  address?: string;
}

export interface Message {
  id: number;
  sender: string;
  text: string;
  timestamp: string;
  isAdmin?: boolean;
}

export type PayoutStatus = boolean | "next";

export interface PayoutScheduleItem {
  paid: boolean;
  payDate: Date;
  userAddress: string;
}

export interface Transaction {
  id: number | string;
  type: string;
  amount: number;
  date: string;
  status: string;
  description: string;
  txHash: string;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
    profileImageUrl: string;
    address: string;
  };
}

export interface JoinedChama {
  id: number;
  blockchainId: string;
  slug: string;
  name: string;
  description: string;
  currency: string;
  totalMembers: number;
  startDate: Date;
  maxMembers: number;
  contribution: number;
  totalContributions: number;
  nextPayoutDate: string;
  nextPayoutAmount: number;
  currentTurnMember: string;
  currentTurnMemberPosition: number;
  currentTurnMemberAddress: string;
  myTurnDate: string;
  contributionDueDate: Date;
  hasOutstandingPayment: boolean;
  frequency: string;
  duration: number;
  rating: number;
  raterCount: number;
  category: string;
  canJoin: boolean;
  adminTerms: string[];
  collateralAmount: number;
  nextPayout: string | null;
  myTurn: boolean;
  myPosition: number;
  nextTurnMember: string;
  status: "not started" | "active";
  unreadMessages: number;
  isPublic: boolean;
  currentCycle: number;
  currentRound: number;
  messages: Message[];
  payoutSchedule: PayoutScheduleItem[];
  members: Member[];
  recentTransactions: Transaction[];
  userChamaBalance?: [];
  eachMemberBalance?: [];
}

export type PublicChama = {
  id: string;
  slug: string;
  name: string;
  description: string;
  members: number;
  maxMembers: number;
  contribution: number;
  frequency: string;
  duration: string;
  rating: number;
  raterCount: number;
  collateralAmount: number;
  nextPayout: string;
  currency: string;
  isPublic: boolean;
  startDate: string;
  adminTerms: string[];
};

export type User = {
  id: number;
  email: string;
  name: string | null;
  phoneNo: number | null;
  address: string;
  privKey: string;
  mnemonics: string;
  password: string;
  role: string | null;
  profile: string | null;
}
