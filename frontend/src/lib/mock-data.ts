// Mock data for the Splitwise AI app

export interface User {
  id: number;
  name: string;
  email?: string;
  avatar?: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  currency: string;
  payer: User;
  participants: User[];
  splits: { user: User; amount: number }[];
  date: string;
  group?: Group;
  isSettled: boolean;
}

export interface Group {
  id: number;
  name: string;
  members: User[];
  description?: string;
}

export interface Balance {
  user: User;
  amount: number; // positive = they owe you, negative = you owe them
}

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  expense?: Expense;
  settlement?: { from: User; to: User; amount: number };
  actions?: string[];
  quickReplies?: string[];
  isThinking?: boolean;
}

// Mock Users
export const mockUsers: User[] = [
  { id: 1, name: 'You', email: 'you@example.com' },
  { id: 2, name: 'Amit', email: 'amit@example.com' },
  { id: 3, name: 'Sarah', email: 'sarah@example.com' },
  { id: 4, name: 'Rahul', email: 'rahul@example.com' },
  { id: 5, name: 'Priya', email: 'priya@example.com' },
];

// Mock Groups
export const mockGroups: Group[] = [
  { 
    id: 1, 
    name: 'Roommates', 
    members: [mockUsers[0], mockUsers[1], mockUsers[2]],
    description: 'Monthly rent and utilities'
  },
  { 
    id: 2, 
    name: 'Goa Trip', 
    members: [mockUsers[0], mockUsers[1], mockUsers[3], mockUsers[4]],
    description: 'Trip expenses December 2025'
  },
  { 
    id: 3, 
    name: 'Office Lunch', 
    members: [mockUsers[0], mockUsers[2], mockUsers[4]],
    description: 'Daily lunch splits'
  },
];

// Mock Expenses
export const mockExpenses: Expense[] = [
  {
    id: 1,
    description: 'Dinner at Olive Garden',
    amount: 2400,
    currency: 'INR',
    payer: mockUsers[0],
    participants: [mockUsers[0], mockUsers[1], mockUsers[2]],
    splits: [
      { user: mockUsers[0], amount: 800 },
      { user: mockUsers[1], amount: 800 },
      { user: mockUsers[2], amount: 800 },
    ],
    date: '2026-01-08',
    isSettled: false,
  },
  {
    id: 2,
    description: 'Groceries',
    amount: 1500,
    currency: 'INR',
    payer: mockUsers[1],
    participants: [mockUsers[0], mockUsers[1]],
    splits: [
      { user: mockUsers[0], amount: 750 },
      { user: mockUsers[1], amount: 750 },
    ],
    date: '2026-01-07',
    group: mockGroups[0],
    isSettled: false,
  },
  {
    id: 3,
    description: 'Uber to Airport',
    amount: 850,
    currency: 'INR',
    payer: mockUsers[0],
    participants: [mockUsers[0], mockUsers[3]],
    splits: [
      { user: mockUsers[0], amount: 425 },
      { user: mockUsers[3], amount: 425 },
    ],
    date: '2026-01-06',
    group: mockGroups[1],
    isSettled: false,
  },
  {
    id: 4,
    description: 'Hotel Booking',
    amount: 12000,
    currency: 'INR',
    payer: mockUsers[3],
    participants: [mockUsers[0], mockUsers[1], mockUsers[3], mockUsers[4]],
    splits: [
      { user: mockUsers[0], amount: 3000 },
      { user: mockUsers[1], amount: 3000 },
      { user: mockUsers[3], amount: 3000 },
      { user: mockUsers[4], amount: 3000 },
    ],
    date: '2026-01-05',
    group: mockGroups[1],
    isSettled: false,
  },
  {
    id: 5,
    description: 'Pizza Friday',
    amount: 900,
    currency: 'INR',
    payer: mockUsers[2],
    participants: [mockUsers[0], mockUsers[2], mockUsers[4]],
    splits: [
      { user: mockUsers[0], amount: 300 },
      { user: mockUsers[2], amount: 300 },
      { user: mockUsers[4], amount: 300 },
    ],
    date: '2026-01-03',
    group: mockGroups[2],
    isSettled: true,
  },
];

// Mock Balances (calculated)
export const mockBalances: Balance[] = [
  { user: mockUsers[1], amount: 50 },   // Amit owes you ₹50
  { user: mockUsers[2], amount: -500 }, // You owe Sarah ₹500
  { user: mockUsers[3], amount: -2575 }, // You owe Rahul ₹2575
  { user: mockUsers[4], amount: 300 },  // Priya owes you ₹300
];

// Calculate totals
export const getTotalOwedToYou = () => 
  mockBalances.filter(b => b.amount > 0).reduce((sum, b) => sum + b.amount, 0);

export const getTotalYouOwe = () => 
  Math.abs(mockBalances.filter(b => b.amount < 0).reduce((sum, b) => sum + b.amount, 0));

export const getNetBalance = () => 
  mockBalances.reduce((sum, b) => sum + b.amount, 0);

// Initial chat messages
export const initialMessages: Message[] = [
  {
    id: '1',
    type: 'ai',
    content: "Hey! 👋 I'm your expense assistant. You can tell me things like:\n\n• \"Split ₹500 dinner with Amit\"\n• \"Who owes me money?\"\n• \"Settle with Sarah\"\n\nHow can I help you today?",
    timestamp: new Date(),
    actions: ['Check Balance', 'Add Expense', 'Settle Up'],
  },
];
