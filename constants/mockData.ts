export interface Member {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: string;
  contributions: number;
}

export interface Message {
  id: number;
  sender: string;
  message: string;
  time: string;
  isAdmin?: boolean;
}

export type PayoutStatus = "completed" | "next" | "pending" | "upcoming";

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
}

export interface JoinedChama {
  id: string;
  name: string;
  description: string;
  currency: string;
  totalMembers: number;
  maxMembers: number;
  contribution: number;
  totalContributions: number;
  myContributions: number;
  nextPayoutDate: string;
  nextPayoutAmount: number;
  currentTurnMember: string;
  myTurnDate: string;
  contributionDueDate: string;
  hasOutstandingPayment: boolean;
  frequency: string;
  duration: string;
  rating: number;
  category: string;
  location: string;
  tags: string[];
  collateralRequired: number;
  nextPayout: string;
  myTurn: boolean;
  myPosition: number;
  nextTurnMember: string;
  status: string;
  unreadMessages: number;
  isPublic: boolean;
  messages: Message[];
  payoutSchedule: PayoutScheduleItem[];
  members: Member[];
  recentTransactions: Transaction[];
}

export const mockJoinedChamas: JoinedChama[] = [
  {
    id: "1",
    name: "Women Entrepreneurs Chama",
    description:
      "Supporting women entrepreneurs in building successful businesses and financial independence",
    currency: "KES",
    totalMembers: 5,
    maxMembers: 5,
    contribution: 5000,
    totalContributions: 15000,
    myContributions: 3000,
    nextPayoutDate: "2024-08-15",
    nextPayoutAmount: 25000,
    currentTurnMember: "John Kamau",
    myTurnDate: "2024-09-15",
    contributionDueDate: "2024-07-30",
    hasOutstandingPayment: true,
    frequency: "Monthly",
    duration: "10 months",
    rating: 4.7,
    category: "Professional",
    location: "Nairobi",
    tags: ["Women", "Entrepreneurship", "Business"],
    collateralRequired: 5000,
    nextPayout: "2025-02-15",
    myTurn: false,
    myPosition: 3,
    nextTurnMember: "Grace Wanjiku",
    status: "active",
    unreadMessages: 3,
    isPublic: false,
    messages: [
      {
        id: 1,
        sender: "Admin",
        message:
          "Welcome to Savings Champions! Please make sure to contribute by the 30th of each month.",
        time: "2 hours ago",
        isAdmin: true,
      },
      {
        id: 2,
        sender: "Mary Wanjiru",
        message:
          "Has everyone made their contribution this month? The deadline is approaching.",
        time: "1 hour ago",
      },
      {
        id: 3,
        sender: "John Kamau",
        message: "Yes, just sent mine. Thanks for the reminder! 💪",
        time: "45 min ago",
      },
      {
        id: 4,
        sender: "Admin",
        message:
          "All contributions received except 2 members. Next payout is scheduled for Aug 15.",
        time: "30 min ago",
        isAdmin: true,
      },
    ] as Message[],
    payoutSchedule: [
      {
        position: 1,
        member: "Mary Wanjiru",
        date: "2024-07-15",
        status: "completed",
        amount: 25000,
      },
      {
        position: 2,
        member: "John Kamau",
        date: "2024-08-15",
        status: "next",
        amount: 25000,
      },
      {
        position: 3,
        member: "You (Sarah)",
        date: "2024-09-15",
        status: "upcoming",
        amount: 25000,
      },
      {
        position: 4,
        member: "Peter Maina",
        date: "2024-10-15",
        status: "upcoming",
        amount: 25000,
      },
      {
        position: 5,
        member: "Grace Njeri",
        date: "2024-11-15",
        status: "upcoming",
        amount: 25000,
      },
    ] as PayoutScheduleItem[],
    members: [
      {
        id: 1,
        name: "Mary Wanjiru",
        phone: "+254 712 345 678",
        email: "mary@email.com",
        role: "Admin",
        contributions: 5000,
      },
      {
        id: 2,
        name: "John Kamau",
        phone: "+254 701 234 567",
        email: "john@email.com",
        role: "Member",
        contributions: 5000,
      },
      {
        id: 3,
        name: "You (Sarah)",
        phone: "+254 722 345 678",
        email: "sarah@email.com",
        role: "Member",
        contributions: 3000,
        status: "pending",
      },
      {
        id: 4,
        name: "Peter Maina",
        phone: "+254 733 456 789",
        email: "peter@email.com",
        role: "Member",
        contributions: 2000,
      },
      {
        id: 5,
        name: "Grace Njeri",
        phone: "+254 744 567 890",
        email: "grace@email.com",
        role: "Member",
        contributions: 5000,
      },
    ] as Member[],
    recentTransactions: [
      {
        id: 1,
        type: "contribution",
        amount: 3000,
        date: "2024-07-20",
        status: "completed",
      },
      {
        id: 2,
        type: "contribution",
        amount: 5000,
        date: "2024-06-15",
        status: "completed",
      },
    ] as Transaction[],
  },
];

export type PublicChama = {
  id: string;
  name: string;
  description: string;
  members: number;
  maxMembers: number;
  contribution: number;
  frequency: string;
  duration: string;
  rating: number;
  category: string;
  location: string;
  tags: string[];
  collateralRequired: number;
  nextPayout: string;
  currency: string;
  isPublic: boolean;
};

export const mockPublicChamas: PublicChama[] = [
  {
    id: "4",
    name: "Digital Nomads Savings",
    description:
      "For remote workers and freelancers building financial security",
    members: 8,
    maxMembers: 12,
    contribution: 8000,
    frequency: "Monthly",
    duration: "12 months",
    rating: 4.8,
    category: "Professional",
    location: "Global",
    tags: ["Remote Work", "Tech", "Global"],
    collateralRequired: 8000,
    nextPayout: "2025-02-10",
    currency: "KES",
    isPublic: true,
  },
  {
    id: "5",
    name: "Small Business Owners Circle",
    description: "Supporting entrepreneurs and small business growth",
    members: 6,
    maxMembers: 10,
    contribution: 15000,
    frequency: "Monthly",
    duration: "10 months",
    rating: 4.9,
    category: "Business",
    location: "Nairobi",
    tags: ["Entrepreneurship", "SME", "Growth"],
    collateralRequired: 15000,
    nextPayout: "2025-01-30",
    currency: "KES",
    isPublic: true,
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

export const mockTransactions = [
  {
    id: "1",
    type: "contribution",
    amount: 10000,
    chama: "Tech Developers Circle",
    date: "2025-01-24T14:30:00Z",
    status: "completed",
    hash: "0x742d35Cc6Cd3C9C4F6",
  },
  {
    id: "2",
    type: "payout",
    amount: 120000,
    chama: "Tech Developers Circle",
    date: "2025-01-20T10:00:00Z",
    status: "completed",
    hash: "0x8f3e2A9d7B5c1E4f8",
  },
];

export const mockPayoutSchedule = [
  {
    position: 1,
    member: {
      id: "1",
      name: "Alice Wanjiku",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face",
      joinDate: "2024-10-01",
    },
    date: "2024-12-10",
    amount: 120000,
    status: "completed",
    contributions: 12000,
  },
  {
    position: 2,
    member: {
      id: "2",
      name: "John Kamau",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face",
      joinDate: "2024-10-01",
    },
    date: "2025-01-10",
    amount: 120000,
    status: "completed",
    contributions: 12000,
  },
  {
    position: 3,
    member: {
      id: "3",
      name: "Grace Njeri",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop&crop=face",
      joinDate: "2024-10-01",
    },
    date: "2025-02-10",
    amount: 120000,
    status: "current",
    contributions: 12000,
  },
];
