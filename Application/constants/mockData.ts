export interface Member {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: string;
  contributions: number;
  address?: string;
}

export interface Message {
  id: number;
  sender: string;
  message: string;
  time: string;
  isAdmin?: boolean;
}

export type PayoutStatus = "completed" | "next" | "not started" | "upcoming";

export interface PayoutScheduleItem {
  position: number;
  member: string;
  date: string;
  status: PayoutStatus;
  amount: number;
}

export interface Transaction {
  id: number;
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
  myTurnDate: string;
  contributionDueDate: Date;
  hasOutstandingPayment: boolean;
  frequency: string;
  duration: string;
  rating: number;
  raterCount: number;
  category: string;
  location: string;
  adminTerms: string[];
  collateralAmount: number;
  nextPayout: string | null;
  myTurn: boolean;
  myPosition: number;
  nextTurnMember: string;
  status: "not started" | "active";
  unreadMessages: number;
  isPublic: boolean;
  messages: Message[];
  payoutSchedule: PayoutScheduleItem[];
  members: Member[];
  recentTransactions: Transaction[];
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

export const mockPublicChamas: PublicChama[] = [
  {
    id: "4",
    slug: "digital-nomads-savings",
    name: "Digital Nomads Savings",
    description:
      "For remote workers and freelancers building financial security",
    members: 8,
    maxMembers: 12,
    contribution: 8000,
    frequency: "Monthly",
    duration: "12 months",
    rating: 4.8,
    raterCount: 42,
    collateralAmount: 8000,
    nextPayout: "2025-02-10",
    currency: "KES",
    isPublic: true,
    startDate: "2024-01-15",
    adminTerms: ["Must be a remote worker or freelancer.", "Contributions must be made monthly."],
  },
  {
    id: "5",
    slug: "small-business-owners-circle",
    name: "Small Business Owners Circle",
    description: "Supporting entrepreneurs and small business growth",
    members: 6,
    maxMembers: 10,
    contribution: 15000,
    frequency: "Monthly",
    duration: "10 months",
    rating: 4.9,
    raterCount: 56,
    collateralAmount: 15000,
    nextPayout: "2025-01-30",
    currency: "KES",
    isPublic: true,
    startDate: "2024-03-20",
    adminTerms: ["Must be an entrepreneur or small business owner.", "Contributions must be made monthly."],
  },
  {
    id: "6",
    slug: "student-loan-repayment-group",
    name: "Student Loan Repayment Group",
    description: "Helping students manage and repay their education loans together",
    members: 12,
    maxMembers: 15,
    contribution: 3000,
    frequency: "Monthly",
    duration: "18 months",
    rating: 4.6,
    raterCount: 28,
    collateralAmount: 3000,
    nextPayout: "2025-06-15",
    currency: "KES",
    isPublic: true,
    startDate: "2024-02-10",
    adminTerms: ["Must be a student with an education loan.", "Contributions must be made monthly."],
  },
  {
    id: "7",
    slug: "real-estate-investment-pool",
    name: "Real Estate Investment Pool",
    description: "Collective investment in real estate properties and land",
    members: 10,
    maxMembers: 12,
    contribution: 25000,
    frequency: "Monthly",
    duration: "24 months",
    rating: 4.7,
    raterCount: 37,
    collateralAmount: 25000,
    nextPayout: "2025-12-20",
    currency: "KES",
    isPublic: true,
    startDate: "2024-04-05",
    adminTerms: ["Must have a real estate property or land to invest in.", "Contributions must be made monthly."],
  },
  {
    id: "8",
    slug: "tech-startup-founders",
    name: "Tech Startup Founders",
    description: "Funding and support for tech startup founders and innovators",
    members: 7,
    maxMembers: 10,
    contribution: 20000,
    frequency: "Monthly",
    duration: "15 months",
    rating: 4.5,
    raterCount: 24,
    collateralAmount: 20000,
    nextPayout: "2025-09-10",
    currency: "KES",
    isPublic: true,
    startDate: "2024-05-12",
    adminTerms: ["Must be a tech startup founder or innovator.", "Contributions must be made monthly."],
  },
  {
    id: "9",
    slug: "healthcare-workers-support",
    name: "Healthcare Workers Support",
    description: "Financial support group for healthcare professionals and medical workers",
    members: 9,
    maxMembers: 12,
    contribution: 12000,
    frequency: "Monthly",
    duration: "14 months",
    rating: 4.8,
    raterCount: 45,
    collateralAmount: 12000,
    nextPayout: "2025-08-25",
    currency: "KES",
    isPublic: true,
    startDate: "2024-06-18",
    adminTerms: ["Must be a healthcare professional or medical worker.", "Contributions must be made monthly."],
  },
  {
    id: "10",
    slug: "creative-artists-collective",
    name: "Creative Artists Collective",
    description: "Supporting artists, musicians, and creative professionals",
    members: 11,
    maxMembers: 15,
    contribution: 6000,
    frequency: "Monthly",
    duration: "16 months",
    rating: 4.4,
    raterCount: 19,
    collateralAmount: 6000,
    nextPayout: "2025-10-15",
    currency: "KES",
    isPublic: true,
    startDate: "2024-07-22",
    adminTerms: ["Must be an artist, musician, or creative professional.", "Contributions must be made monthly."],
  },
];

export const mockMembers = [
  {
    id: "1",
    name: "Alice Wanjiku",
    role: "admin",
    joined: "2024-10-01",
    status: "active",
    contributions: 12000,
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
  },
  {
    id: "2",
    name: "John Kamau",
    role: "member",
    joined: "2024-10-01",
    status: "active",
    contributions: 12000,
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
  },
  {
    id: "3",
    name: "Grace Njeri",
    role: "member",
    joined: "2024-10-01",
    status: "active",
    contributions: 12000,
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
  },
  {
    id: "4",
    name: "Sarah Njeri",
    role: "member",
    joined: "2024-10-01",
    status: "active",
    contributions: 12000,
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
  },
];

export type User =  {
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
