import type { Expense, KhataFriend, QuickAddPreset } from "../types";

export const QUICK_ADD_PRESETS: QuickAddPreset[] = [
  { id: "chai", emoji: "☕", label: "Chai", amount: 10, category: "Chai & Snacks" },
  { id: "diet", emoji: "🥪", label: "Diet", amount: 50, category: "Food" },
  { id: "petrol", emoji: "⛽", label: "Petrol", amount: 100, category: "Transport" },
  { id: "grocery", emoji: "🛒", label: "Grocery", amount: 200, category: "Grocery" },
];

export function createInitialExpenses(): Expense[] {
  // Start with a clean ledger. Never present sample transactions as real user activity.
  return [];
}

export function createInitialKhata(): KhataFriend[] {
  // No demo contacts or fabricated balances on a new account.
  return [];
}
