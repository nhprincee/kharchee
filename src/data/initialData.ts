import type { Expense, KhataFriend, QuickAddPreset } from "../types";

export const QUICK_ADD_PRESETS: QuickAddPreset[] = [
  { id: "chai", emoji: "☕", label: "Chai", amount: 10, category: "Chai & Snacks" },
  { id: "diet", emoji: "🥪", label: "Diet", amount: 50, category: "Food" },
  { id: "petrol", emoji: "⛽", label: "Petrol", amount: 100, category: "Transport" },
  { id: "grocery", emoji: "🛒", label: "Grocery", amount: 200, category: "Grocery" },
];

export function createInitialExpenses(): Expense[] {
  const now = new Date();

  const todayAt = (hoursAgo: number, minsAgo = 0) => {
    const d = new Date(now.getTime() - (hoursAgo * 60 + minsAgo) * 60 * 1000);
    return d.toISOString();
  };

  const daysAgoAt = (days: number, hour: number, minute: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: "exp-1",
      title: "Masala Chai & Bun Maska",
      category: "Chai & Snacks",
      amount: 68,
      timestamp: todayAt(1, 15),
      paymentMode: "UPI",
      note: "Tapri with team",
    },
    {
      id: "exp-2",
      title: "Metro Smart Card Top-up",
      category: "Transport",
      amount: 50,
      timestamp: todayAt(2, 40),
      paymentMode: "UPI",
    },
    {
      id: "exp-3",
      title: "Grilled Paneer Protein Bowl",
      category: "Food",
      amount: 180,
      timestamp: daysAgoAt(1, 20, 15),
      paymentMode: "UPI",
      note: "Post-workout",
    },
    {
      id: "exp-4",
      title: "HP Petrol Pump Refill",
      category: "Transport",
      amount: 200,
      timestamp: daysAgoAt(1, 11, 30),
      paymentMode: "UPI",
    },
    {
      id: "exp-5",
      title: "Filter Coffee",
      category: "Chai & Snacks",
      amount: 25,
      timestamp: daysAgoAt(1, 17, 10),
      paymentMode: "Cash",
    },
    {
      id: "exp-6",
      title: "Oats, Milk & Eggs",
      category: "Grocery",
      amount: 280,
      timestamp: daysAgoAt(2, 19, 0),
      paymentMode: "UPI",
    },
    {
      id: "exp-7",
      title: "Shawarma Wrap",
      category: "Food",
      amount: 160,
      timestamp: daysAgoAt(3, 22, 30),
      paymentMode: "UPI",
    },
    {
      id: "exp-8",
      title: "Turf Football Share",
      category: "Entertainment",
      amount: 250,
      timestamp: daysAgoAt(4, 21, 0),
      paymentMode: "UPI",
    },
  ];
}

export function createInitialKhata(): KhataFriend[] {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

  return [
    {
      id: "fr-1",
      name: "Rohan Verma",
      phone: "919876543210",
      avatarInitials: "RV",
      upiId: "rohan.verma@oksbi",
      entries: [
        {
          id: "ke-1",
          description: "Midnight Biryani Split",
          amount: 340,
          timestamp: daysAgo(1),
          settled: false,
        },
        {
          id: "ke-2",
          description: "Weekend Turf Booking",
          amount: 250,
          timestamp: daysAgo(3),
          settled: false,
        },
      ],
    },
    {
      id: "fr-2",
      name: "Kabir Malhotra",
      phone: "919812345678",
      avatarInitials: "KM",
      upiId: "kabir.m@okhdfcbank",
      entries: [
        {
          id: "ke-3",
          description: "IMAX Movie Tickets",
          amount: 420,
          timestamp: daysAgo(2),
          settled: false,
        },
      ],
    },
    {
      id: "fr-3",
      name: "Priya Nair",
      phone: "919988776655",
      avatarInitials: "PN",
      upiId: "priyanair@paytm",
      entries: [
        {
          id: "ke-4",
          description: "Uber Airport Pool Share",
          amount: -180,
          timestamp: daysAgo(2),
          settled: false,
        },
      ],
    },
  ];
}
