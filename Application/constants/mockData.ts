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
  raterCount: number;
  category: string;
  location: string;
  adminTerms: string[];
  collateralAmount: number;
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
    id: 1,
    slug: "women-entrepreneurs-chama",
    name: "Women Entrepreneurs Chama",
    description:
      "Supporting women entrepreneurs in building successful businesses and financial independence",
    currency: "cUSD",
    blockchainId: "1",
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
    raterCount: 23,
    category: "Professional",
    location: "Nairobi",
    adminTerms: ["Must be a woman entrepreneur.", "Contributions must be made monthly."],
    collateralAmount: 5000,
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
  {
    id: 2,
    slug: "young-professionals-investment-group",
    name: "Young Professionals Investment Group",
    description:
      "A group of young professionals pooling resources for joint investments and financial growth.",
    currency: "cUSD",
    blockchainId: "2",
    totalMembers: 8,
    maxMembers: 10,
    contribution: 3000,
    totalContributions: 9000,
    myContributions: 3000,
    nextPayoutDate: "2024-08-25",
    nextPayoutAmount: 24000,
    currentTurnMember: "You (Sarah)",
    myTurnDate: "2024-08-25",
    contributionDueDate: "2024-08-20",
    hasOutstandingPayment: false,
    frequency: "Monthly",
    duration: "8 months",
    rating: 4.3,
    raterCount: 18,
    category: "Investment",
    location: "Nairobi",
    adminTerms: ["Must be a young professional.", "Contributions must be made monthly."],
    collateralAmount: 0,
    nextPayout: "2024-08-25",
    myTurn: true,
    myPosition: 2,
    nextTurnMember: "You (Sarah)",
    status: "active",
    unreadMessages: 0,
    isPublic: true,
    messages: [
      {
        id: 1,
        sender: "Admin",
        message: "Welcome to the group! Let's make smart investments together.",
        time: "3 days ago",
        isAdmin: true,
      },
      {
        id: 2,
        sender: "Brian Otieno",
        message: "Looking forward to the next payout round!",
        time: "1 day ago",
      },
      {
        id: 3,
        sender: "You (Sarah)",
        message: "Excited for my turn this month!",
        time: "2 hours ago",
      },
    ] as Message[],
    payoutSchedule: [
      {
        position: 1,
        member: "Alice Mwangi",
        date: "2024-07-25",
        status: "completed",
        amount: 24000,
      },
      {
        position: 2,
        member: "You (Sarah)",
        date: "2024-08-25",
        status: "next",
        amount: 24000,
      },
      {
        position: 3,
        member: "Brian Otieno",
        date: "2024-09-25",
        status: "upcoming",
        amount: 24000,
      },
      {
        position: 4,
        member: "Linda Njoroge",
        date: "2024-10-25",
        status: "upcoming",
        amount: 24000,
      },
    ] as PayoutScheduleItem[],
    members: [
      {
        id: 1,
        name: "Alice Mwangi",
        phone: "+254 700 111 222",
        email: "alice@email.com",
        role: "Admin",
        contributions: 3000,
      },
      {
        id: 2,
        name: "You (Sarah)",
        phone: "+254 722 345 678",
        email: "sarah@email.com",
        role: "Member",
        contributions: 3000,
      },
      {
        id: 3,
        name: "Brian Otieno",
        phone: "+254 701 333 444",
        email: "brian@email.com",
        role: "Member",
        contributions: 3000,
      },
      {
        id: 4,
        name: "Linda Njoroge",
        phone: "+254 733 555 666",
        email: "linda@email.com",
        role: "Member",
        contributions: 0,
      },
    ] as Member[],
    recentTransactions: [
      {
        id: 1,
        type: "contribution",
        amount: 3000,
        date: "2024-08-10",
        status: "completed",
      },
      {
        id: 2,
        type: "contribution",
        amount: 3000,
        date: "2024-07-10",
        status: "completed",
      },
    ] as Transaction[],
  },
  {
    id: 3,
    slug: "family-welfare-chama",
    name: "Family Welfare Chama",
    description:
      "A family-based chama for supporting each other in times of need and celebrating milestones.",
    currency: "cUSD",
    blockchainId: "3",
    totalMembers: 6,
    maxMembers: 10,
    contribution: 2000,
    totalContributions: 4000,
    myContributions: 2000,
    nextPayoutDate: "2024-09-01",
    nextPayoutAmount: 12000,
    currentTurnMember: "James Mwangi",
    myTurnDate: "2024-12-01",
    contributionDueDate: "2024-08-28",
    hasOutstandingPayment: false,
    frequency: "Monthly",
    duration: "6 months",
    rating: 4.9,
    raterCount: 31,
    category: "Family",
    location: "Nakuru",
    adminTerms: ["Must be a family member.", "Contributions must be made monthly."],
    collateralAmount: 0,
    nextPayout: "2024-09-01",
    myTurn: false,
    myPosition: 4,
    nextTurnMember: "Mary Atieno",
    status: "active",
    unreadMessages: 1,
    isPublic: false,
    messages: [
      {
        id: 1,
        sender: "Admin",
        message: "Remember to contribute before the end of the month.",
        time: "5 days ago",
        isAdmin: true,
      },
      {
        id: 2,
        sender: "James Mwangi",
        message: "Thank you all for your support!",
        time: "2 days ago",
      },
      {
        id: 3,
        sender: "You (Sarah)",
        message: "Happy to help, James!",
        time: "1 day ago",
      },
    ] as Message[],
    payoutSchedule: [
      {
        position: 1,
        member: "Mary Atieno",
        date: "2024-07-01",
        status: "completed",
        amount: 12000,
      },
      {
        position: 2,
        member: "James Mwangi",
        date: "2024-09-01",
        status: "next",
        amount: 12000,
      },
      {
        position: 3,
        member: "Peter Otieno",
        date: "2024-10-01",
        status: "upcoming",
        amount: 12000,
      },
      {
        position: 4,
        member: "You (Sarah)",
        date: "2024-12-01",
        status: "upcoming",
        amount: 12000,
      },
    ] as PayoutScheduleItem[],
    members: [
      {
        id: 1,
        name: "Mary Atieno",
        phone: "+254 700 222 333",
        email: "maryatieno@email.com",
        role: "Admin",
        contributions: 2000,
      },
      {
        id: 2,
        name: "James Mwangi",
        phone: "+254 701 444 555",
        email: "james@email.com",
        role: "Member",
        contributions: 2000,
      },
      {
        id: 3,
        name: "Peter Otieno",
        phone: "+254 702 666 777",
        email: "peter@email.com",
        role: "Member",
        contributions: 0,
      },
      {
        id: 4,
        name: "You (Sarah)",
        phone: "+254 722 345 678",
        email: "sarah@email.com",
        role: "Member",
        contributions: 2000,
      },
    ] as Member[],
    recentTransactions: [
      {
        id: 1,
        type: "contribution",
        amount: 2000,
        date: "2024-08-01",
        status: "completed",
      },
      {
        id: 2,
        type: "contribution",
        amount: 2000,
        date: "2024-07-01",
        status: "completed",
      },
    ] as Transaction[],
  },
];

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
