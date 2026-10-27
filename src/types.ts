export type TabId = "home" | "history" | "insights" | "khata" | "pro";

export type TransactionType = "expense" | "income";

export type ExpenseCategory =
  | "Food"
  | "Chai & Snacks"
  | "Transport"
  | "Grocery"
  | "Entertainment"
  | "Bills"
  | "Shopping"
  | "Salary"
  | "Freelance"
  | "Cashback";

export type PaymentMode = "UPI" | "Cash" | "Card";

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  timestamp: string; // ISO string
  paymentMode: PaymentMode;
  type?: TransactionType; // defaults to "expense" for backward compatibility
  note?: string;
}

export interface KhataEntry {
  id: string;
  description: string;
  amount: number; // positive = friend owes you (Lena Hai), negative = you owe friend (Dena Hai)
  timestamp: string;
  settled: boolean;
}

export interface KhataFriend {
  id: string;
  name: string;
  phone: string;
  avatarInitials: string;
  upiId?: string;
  entries: KhataEntry[];
}

export type ThemeId =
  | "stark"
  | "avengers"
  | "realmadrid"
  | "barcelona"
  | "liverpool"
  | "manutd";

export interface FanTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  symbol: string;
  isProExclusive: boolean;
  accentHex: string;
  secondaryHex: string;
  ringStroke: string;
  ringGlow: string;
  buttonBg: string;
  buttonText: string;
  borderAccent: string;
  cardBorder: string;
  cardShadow: string;
  hudGlowColor: string;
  textAccent: string;
  surfaceTint: string;
  ambientPattern: string;
  borderGlow?: string;
  auraGlow?: string;
  wallpaperUrl?: string;
}

export interface JarvisMessage {
  id: string;
  role: "user" | "jarvis";
  text: string;
  timestamp: string;
  mode?: "roast" | "advice";
  isStreaming?: boolean;
  actionExecuted?: {
    type: "ADD_EXPENSE" | "SET_LOCKDOWN" | "SET_DAILY_LIMIT" | "ADD_KHATA";
    payload: any;
  };
}

export interface QuickAddPreset {
  id: string;
  emoji: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
}
