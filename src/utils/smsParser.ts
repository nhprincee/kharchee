import type { ExpenseCategory, PaymentMode } from "../types";

export interface ParsedTransaction {
  rawText: string;
  amount: number | null;
  merchant: string;
  category: ExpenseCategory;
  paymentMode: PaymentMode;
  date?: string;
  confidence: "high" | "medium" | "low";
}

// Category keyword mappings for Indian merchant ecosystems
const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  Food: [
    "swiggy",
    "zomato",
    "eatclub",
    "mcdonald",
    "burger",
    "pizza",
    "domino",
    "kfc",
    "biryani",
    "behrouz",
    "faasos",
    "subway",
    "haldiram",
    "barbeque",
    "bikanervala",
    "restaurant",
    "dhaba",
    "cafe",
    "dining",
    "eats",
    "kitchen",
    "bhojanalaya",
  ],
  "Chai & Snacks": [
    "chai",
    "tea",
    "coffee",
    "starbucks",
    "blue tokai",
    "chaayos",
    "chai point",
    "tapri",
    "bakery",
    "cake",
    "cappuccino",
    "espresso",
    "samosa",
    "kachori",
    "snack",
    "juice",
    "sweet",
    "mithai",
  ],
  Transport: [
    "uber",
    "ola",
    "rapido",
    "metro",
    "auto",
    "cab",
    "petrol",
    "diesel",
    "fuel",
    "shell",
    "hpcl",
    "iocl",
    "bpcl",
    "fastag",
    "toll",
    "parking",
    "irctc",
    "railway",
    "flight",
    "indigo",
    "air india",
  ],
  Grocery: [
    "blinkit",
    "zepto",
    "instamart",
    "bigbasket",
    "bb daily",
    "dmart",
    "supermarket",
    "kirana",
    "grocery",
    "vegetable",
    "fruit",
    "milk",
    "amul",
    "mother dairy",
    "spencer",
    "reliance fresh",
    "nature basket",
  ],
  Entertainment: [
    "bookmyshow",
    "pvr",
    "inox",
    "cinepolis",
    "cinema",
    "movie",
    "netflix",
    "prime",
    "hotstar",
    "spotify",
    "youtube",
    "sonyliv",
    "zee5",
    "playstation",
    "steam",
    "turf",
    "gaming",
  ],
  Bills: [
    "electricity",
    "power",
    "bescom",
    "adani",
    "tata power",
    "water",
    "gas",
    "indane",
    "bharat gas",
    "hp gas",
    "airtel",
    "jio",
    "vodafone",
    "vi",
    "bsnl",
    "broadband",
    "wifi",
    "recharge",
    "maintenance",
    "rent",
    "lic",
    "insurance",
  ],
  Shopping: [
    "amazon",
    "flipkart",
    "myntra",
    "ajio",
    "tatacliq",
    "meesho",
    "nykaa",
    "zara",
    "h&m",
    "uniqlo",
    "decathlon",
    "croma",
    "vijay sales",
    "retail",
    "store",
    "mall",
    "clothing",
  ],
};

/**
 * Extracts amount, merchant, category, and payment mode from Indian bank/UPI SMS strings.
 */
export function parseBankSms(text: string): ParsedTransaction | null {
  if (!text || text.trim().length === 0) return null;

  const normalized = text.trim();
  const lower = normalized.toLowerCase();

  // 1. Amount Extraction
  // Patterns like:
  // "debited by Rs 250.00"
  // "debited by INR 250"
  // "spent Rs. 120"
  // "paid Rs 40"
  // "Rs. 240.00 debited"
  // "INR 500 spent"
  // "VPA xxx paid Rs 40"
  let amount: number | null = null;

  const amountRegexes = [
    // debited by / spent / paid ... Rs./INR 120.50
    /(?:debited(?:\s+by)?|spent|paid|transferred|deducted)\s*(?:of)?\s*(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    // Rs./INR 120.50 ... debited / spent / paid
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:is|was)?\s*(?:debited|spent|paid|deducted)/i,
    // VPA ... paid Rs 40
    /paid\s+(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    // General fallback: first occurrence of Rs./INR/₹ with digits
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const regex of amountRegexes) {
    const match = normalized.match(regex);
    if (match && match[1]) {
      const cleaned = match[1].replace(/,/g, "");
      const val = parseFloat(cleaned);
      if (!isNaN(val) && val > 0) {
        amount = Math.round(val);
        break;
      }
    }
  }

  // 2. Merchant / Beneficiary Extraction
  let merchant = "";

  // Common Indian SMS patterns:
  // "to SWIGGY"
  // "at PETROL PUMP"
  // "to VPA swiggy@icici"
  // "info/SWIGGY/..."
  // "transfer to BLUE TOKAI"
  // "paid to Chai Point"
  const merchantPatterns = [
    /(?:to|at|towards|transfer\s+to|paid\s+to)\s+(?:vpa\s+)?([A-Za-z0-9&.\-_ ]+?)(?:\s+(?:on|ref|via|using|avl|bal|upi|thru|from|\.|\,)|$)/i,
    /(?:info|trf\s+to|neft|imps)\/([A-Za-z0-9&.\-_ ]+?)(?:\/|\s|$)/i,
    /at\s+([A-Za-z0-9&.\-_ ]+?)(?:\s+on|\s+dated|\.|\,|$)/i,
  ];

  for (const pattern of merchantPatterns) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Filter out generic noise words
      if (
        candidate &&
        !candidate.toLowerCase().startsWith("vpa") &&
        !candidate.toLowerCase().includes("a/c") &&
        !candidate.toLowerCase().includes("account") &&
        candidate.length > 1
      ) {
        merchant = candidate;
        break;
      }
    }
  }

  // Fallback: If no explicit merchant matched, scan for known brand keywords
  if (!merchant) {
    for (const [_, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          merchant = kw.charAt(0).toUpperCase() + kw.slice(1);
          break;
        }
      }
      if (merchant) break;
    }
  }

  // Clean up merchant name
  if (merchant) {
    // Cut off trailing reference numbers or punctuation
    merchant = merchant
      .replace(/\b(ref|upi|refno|txn|rrn|val|bal|a\/c)\b.*$/i, "")
      .replace(/[.,\-_/]+$/, "")
      .trim();
    // Uppercase first letter of each word
    merchant = merchant
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  if (!merchant) {
    merchant = "UPI Transaction";
  }

  // 3. Category Detection
  let category: ExpenseCategory = "Food"; // sensible default in daily spending
  let matchedCategory = false;

  const targetSearch = `${merchant.toLowerCase()} ${lower}`;
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (targetSearch.includes(kw)) {
        category = catName as ExpenseCategory;
        matchedCategory = true;
        break;
      }
    }
    if (matchedCategory) break;
  }

  // 4. Payment Mode Detection
  let paymentMode: PaymentMode = "UPI";
  if (lower.includes("card") || lower.includes("pos") || lower.includes("credit card") || lower.includes("debit card")) {
    paymentMode = "Card";
  } else if (lower.includes("cash") || lower.includes("atm withdrawal")) {
    paymentMode = "Cash";
  } else {
    paymentMode = "UPI";
  }

  // 5. Confidence
  let confidence: "high" | "medium" | "low" = "medium";
  if (amount && matchedCategory && merchant !== "UPI Transaction") {
    confidence = "high";
  } else if (!amount) {
    confidence = "low";
  }

  return {
    rawText: normalized,
    amount,
    merchant,
    category,
    paymentMode,
    confidence,
  };
}

/**
 * Curated preset samples for quick 1-tap testing
 */
export const SAMPLE_BANK_SMS = [
  {
    label: "Swiggy Food",
    sms: "Alert: Rs. 249.00 debited from A/C **4582 on 24-OCT-24 to SWIGGY. Ref: UPI/429810394. Avl Bal: Rs 12,450.00 - HDFC Bank",
  },
  {
    label: "HP Petrol Pump",
    sms: "Your A/C ending 3012 is debited by INR 150.00 on 24Oct24 spent at HP PETROL PUMP via UPI. - SBI",
  },
  {
    label: "Tapri Chai",
    sms: "Paid Rs 40 to Sharma Chai Point via PhonePe (UPI Ref: 429104882193) on 24-10-2024.",
  },
  {
    label: "Zepto Grocery",
    sms: "ICICI Bank: INR 315.00 debited from Account **9102 towards ZEPTO GROCERY. Avl Bal: INR 8,920.00.",
  },
  {
    label: "PVR Cinemas",
    sms: "Axis Bank: INR 450.00 spent on your Card ending 1289 at PVR CINEMAS on 24-Oct-24 19:30:15.",
  },
];

export interface DetectedClipboardTx {
  amount: number;
  vendor: string;
  category: ExpenseCategory;
  paymentMode: PaymentMode;
  raw: string;
}

/**
 * Global smart auto-detection function for clipboard & focus events.
 * Specifically applies standard Indian bank/UPI patterns:
 * - /debited by (?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/i
 * - /(?:paid|spent|transferred)\s*(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/i
 * - /(?:to|at|vpa)\s+([A-Za-z0-9\s._-]+)/i
 */
export function detectClipboardTransaction(text: string): DetectedClipboardTx | null {
  if (!text || text.trim().length < 8) return null;
  const normalized = text.trim();

  // Pattern 1: debited by Rs/INR
  const debitedMatch = normalized.match(/debited by (?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/i);
  // Pattern 2: paid/spent/transferred Rs/INR
  const paidMatch = normalized.match(/(?:paid|spent|transferred)\s*(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/i);
  // Additional common pattern: Rs/INR ... debited/spent/paid
  const altMatch = normalized.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d+)?)\s*(?:debited|spent|paid)/i);

  const matchedAmountStr = debitedMatch?.[1] || paidMatch?.[1] || altMatch?.[1];

  // If no direct regex match, test if parseBankSms extracts a debit/spent/paid txn
  if (!matchedAmountStr) {
    const isDebitContext =
      /(?:debit|spent|paid|transferred|deducted)/i.test(normalized) &&
      !/(?:credited|received|refund)/i.test(normalized);
    if (!isDebitContext) return null;

    const parsed = parseBankSms(normalized);
    if (parsed && parsed.amount && parsed.amount > 0) {
      return {
        amount: parsed.amount,
        vendor: parsed.merchant || "UPI Transaction",
        category: parsed.category,
        paymentMode: parsed.paymentMode,
        raw: normalized,
      };
    }
    return null;
  }

  const numeric = parseFloat(matchedAmountStr.replace(/,/g, ""));
  if (isNaN(numeric) || numeric <= 0) return null;

  // Pattern 3: to/at/vpa vendor extraction
  const vendorMatch = normalized.match(/(?:to|at|vpa)\s+([A-Za-z0-9\s._-]+)/i);
  let rawVendor = vendorMatch?.[1]?.trim() || "";

  // Clean vendor from noise
  if (rawVendor) {
    rawVendor = rawVendor
      .replace(/\b(ref|upi|refno|txn|rrn|val|bal|avl|on|dated|using|a\/c)\b.*$/i, "")
      .replace(/[.,\-_/]+$/, "")
      .trim();
  }

  const fullParsed = parseBankSms(normalized);
  const finalVendor =
    rawVendor && !rawVendor.toLowerCase().startsWith("vpa") && !rawVendor.toLowerCase().startsWith("a/c")
      ? rawVendor
      : fullParsed?.merchant || "UPI Vendor";

  const finalCategory = fullParsed?.category || "Food";
  const finalPaymentMode = fullParsed?.paymentMode || "UPI";

  return {
    amount: Math.round(numeric),
    vendor: finalVendor,
    category: finalCategory,
    paymentMode: finalPaymentMode,
    raw: normalized,
  };
}
