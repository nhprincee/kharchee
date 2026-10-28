import express from "express";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createHmac, timingSafeEqual } from "node:crypto";
import { applicationDefault, cert, getApps as getAdminApps, initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { type FunctionDeclaration, GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGenAIClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key.startsWith("your_") || key.trim() === "") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export interface FinancialSnapshot {
  dailyLimit: number;
  todaySpent: number;
  remaining: number;
  percentUsed: number;
  lockdownActive: boolean;
  streakDays: number;
  disciplineScore?: number;
  themeName: string;
  recentExpenses: Array<{
    title: string;
    category: string;
    amount: number;
    timeLabel: string;
  }>;
  khataToReceive: number;
  khataToPay: number;
}

export interface ClientChatMessage {
  role: "user" | "jarvis";
  text: string;
}

export type JarvisAction =
  | { type: "ADD_EXPENSE"; payload: { title: string; amount: number; category: string } }
  | { type: "SET_LOCKDOWN"; payload: { active: boolean } }
  | { type: "SET_DAILY_LIMIT"; payload: { limit: number } }
  | {
      type: "ADD_KHATA";
      payload: {
        friendName: string;
        amount: number; // positive = friend owes user (Lena Hai), negative = user owes friend (Dena Hai)
        description: string;
      };
    };

function categorizeExpense(title: string): string {
  const t = title.toLowerCase();
  if (
    t.includes("chai") ||
    t.includes("tea") ||
    t.includes("coffee") ||
    t.includes("samosa") ||
    t.includes("snack") ||
    t.includes("maggi") ||
    t.includes("biscuit")
  ) {
    return "Chai & Snacks";
  }
  if (
    t.includes("chicken") ||
    t.includes("mutton") ||
    t.includes("biryani") ||
    t.includes("dinner") ||
    t.includes("lunch") ||
    t.includes("burger") ||
    t.includes("pizza") ||
    t.includes("swiggy") ||
    t.includes("zomato") ||
    t.includes("food") ||
    t.includes("roti") ||
    t.includes("paneer") ||
    t.includes("egg") ||
    t.includes("thali")
  ) {
    return "Food";
  }
  if (
    t.includes("petrol") ||
    t.includes("diesel") ||
    t.includes("fuel") ||
    t.includes("auto") ||
    t.includes("cab") ||
    t.includes("uber") ||
    t.includes("ola") ||
    t.includes("metro") ||
    t.includes("bus") ||
    t.includes("toll") ||
    t.includes("fare")
  ) {
    return "Transport";
  }
  if (
    t.includes("milk") ||
    t.includes("doodh") ||
    t.includes("sabzi") ||
    t.includes("vegetable") ||
    t.includes("fruit") ||
    t.includes("blinkit") ||
    t.includes("zepto") ||
    t.includes("instamart") ||
    t.includes("grocery") ||
    t.includes("atta") ||
    t.includes("oil")
  ) {
    return "Grocery";
  }
  if (
    t.includes("movie") ||
    t.includes("netflix") ||
    t.includes("cinema") ||
    t.includes("game") ||
    t.includes("party") ||
    t.includes("club") ||
    t.includes("show")
  ) {
    return "Entertainment";
  }
  if (
    t.includes("bill") ||
    t.includes("recharge") ||
    t.includes("electricity") ||
    t.includes("wifi") ||
    t.includes("rent") ||
    t.includes("maid") ||
    t.includes("cylinder")
  ) {
    return "Bills";
  }
  if (
    t.includes("cloth") ||
    t.includes("shirt") ||
    t.includes("shoes") ||
    t.includes("amazon") ||
    t.includes("myntra") ||
    t.includes("shopping") ||
    t.includes("jeans")
  ) {
    return "Shopping";
  }
  return "Food";
}

export function extractIntentAction(prompt: string): JarvisAction | null {
  const p = prompt.trim();

  // 1. Direct Add Expense Patterns:
  // e.g. "Add 150 for chicken", "Add 150 for chai", "log 200 fuel", "daal do 50 chai"
  const addMatch1 = p.match(
    /^(?:add|log|daal(?:do)?|record)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:for|ka|ki|ke|on)?\s+(.+)$/i
  );
  if (addMatch1) {
    const amount = parseFloat(addMatch1[1]);
    const rawTitle = addMatch1[2].replace(/[.,!]+$/, "").trim();
    if (amount > 0 && rawTitle) {
      return {
        type: "ADD_EXPENSE",
        payload: {
          title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
          amount,
          category: categorizeExpense(rawTitle),
        },
      };
    }
  }

  // e.g. "Maine 40 ki chai pee", "Maine 150 ka chicken khaya", "maine 50 ki coffee li"
  const addMatch2 = p.match(
    /^maine\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*k[aie]\s+(.+?)(?:\s+(?:pee|pi|khayi|khaya|li|lee|di|de\s*diye|kharidi|spent|spend))?$/i
  );
  if (addMatch2) {
    const amount = parseFloat(addMatch2[1]);
    const rawTitle = addMatch2[2].replace(/[.,!]+$/, "").trim();
    if (amount > 0 && rawTitle) {
      return {
        type: "ADD_EXPENSE",
        payload: {
          title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
          amount,
          category: categorizeExpense(rawTitle),
        },
      };
    }
  }

  // e.g. "Swiggy pe 320 kharch hue", "Petrol mein 200 gaye"
  const addMatch3 = p.match(
    /^(.+?)\s*(?:p[ea]|mein|par)?\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:kharch|gaye|lag|spent|lagaye)/i
  );
  if (addMatch3) {
    const rawTitle = addMatch3[1].replace(/^(?:maine|aaj)\s+/i, "").trim();
    const amount = parseFloat(addMatch3[2]);
    if (amount > 0 && rawTitle) {
      return {
        type: "ADD_EXPENSE",
        payload: {
          title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
          amount,
          category: categorizeExpense(rawTitle),
        },
      };
    }
  }

  // e.g. "40 ki chai add karo", "150 ka chicken add kar do"
  const addMatch4 = p.match(
    /(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*k[aie]\s+(.+?)\s*(?:add|log|daal|likh)/i
  );
  if (addMatch4) {
    const amount = parseFloat(addMatch4[1]);
    const rawTitle = addMatch4[2].replace(/[.,!]+$/, "").trim();
    if (amount > 0 && rawTitle) {
      return {
        type: "ADD_EXPENSE",
        payload: {
          title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
          amount,
          category: categorizeExpense(rawTitle),
        },
      };
    }
  }

  // 2. Emergency Lockdown activation / deactivation:
  if (
    /(?:activate|turn on|enable|lagao|chalu karo|start)\s*(?:emergency\s*)?lockdown/i.test(p) ||
    /(?:emergency\s*)?lockdown\s*(?:activate|on|lagao|kardo)/i.test(p)
  ) {
    return { type: "SET_LOCKDOWN", payload: { active: true } };
  }
  if (
    /(?:deactivate|turn off|disable|hatao|band karo|lift|remove)\s*(?:emergency\s*)?lockdown/i.test(p) ||
    /(?:emergency\s*)?lockdown\s*(?:deactivate|off|hatao|khatam)/i.test(p)
  ) {
    return { type: "SET_LOCKDOWN", payload: { active: false } };
  }

  // 3. Set Daily Limit:
  const limitMatch = p.match(
    /(?:set|change|update|kardo)?\s*(?:daily\s*)?(?:limit|budget)\s*(?:to|ko)?\s*(?:rs\.?|inr|₹)?\s*(\d{2,6})/i
  );
  if (limitMatch && (p.toLowerCase().includes("budget") || p.toLowerCase().includes("limit"))) {
    const newLimit = parseInt(limitMatch[1], 10);
    if (newLimit >= 100) {
      return { type: "SET_DAILY_LIMIT", payload: { limit: newLimit } };
    }
  }

  // 4. Voice-to-Khata Natural Language Parser:
  // Pattern A: "Kabir owes me 500 for dinner" / "Rohan owes me Rs 300"
  const khataOwesMe = p.match(
    /^([A-Za-z]+)\s+owes\s+me\s+(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)(?:\s+(?:for|on|towards)\s+(.+))?$/i
  );
  if (khataOwesMe) {
    const friendName =
      khataOwesMe[1].charAt(0).toUpperCase() + khataOwesMe[1].slice(1).toLowerCase();
    const amount = Math.round(parseFloat(khataOwesMe[2]));
    const rawDesc = (khataOwesMe[3] || "Shared Expense").replace(/[.,!]+$/, "").trim();
    const description = rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1);
    if (amount > 0) {
      return {
        type: "ADD_KHATA",
        payload: { friendName, amount, description },
      };
    }
  }

  // Pattern B: "Maine Rohan ko 300 diye (for dinner)" / "Rohan ko 300 diye"
  const khataMaineDiye = p.match(
    /^(?:maine\s+)?([A-Za-z]+)\s+ko\s+(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:rupaye\s+|rs\s+)?(?:diye|diya|de\s+diye|pay\s+kiye|bheje|transfer\s+kiye)(?:\s+(?:for|ke\s+liye|on|mein)\s+(.+))?$/i
  );
  if (khataMaineDiye) {
    const friendName =
      khataMaineDiye[1].charAt(0).toUpperCase() + khataMaineDiye[1].slice(1).toLowerCase();
    const amount = Math.round(parseFloat(khataMaineDiye[2]));
    const rawDesc = (khataMaineDiye[3] || "Given via Khata").replace(/[.,!]+$/, "").trim();
    const description = rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1);
    if (amount > 0) {
      return {
        type: "ADD_KHATA",
        payload: { friendName, amount, description },
      };
    }
  }

  // Pattern C: "Rohan se 400 lene hain (for movie)"
  const khataLeneHain = p.match(
    /^(?:mujhe\s+)?([A-Za-z]+)\s+se\s+(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:lene\s+hain|lena\s+hai)(?:\s+(?:for|ke\s+liye|ka|ki)\s+(.+))?$/i
  );
  if (khataLeneHain) {
    const friendName =
      khataLeneHain[1].charAt(0).toUpperCase() + khataLeneHain[1].slice(1).toLowerCase();
    const amount = Math.round(parseFloat(khataLeneHain[2]));
    const rawDesc = (khataLeneHain[3] || "Shared Expense").replace(/[.,!]+$/, "").trim();
    const description = rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1);
    if (amount > 0) {
      return {
        type: "ADD_KHATA",
        payload: { friendName, amount, description },
      };
    }
  }

  // Pattern D: "I owe Kabir 250 for pizza" / "Mujhe Kabir ko 250 dene hain"
  const khataIOwe = p.match(
    /^(?:i\s+owe\s+([A-Za-z]+)\s+(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)|(?:mujhe\s+)?([A-Za-z]+)\s+ko\s+(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:dene\s+hain|dena\s+hai))(?:\s+(?:for|ke\s+liye|on)\s+(.+))?$/i
  );
  if (khataIOwe) {
    const rawName = khataIOwe[1] || khataIOwe[3];
    const rawAmt = khataIOwe[2] || khataIOwe[4];
    const friendName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    const amount = -Math.round(parseFloat(rawAmt));
    const rawDesc = (khataIOwe[5] || "Borrowed").replace(/[.,!]+$/, "").trim();
    const description = rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1);
    if (amount !== 0) {
      return {
        type: "ADD_KHATA",
        payload: { friendName, amount, description },
      };
    }
  }

  return null;
}

const addExpenseDeclaration: FunctionDeclaration = {
  name: "addExpense",
  description:
    "Add a new expense transaction to today's ledger when user mentions spending money, buying something, or asks to log an expense (e.g., 'Add 150 for chicken', 'Maine 40 ki chai pee').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Name of the expense or vendor, e.g. Chicken, Chai, Swiggy, Petrol",
      },
      amount: {
        type: Type.NUMBER,
        description: "Amount in Indian Rupees (INR)",
      },
      category: {
        type: Type.STRING,
        description:
          "Category: Food, Chai & Snacks, Transport, Grocery, Entertainment, Bills, or Shopping",
      },
    },
    required: ["title", "amount"],
  },
};

const setLockdownDeclaration: FunctionDeclaration = {
  name: "setEmergencyLockdown",
  description: "Activate or deactivate the Emergency Lockdown budget freeze mode.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      active: {
        type: Type.BOOLEAN,
        description: "True to freeze spending, False to lift lockdown",
      },
    },
    required: ["active"],
  },
};

const setDailyLimitDeclaration: FunctionDeclaration = {
  name: "setDailyLimit",
  description: "Update the user's daily spending budget limit in Rupees.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.NUMBER,
        description: "New daily limit amount in INR",
      },
    },
    required: ["limit"],
  },
};

const addKhataDeclaration: FunctionDeclaration = {
  name: "addKhataEntry",
  description:
    "Record a peer-to-peer debt or loan in Dosto Ka Khata when the user says someone owes them money or they gave/owe money to a friend (e.g. 'Kabir owes me 500 for dinner', 'Maine Rohan ko 300 diye', 'I owe Aman 200 for coffee').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      friendName: {
        type: Type.STRING,
        description: "First name of the friend (e.g. Kabir, Rohan, Aman)",
      },
      amount: {
        type: Type.NUMBER,
        description:
          "Positive INR amount if friend owes the user (Lena Hai / user gave money to friend), or negative INR amount if user owes the friend (Dena Hai)",
      },
      description: {
        type: Type.STRING,
        description: "Short tag or reason for the Khata entry, e.g. Dinner, Movie, Chai, Split",
      },
    },
    required: ["friendName", "amount"],
  },
};

const jarvisTools = [
  {
    functionDeclarations: [
      addExpenseDeclaration,
      setLockdownDeclaration,
      setDailyLimitDeclaration,
      addKhataDeclaration,
    ],
  },
];

function buildDynamicJarvisReply(
  prompt: string,
  snapshot?: FinancialSnapshot,
  action?: JarvisAction | null
): string {
  if (action?.type === "ADD_EXPENSE") {
    return `Logged ₹${action.payload.amount} for ${action.payload.title}, Sir. Quota updated. Anything else for your ledger?`;
  }
  if (action?.type === "ADD_KHATA") {
    const absAmt = Math.abs(action.payload.amount);
    return action.payload.amount >= 0
      ? `Dosto Ka Khata updated, Sir! Recorded that ${action.payload.friendName} owes you ₹${absAmt} for ${action.payload.description} (Lena Hai). Shall I prepare a WhatsApp UPI recovery link?`
      : `Dosto Ka Khata updated, Sir! Logged ₹${absAmt} payable to ${action.payload.friendName} for ${action.payload.description} (Dena Hai).`;
  }
  if (action?.type === "SET_LOCKDOWN") {
    return action.payload.active
      ? `Emergency Lockdown activated, Sir. Spending freeze engaged across your perimeter—no unauthorized debits shall pass.`
      : `Emergency Lockdown deactivated, Sir. Normal operational parameters restored.`;
  }
  if (action?.type === "SET_DAILY_LIMIT") {
    return `Daily limit updated to ₹${action.payload.limit}, Sir. Perimeter recalibrated to your target.`;
  }

  const p = prompt.toLowerCase();
  const limit = snapshot?.dailyLimit ?? 1000;
  const spent = snapshot?.todaySpent ?? 0;
  const rem = snapshot?.remaining ?? limit - spent;
  const pct = snapshot?.percentUsed ?? Math.round((spent / limit) * 100);
  const score = snapshot?.disciplineScore ?? 750;
  const recentList =
    snapshot?.recentExpenses && snapshot.recentExpenses.length > 0
      ? snapshot.recentExpenses.map((e) => `${e.title} (₹${e.amount})`).join(", ")
      : "No expenses logged today yet";

  if (p.includes("score")) {
    return `Your in-app spending-discipline estimate is ${score}/900. This is not a CIBIL or official credit score. ${
      pct > 100
        ? "Your logged spending is above the daily budget you set."
        : "As you log real transactions, the app can give you more useful habit insights."
    }`;
  }

  if (p.includes("lockdown")) {
    return `Defensive shields are fully primed, Sir. Emergency Lockdown is currently ${
      snapshot?.lockdownActive ? "ACTIVE and freezing expenditures" : "standing by on standby"
    }. Say the word and I will toggle the perimeter.`;
  }

  if (pct > 100) {
    return `You have exceeded your daily budget by ₹${Math.abs(rem)} (₹${spent} spent against ₹${limit}). You could pause non-essential spending for the rest of today.`;
  }

  if (pct >= 70) {
    return `You have logged ₹${spent} today (${pct}% of your ₹${limit} budget), leaving ₹${rem}. Recent entries: ${recentList}.`;
  }

  return `You have logged ₹${spent} today against a daily budget of ₹${limit}, leaving ₹${rem}. What would you like to check or record?`;
}

async function getOpenAIJarvisReply(
  prompt: string,
  snapshot?: FinancialSnapshot,
  mode?: "roast" | "advice",
  history: ClientChatMessage[] = []
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const snapshotSummary = snapshot
    ? JSON.stringify({
        dailyLimit: snapshot.dailyLimit,
        todaySpent: snapshot.todaySpent,
        remaining: snapshot.remaining,
        percentUsed: snapshot.percentUsed,
        lockdownActive: snapshot.lockdownActive,
        streakDays: snapshot.streakDays,
        disciplineScore: snapshot.disciplineScore,
        recentExpenses: snapshot.recentExpenses,
        khataToReceive: snapshot.khataToReceive,
        khataToPay: snapshot.khataToPay,
      })
    : "No financial snapshot available.";

  const messages = [
    {
      role: "system",
      content: [
        "You are Jarvis, the helpful AI assistant inside Kharchee, a personal finance app.",
        "Answer the user's latest question directly. Understand Hindi, Hinglish, and English; naturally mirror the user's language.",
        "Be clear, practical, concise, and friendly. A little dry wit is fine, but never force movie references, 'Sir/Boss', fake telemetry, or dramatic roleplay.",
        "Use only the supplied financial snapshot. Never invent transactions, balances, names, credit ratings, or actions.",
        "The disciplineScore is an app-generated habit estimate, not a CIBIL score or lender-issued credit score; explain that distinction whenever relevant.",
        "Never claim that an action was completed merely because the user asked. The app executes separately detected actions; only describe the requested action, and do not claim other side effects.",
        "If there is no logged data, say so plainly and ask what the user wants to add. Never shame the user about money.",
        `Response style: ${mode === "advice" ? "supportive, thoughtful, actionable" : "casual, lightly witty, never insulting"}.`,
        `Current financial snapshot: ${snapshotSummary}`,
      ].join("\n"),
    },
    ...history.slice(-8).map((message) => ({
      role: message.role === "jarvis" ? "assistant" : "user",
      content: String(message.text || "").slice(0, 1500),
    })),
    { role: "user", content: prompt },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages,
      temperature: 0.65,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 240)}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  return payload.choices?.[0]?.message?.content?.trim() || "";
}

const GEMINI_TEXT_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const ipRequestTimestamps = new Map<string, number[]>();

function apiRateLimiter(req: Request, res: Response, next: () => void) {
  const forwarded = req.headers["x-forwarded-for"];
  const clientIp =
    (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown";

  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recentTimestamps = (ipRequestTimestamps.get(clientIp) || []).filter(
    (ts) => ts > windowStart
  );

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({
      error: "Too many requests. Please wait a moment before trying again.",
    });
    return;
  }

  recentTimestamps.push(now);
  ipRequestTimestamps.set(clientIp, recentTimestamps);
  next();
}

function isValidExpenseAmount(val: unknown): val is number {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 && num <= 1000000;
}

function isValidDailyLimit(val: unknown): val is number {
  const num = Number(val);
  return Number.isFinite(num) && num >= 50 && num <= 1000000;
}

function isValidKhataAmount(val: unknown): val is number {
  const num = Number(val);
  return Number.isFinite(num) && num !== 0 && Math.abs(num) <= 1000000;
}

function buildGeminiPayload(
  userPrompt: string,
  snapshot?: FinancialSnapshot,
  mode?: "roast" | "advice",
  history?: ClientChatMessage[]
) {
  const safeUserPrompt = userPrompt.slice(0, 1000);
  const limit = snapshot?.dailyLimit ?? 1000;
  const spent = snapshot?.todaySpent ?? 0;
  const diff = snapshot?.remaining ?? limit - spent;
  const percentage = snapshot?.percentUsed ?? Math.round((spent / limit) * 100);
  const recentList =
    snapshot?.recentExpenses && snapshot.recentExpenses.length > 0
      ? snapshot.recentExpenses.map((e) => `${e.title} (₹${e.amount}, ${e.category})`).join(", ")
      : "None logged yet today";
  const khataList = `To collect: ₹${snapshot?.khataToReceive ?? 0}, To pay: ₹${snapshot?.khataToPay ?? 0}`;
  const disciplineScore = snapshot?.disciplineScore ?? 750;
  const lockdownActive = Boolean(snapshot?.lockdownActive);

  const systemInstruction = `You are J.A.R.V.I.S., the ultimate hyper-intelligent AI butler and street-smart financial tactician (inspired by Tony Stark's personal assistant).
- Persona: Sophisticated British gentleman meets witty Indian brother ('Sir', 'Bhai', 'Boss').
- Language: Seamless natural spoken Hinglish.
- Core Capability: You can talk about ANYTHING. Life, financial hacks, investment philosophies, daily discipline, workout motivation, or just friendly banter. You are NOT just a rigid calculator.
- Live Telemetry Grounding:
  * Today's Limit: ₹${limit}
  * Spent: ₹${spent}
  * Overspend/Remaining: ₹${diff} (${diff >= 0 ? "Remaining in reserve" : "OVER BUDGET by ₹" + Math.abs(diff)})
  * Percentage: ${percentage}%
  * Recent Expenses: ${recentList}
  * Khata Debts: ${khataList}
  * In-app spending-discipline estimate: ${disciplineScore} / 900 (not a CIBIL or official credit score)
  * Emergency Lockdown: ${lockdownActive ? "ACTIVE (Frozen)" : "Inactive"}
- Directives:
  * Weave these real numbers naturally into banter instead of giving boring static stats.
  * If overspent (>100%): Roast them with supreme intelligence ('Sir, spending ${percentage}% of your daily quota is pure Thanos-level destruction of your savings').
  * If doing well: Give genuinely motivating, legendary praise.
  * Answer the actual latest question first. Do not force every answer back to spending telemetry, scores, Stark Industries, or lockdown.
  * For greetings, reply naturally. For general questions, answer the topic directly in 2-5 sentences. Ask a brief clarifying question only when needed.
  * Use history to understand follow-ups, but treat the latest user message as the main request.
  * Only claim a transaction, budget, or lockdown change succeeded when a corresponding valid action is returned. Never pretend an action happened.
  * Never invent financial facts. If a requested figure is absent from the supplied data, say you cannot see it.
  * NEVER repeat canned formulas or static quotes. Make replies specific to the user's question and supplied data.
  * DIRECT ACTIONS:
    - If user types or says 'Add 150 for chicken', 'Maine 40 ki chai pee', 'Swiggy pe 250 kharch hue', or any personal expense, call the addExpense function and confirm warmly: 'Logged ₹150 for Chicken, Sir. Quota updated. Anything else for your ledger?'
    - If user mentions a friend owing money or giving money to a friend (e.g. 'Kabir owes me 500 for dinner', 'Maine Rohan ko 300 diye', 'I owe Aman 200'), call the addKhataEntry function (positive amount if friend owes user, negative if user owes friend) and confirm the Khata update!
    - If user asks to activate or remove Emergency Lockdown, call setEmergencyLockdown.
    - If user asks to change or set daily budget/limit, call setDailyLimit.
    - If user asks about their score, explain the app-generated spending-discipline estimate (${disciplineScore}/900); never call it a real credit score.
- Response Style: Crisp, lively, intelligent, with real personality. Keep it to 2-4 punchy sentences so it's enjoyable to read and speak aloud. No markdown asterisk lists or robotic apologies.`;

  const turns: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  if (history && Array.isArray(history) && history.length > 0) {
    for (const item of history.slice(-8)) {
      if (!item.text || typeof item.text !== "string") continue;
      const truncatedHistoryText = item.text.trim().slice(0, 500);
      if (
        !truncatedHistoryText ||
        truncatedHistoryText.startsWith("Good day, Sir") ||
        truncatedHistoryText.startsWith("Arey Seth ji!")
      ) {
        continue;
      }
      turns.push({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: truncatedHistoryText }],
      });
    }
  }

  turns.push({
    role: "user",
    parts: [
      {
        text: `Live Telemetry: Today Limit: ₹${limit}, Spent: ₹${spent}, Remaining: ₹${diff}, ${percentage}% used, Score: ${disciplineScore}/900, Lockdown: ${
          lockdownActive ? "ON" : "OFF"
        }. Mode preference: ${mode || "general"}.\n\nUser Question: "${safeUserPrompt}"`,
      },
    ],
  });

  return { systemInstruction, turns, tools: jarvisTools };
}


type BillingPlanKey = "monthly" | "quarterly";
type RazorpaySubscription = { id: string; plan_id: string; status: string; current_end?: number | null; notes?: Record<string, string> };

function getBillingServices() {
  const existing = getAdminApps().find((item) => item.name === "kharchee-billing");
  if (existing) return { auth: getAdminAuth(existing), db: getFirestore(existing) };
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawServiceAccount) {
    const account = JSON.parse(rawServiceAccount) as { project_id: string; client_email: string; private_key: string };
    const adminApp = initializeAdminApp({
      credential: cert({ projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key }),
      projectId: account.project_id || process.env.VITE_FIREBASE_PROJECT_ID,
    }, "kharchee-billing");
    return { auth: getAdminAuth(adminApp), db: getFirestore(adminApp) };
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const adminApp = initializeAdminApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
    }, "kharchee-billing");
    return { auth: getAdminAuth(adminApp), db: getFirestore(adminApp) };
  }
  throw new Error("Firebase Admin credentials are not configured.");
}

async function verifyBillingUser(req: Request): Promise<string> {
  const authorization = req.header("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new Error("Sign in to manage a Pro subscription.");
  const { auth } = getBillingServices();
  return (await auth.verifyIdToken(token, true)).uid;
}

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) throw new Error("Razorpay server credentials are not configured.");
  return { keyId, keySecret };
}

function getPlanConfig(plan: BillingPlanKey) {
  const planId = plan === "monthly" ? process.env.RAZORPAY_MONTHLY_PLAN_ID?.trim() : process.env.RAZORPAY_QUARTERLY_PLAN_ID?.trim();
  if (!planId) throw new Error("Razorpay plan ID is not configured.");
  return { planId, amountPaise: plan === "monthly" ? 3900 : 9900, label: plan === "monthly" ? "Kharchee Pro Monthly" : "Kharchee Pro Quarterly", totalCount: plan === "monthly" ? 120 : 40, periodMs: plan === "monthly" ? 30 * 24 * 60 * 60 * 1000 : 90 * 24 * 60 * 60 * 1000 };
}

async function razorpayApi<T>(pathName: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const credentials = getRazorpayConfig();
  const response = await fetch("https://api.razorpay.com/v1/" + pathName, {
    method,
    headers: { Authorization: "Basic " + Buffer.from(credentials.keyId + ":" + credentials.keySecret).toString("base64"), "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({})) as T & { error?: { description?: string } };
  if (!response.ok) throw new Error(data.error?.description || "Payment provider request failed.");
  return data;
}

function secureSignatureMatches(message: string, suppliedSignature: string, secret: string): boolean {
  const expectedBuffer = Buffer.from(createHmac("sha256", secret).update(message).digest("hex"), "utf8");
  const suppliedBuffer = Buffer.from(suppliedSignature || "", "utf8");
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

async function startServer() {
  const app = express();
  const defaultJsonParser = express.json({ limit: "256kb" });
  const ocrReceiptJsonParser = express.json({ limit: "8mb" });

  app.use((req: Request, res: Response, next: () => void) => {
    if (req.path === "/api/ocr/receipt" || req.path === "/api/billing/webhook") {
      next();
      return;
    }
    defaultJsonParser(req, res, next);
  });

  app.use("/api", apiRateLimiter);


  app.post("/api/billing/subscription", async (req: Request, res: Response) => {
    try {
      const uid = await verifyBillingUser(req);
      const plan = req.body?.plan as BillingPlanKey;
      if (plan !== "monthly" && plan !== "quarterly") { res.status(400).json({ error: "Choose a valid Pro subscription plan." }); return; }
      const credentials = getRazorpayConfig();
      const planConfig = getPlanConfig(plan);
      const { db } = getBillingServices();
      const currentBilling = await db.collection("users").doc(uid).collection("billing").doc("current").get();
      const existingBilling = currentBilling.data();
      const existingEnd = Number(existingBilling?.currentPeriodEnd || 0);
      if (existingBilling && ["authenticated", "active"].includes(String(existingBilling.status)) && (!existingEnd || existingEnd > Date.now())) {
        res.status(409).json({ error: "Kharchee Pro is already active on this account." });
        return;
      }
      const subscription = await razorpayApi<RazorpaySubscription>("subscriptions", "POST", {
        plan_id: planConfig.planId, total_count: planConfig.totalCount, quantity: 1, customer_notify: 1,
        notes: { firebase_uid: uid, product: "kharchee_pro", plan_key: plan },
      });
      await db.collection("billingSubscriptions").doc(subscription.id).set({
        uid, subscriptionId: subscription.id, planKey: plan, planId: planConfig.planId, status: "created",
        amountPaise: planConfig.amountPaise, createdAt: FieldValue.serverTimestamp(),
      });
      await db.collection("users").doc(uid).collection("billing").doc("current").set({
        uid, subscriptionId: subscription.id, planKey: plan, status: "created", amountPaise: planConfig.amountPaise,
        updatedAt: FieldValue.serverTimestamp(),
      });
      res.status(201).json({ keyId: credentials.keyId, subscriptionId: subscription.id, plan, amountPaise: planConfig.amountPaise, label: planConfig.label });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start checkout.";
      const status = message.includes("Sign in") ? 401 : message.includes("not configured") ? 503 : 400;
      res.status(status).json({ error: status === 503 ? "Pro billing is not configured yet. Please try again later." : message });
    }
  });

  app.post("/api/billing/verify", async (req: Request, res: Response) => {
    try {
      const uid = await verifyBillingUser(req);
      const paymentId = String(req.body?.razorpay_payment_id || "");
      const subscriptionId = String(req.body?.razorpay_subscription_id || "");
      const signature = String(req.body?.razorpay_signature || "");
      if (!paymentId || !subscriptionId || !signature) { res.status(400).json({ error: "Payment confirmation details are incomplete." }); return; }
      const credentials = getRazorpayConfig();
      const { db } = getBillingServices();
      const subscriptionRef = db.collection("billingSubscriptions").doc(subscriptionId);
      const stored = await subscriptionRef.get();
      if (!stored.exists || stored.data()?.uid !== uid) { res.status(403).json({ error: "This subscription does not belong to the signed-in account." }); return; }
      if (!secureSignatureMatches(paymentId + "|" + subscriptionId, signature, credentials.keySecret)) { res.status(400).json({ error: "Payment signature verification failed." }); return; }
      const remote = await razorpayApi<RazorpaySubscription>("subscriptions/" + encodeURIComponent(subscriptionId), "GET");
      const record = stored.data()!;
      const plan = record.planKey as BillingPlanKey;
      const expectedPlan = getPlanConfig(plan);
      if (remote.id !== subscriptionId || remote.plan_id !== expectedPlan.planId || remote.notes?.firebase_uid !== uid) {
        res.status(400).json({ error: "The verified subscription does not match this account or plan." }); return;
      }
      if (!["authenticated", "active"].includes(remote.status)) {
        res.status(409).json({ error: "Payment is awaiting subscription activation. Please check again shortly.", pending: true }); return;
      }
      const periodEnd = remote.current_end ? remote.current_end * 1000 : Date.now() + expectedPlan.periodMs;
      const billingState = {
        uid, subscriptionId, planKey: plan, status: remote.status, paymentId, currentPeriodEnd: periodEnd,
        amountPaise: expectedPlan.amountPaise, verifiedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      };
      await Promise.all([
        subscriptionRef.set(billingState, { merge: true }),
        db.collection("users").doc(uid).collection("billing").doc("current").set(billingState, { merge: true }),
      ]);
      res.status(200).json({ active: true, plan, currentPeriodEnd: periodEnd });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment verification failed.";
      const status = message.includes("Sign in") ? 401 : message.includes("not configured") ? 503 : 400;
      res.status(status).json({ error: status === 503 ? "Pro billing is not configured yet." : message });
    }
  });

  app.post("/api/billing/cancel", async (req: Request, res: Response) => {
    try {
      const uid = await verifyBillingUser(req);
      const { db } = getBillingServices();
      const currentRef = db.collection("users").doc(uid).collection("billing").doc("current");
      const current = await currentRef.get();
      const currentData = current.data();
      const subscriptionId = String(currentData?.subscriptionId || "");
      if (!subscriptionId) {
        res.status(404).json({ error: "No Pro subscription was found for this account." });
        return;
      }
      const subscriptionRef = db.collection("billingSubscriptions").doc(subscriptionId);
      const stored = await subscriptionRef.get();
      if (!stored.exists || stored.data()?.uid !== uid) {
        res.status(403).json({ error: "This subscription does not belong to the signed-in account." });
        return;
      }
      const remote = await razorpayApi<RazorpaySubscription>("subscriptions/" + encodeURIComponent(subscriptionId) + "/cancel", "POST", { cancel_at_cycle_end: true });
      const periodEnd = remote.current_end ? remote.current_end * 1000 : Number(currentData?.currentPeriodEnd || 0);
      const state = {
        uid, subscriptionId, planKey: currentData?.planKey || stored.data()?.planKey || null,
        status: remote.status || "cancelled", currentPeriodEnd: periodEnd || null,
        updatedAt: FieldValue.serverTimestamp(),
      };
      await Promise.all([
        subscriptionRef.set(state, { merge: true }),
        currentRef.set(state, { merge: true }),
      ]);
      res.status(200).json({
        cancelled: true,
        active: periodEnd > Date.now(),
        currentPeriodEnd: periodEnd || null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not cancel subscription.";
      const status = message.includes("Sign in") ? 401 : message.includes("not configured") ? 503 : 400;
      res.status(status).json({ error: status === 503 ? "Subscription management is not configured yet." : message });
    }
  });

  app.get("/api/billing/status", async (req: Request, res: Response) => {
    try {
      const uid = await verifyBillingUser(req);
      const { db } = getBillingServices();
      const snapshot = await db.collection("users").doc(uid).collection("billing").doc("current").get();
      const record = snapshot.data();
      if (!record) { res.status(200).json({ active: false, plan: null }); return; }
      const periodEnd = Number(record.currentPeriodEnd || 0);
      const active = (["authenticated", "active"].includes(String(record.status)) || (String(record.status) === "cancelled" && periodEnd > Date.now())) && (!periodEnd || periodEnd > Date.now());
      res.status(200).json({ active, plan: active ? record.planKey || null : null, currentPeriodEnd: periodEnd || null, status: record.status || "inactive" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read subscription status.";
      const status = message.includes("Sign in") ? 401 : 503;
      res.status(status).json({ error: status === 401 ? message : "Subscription status is temporarily unavailable." });
    }
  });

  app.post("/api/billing/webhook", express.raw({ type: "application/json", limit: "256kb" }), async (req: Request, res: Response) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) { res.status(503).send("Webhook secret is not configured."); return; }
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    const suppliedSignature = String(req.header("x-razorpay-signature") || "");
    const expectedBuffer = Buffer.from(createHmac("sha256", webhookSecret).update(rawBody).digest("hex"), "utf8");
    const suppliedBuffer = Buffer.from(suppliedSignature, "utf8");
    if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) { res.status(400).send("Invalid webhook signature."); return; }
    try {
      const event = JSON.parse(rawBody.toString("utf8")) as {
        event?: string;
        payload?: { subscription?: { entity?: RazorpaySubscription }; payment?: { entity?: { subscription_id?: string } } };
      };
      const subscription = event.payload?.subscription?.entity;
      const subscriptionId = subscription?.id || event.payload?.payment?.entity?.subscription_id;
      if (!subscriptionId) { res.status(200).json({ received: true, ignored: true }); return; }
      const { db } = getBillingServices();
      const subscriptionRef = db.collection("billingSubscriptions").doc(subscriptionId);
      const stored = await subscriptionRef.get();
      if (!stored.exists) { res.status(200).json({ received: true, ignored: true }); return; }
      const uid = String(stored.data()?.uid || "");
      const eventId = req.header("x-razorpay-event-id") || "";
      if (eventId) {
        const eventRef = db.collection("billingWebhookEvents").doc(eventId);
        if ((await eventRef.get()).exists) { res.status(200).json({ received: true, duplicate: true }); return; }
        await eventRef.set({ event: event.event || "unknown", receivedAt: FieldValue.serverTimestamp() });
      }
      const eventName = String(event.event || "");
      const remoteStatus = String(subscription?.status || "");
      const activeEvent = ["subscription.authenticated", "subscription.activated", "subscription.charged"].includes(eventName);
      const inactiveEvent = ["subscription.cancelled", "subscription.halted", "subscription.completed", "subscription.expired"].includes(eventName);
      if (activeEvent || inactiveEvent) {
        const status = activeEvent ? (remoteStatus || "active") : (remoteStatus || eventName.split(".")[1] || "inactive");
        const periodEnd = subscription?.current_end ? subscription.current_end * 1000 : Number(stored.data()?.currentPeriodEnd || 0);
        const state = { uid, subscriptionId, status, currentPeriodEnd: periodEnd || null, updatedAt: FieldValue.serverTimestamp() };
        await Promise.all([
          subscriptionRef.set(state, { merge: true }),
          db.collection("users").doc(uid).collection("billing").doc("current").set(state, { merge: true }),
        ]);
      }
      res.status(200).json({ received: true });
    } catch {
      res.status(500).send("Webhook processing failed.");
    }
  });


  // Real-Time Streaming Endpoint (SSE)
  app.post("/api/jarvis/stream", async (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const { prompt, message, query, snapshot, mode, history } = req.body as {
      prompt?: string;
      message?: string;
      query?: string;
      snapshot?: FinancialSnapshot;
      mode?: "roast" | "advice";
      history?: ClientChatMessage[];
    };

    const userPrompt = String(prompt || message || query || "Protocol Status, Sir")
      .trim()
      .slice(0, 1000);
    const preDetectedAction = extractIntentAction(userPrompt);

    if (process.env.OPENAI_API_KEY?.trim()) {
      try {
        const reply = await getOpenAIJarvisReply(userPrompt, snapshot, mode, history);
        const text = reply || buildDynamicJarvisReply(userPrompt, snapshot, preDetectedAction);
        if (preDetectedAction) res.write(`data: ${JSON.stringify({ type: "action", action: preDetectedAction })}\n\n`);
        for (let offset = 0; offset < text.length; offset += 42) {
          const piece = text.slice(offset, offset + 42);
          res.write(`data: ${JSON.stringify({ type: "chunk", text: piece })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ type: "done", fullText: text, source: "openai-gpt-4o" })}\n\n`);
        res.end();
      } catch {
        const message = "Jarvis couldn’t connect to GPT-4o. Check the server’s OPENAI_API_KEY and API access.";
        res.write(`data: ${JSON.stringify({ type: "chunk", text: message })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done", fullText: message, source: "openai-error" })}\n\n`);
        res.end();
      }
      return;
    }

    const ai = getGenAIClient();
    if (!ai) {
      const fallbackText = buildDynamicJarvisReply(userPrompt, snapshot, preDetectedAction);
      const words = fallbackText.split(" ");
      for (let i = 0; i < words.length; i++) {
        const piece = (i === 0 ? "" : " ") + words[i];
        res.write(`data: ${JSON.stringify({ type: "chunk", text: piece })}\n\n`);
      }
      if (preDetectedAction) {
        res.write(`data: ${JSON.stringify({ type: "action", action: preDetectedAction })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: "done", fullText: fallbackText })}\n\n`);
      res.end();
      return;
    }

    let streamClosed = false;
    let firstChunkSent = false;

    const sendFallbackStreamAndClose = () => {
      if (streamClosed || firstChunkSent) return;
      streamClosed = true;
      const spent = snapshot?.todaySpent ?? 0;
      const limit = snapshot?.dailyLimit ?? 1000;
      const fallbackText = preDetectedAction
        ? buildDynamicJarvisReply(userPrompt, snapshot, preDetectedAction)
        : `Apologies Sir, neural uplink experienced turbulence. However, your telemetry stands: ₹${spent} deployed out of ₹${limit}. Let's keep a tight leash on non-essentials.`;
      res.write(`data: ${JSON.stringify({ type: "chunk", text: fallbackText })}\n\n`);
      if (preDetectedAction) {
        res.write(`data: ${JSON.stringify({ type: "action", action: preDetectedAction })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: "done", fullText: fallbackText })}\n\n`);
      res.end();
    };

    // Gemini can take several seconds to start streaming; do not replace valid answers
    // with the same canned fallback after only 2.6 seconds.
    const serverWatchdog = setTimeout(sendFallbackStreamAndClose, 20000);

    try {
      const { systemInstruction, turns, tools } = buildGeminiPayload(
        userPrompt,
        snapshot,
        mode,
        history
      );

      const stream = await ai.models.generateContentStream({
        model: GEMINI_TEXT_MODEL,
        contents: turns,
        config: {
          systemInstruction,
          temperature: 0.75,
          tools,
        },
      });

      let fullText = "";
      let toolAction = preDetectedAction;

      for await (const chunk of stream) {
        if (streamClosed) break;

        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          for (const call of chunk.functionCalls) {
            if (call.name === "addExpense") {
              const args = call.args as { title?: string; amount?: number; category?: string };
              const cleanTitle = typeof args.title === "string" ? args.title.trim().slice(0, 80) : "";
              if (cleanTitle && isValidExpenseAmount(args.amount)) {
                toolAction = {
                  type: "ADD_EXPENSE",
                  payload: {
                    title: cleanTitle,
                    amount: Number(args.amount),
                    category: args.category || categorizeExpense(cleanTitle),
                  },
                };
              }
            } else if (call.name === "setEmergencyLockdown") {
              const args = call.args as { active?: boolean };
              toolAction = {
                type: "SET_LOCKDOWN",
                payload: { active: Boolean(args.active) },
              };
            } else if (call.name === "setDailyLimit") {
              const args = call.args as { limit?: number };
              if (isValidDailyLimit(args.limit)) {
                toolAction = {
                  type: "SET_DAILY_LIMIT",
                  payload: { limit: Number(args.limit) },
                };
              }
            } else if (call.name === "addKhataEntry") {
              const args = call.args as {
                friendName?: string;
                amount?: number;
                description?: string;
              };
              const cleanFriend =
                typeof args.friendName === "string" ? args.friendName.trim().slice(0, 60) : "";
              if (cleanFriend && isValidKhataAmount(args.amount)) {
                toolAction = {
                  type: "ADD_KHATA",
                  payload: {
                    friendName: cleanFriend,
                    amount: Number(args.amount),
                    description:
                      typeof args.description === "string" && args.description.trim()
                        ? args.description.trim().slice(0, 100)
                        : "Shared Expense",
                  },
                };
              }
            }
          }
        }

        if (chunk.text) {
          if (!firstChunkSent) {
            firstChunkSent = true;
            clearTimeout(serverWatchdog);
          }
          fullText += chunk.text;
          res.write(`data: ${JSON.stringify({ type: "chunk", text: chunk.text })}\n\n`);
        }
      }

      clearTimeout(serverWatchdog);
      if (streamClosed) return;
      streamClosed = true;

      if (!fullText.trim()) {
        if (toolAction?.type === "ADD_EXPENSE") {
          fullText = `Logged ₹${toolAction.payload.amount} for ${toolAction.payload.title}, Sir. Quota updated. Anything else for your ledger?`;
        } else if (toolAction?.type === "ADD_KHATA") {
          const absAmt = Math.abs(toolAction.payload.amount);
          fullText =
            toolAction.payload.amount >= 0
              ? `Dosto Ka Khata updated, Sir! Logged that ${toolAction.payload.friendName} owes you ₹${absAmt} for ${toolAction.payload.description}.`
              : `Dosto Ka Khata updated, Sir! Logged ₹${absAmt} payable to ${toolAction.payload.friendName} for ${toolAction.payload.description}.`;
        } else if (toolAction?.type === "SET_LOCKDOWN") {
          fullText = toolAction.payload.active
            ? "Emergency Lockdown activated, Sir. Spending freeze engaged across your perimeter."
            : "Lockdown lifted, Sir. Normal operational parameters restored.";
        } else if (toolAction?.type === "SET_DAILY_LIMIT") {
          fullText = `Daily limit updated to ₹${toolAction.payload.limit}, Sir. Perimeter recalibrated.`;
        } else {
          fullText = buildDynamicJarvisReply(userPrompt, snapshot, toolAction);
        }
        res.write(`data: ${JSON.stringify({ type: "chunk", text: fullText })}\n\n`);
      }

      if (toolAction) {
        res.write(`data: ${JSON.stringify({ type: "action", action: toolAction })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: "done", fullText })}\n\n`);
      res.end();
    } catch {
      clearTimeout(serverWatchdog);
      sendFallbackStreamAndClose();
    }
  });

  // Standard JSON Ask Jarvis endpoint (Gemini Flash with function calling & action execution)
  const handleJarvisAsk = async (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    const { prompt, message, query, snapshot, mode, history } = req.body as {
      prompt?: string;
      message?: string;
      query?: string;
      snapshot?: FinancialSnapshot;
      mode?: "roast" | "advice";
      history?: ClientChatMessage[];
    };

    const userPrompt = String(prompt || message || query || "Protocol Status, Sir")
      .trim()
      .slice(0, 1000);
    const preDetectedAction = extractIntentAction(userPrompt);

    if (process.env.OPENAI_API_KEY?.trim()) {
      try {
        const reply = await getOpenAIJarvisReply(userPrompt, snapshot, mode, history);
        const text = reply || buildDynamicJarvisReply(userPrompt, snapshot, preDetectedAction);
        res.status(200).json({ response: text, reply: text, action: preDetectedAction, source: "openai-gpt-4o" });
      } catch {
        const message = "Jarvis couldn’t connect to GPT-4o. Check the server’s OPENAI_API_KEY and API access.";
        res.status(503).json({ response: message, reply: message, action: null, source: "openai-error" });
      }
      return;
    }

    const ai = getGenAIClient();
    if (!ai) {
      const reply = buildDynamicJarvisReply(userPrompt, snapshot, preDetectedAction);
      res.status(200).json({
        response: reply,
        reply,
        action: preDetectedAction,
        source: "fallback",
      });
      return;
    }

    try {
      const { systemInstruction, turns, tools } = buildGeminiPayload(
        userPrompt,
        snapshot,
        mode,
        history
      );

      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: turns,
        config: {
          systemInstruction,
          temperature: 0.85,
          tools,
        },
      });

      let toolAction = preDetectedAction;
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === "addExpense") {
            const args = call.args as { title?: string; amount?: number; category?: string };
            const cleanTitle = typeof args.title === "string" ? args.title.trim().slice(0, 80) : "";
            if (cleanTitle && isValidExpenseAmount(args.amount)) {
              toolAction = {
                type: "ADD_EXPENSE",
                payload: {
                  title: cleanTitle,
                  amount: Number(args.amount),
                  category: args.category || categorizeExpense(cleanTitle),
                },
              };
            }
          } else if (call.name === "setEmergencyLockdown") {
            const args = call.args as { active?: boolean };
            toolAction = {
              type: "SET_LOCKDOWN",
              payload: { active: Boolean(args.active) },
            };
          } else if (call.name === "setDailyLimit") {
            const args = call.args as { limit?: number };
            if (isValidDailyLimit(args.limit)) {
              toolAction = {
                type: "SET_DAILY_LIMIT",
                payload: { limit: Number(args.limit) },
              };
            }
          } else if (call.name === "addKhataEntry") {
            const args = call.args as {
              friendName?: string;
              amount?: number;
              description?: string;
            };
            const cleanFriend =
              typeof args.friendName === "string" ? args.friendName.trim().slice(0, 60) : "";
            if (cleanFriend && isValidKhataAmount(args.amount)) {
              toolAction = {
                type: "ADD_KHATA",
                payload: {
                  friendName: cleanFriend,
                  amount: Number(args.amount),
                  description:
                    typeof args.description === "string" && args.description.trim()
                      ? args.description.trim().slice(0, 100)
                      : "Shared Expense",
                },
              };
            }
          }
        }
      }

      let replyText = response.text?.trim() || "";
      if (!replyText) {
        if (toolAction?.type === "ADD_EXPENSE") {
          replyText = `Logged ₹${toolAction.payload.amount} for ${toolAction.payload.title}, Sir. Quota updated. Anything else for your ledger?`;
        } else if (toolAction?.type === "ADD_KHATA") {
          const absAmt = Math.abs(toolAction.payload.amount);
          replyText =
            toolAction.payload.amount >= 0
              ? `Dosto Ka Khata updated, Sir! Logged that ${toolAction.payload.friendName} owes you ₹${absAmt} for ${toolAction.payload.description}.`
              : `Dosto Ka Khata updated, Sir! Logged ₹${absAmt} payable to ${toolAction.payload.friendName} for ${toolAction.payload.description}.`;
        } else if (toolAction?.type === "SET_LOCKDOWN") {
          replyText = toolAction.payload.active
            ? "Emergency Lockdown activated, Sir. Spending freeze engaged across your perimeter."
            : "Lockdown lifted, Sir. Normal operational parameters restored.";
        } else if (toolAction?.type === "SET_DAILY_LIMIT") {
          replyText = `Daily limit updated to ₹${toolAction.payload.limit}, Sir. Perimeter recalibrated.`;
        } else {
          replyText = buildDynamicJarvisReply(userPrompt, snapshot, toolAction);
        }
      }

      res.status(200).json({
        response: replyText,
        reply: replyText,
        action: toolAction,
        source: "gemini",
      });
    } catch {
      const fallback = buildDynamicJarvisReply(userPrompt, snapshot, preDetectedAction);
      res.status(200).json({
        response: fallback,
        reply: fallback,
        action: preDetectedAction,
        source: "fallback",
      });
    }
  };

  app.post("/api/jarvis/ask", handleJarvisAsk);
  app.post("/api/jarvis", handleJarvisAsk);
  app.post("/api/chat", handleJarvisAsk);

  // Jarvis Text-to-Speech endpoint
  app.post("/api/jarvis/tts", async (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== "string" || !text.trim()) {
      res.status(400).json({ error: "Text is required for speech synthesis." });
      return;
    }

    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json({ error: "Gemini API key not configured; using browser speech synthesis fallback." });
      return;
    }

    try {
      const cleanText = text.replace(/[*#_`~]/g, "").slice(0, 500);
      const response = await ai.models.generateContent({
        model: GEMINI_TTS_MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: cleanText }],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Puck" },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({ error: "Speech synthesis temporarily unavailable." });
        return;
      }

      res.status(200).json({ audioBase64: base64Audio, mimeType: "audio/wav" });
    } catch {
      res.status(502).json({ error: "Speech synthesis temporarily unavailable." });
    }
  });

  // Receipt / Bill OCR Scanner Endpoint (8MB scoped JSON body limit)
  app.post("/api/ocr/receipt", ocrReceiptJsonParser, async (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    const { imageBase64, mimeType } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      fileName?: string;
    };

    if (!imageBase64) {
      res.status(400).json({
        error: "Receipt scan unreadable or API key missing. Please enter manually.",
      });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
    const resolvedMimeType = mimeType || "image/jpeg";

    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json({
        error: "Receipt scan unreadable or API key missing. Please enter manually.",
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: resolvedMimeType,
                data: cleanBase64,
              },
            },
            {
              text: `Analyze this receipt, bill, or payment screenshot. Extract:
1. vendor: The merchant, restaurant, store, or recipient name (e.g. "Swiggy", "Starbucks", "Reliance Fresh", "Indian Oil"). If unreadable, return empty string "".
2. amount: The final total amount paid in numbers (INR). If multiple numbers exist, pick the Grand Total / Net Payable. If unreadable or no valid total exists, return 0.
3. category: Must be exactly one of: "Food", "Chai & Snacks", "Transport", "Grocery", "Entertainment", "Bills", "Shopping".
4. paymentMode: Must be exactly one of: "UPI", "Card", "Cash".
5. itemsSummary: Brief 1-line summary of items on the bill.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vendor: {
                type: Type.STRING,
                description: "Merchant or vendor name from the receipt",
              },
              amount: {
                type: Type.NUMBER,
                description: "Total bill amount in Rupees",
              },
              category: {
                type: Type.STRING,
                description:
                  "One of: Food, Chai & Snacks, Transport, Grocery, Entertainment, Bills, Shopping",
              },
              paymentMode: {
                type: Type.STRING,
                description: "One of: UPI, Card, Cash",
              },
              itemsSummary: {
                type: Type.STRING,
                description: "Short summary of billed items",
              },
            },
            required: ["vendor", "amount", "category", "paymentMode"],
          },
        },
      });

      const rawText = response.text?.trim() || "{}";
      const parsed = JSON.parse(rawText) as {
        vendor?: string;
        amount?: number;
        category?: string;
        paymentMode?: string;
        itemsSummary?: string;
      };

      const cleanVendor = (parsed.vendor || "").trim();
      const numericAmount = Math.round(Number(parsed.amount));

      if (!cleanVendor || Number.isNaN(numericAmount) || numericAmount <= 0) {
        res.status(422).json({
          error: "Receipt scan unreadable or API key missing. Please enter manually.",
        });
        return;
      }

      const validCategories = [
        "Food",
        "Chai & Snacks",
        "Transport",
        "Grocery",
        "Entertainment",
        "Bills",
        "Shopping",
      ];
      const normalizedCategory = validCategories.includes(parsed.category || "")
        ? parsed.category!
        : categorizeExpense(cleanVendor);

      const validModes = ["UPI", "Card", "Cash"];
      const normalizedMode = validModes.includes(parsed.paymentMode || "")
        ? parsed.paymentMode!
        : "UPI";

      res.status(200).json({
        vendor: cleanVendor,
        amount: numericAmount,
        category: normalizedCategory,
        paymentMode: normalizedMode,
        itemsSummary: parsed.itemsSummary || "Scanned via Gemini Vision OCR",
        source: "gemini",
      });
    } catch {
      res.status(422).json({
        error: "Receipt scan unreadable or API key missing. Please enter manually.",
      });
    }
  });

  // Dedicated API Catch-All: Never allow any /api/* request to fall through to Vite HTML
  app.all("/api/*", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    const defaultReply = buildDynamicJarvisReply("status");
    res.status(404).json({
      response: defaultReply,
      reply: defaultReply,
      error: "API endpoint not found",
    });
  });

  const distPath = path.resolve(__dirname, "dist");
  const distIndexHtml = path.join(distPath, "index.html");
  const isProdEnv = process.env.NODE_ENV === "production";

  if (isProdEnv && fs.existsSync(distIndexHtml)) {
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      if (fs.existsSync(distIndexHtml)) {
        res.sendFile(distIndexHtml);
      } else {
        res.sendFile(path.resolve(__dirname, "index.html"));
      }
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`KHARCHE server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
