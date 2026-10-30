import {
  EXPENSE_ONLY_CATEGORIES,
  INCOME_ONLY_CATEGORIES,
  type CategoryBudgets,
  type Expense,
  type ExpenseCategory,
} from "../types";
import { parseBankSms } from "./smsParser";

export interface SupportedUpiApp {
  packageName: string;
  displayName: string;
  shortCode: string;
  supportNotes: string;
}

/**
 * Explicit allowlist of supported Android UPI payment apps.
 * Only notifications originating from these packages are inspected by the native
 * Android NotificationListenerService. Not every UPI or bank app is supported.
 */
export const SUPPORTED_UPI_APPS: SupportedUpiApp[] = [
  {
    packageName: "com.google.android.apps.nbu.paisa.user",
    displayName: "Google Pay (GPay)",
    shortCode: "GPay",
    supportNotes: "Detects 'Paid ₹X to Merchant' post-payment notifications when GPay notifications are enabled.",
  },
  {
    packageName: "com.phonepe.app",
    displayName: "PhonePe",
    shortCode: "PhonePe",
    supportNotes: "Detects 'Paid ₹X to Merchant' & 'Money sent' debit alerts after transaction completion.",
  },
  {
    packageName: "net.one97.paytm",
    displayName: "Paytm UPI",
    shortCode: "Paytm",
    supportNotes: "Detects 'Paid ₹X at/to Merchant' UPI confirmation notifications.",
  },
  {
    packageName: "in.org.npci.upiapp",
    displayName: "BHIM UPI",
    shortCode: "BHIM",
    supportNotes: "Detects standard NPCI BHIM outbound payment confirmation alerts.",
  },
];

export type AlertToneMode = "hinglish" | "coach" | "strict";
export type AlertThresholdMode = "smart_budget" | "every_spend" | "critical_only";

export interface UpiAccountabilitySettings {
  monitoringEnabled: boolean;
  userConsentGranted: boolean;
  autoLogDetectedPayments: boolean;
  tone: AlertToneMode;
  thresholdMode: AlertThresholdMode;
  dailyWarnPercent: number; // default 75%
  monthlyWarnPercent: number; // default 80%
  repeatCategoryCountTrigger: number; // default 2 (e.g., 2nd chai/snack of the day)
  dedupWindowMinutes: number; // default 5 minutes
}

export const DEFAULT_ACCOUNTABILITY_SETTINGS: UpiAccountabilitySettings = {
  monitoringEnabled: true,
  userConsentGranted: false,
  autoLogDetectedPayments: true,
  tone: "hinglish",
  thresholdMode: "smart_budget",
  dailyWarnPercent: 75,
  monthlyWarnPercent: 80,
  repeatCategoryCountTrigger: 2,
  dedupWindowMinutes: 5,
};

const SETTINGS_STORAGE_KEY = "kharchee_upi_accountability_settings_v1";
const ALERT_HISTORY_STORAGE_KEY = "kharchee_upi_alert_history_v1";
const DEDUP_CACHE_STORAGE_KEY = "kharchee_upi_dedup_fingerprints_v1";

export interface ParsedUpiNotification {
  amount: number;
  merchant: string;
  category: ExpenseCategory;
  appPackage: string;
  appName: string;
  upiRef?: string;
  timestampIso: string;
  confidence: "high" | "medium";
  fingerprint: string;
  sanitizedSummary: string;
}

export interface ParseNotificationRejection {
  rejected: true;
  reason:
    | "empty_or_short"
    | "unsupported_package"
    | "sensitive_otp_or_pin_ignored"
    | "incoming_credit_or_refund"
    | "collect_request_or_promo"
    | "failed_or_pending_payment"
    | "no_valid_debit_amount";
  explanation: string;
}

export type ParseUpiNotificationResult =
  | { rejected: false; parsed: ParsedUpiNotification }
  | ParseNotificationRejection;

export interface BudgetEvaluationSnapshot {
  amount: number;
  merchant: string;
  category: ExpenseCategory;
  todaySpentAfter: number;
  dailyLimit: number;
  dailyRemainingAfter: number;
  dailyUsedPercent: number;
  monthSpentAfter: number;
  monthlyBudget: number;
  monthlyRemainingAfter: number;
  monthlyUsedPercent: number;
  categoryMonthSpentAfter: number;
  categoryBudgetLimit: number;
  categoryRemainingAfter: number | null;
  sameCategoryTodayCount: number;
  shouldWarn: boolean;
  urgency: "info" | "warning" | "breach";
  triggerReason: string;
  headline: string;
  message: string;
}

export interface AccountabilityAlertRecord {
  id: string;
  createdAt: string;
  source: "android_notification_listener" | "manual_parser_test" | "app_expense_entry";
  appName: string;
  fingerprint: string;
  linkedExpenseId?: string;
  dismissed?: boolean;
  markedFalseDetection?: boolean;
  evaluation: BudgetEvaluationSnapshot;
}

// Bridge interface exposed when running inside the Capacitor / Native Android APK
export interface KharcheeNativeAndroidBridge {
  isNativeAndroid?: () => boolean;
  isNotificationAccessGranted?: () => boolean | Promise<boolean>;
  openNotificationAccessSettings?: () => void;
  getSupportedPackages?: () => string[];
}

declare global {
  interface Window {
    KharcheeAndroidBridge?: KharcheeNativeAndroidBridge;
  }
}

export function loadAccountabilitySettings(): UpiAccountabilitySettings {
  if (typeof window === "undefined") return DEFAULT_ACCOUNTABILITY_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_ACCOUNTABILITY_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UpiAccountabilitySettings>;
    return {
      monitoringEnabled:
        typeof parsed.monitoringEnabled === "boolean"
          ? parsed.monitoringEnabled
          : DEFAULT_ACCOUNTABILITY_SETTINGS.monitoringEnabled,
      userConsentGranted:
        typeof parsed.userConsentGranted === "boolean"
          ? parsed.userConsentGranted
          : DEFAULT_ACCOUNTABILITY_SETTINGS.userConsentGranted,
      autoLogDetectedPayments:
        typeof parsed.autoLogDetectedPayments === "boolean"
          ? parsed.autoLogDetectedPayments
          : DEFAULT_ACCOUNTABILITY_SETTINGS.autoLogDetectedPayments,
      tone:
        parsed.tone === "hinglish" || parsed.tone === "coach" || parsed.tone === "strict"
          ? parsed.tone
          : DEFAULT_ACCOUNTABILITY_SETTINGS.tone,
      thresholdMode:
        parsed.thresholdMode === "smart_budget" ||
        parsed.thresholdMode === "every_spend" ||
        parsed.thresholdMode === "critical_only"
          ? parsed.thresholdMode
          : DEFAULT_ACCOUNTABILITY_SETTINGS.thresholdMode,
      dailyWarnPercent:
        typeof parsed.dailyWarnPercent === "number" &&
        parsed.dailyWarnPercent >= 40 &&
        parsed.dailyWarnPercent <= 100
          ? Math.round(parsed.dailyWarnPercent)
          : DEFAULT_ACCOUNTABILITY_SETTINGS.dailyWarnPercent,
      monthlyWarnPercent:
        typeof parsed.monthlyWarnPercent === "number" &&
        parsed.monthlyWarnPercent >= 40 &&
        parsed.monthlyWarnPercent <= 100
          ? Math.round(parsed.monthlyWarnPercent)
          : DEFAULT_ACCOUNTABILITY_SETTINGS.monthlyWarnPercent,
      repeatCategoryCountTrigger:
        typeof parsed.repeatCategoryCountTrigger === "number" &&
        parsed.repeatCategoryCountTrigger >= 2 &&
        parsed.repeatCategoryCountTrigger <= 10
          ? Math.round(parsed.repeatCategoryCountTrigger)
          : DEFAULT_ACCOUNTABILITY_SETTINGS.repeatCategoryCountTrigger,
      dedupWindowMinutes:
        typeof parsed.dedupWindowMinutes === "number" &&
        parsed.dedupWindowMinutes >= 1 &&
        parsed.dedupWindowMinutes <= 60
          ? Math.round(parsed.dedupWindowMinutes)
          : DEFAULT_ACCOUNTABILITY_SETTINGS.dedupWindowMinutes,
    };
  } catch {
    return DEFAULT_ACCOUNTABILITY_SETTINGS;
  }
}

export function saveAccountabilitySettings(settings: UpiAccountabilitySettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function loadAlertHistory(): AccountabilityAlertRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERT_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 40);
  } catch {
    return [];
  }
}

export function saveAlertHistory(records: AccountabilityAlertRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ALERT_HISTORY_STORAGE_KEY, JSON.stringify(records.slice(0, 40)));
}

/**
 * Checks if the app is running inside a native Android WebView with the
 * Kharchee NotificationListenerService bridge registered.
 * Never fakes native support in a standard browser.
 */
export function getRuntimeEnvironmentStatus(): {
  isNativeAndroidBridgePresent: boolean;
  environmentLabel: string;
  canMonitorBackgroundApps: boolean;
} {
  if (typeof window !== "undefined" && window.KharcheeAndroidBridge?.isNativeAndroid?.()) {
    return {
      isNativeAndroidBridgePresent: true,
      environmentLabel: "Native Android APK (NotificationListener Bridge Active)",
      canMonitorBackgroundApps: true,
    };
  }
  return {
    isNativeAndroidBridgePresent: false,
    environmentLabel: "Web / PWA Preview (Browser Sandbox)",
    canMonitorBackgroundApps: false,
  };
}

/**
 * Builds a deterministic fingerprint for deduplication so repeated notifications
 * from the same UPI payment (e.g. GPay summary + update) do not trigger twice.
 */
export function buildTransactionFingerprint(params: {
  amount: number;
  merchant: string;
  upiRef?: string;
  timestampMs?: number;
  windowMinutes?: number;
}): string {
  const cleanRef = (params.upiRef || "").replace(/\W/g, "").toLowerCase();
  if (cleanRef.length >= 8) {
    return `ref:${cleanRef}:${Math.round(params.amount)}`;
  }
  const cleanMerchant = params.merchant
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
  const windowMs = Math.max(1, params.windowMinutes || 5) * 60 * 1000;
  const bucket = Math.floor((params.timestampMs || Date.now()) / windowMs);
  return `tx:${Math.round(params.amount)}:${cleanMerchant || "upi"}:${bucket}`;
}

export function isDuplicateFingerprint(fingerprint: string, windowMinutes = 5): boolean {
  if (typeof window === "undefined") return false;
  try {
    const now = Date.now();
    const ttlMs = Math.max(1, windowMinutes) * 60 * 1000;
    const raw = localStorage.getItem(DEDUP_CACHE_STORAGE_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const lastSeen = map[fingerprint];
    if (typeof lastSeen === "number" && now - lastSeen < ttlMs) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function recordFingerprintSeen(fingerprint: string, windowMinutes = 5): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const ttlMs = Math.max(5, windowMinutes) * 60 * 1000 * 3;
    const raw = localStorage.getItem(DEDUP_CACHE_STORAGE_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const pruned: Record<string, number> = {};
    for (const [k, ts] of Object.entries(map)) {
      if (typeof ts === "number" && now - ts < ttlMs) {
        pruned[k] = ts;
      }
    }
    pruned[fingerprint] = now;
    localStorage.setItem(DEDUP_CACHE_STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // ignore storage errors
  }
}

/**
 * Conservative, privacy-preserving on-device UPI payment notification parser.
 * - Filters out OTPs, PIN prompts, passwords, promotional notifications, collect requests,
 *   failed transactions, and incoming credits.
 * - Extracts only outbound completed payment amount, merchant, and category.
 * - Never transmits raw notification text off-device.
 */
export function parseUpiPaymentNotification(input: {
  title?: string;
  text: string;
  packageName?: string;
  timestampIso?: string;
  dedupWindowMinutes?: number;
  allowManualTestPackage?: boolean;
}): ParseUpiNotificationResult {
  const combinedRaw = `${input.title || ""} ${input.text || ""}`.trim();
  if (!combinedRaw || combinedRaw.length < 6) {
    return {
      rejected: true,
      reason: "empty_or_short",
      explanation: "Notification text is empty or too short to be a transaction alert.",
    };
  }

  // 1. Validate package name if provided
  const pkg = (input.packageName || "manual.test").trim();
  const matchedApp = SUPPORTED_UPI_APPS.find((a) => a.packageName === pkg);
  if (!matchedApp && !input.allowManualTestPackage) {
    return {
      rejected: true,
      reason: "unsupported_package",
      explanation: `Package '${pkg}' is not in the supported UPI payment app allowlist.`,
    };
  }

  const lower = combinedRaw.toLowerCase();

  // 2. Privacy & Security Guard: Immediately discard OTPs, UPI PIN prompts, passwords, CVV
  if (
    /\b(otp|one time password|verification code|upi pin|mpin|enter pin|passcode|password|cvv|secret code|do not share)\b/i.test(
      lower
    )
  ) {
    return {
      rejected: true,
      reason: "sensitive_otp_or_pin_ignored",
      explanation:
        "Ignored sensitive authentication/OTP/PIN message. Kharchee never reads or stores OTPs or PIN prompts.",
    };
  }

  // 3. Ignore Failed / Declined / Pending payments
  if (
    /\b(failed|declined|unsuccessful|could not be processed|pending|expired|cancelled|reversed)\b/i.test(
      lower
    )
  ) {
    return {
      rejected: true,
      reason: "failed_or_pending_payment",
      explanation: "Ignored non-completed (failed, pending, or declined) transaction status.",
    };
  }

  // 4. Ignore Collect Requests, Autopay Mandates, or Promotional messages
  if (
    /\b(requested|collect request|has requested|approve payment|mandate|autopay setup|scratch card|win up to|cashback offer|play now|apply now|loan offer)\b/i.test(
      lower
    )
  ) {
    return {
      rejected: true,
      reason: "collect_request_or_promo",
      explanation: "Ignored payment request or promotional notification (no money was debited).",
    };
  }

  // 5. Ignore Incoming Credits / Refunds (unless it explicitly says 'paid'/'debited'/'sent')
  const hasDebitVerb =
    /\b(paid|sent|debited|spent|transferred|payment of|money sent|paid to)\b/i.test(lower);
  const hasCreditVerb =
    /\b(received|credited|added to|refunded|cashback received|money received)\b/i.test(lower);

  if (hasCreditVerb && !hasDebitVerb) {
    return {
      rejected: true,
      reason: "incoming_credit_or_refund",
      explanation: "Ignored incoming money / credit notification (only outbound spending triggers budget alerts).",
    };
  }

  if (!hasDebitVerb) {
    return {
      rejected: true,
      reason: "no_valid_debit_amount",
      explanation: "Notification does not contain a confirmed outbound debit/payment status ('Paid', 'Sent', 'Debited').",
    };
  }

  // 6. Extract Amount conservatively (must be paired with ₹ / Rs / INR)
  const amountPatterns = [
    /(?:paid|sent|debited(?:\s+by)?|spent|payment\s+of|transferred)\s*(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:was\s+|is\s+|has\s+been\s+)?(?:paid|sent|debited|spent|transferred)/i,
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)\s+to\s+[A-Za-z0-9]/i,
  ];

  let amount: number | null = null;
  for (const regex of amountPatterns) {
    const match = combinedRaw.match(regex);
    if (match?.[1]) {
      const parsedVal = parseFloat(match[1].replace(/,/g, ""));
      if (Number.isFinite(parsedVal) && parsedVal > 0 && parsedVal <= 1000000) {
        amount = Math.round(parsedVal);
        break;
      }
    }
  }

  if (!amount) {
    return {
      rejected: true,
      reason: "no_valid_debit_amount",
      explanation: "Could not conservatively verify a valid INR debit amount in this notification.",
    };
  }

  // 7. Extract UPI Reference / UTR if present (for exact deduplication)
  const refMatch =
    combinedRaw.match(/(?:upi\s*(?:ref|txn|id)?|utr|ref\s*no\.?)[\s:#-]*([0-9]{10,16})/i) ||
    combinedRaw.match(/\b([0-9]{12})\b/);
  const upiRef = refMatch?.[1];

  // 8. Use existing Indian merchant/category parser on-device
  const bankParsed = parseBankSms(combinedRaw);
  let merchant = bankParsed?.merchant || "UPI Merchant";

  // Additional GPay / PhonePe notification title pattern: "Paid ₹40 to Sharma Chai" or "Sharma Tea Stall: Paid ₹20"
  const paidToMatch = combinedRaw.match(
    /(?:paid|sent)\s+(?:(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d{1,2})?\s+)?to\s+([A-Za-z0-9&'.,\-_ ]{2,40}?)(?:\s+(?:on|via|using|upi|ref|\.|\(|\-)|$)/i
  );
  if (paidToMatch?.[1]) {
    const candidate = paidToMatch[1].trim();
    if (candidate.length >= 2 && !/^(vpa|a\/c|account|bank)$/i.test(candidate)) {
      merchant = candidate;
    }
  }

  const rawCategory = bankParsed?.category || "Food";
  const category: ExpenseCategory = EXPENSE_ONLY_CATEGORIES.includes(rawCategory)
    ? rawCategory
    : "Food";

  const timestampIso = input.timestampIso || new Date().toISOString();
  const fingerprint = buildTransactionFingerprint({
    amount,
    merchant,
    upiRef,
    timestampMs: Date.parse(timestampIso) || Date.now(),
    windowMinutes: input.dedupWindowMinutes || 5,
  });

  const appName = matchedApp ? matchedApp.displayName : "Manual Notification Test";

  return {
    rejected: false,
    parsed: {
      amount,
      merchant,
      category,
      appPackage: pkg,
      appName,
      upiRef,
      timestampIso,
      confidence: merchant !== "UPI Merchant" && merchant !== "UPI Transaction" ? "high" : "medium",
      fingerprint,
      sanitizedSummary: `Paid ₹${amount.toLocaleString("en-IN")} to ${merchant} (${category}) via ${
        matchedApp ? matchedApp.shortCode : "UPI"
      }`,
    },
  };
}

/**
 * Evaluates a newly detected or logged expense against the user's REAL budget and
 * spending history. Never invents balances or warns unless the user's actual numbers
 * and configured thresholds support the warning.
 */
export function evaluateSpendingAccountability(params: {
  amount: number;
  merchant: string;
  category: ExpenseCategory;
  existingExpenses: Expense[];
  dailyLimit: number;
  categoryBudgets: CategoryBudgets;
  settings: UpiAccountabilitySettings;
  now?: Date;
  alreadyIncludedInExpenses?: boolean;
}): BudgetEvaluationSnapshot {
  const {
    amount,
    merchant,
    category,
    existingExpenses,
    dailyLimit,
    categoryBudgets,
    settings,
    now = new Date(),
    alreadyIncludedInExpenses = false,
  } = params;

  const todayStr = now.toDateString();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate() || 30;

  // Strictly filter only real expense transactions (never count income as spending)
  const realExpenses = existingExpenses.filter(
    (e) => e.type !== "income" && !INCOME_ONLY_CATEGORIES.includes(e.category)
  );

  const todayExpensesBefore = realExpenses
    .filter((e) => new Date(e.timestamp).toDateString() === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const monthExpensesBefore = realExpenses
    .filter((e) => {
      const d = new Date(e.timestamp);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const categoryMonthBefore = realExpenses
    .filter((e) => {
      const d = new Date(e.timestamp);
      return (
        e.category === category &&
        d.getMonth() === curMonth &&
        d.getFullYear() === curYear
      );
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const sameCategoryTodayBefore = realExpenses.filter(
    (e) =>
      e.category === category &&
      new Date(e.timestamp).toDateString() === todayStr
  ).length;

  const delta = alreadyIncludedInExpenses ? 0 : amount;
  const countDelta = alreadyIncludedInExpenses ? 0 : 1;

  const todaySpentAfter = todayExpensesBefore + delta;
  const dailyRemainingAfter = dailyLimit - todaySpentAfter;
  const dailyUsedPercent =
    dailyLimit > 0 ? Math.round((todaySpentAfter / dailyLimit) * 100) : 0;

  const monthlyBudget = dailyLimit * daysInMonth;
  const monthSpentAfter = monthExpensesBefore + delta;
  const monthlyRemainingAfter = monthlyBudget - monthSpentAfter;
  const monthlyUsedPercent =
    monthlyBudget > 0 ? Math.round((monthSpentAfter / monthlyBudget) * 100) : 0;

  const categoryBudgetLimit = categoryBudgets[category] || 0;
  const categoryMonthSpentAfter = categoryMonthBefore + delta;
  const categoryRemainingAfter =
    categoryBudgetLimit > 0 ? categoryBudgetLimit - categoryMonthSpentAfter : null;
  const categoryUsedPercent =
    categoryBudgetLimit > 0
      ? Math.round((categoryMonthSpentAfter / categoryBudgetLimit) * 100)
      : 0;

  const sameCategoryTodayCount = sameCategoryTodayBefore + countDelta;

  // Determine whether a warning is genuinely warranted by the user's real numbers
  const isDailyBreach = dailyLimit > 0 && todaySpentAfter >= dailyLimit;
  const isDailyNearLimit =
    dailyLimit > 0 && dailyUsedPercent >= settings.dailyWarnPercent;
  const isMonthlyNearLimit =
    monthlyBudget > 0 && monthlyUsedPercent >= settings.monthlyWarnPercent;
  const isCategoryNearOrOver =
    categoryBudgetLimit > 0 && categoryUsedPercent >= 80;
  const isRepeatHabitSpend =
    (category === "Chai & Snacks" || category === "Food" || category === "Shopping") &&
    sameCategoryTodayCount >= settings.repeatCategoryCountTrigger;

  let shouldWarn = false;
  if (settings.thresholdMode === "every_spend") {
    shouldWarn = true;
  } else if (settings.thresholdMode === "critical_only") {
    shouldWarn = isDailyBreach || dailyUsedPercent >= 90 || monthlyUsedPercent >= 90;
  } else {
    // smart_budget mode
    shouldWarn =
      isDailyBreach ||
      isDailyNearLimit ||
      isMonthlyNearLimit ||
      isCategoryNearOrOver ||
      isRepeatHabitSpend;
  }

  let urgency: "info" | "warning" | "breach" = "info";
  if (isDailyBreach || monthlyRemainingAfter <= 0 || (categoryRemainingAfter !== null && categoryRemainingAfter < 0)) {
    urgency = "breach";
  } else if (shouldWarn) {
    urgency = "warning";
  }

  // Construct truthful, context-aware message using the user's actual numbers
  const fmtDailyRem = Math.max(0, dailyRemainingAfter).toLocaleString("en-IN");
  const fmtMonthlyRem = Math.max(0, monthlyRemainingAfter).toLocaleString("en-IN");
  const isChaiOrCoffee =
    category === "Chai & Snacks" ||
    /\b(chai|tea|coffee|tapri|chaayos|starbucks|samosa|snack|bakery)\b/i.test(merchant);

  let triggerReason = "Within safe daily & monthly budget";
  let headline = `UPI Spend Logged: ₹${amount.toLocaleString("en-IN")}`;
  let message = "";

  if (isDailyBreach) {
    triggerReason = `Exceeded daily limit (₹${todaySpentAfter.toLocaleString("en-IN")} / ₹${dailyLimit.toLocaleString("en-IN")})`;
    if (settings.tone === "hinglish") {
      headline = "🚨 Bhai, Aaj Ka Limit Cross Ho Gaya!";
      message = `Paid ₹${amount.toLocaleString("en-IN")} to ${merchant}. Aaj ₹${todaySpentAfter.toLocaleString("en-IN")} kharch ho chuke hain (Daily limit ₹${dailyLimit.toLocaleString("en-IN")}). Monthly budget mein ₹${fmtMonthlyRem} bacha hai — ab thoda break laga!`;
    } else if (settings.tone === "strict") {
      headline = "🚨 Daily Spending Limit Exceeded";
      message = `₹${amount.toLocaleString("en-IN")} at ${merchant} pushed today's spend to ₹${todaySpentAfter.toLocaleString("en-IN")} (${dailyUsedPercent}% of ₹${dailyLimit.toLocaleString("en-IN")} limit). Remaining monthly budget: ₹${fmtMonthlyRem}.`;
    } else {
      headline = "⚠️ Over Today's Spending Limit";
      message = `You spent ₹${amount.toLocaleString("en-IN")} at ${merchant}. Today's total is ₹${todaySpentAfter.toLocaleString("en-IN")} against your ₹${dailyLimit.toLocaleString("en-IN")} daily target. You have ₹${fmtMonthlyRem} left in your monthly budget.`;
    }
  } else if (isDailyNearLimit) {
    triggerReason = `At ${dailyUsedPercent}% of daily limit (₹${fmtDailyRem} left today)`;
    if (settings.tone === "hinglish") {
      headline = "💸 Bhai, spending limit ke paas ho — aaj thoda ruk!";
      message = `₹${amount.toLocaleString("en-IN")} at ${merchant} (${category}). Aaj ke ₹${dailyLimit.toLocaleString("en-IN")} limit mein sirf ₹${fmtDailyRem} bacha hai (${dailyUsedPercent}% used). Monthly remaining: ₹${fmtMonthlyRem}.`;
    } else if (settings.tone === "strict") {
      headline = `⚠️ ${dailyUsedPercent}% of Daily Limit Used`;
      message = `₹${amount.toLocaleString("en-IN")} paid to ${merchant}. Only ₹${fmtDailyRem} left for today and ₹${fmtMonthlyRem} left in your monthly budget.`;
    } else {
      headline = "Heads up: Approaching Today's Limit";
      message = `After paying ₹${amount.toLocaleString("en-IN")} to ${merchant}, you have ₹${fmtDailyRem} left in today's budget (${dailyUsedPercent}% used).`;
    }
  } else if (isChaiOrCoffee && sameCategoryTodayCount >= settings.repeatCategoryCountTrigger) {
    triggerReason = `Repeat ${category} spend today (#${sameCategoryTodayCount} today)`;
    if (settings.tone === "hinglish") {
      headline = "☕ Bhai chai/snacks phir se?";
      message = `Aaj ki #${sameCategoryTodayCount} ${category} payment (₹${amount.toLocaleString("en-IN")} at ${merchant})! Today remaining: ₹${fmtDailyRem} · Monthly budget left: ₹${fmtMonthlyRem}.`;
    } else {
      headline = `☕ Repeat ${category} Purchase (#${sameCategoryTodayCount} Today)`;
      message = `Logged ₹${amount.toLocaleString("en-IN")} at ${merchant}. You've made ${sameCategoryTodayCount} ${category} purchases today. Remaining daily budget: ₹${fmtDailyRem}.`;
    }
  } else if (isMonthlyNearLimit) {
    triggerReason = `Monthly budget at ${monthlyUsedPercent}% (₹${fmtMonthlyRem} left)`;
    if (settings.tone === "hinglish") {
      headline = "💸 Bhai, thoda ruk ja — monthly budget khatam hone wala hai!";
      message = `Warning: You have only ₹${fmtMonthlyRem} left in your monthly budget (${monthlyUsedPercent}% used after ₹${amount.toLocaleString("en-IN")} at ${merchant}).`;
    } else {
      headline = `⚠️ Monthly Budget at ${monthlyUsedPercent}%`;
      message = `Warning: You have only ₹${fmtMonthlyRem} left in your monthly budget after spending ₹${amount.toLocaleString("en-IN")} at ${merchant}.`;
    }
  } else if (isCategoryNearOrOver && categoryRemainingAfter !== null) {
    const fmtCatRem = Math.max(0, categoryRemainingAfter).toLocaleString("en-IN");
    triggerReason = `${category} monthly budget at ${categoryUsedPercent}% (₹${fmtCatRem} left)`;
    if (settings.tone === "hinglish") {
      headline = `😂 Another ${category} expense? Future wale tu ke liye bhi kuch bacha le!`;
      message = `₹${amount.toLocaleString("en-IN")} at ${merchant}. ${category} monthly budget mein sirf ₹${fmtCatRem} bacha hai (${categoryUsedPercent}% used).`;
    } else {
      headline = `⚠️ ${category} Budget Alert (${categoryUsedPercent}% Used)`;
      message = `Spent ₹${amount.toLocaleString("en-IN")} at ${merchant}. You have ₹${fmtCatRem} left in your ${category} budget this month.`;
    }
  } else if (isRepeatHabitSpend) {
    triggerReason = `${sameCategoryTodayCount} ${category} transactions today`;
    if (settings.tone === "hinglish") {
      headline = "😂 Another expense? Bhai, future wale tu ke liye bhi kuch bacha le!";
      message = `Aaj ${sameCategoryTodayCount} baar ${category} pe kharch kiya (latest: ₹${amount.toLocaleString("en-IN")} at ${merchant}). Aaj ka remaining budget: ₹${fmtDailyRem}.`;
    } else {
      headline = `Repeat ${category} Spend (#${sameCategoryTodayCount} Today)`;
      message = `₹${amount.toLocaleString("en-IN")} at ${merchant}. You have ₹${fmtDailyRem} left in today's limit and ₹${fmtMonthlyRem} left this month.`;
    }
  } else {
    triggerReason = `Within budget (${dailyUsedPercent}% of daily limit used)`;
    if (settings.tone === "hinglish") {
      headline = `✅ ₹${amount.toLocaleString("en-IN")} logged (${merchant})`;
      message = `Control mein ho bhai! Aaj ke limit mein abhi ₹${fmtDailyRem} bacha hai (Monthly remaining: ₹${fmtMonthlyRem}).`;
    } else {
      headline = `✅ Paid ₹${amount.toLocaleString("en-IN")} to ${merchant}`;
      message = `Within budget: ₹${fmtDailyRem} left today (${dailyUsedPercent}% used) · ₹${fmtMonthlyRem} left this month.`;
    }
  }

  return {
    amount,
    merchant,
    category,
    todaySpentAfter,
    dailyLimit,
    dailyRemainingAfter,
    dailyUsedPercent,
    monthSpentAfter,
    monthlyBudget,
    monthlyRemainingAfter,
    monthlyUsedPercent,
    categoryMonthSpentAfter,
    categoryBudgetLimit,
    categoryRemainingAfter,
    sameCategoryTodayCount,
    shouldWarn,
    urgency,
    triggerReason,
    headline,
    message,
  };
}

/**
 * Sample UPI notification payloads for testing the on-device parser and
 * real-budget warning logic in the web preview.
 */
export const SAMPLE_UPI_NOTIFICATION_PAYLOADS = [
  {
    id: "gpay-chai",
    label: "GPay · Chai ₹30",
    packageName: "com.google.android.apps.nbu.paisa.user",
    appTitle: "Google Pay",
    notificationText: "Paid ₹30 to Sharma Chai Tapri via UPI. UPI Ref: 430291847561.",
  },
  {
    id: "phonepe-food",
    label: "PhonePe · Swiggy ₹320",
    packageName: "com.phonepe.app",
    appTitle: "PhonePe",
    notificationText: "Paid ₹320 to SWIGGY from HDFC Bank A/c **4582. UTR: 430299182736.",
  },
  {
    id: "paytm-shopping",
    label: "Paytm · Myntra ₹699",
    packageName: "net.one97.paytm",
    appTitle: "Paytm",
    notificationText: "Money Sent: Paid Rs. 699 to Myntra Designs Pvt Ltd via UPI.",
  },
  {
    id: "bhim-auto",
    label: "BHIM · Uber Auto ₹140",
    packageName: "in.org.npci.upiapp",
    appTitle: "BHIM",
    notificationText: "INR 140.00 debited via BHIM UPI to Uber India Systems. Ref 430288172635.",
  },
  {
    id: "ignored-otp",
    label: "Ignored · Bank OTP (Safety Test)",
    packageName: "com.google.android.apps.nbu.paisa.user",
    appTitle: "Security Alert",
    notificationText: "Your OTP for payment of Rs 500 is 482910. Do not share your OTP or UPI PIN with anyone.",
  },
  {
    id: "ignored-collect",
    label: "Ignored · Collect Request (Safety Test)",
    packageName: "com.phonepe.app",
    appTitle: "PhonePe",
    notificationText: "Ramesh has requested ₹250. Tap to approve collect request using your UPI PIN.",
  },
];
