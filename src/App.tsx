import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Home,
  History,
  PieChart,
  Users,
  Crown,
  RotateCcw,
  Shield,
  X,
  Zap,
  PhoneIncoming,
  PhoneOff,
  Fingerprint,
} from "lucide-react";
import {
  celebrateStreakMilestone,
  celebrateDisciplineShield,
  playQuickAddChirp,
  playLockdownThud,
  playCashRegisterChime,
  playArmorBootSound,
  playMidnightCravingsChime,
  playStarkPowerSurgeSwoosh,
  playMetallicCoinChime,
} from "./utils/celebration";
import {
  detectClipboardTransaction,
  type DetectedClipboardTx,
} from "./utils/smsParser";
import type {
  Expense,
  ExpenseCategory,
  KhataFriend,
  PaymentMode,
  QuickAddPreset,
  TabId,
  ThemeId,
} from "./types";
import { FAN_THEMES } from "./themes";
import { createInitialExpenses, createInitialKhata } from "./data/initialData";
import { ThemeBackdrop } from "./components/ThemeBackdrop";
import { ThemeSelector } from "./components/ThemeSelector";
import { Header } from "./components/Header";
import { BudgetWidget } from "./components/BudgetWidget";
import { SwipeableExpenseRow } from "./components/SwipeableExpenseRow";
import { AddExpenseModal } from "./components/AddExpenseModal";
import { HistoryView } from "./components/HistoryView";
import { InsightsView } from "./components/InsightsView";
import { KhataView } from "./components/KhataView";
import { ProView } from "./components/ProView";
import { JarvisDrawer } from "./components/JarvisDrawer";
import { ProfileDrawer } from "./components/ProfileDrawer";
import { getCurrentUserIdToken, signOutCurrentUser } from "./components/AuthGate";
import { OnboardingModal } from "./components/OnboardingModal";
import { AppTour } from "./components/AppTour";
import { ProTrialModal } from "./components/ProTrialModal";
import {
  StarkRewardVaultModal,
  STARK_ARC_BADGES,
} from "./components/StarkRewardVaultModal";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendKharcheNotification,
} from "./utils/notifications";

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};
type RazorpayFailureResponse = { error?: { description?: string } };
type RazorpayCheckoutOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayPaymentResponse) => void | Promise<void>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
};
type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: string, handler: (response: RazorpayFailureResponse) => void) => void;
};
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

async function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout="true"]');
    const script = existing || document.createElement("script");
    const onLoad = () => window.Razorpay ? resolve() : reject(new Error("Secure checkout could not be loaded."));
    const onError = () => reject(new Error("Secure checkout could not be loaded. Check your connection and try again."));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.dataset.razorpayCheckout = "true";
      document.body.appendChild(script);
    }
  });
  if (!window.Razorpay) throw new Error("Secure checkout is unavailable.");
}

function scopedStorageKey(key: string): string {
  const uid = localStorage.getItem("kharche_current_user_uid") || "unverified";
  return `${uid}:${key}`;
}

const STORAGE_KEYS = {
  expenses: "kharche_expenses_v1",
  khata: "kharche_khata_v1",
  dailyLimit: "kharche_daily_limit_v1",
  lockdown: "kharche_lockdown_v1",
  theme: "kharche_theme_v1",
  pro: "kharche_pro_v1",
  autoLockdown: "kharche_autolockdown_v1",
  notifications: "kharche_notifications_v1",
  onboarding: "kharche_onboarding_completed_v1",
  financialProfile: "kharche_financial_profile_v1",
};

function getDynamicGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "GOOD MORNING";
  if (hour >= 12 && hour < 17) return "GOOD AFTERNOON";
  if (hour >= 17 && hour < 22) return "GOOD EVENING";
  return "LATE NIGHT WATCH";
}

function formatLiveHeaderDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const VALID_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Chai & Snacks",
  "Transport",
  "Grocery",
  "Entertainment",
  "Bills",
  "Shopping",
  "Salary",
  "Freelance",
  "Cashback",
];

const VALID_PAYMENT_MODES: PaymentMode[] = ["UPI", "Cash", "Card"];

function isValidExpenseRecord(item: unknown): item is Expense {
  if (!item || typeof item !== "object") return false;
  const exp = item as Record<string, unknown>;
  if (typeof exp.id !== "string" || !exp.id.trim()) return false;
  if (typeof exp.title !== "string" || !exp.title.trim()) return false;
  if (
    typeof exp.amount !== "number" ||
    !Number.isFinite(exp.amount) ||
    exp.amount <= 0 ||
    exp.amount > 10000000
  ) {
    return false;
  }
  if (typeof exp.timestamp !== "string" || Number.isNaN(Date.parse(exp.timestamp))) {
    return false;
  }
  if (
    typeof exp.category !== "string" ||
    !VALID_EXPENSE_CATEGORIES.includes(exp.category as ExpenseCategory)
  ) {
    return false;
  }
  if (
    typeof exp.paymentMode !== "string" ||
    !VALID_PAYMENT_MODES.includes(exp.paymentMode as PaymentMode)
  ) {
    return false;
  }
  if (
    exp.type !== undefined &&
    exp.type !== "expense" &&
    exp.type !== "income"
  ) {
    return false;
  }
  return true;
}

function isValidKhataFriend(item: unknown): item is KhataFriend {
  if (!item || typeof item !== "object") return false;
  const friend = item as Record<string, unknown>;
  if (typeof friend.id !== "string" || !friend.id.trim()) return false;
  if (typeof friend.name !== "string" || !friend.name.trim()) return false;
  if (typeof friend.phone !== "string") return false;
  if (typeof friend.avatarInitials !== "string") return false;
  if (!Array.isArray(friend.entries)) return false;
  for (const entry of friend.entries) {
    if (!entry || typeof entry !== "object") return false;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string" || !e.id.trim()) return false;
    if (typeof e.description !== "string" || !e.description.trim()) return false;
    if (
      typeof e.amount !== "number" ||
      !Number.isFinite(e.amount) ||
      e.amount === 0 ||
      Math.abs(e.amount) > 10000000
    ) {
      return false;
    }
    if (typeof e.timestamp !== "string" || Number.isNaN(Date.parse(e.timestamp))) {
      return false;
    }
    if (typeof e.settled !== "boolean") return false;
  }
  return true;
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [now, setNow] = useState<Date>(() => new Date());

  // Persistent State
  const [dailyLimit, setDailyLimit] = useState<number>(() => {
    const saved = localStorage.getItem(scopedStorageKey(STORAGE_KEYS.dailyLimit));
    const parsed = saved ? Number(saved) : NaN;
    if (Number.isFinite(parsed) && parsed >= 50 && parsed <= 1000000) {
      return Math.round(parsed);
    }
    return 500;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(scopedStorageKey(STORAGE_KEYS.expenses));
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(isValidExpenseRecord);
        }
      } catch {
        return [];
      }
    }
    return createInitialExpenses();
  });

  const [khataFriends, setKhataFriends] = useState<KhataFriend[]>(() => {
    const saved = localStorage.getItem(scopedStorageKey(STORAGE_KEYS.khata));
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(isValidKhataFriend);
        }
      } catch {
        return [];
      }
    }
    return createInitialKhata();
  });

  const [lockdownActive, setLockdownActive] = useState<boolean>(() => {
    return localStorage.getItem(scopedStorageKey(STORAGE_KEYS.lockdown)) === "true";
  });

  const [themeId, setThemeId] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(scopedStorageKey(STORAGE_KEYS.theme));
    return "stark";
  });

  const [customThemeOverride, setCustomThemeOverride] = useState<{
    name: string;
    primaryHex: string;
    glowIntensity: number;
  } | null>(null);

  const [isProActive, setIsProActive] = useState<boolean>(false);

  const [autoLockdownAt90, setAutoLockdownAt90] = useState<boolean>(() => {
    return localStorage.getItem(scopedStorageKey(STORAGE_KEYS.autoLockdown)) === "true";
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(scopedStorageKey(STORAGE_KEYS.notifications));
    return saved !== null ? saved === "true" : true;
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() =>
    getNotificationPermission()
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<"ocr" | "nfc" | "sms" | "manual">("ocr");
  const [addModalType, setAddModalType] = useState<"expense" | "income">("expense");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisBooting, setIsJarvisBooting] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isRewardVaultOpen, setIsRewardVaultOpen] = useState(false);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(scopedStorageKey("kharche_stark_unlocked_badges_v1"));
      return saved ? JSON.parse(saved) : ["iron-discipline", "zero-leak-legend"];
    } catch {
      return ["iron-discipline", "zero-leak-legend"];
    }
  });
  const [pinnedBadgeIds, setPinnedBadgeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(scopedStorageKey("kharche_stark_pinned_badges_v1"));
      return saved ? JSON.parse(saved) : ["iron-discipline", "zero-leak-legend"];
    } catch {
      return ["iron-discipline", "zero-leak-legend"];
    }
  });
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return localStorage.getItem(scopedStorageKey(STORAGE_KEYS.onboarding)) !== "true";
  });
  const [isTourActive, setIsTourActive] = useState(false);
  const [isProTeaserOpen, setIsProTeaserOpen] = useState(false);

  // Feature 4: "STEALTH ZERO-BALANCE SHIELD" (Privacy Toggle)
  const [stealthMode, setStealthMode] = useState<boolean>(() => {
    return localStorage.getItem(scopedStorageKey("kharche_stealth_mode_v1")) === "true";
  });

  // Feature 5: "BIOMETRIC HUD SCANNER ON BOOT" (1.5-second cyan thumbprint laser-scan)
  const [isBiometricScanning, setIsBiometricScanning] = useState<boolean>(true);

  // Feature 1: "FAKE MOM CALL ESCAPE" ("Incoming Call: Mummy ❤️" screen + ringtone)
  const [isFakeMomCallOpen, setIsFakeMomCallOpen] = useState<boolean>(false);
  const [isMomCallConnected, setIsMomCallConnected] = useState<boolean>(false);
  const momRingtoneTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsBiometricScanning(false);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const stopMomRingtone = () => {
    if (momRingtoneTimerRef.current !== null) {
      window.clearInterval(momRingtoneTimerRef.current);
      momRingtoneTimerRef.current = null;
    }
  };

  const playMomRingtonePulse = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const nowTime = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(523.25, nowTime); // C5
      osc1.frequency.setValueAtTime(659.25, nowTime + 0.18); // E5
      osc2.frequency.setValueAtTime(783.99, nowTime); // G5
      osc2.frequency.setValueAtTime(1046.5, nowTime + 0.18); // C6

      gain.gain.setValueAtTime(0.001, nowTime);
      gain.gain.exponentialRampToValueAtTime(0.14, nowTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, nowTime + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(nowTime);
      osc2.start(nowTime);
      osc1.stop(nowTime + 0.46);
      osc2.stop(nowTime + 0.46);
    } catch {
      // ignore audio context restrictions
    }
  };

  const handleTriggerFakeMomCall = () => {
    stopMomRingtone();
    setIsMomCallConnected(false);
    setIsFakeMomCallOpen(true);
    playMomRingtonePulse();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([300, 150, 300]);
      } catch {
        // ignore vibration error
      }
    }
    momRingtoneTimerRef.current = window.setInterval(() => {
      playMomRingtonePulse();
    }, 1400);
  };

  const handleEndFakeMomCall = () => {
    stopMomRingtone();
    setIsFakeMomCallOpen(false);
    setIsMomCallConnected(false);
    showToast("📞 Saved by Mummy ❤️ · Escaped expensive group split!");
  };

  const handleUnlockAndPinBadge = (badgeId: string) => {
    setUnlockedBadgeIds((prev) => {
      const next = prev.includes(badgeId) ? prev : [...prev, badgeId];
      localStorage.setItem(scopedStorageKey("kharche_stark_unlocked_badges_v1"), JSON.stringify(next));
      return next;
    });
    setPinnedBadgeIds((prev) => {
      const next = prev.includes(badgeId) ? prev : [...prev, badgeId];
      localStorage.setItem(scopedStorageKey("kharche_stark_pinned_badges_v1"), JSON.stringify(next));
      return next;
    });
    const badgeObj = STARK_ARC_BADGES.find((b) => b.id === badgeId);
    if (badgeObj) {
      showToast(`🏆 Unlocked "${badgeObj.name}" & pinned to Profile Card!`);
    }
  };

  const handleTogglePinBadge = (badgeId: string) => {
    setPinnedBadgeIds((prev) => {
      const next = prev.includes(badgeId)
        ? prev.filter((id) => id !== badgeId)
        : [...prev, badgeId];
      localStorage.setItem(scopedStorageKey("kharche_stark_pinned_badges_v1"), JSON.stringify(next));
      return next;
    });
  };

  const handleOpenJarvisWithBootSequence = () => {
    playArmorBootSound();
    setIsJarvisBooting(true);

    // Zero-lag immediate Butler greeting on tap gesture
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          "At your service, Sir. Perimeter secure."
        );
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const jarvisVoice =
          voices.find(
            (v) =>
              v.lang.startsWith("en-GB") ||
              v.name.includes("UK") ||
              v.name.includes("British") ||
              v.name.includes("Daniel")
          ) || voices.find((v) => v.lang.startsWith("en"));
        if (jarvisVoice) utterance.voice = jarvisVoice;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Ignore speech errors
    }

    setTimeout(() => {
      setIsJarvisOpen(true);
    }, 260);

    setTimeout(() => {
      setIsJarvisBooting(false);
    }, 520);
  };

  // Toast / Undo State
  const [toast, setToast] = useState<{
    message: string;
    deletedExpense?: Expense;
  } | null>(null);

  // Receiving UPI ID (Khata Direct Settlement)
  const [myUpiId, setMyUpiId] = useState<string>(() => {
    return localStorage.getItem(scopedStorageKey("kharche_my_upi_id_v1")) || "";
  });

  // Global Smart Clipboard & SMS Auto-Detection State
  const [detectedTxn, setDetectedTxn] = useState<DetectedClipboardTx | null>(null);
  const lastClipboardTextRef = useRef<string>("");

  // "STARK MORNING BRIEFING" Automatic Audio HUD State
  const [isMorningBriefingOpen, setIsMorningBriefingOpen] = useState<boolean>(false);

  const triggerStarkMorningBriefing = (limitVal = dailyLimit) => {
    setIsMorningBriefingOpen(true);
    playQuickAddChirp();

    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const briefingText = `Good morning, Sir. Systems synchronized. Daily limit calibrated to Rupees ${limitVal}. Let's maintain operational discipline today.`;
        const utterance = new SpeechSynthesisUtterance(briefingText);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const jarvisVoice =
          voices.find(
            (v) =>
              v.lang.startsWith("en-GB") ||
              v.name.includes("UK") ||
              v.name.includes("British") ||
              v.name.includes("Daniel")
          ) || voices.find((v) => v.lang.startsWith("en"));
        if (jarvisVoice) utterance.voice = jarvisVoice;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // ignore TTS autoplay restrictions
    }
  };

  useEffect(() => {
    const todayKey = new Date().toDateString();
    const lastBriefedDate = localStorage.getItem(scopedStorageKey("kharche_morning_briefing_date_v1"));
    if (lastBriefedDate !== todayKey) {
      localStorage.setItem(scopedStorageKey("kharche_morning_briefing_date_v1"), todayKey);
      triggerStarkMorningBriefing(dailyLimit);
    }
  }, []);

  useEffect(() => {
    if (!isMorningBriefingOpen) return;
    const timer = setTimeout(() => {
      setIsMorningBriefingOpen(false);
    }, 3400);
    return () => clearTimeout(timer);
  }, [isMorningBriefingOpen]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.dailyLimit), String(dailyLimit));
  }, [dailyLimit]);

  useEffect(() => {
    localStorage.setItem(scopedStorageKey("kharche_my_upi_id_v1"), myUpiId);
  }, [myUpiId]);

  useEffect(() => {
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.expenses), JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.khata), JSON.stringify(khataFriends));
  }, [khataFriends]);

  useEffect(() => {
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.lockdown), String(lockdownActive));
  }, [lockdownActive]);

  useEffect(() => {
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.theme), themeId);
  }, [themeId]);

  useEffect(() => {
    let cancelled = false;
    const syncSubscription = async () => {
      try {
        const token = await getCurrentUserIdToken();
        if (!token) {
          if (!cancelled) setIsProActive(false);
          return;
        }
        const response = await fetch("/api/billing/status", { headers: { Authorization: "Bearer " + token } });
        if (!response.ok) return;
        const result = await response.json() as { active?: boolean };
        if (!cancelled) setIsProActive(result.active === true);
      } catch {
        // Network failures must never grant Pro access.
      }
    };
    void syncSubscription();
    const intervalId = window.setInterval(() => void syncSubscription(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.autoLockdown), String(autoLockdownAt90));
  }, [autoLockdownAt90]);

  useEffect(() => {
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.notifications), String(notificationsEnabled));
  }, [notificationsEnabled]);

  /**
   * Smart Auto-Detect: Inspects clipboard for Indian banking SMS patterns
   * (e.g. debited by Rs..., paid Rs... to..., INR... spent at...)
   */
  const checkClipboardForTransactions = async (manual = false) => {
    if (typeof window === "undefined" || !navigator.clipboard?.readText) {
      if (manual) showToast("Clipboard reading not supported in this browser");
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length === 0) {
        if (manual) showToast("Clipboard is empty");
        return;
      }
      const trimmed = text.trim();
      if (trimmed === lastClipboardTextRef.current && !manual) return;
      lastClipboardTextRef.current = trimmed;

      const detected = detectClipboardTransaction(trimmed);
      if (detected) {
        setDetectedTxn(detected);
        if (manual) {
          showToast(`⚡ Transaction detected: ₹${detected.amount} to ${detected.vendor}`);
        }
      } else if (manual) {
        showToast("No Indian banking transaction detected in clipboard");
      }
    } catch {
      // Browser permissions may restrict auto-reading until focused
    }
  };

  // Global listener: on window focus or document visibility change
  useEffect(() => {
    const onFocus = () => {
      void checkClipboardForTransactions(false);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkClipboardForTransactions(false);
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const baseTheme = FAN_THEMES[themeId];
  const theme = useMemo(() => {
    if (!customThemeOverride) return baseTheme;
    const hex = customThemeOverride.primaryHex;
    const alpha = Math.round((customThemeOverride.glowIntensity / 100) * 255)
      .toString(16)
      .padStart(2, "0");
    return {
      ...baseTheme,
      name: customThemeOverride.name,
      accentHex: hex,
      ringStroke: hex,
      ringGlow: `${hex}${alpha}`,
      hudGlowColor: `${hex}80`,
      borderGlow: `${hex}80`,
      auraGlow: `${hex}aa`,
    };
  }, [baseTheme, customThemeOverride]);

  // Calculate Today's Spend (Expense records only)
  const todaySpent = useMemo(() => {
    const todayStr = now.toDateString();
    return expenses
      .filter((e) => e.type !== "income" && new Date(e.timestamp).toDateString() === todayStr)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, now]);

  // Calculate Dynamic Discipline Streak (Expense records only)
  const streakDays = useMemo(() => {
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() - i);
      const dayStr = checkDate.toDateString();
      const dayTotal = expenses
        .filter((e) => e.type !== "income" && new Date(e.timestamp).toDateString() === dayStr)
        .reduce((sum, e) => sum + e.amount, 0);

      if (dayTotal <= dailyLimit) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }, [expenses, dailyLimit, now]);

  // CRED-style Discipline Score (300 to 900)
  const disciplineScore = useMemo(() => {
    let score = 740;
    score += Math.min(streakDays * 8, 96);
    if (dailyLimit > 0) {
      const ratio = todaySpent / dailyLimit;
      if (ratio <= 0.7) {
        score += 35;
      } else if (ratio <= 1.0) {
        score += 15;
      } else {
        const overPercent = (ratio - 1.0) * 100;
        score -= Math.min(Math.round(overPercent * 1.5), 120);
      }
    }
    return Math.max(300, Math.min(900, Math.round(score)));
  }, [streakDays, dailyLimit, todaySpent]);

  const recentExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [expenses]);

  const showToast = (message: string, deletedExpense?: Expense) => {
    setToast({ message, deletedExpense });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const checkAutoLockdown = (nextTodaySpent: number) => {
    if (autoLockdownAt90 && dailyLimit > 0 && nextTodaySpent / dailyLimit >= 0.9) {
      setLockdownActive(true);
    }
  };

  const checkBudgetThresholdAlerts = (prevSpent: number, nextSpent: number) => {
    if (!notificationsEnabled || dailyLimit <= 0) return;

    const prevRatio = prevSpent / dailyLimit;
    const nextRatio = nextSpent / dailyLimit;

    // 100% Limit Breach
    if (prevRatio < 1.0 && nextRatio >= 1.0) {
      const alertMsg = "🚨 KHARCHE Lockdown: Budget khatam! Emergency freeze mode recommend kiya jata hai.";
      sendKharcheNotification(
        "🚨 KHARCHE Lockdown",
        alertMsg,
        "breach"
      );
      showToast(alertMsg);
      return;
    }

    // 80% Budget Threshold
    if (prevRatio < 0.8 && nextRatio >= 0.8) {
      const alertMsg = "⚠️ KHARCHE Alert: Wallet ICU me ja raha hai! You've used 80% of your daily limit.";
      sendKharcheNotification(
        "⚠️ KHARCHE Alert",
        alertMsg,
        "warning"
      );
      showToast(alertMsg);
    }
  };

  const handleToggleNotifications = async () => {
    const next = !notificationsEnabled;
    if (next) {
      const perm = await requestNotificationPermission();
      setNotificationPermission(perm);
      setNotificationsEnabled(true);
      if (perm === "granted") {
        sendKharcheNotification(
          "🔔 Smart Budget Notifications Active",
          "Web alerts & vibration pattern [100, 50, 100] are now active for 80% & 100% budget thresholds.",
          "test"
        );
        showToast("🔔 Smart Budget Notifications enabled [100, 50, 100]");
      } else if (perm === "denied") {
        showToast("Browser notification blocked. In-app alerts & vibration enabled!");
      } else {
        showToast("🔔 Smart Budget Notifications enabled!");
      }
    } else {
      setNotificationsEnabled(false);
      showToast("Smart Budget Notifications turned off");
    }
  };

  const handleSendTestNotification = () => {
    const result = sendKharcheNotification(
      "🔔 KHARCHE Notification Test",
      "Testing 1-2-3! Smart budget alerts & vibration [100, 50, 100] verified on your device.",
      "test"
    );
    showToast(
      result.nativeSent
        ? "🔔 Web notification & vibration [100, 50, 100] sent!"
        : "🔔 In-app alert & vibration [100, 50, 100] triggered!"
    );
  };

  const handleOnboardingComplete = (data: {
    userName: string;
    email: string;
    monthlyIncome: number;
    savingsTarget: number;
    dailyLimit: number;
    notificationsEnabled: boolean;
  }) => {
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.onboarding), "true");
    localStorage.setItem(scopedStorageKey("kharche_user_name_v1"), data.userName);
    localStorage.setItem(scopedStorageKey("kharche_user_email_v1"), data.email);
    localStorage.setItem(
          scopedStorageKey(STORAGE_KEYS.financialProfile),
      JSON.stringify({
        income: data.monthlyIncome,
        savings: data.savingsTarget,
        calibratedAt: new Date().toISOString(),
      })
    );
    setDailyLimit(data.dailyLimit);
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.dailyLimit), String(data.dailyLimit));
    setNotificationsEnabled(data.notificationsEnabled);
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.notifications), String(data.notificationsEnabled));

    setIsOnboardingOpen(false);
    // Transition to Interactive App Tour
    setIsTourActive(true);
    showToast(`Welcome ${data.userName}! Daily limit calibrated to ₹${data.dailyLimit}`);
  };

  const handleTourComplete = () => {
    setIsTourActive(false);
    // Prompt CRED PRO Trial Teaser right after tour completion
    setIsProTeaserOpen(true);
  };

  const handleTourSkip = () => {
    setIsTourActive(false);
    setIsProTeaserOpen(true);
  };

  const handleClaimProTrial = () => {
    setIsProTeaserOpen(false);
    setActiveTab("pro");
    showToast("Choose a Pro plan to continue to secure checkout.");
  };

  const handlePurchasePro = async (plan: "monthly" | "quarterly"): Promise<void> => {
    const token = await getCurrentUserIdToken();
    if (!token) throw new Error("Please sign in again before purchasing Pro.");
    const createResponse = await fetch("/api/billing/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ plan }),
    });
    const checkout = await createResponse.json() as { keyId?: string; subscriptionId?: string; label?: string; error?: string };
    if (!createResponse.ok || !checkout.keyId || !checkout.subscriptionId) {
      throw new Error(checkout.error || "Could not start secure checkout.");
    }
    await loadRazorpayCheckout();
    if (!window.Razorpay) throw new Error("Secure checkout is unavailable.");
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      const razorpay = new window.Razorpay!({
        key: checkout.keyId!,
        subscription_id: checkout.subscriptionId!,
        name: "Kharchee Pro",
        description: checkout.label || "Kharchee Pro subscription",
        theme: { color: "#cbd5e1" },
        modal: { ondismiss: () => fail(new Error("Checkout closed. No Pro access was granted.")) },
        handler: async (payment) => {
          try {
            const verifyResponse = await fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
              body: JSON.stringify(payment),
            });
            const verified = await verifyResponse.json() as { active?: boolean; error?: string };
            if (!verifyResponse.ok || verified.active !== true) throw new Error(verified.error || "Payment is not verified yet.");
            if (settled) return;
            settled = true;
            setIsProActive(true);
            showToast("Kharchee Pro is active — payment verified by the server.");
            resolve();
          } catch (error) {
            fail(error instanceof Error ? error : new Error("Payment verification failed."));
          }
        },
      });
      razorpay.on("payment.failed", (failure) => fail(new Error(failure.error?.description || "Payment failed. No Pro access was granted.")));
      razorpay.open();
    });
  };

  const handleReplayTour = () => {
    setIsOnboardingOpen(true);
  };

  const handleAddExpense = (data: {
    title: string;
    amount: number;
    category: ExpenseCategory;
    paymentMode: PaymentMode;
    type?: "expense" | "income";
    note?: string;
  }) => {
    const txType = data.type === "income" ? "income" : "expense";
    const currentHour = new Date().getHours();
    const isMidnightCraving =
      txType === "expense" &&
      (currentHour >= 22 || currentHour < 4) &&
      (data.category === "Food" || data.category === "Chai & Snacks");

    if (isMidnightCraving) {
      playMidnightCravingsChime();
    } else {
      playStarkPowerSurgeSwoosh();
      playQuickAddChirp();
    }

    const newExp: Expense = {
      id: `${txType === "income" ? "inc" : "exp"}-${Date.now()}`,
      title: data.title,
      category: data.category,
      amount: data.amount,
      paymentMode: data.paymentMode,
      type: txType,
      note: data.note,
      timestamp: new Date().toISOString(),
    };
    setExpenses((prev) => [newExp, ...prev]);

    if (txType === "income") {
      showToast(`Logged +₹${data.amount.toLocaleString("en-IN")} income (${data.title})`);
      return;
    }

    const nextToday = todaySpent + data.amount;
    checkAutoLockdown(nextToday);
    checkBudgetThresholdAlerts(todaySpent, nextToday);
    if (isMidnightCraving) {
      showToast(
        `🌙 Midnight Impulse Alert! Late-night ${data.category} (−₹${data.amount}) leaks daily budgets!`
      );
    } else {
      showToast(`Logged −₹${data.amount.toLocaleString("en-IN")} for ${data.title}`);
    }
  };

  const handleUpdateExpense = (updated: Expense) => {
    playQuickAddChirp();
    const nextList = expenses.map((e) => (e.id === updated.id ? updated : e));
    setExpenses(nextList);
    setEditingExpense(null);

    if (updated.type !== "income") {
      const todayStr = now.toDateString();
      const nextToday = nextList
        .filter((e) => e.type !== "income" && new Date(e.timestamp).toDateString() === todayStr)
        .reduce((sum, e) => sum + e.amount, 0);
      checkAutoLockdown(nextToday);
      checkBudgetThresholdAlerts(todaySpent, nextToday);
    }

    showToast(
      `Updated ${updated.title} (${
        updated.type === "income" ? "+" : "−"
      }₹${updated.amount.toLocaleString("en-IN")})`
    );
  };

  const handleOpenAddExpenseModal = () => {
    setEditingExpense(null);
    setAddModalType("expense");
    setAddModalTab("manual");
    setIsAddModalOpen(true);
  };

  const handleOpenAddIncomeModal = () => {
    setEditingExpense(null);
    setAddModalType("income");
    setAddModalTab("manual");
    setIsAddModalOpen(true);
  };

  const handleOpenScanReceiptModal = () => {
    setEditingExpense(null);
    setAddModalType("expense");
    setAddModalTab("ocr");
    setIsAddModalOpen(true);
  };

  const handleEditTransaction = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddModalOpen(true);
  };

  const handleQuickAdd = (preset: QuickAddPreset) => {
    if (lockdownActive) {
      playLockdownThud();
      showToast("Emergency Lockdown active · Lift lockdown to log");
      return;
    }
    const currentHour = new Date().getHours();
    const isMidnightCraving =
      (currentHour >= 22 || currentHour < 4) &&
      (preset.category === "Food" || preset.category === "Chai & Snacks");

    if (isMidnightCraving) {
      playMidnightCravingsChime();
    } else {
      playStarkPowerSurgeSwoosh();
      playQuickAddChirp();
    }

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      title: preset.label,
      category: preset.category,
      amount: preset.amount,
      paymentMode: "UPI",
      type: "expense",
      timestamp: new Date().toISOString(),
    };
    setExpenses((prev) => [newExp, ...prev]);
    const nextToday = todaySpent + preset.amount;
    checkAutoLockdown(nextToday);
    checkBudgetThresholdAlerts(todaySpent, nextToday);
    if (isMidnightCraving) {
      showToast(
        `🌙 Midnight Impulse Alert: ${preset.emoji} ${preset.label} (−₹${preset.amount}) logged after 10 PM!`
      );
    } else {
      showToast(`Added ${preset.emoji} ${preset.label} · −₹${preset.amount}`);
    }
  };

  const handleDeleteExpense = (id: string) => {
    const target = expenses.find((e) => e.id === id);
    if (!target) return;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast(
      `Deleted ${target.title} (${target.type === "income" ? "+" : "−"}₹${target.amount})`,
      target
    );
  };

  const handleUndoDelete = () => {
    if (!toast?.deletedExpense) return;
    const restored = toast.deletedExpense;
    setExpenses((prev) => [restored, ...prev]);
    setToast(null);
  };

  const handleResetAllExpenses = () => {
    setExpenses([]);
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.expenses), JSON.stringify([]));
    setLockdownActive(false);
    localStorage.setItem(scopedStorageKey(STORAGE_KEYS.lockdown), "false");
    showToast("All expense records cleared");
  };

  // Khata Handlers
  const handleAddKhataEntry = (friendId: string, description: string, amount: number) => {
    setKhataFriends((prev) =>
      prev.map((f) =>
        f.id === friendId
          ? {
              ...f,
              entries: [
                {
                  id: `ke-${Date.now()}`,
                  description,
                  amount,
                  timestamp: new Date().toISOString(),
                  settled: false,
                },
                ...f.entries,
              ],
            }
          : f
      )
    );
    showToast("Updated Khata ledger");
  };

  const handleAddFriendAndEntry = (
    name: string,
    phone: string,
    description: string,
    amount: number,
    upiId?: string
  ) => {
    const initials = name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const newFriend: KhataFriend = {
      id: `fr-${Date.now()}`,
      name,
      phone: phone.replace(/\D/g, "") || "",
      avatarInitials: initials || "FR",
      upiId: upiId || undefined,
      entries: [
        {
          id: `ke-${Date.now()}`,
          description,
          amount,
          timestamp: new Date().toISOString(),
          settled: false,
        },
      ],
    };
    setKhataFriends((prev) => [newFriend, ...prev]);
    showToast(`Added ${name} to Khata`);
  };

  const handleUpdateFriendUpi = (friendId: string, upiId: string) => {
    setKhataFriends((prev) =>
      prev.map((f) => (f.id === friendId ? { ...f, upiId } : f))
    );
    showToast("Updated friend's UPI ID");
  };

  const handleTriggerCelebration = (type: "streak" | "shield") => {
    if (type === "streak") {
      celebrateStreakMilestone(streakDays, theme.accentHex);
      showToast(`🎊 ${streakDays}-Day Discipline Streak Celebrated! Victory chime played.`);
    } else {
      celebrateDisciplineShield(theme.accentHex);
      showToast(`🛡️ Discipline Shield Activated! Spent only ₹${todaySpent} of ₹${dailyLimit}.`);
    }
  };

  const handleSplitAmongFriends = (
    friendIds: string[],
    description: string,
    totalBill: number,
    includeSelf: boolean
  ) => {
    const divisor = friendIds.length + (includeSelf ? 1 : 0);
    const share = Math.round(totalBill / Math.max(1, divisor));

    setKhataFriends((prev) =>
      prev.map((f) =>
        friendIds.includes(f.id)
          ? {
              ...f,
              entries: [
                {
                  id: `ke-${Date.now()}-${f.id}`,
                  description: `${description} (Split)`,
                  amount: share,
                  timestamp: new Date().toISOString(),
                  settled: false,
                },
                ...f.entries,
              ],
            }
          : f
      )
    );
    showToast(`Split ₹${totalBill} · ₹${share} / person`);
  };

  const handleSettleFriend = (friendId: string) => {
    const targetFriend = khataFriends.find((f) => f.id === friendId);
    const settledAmount = targetFriend
      ? Math.abs(
          targetFriend.entries
            .filter((e) => !e.settled)
            .reduce((acc, e) => acc + e.amount, 0)
        ) || 500
      : 500;

    playMetallicCoinChime();
    playCashRegisterChime();

    // Feature 2: "DESI SOUNDBOX VOICE" in Khata
    const soundboxLine = `KHARChe par ${settledAmount} rupaye prapt hue!`;
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(soundboxLine);
        utterance.lang = "hi-IN";
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        const voices = window.speechSynthesis.getVoices();
        const hindiVoice =
          voices.find((v) => v.lang.toLowerCase().includes("hi")) ||
          voices.find((v) => v.lang.toLowerCase().includes("en-in"));
        if (hindiVoice) utterance.voice = hindiVoice;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // ignore speech synthesis restrictions
    }

    setKhataFriends((prev) =>
      prev.map((f) =>
        f.id === friendId
          ? {
              ...f,
              entries: f.entries.map((e) => ({ ...e, settled: true })),
            }
          : f
      )
    );
    showToast(`🔊 "${soundboxLine}"`);
  };

  // LocalStorage Backup & Export/Import Safeguard
  const handleExportBackup = () => {
    playQuickAddChirp();
    const backupPayload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      dailyLimit,
      myUpiId,
      themeId,
      isProActive,
      proUtr: localStorage.getItem(scopedStorageKey("kharche_pro_utr_v1")) || "",
      lockdownActive,
      autoLockdownAt90,
      unlockedBadgeIds,
      pinnedBadgeIds,
      expenses,
      khataFriends,
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `kharche-backup-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(
      `💾 Exported ${expenses.length} transactions & ${khataFriends.length} Khata records to JSON`
    );
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = typeof reader.result === "string" ? reader.result : "";
        const parsed = JSON.parse(raw) as Partial<{
          dailyLimit: number;
          myUpiId: string;
          themeId: ThemeId;
          isProActive: boolean;
          proUtr: string;
          lockdownActive: boolean;
          autoLockdownAt90: boolean;
          unlockedBadgeIds: string[];
          pinnedBadgeIds: string[];
          expenses: unknown[];
          khataFriends: KhataFriend[];
        }>;

        if (!Array.isArray(parsed.expenses) && !Array.isArray(parsed.khataFriends)) {
          showToast("⚠️ Invalid backup file: missing expenses or Khata ledger");
          return;
        }

        let validExpensesCount = expenses.length;
        if (Array.isArray(parsed.expenses)) {
          const validatedExpenses = parsed.expenses.filter(isValidExpenseRecord);
          if (parsed.expenses.length > 0 && validatedExpenses.length === 0) {
            showToast("⚠️ Backup rejected: expense records failed schema validation");
            return;
          }
          validExpensesCount = validatedExpenses.length;
          setExpenses(validatedExpenses);
          localStorage.setItem(scopedStorageKey(STORAGE_KEYS.expenses), JSON.stringify(validatedExpenses));
        }
        if (Array.isArray(parsed.khataFriends)) {
          const validatedFriends = parsed.khataFriends.filter(isValidKhataFriend);
          setKhataFriends(validatedFriends);
          localStorage.setItem(scopedStorageKey(STORAGE_KEYS.khata), JSON.stringify(validatedFriends));
        }
        if (
          typeof parsed.dailyLimit === "number" &&
          Number.isFinite(parsed.dailyLimit) &&
          parsed.dailyLimit >= 50 &&
          parsed.dailyLimit <= 1000000
        ) {
          setDailyLimit(Math.round(parsed.dailyLimit));
          localStorage.setItem(scopedStorageKey(STORAGE_KEYS.dailyLimit), String(Math.round(parsed.dailyLimit)));
        }
        setThemeId("stark");
        localStorage.setItem(scopedStorageKey(STORAGE_KEYS.theme), "stark");
        if (typeof parsed.lockdownActive === "boolean") {
          setLockdownActive(parsed.lockdownActive);
          localStorage.setItem(scopedStorageKey(STORAGE_KEYS.lockdown), String(parsed.lockdownActive));
        }
        if (typeof parsed.autoLockdownAt90 === "boolean") {
          setAutoLockdownAt90(parsed.autoLockdownAt90);
          localStorage.setItem(scopedStorageKey(STORAGE_KEYS.autoLockdown), String(parsed.autoLockdownAt90));
        }
        if (typeof parsed.myUpiId === "string" && parsed.myUpiId.includes("@")) {
          setMyUpiId(parsed.myUpiId.trim());
          localStorage.setItem(scopedStorageKey("kharche_my_upi_id_v1"), parsed.myUpiId.trim());
        }
        const cleanedBackupUtr =
          typeof parsed.proUtr === "string" ? parsed.proUtr.trim() : "";
        if (/^\d{12}$/.test(cleanedBackupUtr)) {
          localStorage.setItem(scopedStorageKey("kharche_pro_submitted_utr_v1"), cleanedBackupUtr);
        }
        // Premium access is server-authoritative; backup files cannot unlock paid Pro.
        if (Array.isArray(parsed.unlockedBadgeIds)) {
          const cleanUnlocked = parsed.unlockedBadgeIds.filter(
            (id): id is string => typeof id === "string"
          );
          setUnlockedBadgeIds(cleanUnlocked);
          localStorage.setItem(
            "kharche_stark_unlocked_badges_v1",
            JSON.stringify(cleanUnlocked)
          );
        }
        if (Array.isArray(parsed.pinnedBadgeIds)) {
          const cleanPinned = parsed.pinnedBadgeIds.filter(
            (id): id is string => typeof id === "string"
          );
          setPinnedBadgeIds(cleanPinned);
          localStorage.setItem(
            "kharche_stark_pinned_badges_v1",
            JSON.stringify(cleanPinned)
          );
        }

        playQuickAddChirp();
        showToast(`✅ Backup restored: ${validExpensesCount} valid transactions recovered`);
      } catch {
        showToast("⚠️ Failed to parse JSON backup file. Please select a valid backup.");
      }
    };
    reader.readAsText(file);
  };

  // Global Escape key listener for accessible modal dismissal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isFakeMomCallOpen) {
        handleEndFakeMomCall();
      } else if (isThemeModalOpen) {
        setIsThemeModalOpen(false);
      } else if (isAddModalOpen) {
        setIsAddModalOpen(false);
        setEditingExpense(null);
      } else if (isProfileOpen) {
        setIsProfileOpen(false);
      } else if (isJarvisOpen) {
        setIsJarvisOpen(false);
      } else if (isRewardVaultOpen) {
        setIsRewardVaultOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isFakeMomCallOpen,
    isThemeModalOpen,
    isAddModalOpen,
    isProfileOpen,
    isJarvisOpen,
    isRewardVaultOpen,
  ]);

  const navItems: Array<{
    id: TabId;
    label: string;
    pageTitle: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }> = [
    { id: "home", label: "Dashboard", pageTitle: "Dashboard Overview", icon: Home },
    { id: "history", label: "Transactions", pageTitle: "Transaction Ledger", icon: History },
    { id: "insights", label: "Analytics", pageTitle: "Analytics & Reports", icon: PieChart },
    { id: "khata", label: "Khata", pageTitle: "Shared Khata Ledger", icon: Users },
    { id: "pro", label: "PRO", pageTitle: "Kharchee PRO Vault", icon: Crown },
  ];

  const currentPageTitle =
    navItems.find((item) => item.id === activeTab)?.pageTitle || "Dashboard Overview";

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100 flex">
      {/* DESKTOP SIDEBAR NAVIGATION (md+ SaaS Workspace Canvas) */}
      <aside
        aria-label="Sidebar Navigation"
        className="hidden md:flex w-64 shrink-0 flex-col justify-between bg-[#0b1019] border-r border-white/[0.07] p-4 sticky top-0 h-screen z-40"
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-display font-black text-indigo-300 text-sm">
              ₹
            </div>
            <div>
              <span className="font-display font-black text-sm tracking-[0.18em] text-white block">
                KHARCHEE
              </span>
              <span className="text-[11px] text-slate-400">Personal Finance OS</span>
            </div>
          </div>

          {/* Primary Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              const isProTab = item.id === "pro";

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? isProTab
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/40"
                        : "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isProTab
                          ? "text-amber-400"
                          : active
                          ? "text-white"
                          : "text-slate-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {isProTab && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-[9px] font-mono font-bold text-amber-300">
                      VIP
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Actions: Quick Add & Jarvis AI Assistant */}
        <div className="space-y-2.5 pt-4 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={handleOpenAddExpenseModal}
            className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>+ Add Transaction</span>
          </button>

          <button
            type="button"
            onClick={handleOpenJarvisWithBootSequence}
            className="w-full py-2.5 px-3 rounded-xl bg-[#101722] hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-indigo-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ask J.A.R.V.I.S. AI</span>
          </button>
        </div>
      </aside>

      {/* MAIN RESPONSIVE VIEWPORT */}
      <div className="flex-1 min-w-0 min-h-screen bg-[#080b12] flex flex-col relative overflow-x-hidden">
        <ThemeBackdrop theme={theme} />

        {/* TOP SAAS HEADER */}
        <Header
          currentThemeId={themeId}
          currentPageTitle={currentPageTitle}
          streakCount={streakDays}
          userInitials="MS"
          vaultReady={expenses.length > 0 || todaySpent <= dailyLimit}
          stealthMode={stealthMode}
          onToggleStealthMode={() => {
            playQuickAddChirp();
            setStealthMode((prev) => {
              const next = !prev;
              localStorage.setItem(scopedStorageKey("kharche_stealth_mode_v1"), String(next));
              showToast(
                next
                  ? "👁️‍🗨️ Stealth Zero-Balance Shield ON: ₹0.00 / Empty Vault"
                  : "👁️ Stealth Shield OFF: Live telemetry restored"
              );
              return next;
            });
          }}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenThemes={() => setIsThemeModalOpen(true)}
          onOpenStreakCelebration={() => handleTriggerCelebration("streak")}
          onOpenRewardVault={() => setIsRewardVaultOpen(true)}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
        />

        {/* Contextual Utility Bar */}
        <div className="px-4 sm:px-6 py-2 bg-[#0b1019]/95 border-b border-white/[0.07] flex items-center justify-between gap-2 shrink-0 relative z-30 backdrop-blur-xl">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap pr-1">
            <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#131c29] border border-slate-800 text-[11px] font-medium text-slate-300 font-mono shrink-0">
              {formatLiveHeaderDate(now)}
            </div>

            <button
              type="button"
              onClick={() => void checkClipboardForTransactions(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#131c29] border border-slate-800 text-slate-300 hover:border-indigo-500/40 hover:text-white transition-colors text-[11px] font-medium shrink-0 cursor-pointer"
              title="Paste Bank SMS"
            >
              <span>Paste Bank SMS</span>
            </button>

            <button
              type="button"
              onClick={handleTriggerFakeMomCall}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#131c29] border border-slate-800 text-slate-300 hover:border-indigo-500/40 hover:text-white transition-colors text-[11px] font-medium shrink-0 cursor-pointer"
              title="Bail Me Out (Simulated Call)"
            >
              <PhoneIncoming className="w-3 h-3 text-indigo-400" />
              <span>Bail Out</span>
            </button>

            <button
              type="button"
              onClick={() => triggerStarkMorningBriefing(dailyLimit)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#131c29] border border-slate-800 text-slate-300 hover:border-indigo-500/40 hover:text-white transition-colors text-[11px] font-medium shrink-0 cursor-pointer"
              title="Morning Audio Briefing"
            >
              <span>Briefing</span>
            </button>
          </div>

          {!isProActive ? (
            <button
              type="button"
              onClick={() => setIsProTeaserOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 font-semibold text-[11px] font-mono tracking-tight transition-colors cursor-pointer shrink-0"
              title="Unlock Kharche PRO Black"
            >
              <span>★ PRO Black</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab("pro")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 font-semibold text-[11px] font-mono tracking-tight cursor-pointer transition-colors shrink-0"
              title="PRO Active Member"
            >
              <span>★ PRO Black</span>
            </button>
          )}
        </div>

        {/* "STARK MORNING BRIEFING" 3-SECOND AUTOMATIC AUDIO HUD BOOT-UP OVERLAY */}
        {isMorningBriefingOpen && (
          <aside
            role="status"
            aria-label="Stark Morning Telemetry Briefing"
            onClick={() => setIsMorningBriefingOpen(false)}
            className="mx-4 sm:mx-6 my-2 p-3.5 rounded-2xl border border-indigo-500/50 bg-[#101722] shadow-xl relative z-40 animate-in fade-in slide-in-from-top-3 duration-300 cursor-pointer overflow-hidden"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-indigo-400 shrink-0 bg-black flex items-center justify-center">
                  <img
                    src="/assets/aistudio/image_34394344.png"
                    alt="J.A.R.V.I.S."
                    className="w-full h-full object-cover scale-110"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-300">
                      DAILY FINANCIAL BRIEFING
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 mt-1 leading-relaxed">
                    &ldquo;Good morning. Systems synchronized. Daily limit calibrated to{" "}
                    <span className="font-mono font-bold text-emerald-400">
                      ₹{dailyLimit.toLocaleString("en-IN")}
                    </span>
                    . Maintain operational discipline today.&rdquo;
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMorningBriefingOpen(false);
                }}
                aria-label="Dismiss Morning Briefing"
                className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </aside>
        )}

        {/* Global Smart Auto-Detected Banking SMS Floating Banner */}
        {detectedTxn && (
          <aside
            role="alert"
            aria-label="Detected Banking Transaction"
            className="mx-4 sm:mx-6 my-2 p-3.5 rounded-2xl border border-indigo-500/40 bg-[#101722] shadow-xl relative z-30 animate-in slide-in-from-top-2 duration-300"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white shrink-0">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      Bank SMS Detected
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                      {detectedTxn.category} · {detectedTxn.paymentMode}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-100 mt-0.5 leading-snug">
                    Detected transaction:{" "}
                    <span className="font-mono text-emerald-400 font-extrabold text-sm">
                      ₹{detectedTxn.amount.toLocaleString("en-IN")}
                    </span>{" "}
                    to <span className="text-white">{detectedTxn.vendor}</span>.
                  </p>
                  <p className="text-[11px] text-slate-400">Add to Today's Expenses?</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetectedTxn(null)}
                className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                aria-label="Dismiss detected transaction"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleAddExpense({
                    title: detectedTxn.vendor,
                    amount: detectedTxn.amount,
                    category: detectedTxn.category,
                    paymentMode: detectedTxn.paymentMode,
                    note: `Auto-detected from bank SMS: ${detectedTxn.vendor}`,
                  });
                  setDetectedTxn(null);
                }}
                className="flex-1 h-9 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Confirm &amp; Add</span>
              </button>
              <button
                type="button"
                onClick={() => setDetectedTxn(null)}
                className="px-3.5 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
              >
                Dismiss
              </button>
            </div>
          </aside>
        )}

        {/* Scrollable Body Content — Responsive SaaS Container */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 relative z-10 max-w-5xl w-full mx-auto space-y-6">
          {activeTab === "home" && (
            <div className="space-y-6">
              {/* FINANCIAL SUMMARY CARDS + QUICK ACTIONS + SPENDING CHARTS */}
              <BudgetWidget
                dailyLimit={dailyLimit}
                todaySpent={todaySpent}
                lockdownActive={lockdownActive}
                theme={theme}
                expenses={expenses}
                streakDays={streakDays}
                stealthMode={stealthMode}
                onUpdateLimit={setDailyLimit}
                onToggleLockdown={() => {
                  const next = !lockdownActive;
                  if (next) {
                    playLockdownThud();
                  } else {
                    playQuickAddChirp();
                  }
                  setLockdownActive(next);
                  showToast(next ? "Emergency Lockdown active" : "Lockdown lifted");
                }}
                onOpenAddModal={handleOpenAddExpenseModal}
                onOpenAddIncomeModal={handleOpenAddIncomeModal}
                onOpenScanReceiptModal={handleOpenScanReceiptModal}
                onNavigateTab={setActiveTab}
                onQuickAdd={handleQuickAdd}
                onTriggerCelebration={handleTriggerCelebration}
                onTriggerFakeMomCall={handleTriggerFakeMomCall}
              />

              {/* RECENT TRANSACTIONS ("Recent Transactions") */}
              <section aria-label="Recent Transactions" className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Recent Transactions
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Latest income and expense activity · Click edit or delete on any row
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors"
                  >
                    View All ({expenses.length}) →
                  </button>
                </div>

                {recentExpenses.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-slate-800 bg-[#101722] text-center space-y-3">
                    <p className="text-sm font-semibold text-slate-200">
                      No transactions recorded yet
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Start tracking your cashflow by adding your first expense, logging an income inflow, or scanning a paper receipt.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={handleOpenAddExpenseModal}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors"
                      >
                        + Add Expense
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAddIncomeModal}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 cursor-pointer transition-colors"
                      >
                        + Add Income
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenScanReceiptModal}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer transition-colors"
                      >
                        Scan Receipt
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentExpenses.map((expense) => (
                      <SwipeableExpenseRow
                        key={expense.id}
                        expense={expense}
                        onDelete={handleDeleteExpense}
                        onEdit={handleEditTransaction}
                        myUpiId={myUpiId}
                        showDate={
                          new Date(expense.timestamp).toDateString() !==
                          now.toDateString()
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* FAN-ZONE THEMES */}
              <section id="tour-themes-bar" aria-label="Appearance" className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Accent &amp; Club Themes
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("pro")}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer transition-colors"
                  >
                    Theme Studio →
                  </button>
                </div>
                <ThemeSelector
                  currentTheme={themeId}
                  onSelectTheme={(id) => {
                    playQuickAddChirp();
                    setThemeId(id);
                  }}
                />
              </section>
            </div>
          )}

          {activeTab === "history" && (
            <HistoryView
              expenses={expenses}
              theme={theme}
              onDeleteExpense={handleDeleteExpense}
              onEditExpense={handleEditTransaction}
              onOpenAddModal={handleOpenAddExpenseModal}
              onOpenAddIncomeModal={handleOpenAddIncomeModal}
              onShowToast={showToast}
            />
          )}

          {activeTab === "insights" && (
            <InsightsView
              expenses={expenses}
              dailyLimit={dailyLimit}
              streakDays={streakDays}
              theme={theme}
            />
          )}

          {activeTab === "khata" && (
            <KhataView
              friends={khataFriends}
              theme={theme}
              myUpiId={myUpiId}
              onUpdateMyUpiId={(newId) => {
                setMyUpiId(newId);
                showToast(`Receiving UPI set to ${newId}`);
              }}
              onAddEntry={handleAddKhataEntry}
              onAddFriendAndEntry={handleAddFriendAndEntry}
              onSplitAmongFriends={handleSplitAmongFriends}
              onSettleFriend={handleSettleFriend}
              onUpdateFriendUpi={handleUpdateFriendUpi}
              onShowToast={showToast}
            />
          )}

          {activeTab === "pro" && (
            <ProView
              activeThemeId={themeId}
              theme={theme}
              isProActive={isProActive}
              autoLockdownAt90={autoLockdownAt90}
              notificationsEnabled={notificationsEnabled}
              notificationPermission={notificationPermission}
              disciplineScore={disciplineScore}
              dailyLimit={dailyLimit}
              todaySpent={todaySpent}
              expenses={expenses}
              friends={khataFriends}
              myUpiId={myUpiId}
              cardholderName="MRIGANDER SINGH"
              onSelectTheme={(id) => {
                setCustomThemeOverride(null);
                setThemeId(id);
              }}
              onApplyCustomTheme={(custom) => {
                setCustomThemeOverride(custom);
              }}
              onPurchasePro={handlePurchasePro}
              onToggleAutoLockdown={() => setAutoLockdownAt90((v) => !v)}
              onToggleNotifications={handleToggleNotifications}
              onSendTestNotification={handleSendTestNotification}
              onShowToast={showToast}
            />
          )}
        </main>

        {/* Floating 3D Iron Man Arc Reactor HUD Orb (64x64px) */}
        <button
          id="tour-jarvis-btn"
          type="button"
          onClick={handleOpenJarvisWithBootSequence}
          aria-label="J.A.R.V.I.S. Online - Open Tactical Financial Butler"
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 w-16 h-16 rounded-full bg-[#0b0f17] flex items-center justify-center active:scale-95 transition-transform cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {/* Idle Circular Cyber Ripples Expanding Outward into the Screen */}
          <span
            className="pointer-events-none absolute -inset-1.5 rounded-full border border-cyan-400/40 animate-ping"
            style={{ animationDuration: "2.8s" }}
          />
          <span
            className="pointer-events-none absolute -inset-3 rounded-full border border-cyan-300/25 animate-ping"
            style={{ animationDuration: "3.6s", animationDelay: "0.9s" }}
          />

          {/* Micro Holographic Badge on Hover / Press */}
          <span className="pointer-events-none absolute right-[74px] whitespace-nowrap px-2.5 py-1 rounded-md bg-[#0b0f17] border border-cyan-400/70 text-cyan-300 font-mono text-[10px] font-black tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(6,182,212,0.6)] opacity-0 scale-90 translate-x-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 group-active:opacity-100 group-active:scale-100 group-active:translate-x-0 transition-all duration-200">
            J.A.R.V.I.S. ONLINE
          </span>

          {/* Outer Layer: Rotating Dashed Cyan Tech Ring */}
          <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/85 animate-[spin_8s_linear_infinite]" />

          {/* Middle Layer: Holographic Blue Pulse Halo */}
          <span className="pointer-events-none absolute inset-1 rounded-full border border-cyan-300/80 shadow-[0_0_30px_rgba(6,182,212,0.8),inset_0_0_15px_rgba(6,182,212,0.5)]" />

          {/* Center: High-Res JARVIS Cyan Arc Core Graphic with Ambient Heartbeat Pulse */}
          <div className="relative z-10 w-11 h-11 rounded-full overflow-hidden bg-[#0b0f17] border border-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.95)] flex items-center justify-center animate-pulse">
            <img
              src="/assets/aistudio/image_34394344.png"
              alt="JARVIS Arc Reactor Core"
              className="w-full h-full object-cover object-[center_50.5%] scale-125 transition-transform duration-300 group-hover:scale-135"
            />
          </div>
        </button>

        {/* FEATURE 5: "BIOMETRIC HUD SCANNER ON BOOT" (1.5s Cyan Thumbprint Laser-Scan) */}
        {isBiometricScanning && (
          <div
            role="status"
            aria-label="Biometric HUD Scanner Active"
            onClick={() => setIsBiometricScanning(false)}
            className="fixed inset-0 z-50 bg-[#0b0f17]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 select-none cursor-pointer animate-in fade-in duration-150"
          >
            <div className="relative w-32 h-32 rounded-3xl bg-[#05080f] border-2 border-cyan-400/80 shadow-[0_0_50px_rgba(6,182,212,0.55),inset_0_0_25px_rgba(6,182,212,0.3)] flex items-center justify-center overflow-hidden">
              <Fingerprint className="w-16 h-16 text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.95)] animate-pulse" />
              {/* Sweeping Cyan Laser Line */}
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_20px_#00f0ff] animate-bounce" />
            </div>

            <div className="mt-5 text-center space-y-1">
              <span className="inline-block text-[10px] font-mono font-black uppercase tracking-[0.28em] text-cyan-300">
                STARK BIOMETRIC HUD SCANNER
              </span>
              <p className="text-sm font-black text-white tracking-wider uppercase">
                Verifying Sovereign Thumbprint...
              </p>
              <p className="text-[11px] font-mono text-cyan-200/80">
                IDENTITY CONFIRMED: MRIGANDER SINGH
              </p>
            </div>
          </div>
        )}

        {/* FEATURE 1: "FAKE MOM CALL ESCAPE" FULL-SCREEN INCOMING CALL OVERLAY */}
        {isFakeMomCallOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Incoming Call: Mummy"
            className="fixed inset-0 z-50 bg-gradient-to-b from-[#0b0f17] via-[#060911] to-black flex flex-col justify-between p-7 text-white select-none animate-in fade-in duration-200"
          >
            <div className="text-center pt-8 space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-300">
                {isMomCallConnected ? "00:08 · CALL IN PROGRESS" : "INCOMING MOBILE AUDIO CALL"}
              </span>
              <h2 className="text-3xl font-black tracking-tight text-white mt-3">
                Incoming Call: Mummy ❤️
              </h2>
              <p className="text-sm font-mono text-slate-300">
                +91 98110 ••••• · Home Calling...
              </p>
            </div>

            {/* Pulsing Avatar */}
            <div className="my-auto flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                <span className="absolute -inset-6 rounded-full bg-emerald-500/20 animate-ping" />
                <span className="absolute -inset-3 rounded-full border-2 border-emerald-400/40 animate-pulse" />
                <div className="relative z-10 w-28 h-28 rounded-full bg-gradient-to-br from-rose-500 via-amber-500 to-pink-600 border-4 border-white/20 shadow-[0_0_45px_rgba(244,63,94,0.5)] flex items-center justify-center text-4xl">
                  ❤️
                </div>
              </div>
              {isMomCallConnected && (
                <p className="mt-6 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-white/10 text-xs font-mono text-emerald-200 text-center max-w-xs">
                  &ldquo;Beta kahan hai? Abhi ke abhi ghar aaja, zaroori kaam hai!&rdquo;
                </p>
              )}
            </div>

            {/* Call Action Controls */}
            <div className="pb-6 grid grid-cols-2 gap-6 max-w-xs mx-auto w-full">
              <button
                type="button"
                onClick={handleEndFakeMomCall}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <span className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 shadow-[0_0_25px_rgba(225,29,72,0.7)] flex items-center justify-center active:scale-95 transition-transform">
                  <PhoneOff className="w-7 h-7 text-white" />
                </span>
                <span className="text-xs font-bold text-rose-300">
                  {isMomCallConnected ? "End Call" : "Decline"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopMomRingtone();
                  setIsMomCallConnected(true);
                  try {
                    if (typeof window !== "undefined" && "speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                      const u = new SpeechSynthesisUtterance(
                        "Beta kahan hai? Abhi ghar aaja, zaroori kaam hai!"
                      );
                      u.lang = "hi-IN";
                      window.speechSynthesis.speak(u);
                    }
                  } catch {
                    // ignore speech synthesis restrictions
                  }
                }}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <span className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.75)] flex items-center justify-center active:scale-95 transition-transform animate-bounce">
                  <PhoneIncoming className="w-7 h-7 text-slate-950" />
                </span>
                <span className="text-xs font-bold text-emerald-300">
                  {isMomCallConnected ? "On Speaker" : "Answer"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Full-Screen Cyan Holographic HUD Grid Overlay ("SYSTEMS ONLINE" Boot Sequence) */}
        {isJarvisBooting && (
          <div
            aria-hidden="true"
            className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-cyan-950/30 backdrop-blur-[2px] animate-in fade-in duration-150 overflow-hidden"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(6, 182, 212, 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.22) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              boxShadow: "inset 0 0 90px rgba(6, 182, 212, 0.65)",
            }}
          >
            <div className="relative flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-[#020408]/90 border-2 border-cyan-400 shadow-[0_0_45px_rgba(6,182,212,0.85)]">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-cyan-300 animate-[spin_3s_linear_infinite] flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.9)]">
                <div className="w-8 h-8 rounded-full bg-cyan-400/30 border border-cyan-200 animate-ping" />
              </div>
              <span className="font-mono text-xs font-black tracking-[0.28em] uppercase text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]">
                SYSTEMS ONLINE · RT-CORE ENGAGED
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-cyan-100/90">
                &ldquo;At your service, Sir. Perimeter secure.&rdquo;
              </span>
            </div>
          </div>
        )}

        {/* Jarvis Chat Modal Drawer */}
        <JarvisDrawer
          isOpen={isJarvisOpen}
          onClose={() => setIsJarvisOpen(false)}
          dailyLimit={dailyLimit}
          todaySpent={todaySpent}
          lockdownActive={lockdownActive}
          streakDays={streakDays}
          disciplineScore={disciplineScore}
          expenses={expenses}
          friends={khataFriends}
          theme={theme}
          onAddExpense={(title, amount, category) => {
            handleAddExpense({
              title,
              amount,
              category: (category as ExpenseCategory) || "Food",
              paymentMode: "UPI",
            });
          }}
          onToggleLockdown={(active) => {
            if (active) {
              playLockdownThud();
            } else {
              playQuickAddChirp();
            }
            setLockdownActive(active);
            localStorage.setItem(scopedStorageKey(STORAGE_KEYS.lockdown), String(active));
            showToast(active ? "🚨 Emergency Lockdown ACTIVATED by JARVIS" : "🛡️ Lockdown lifted by JARVIS");
          }}
          onUpdateDailyLimit={(newLimit) => {
            setDailyLimit(newLimit);
            localStorage.setItem(scopedStorageKey(STORAGE_KEYS.dailyLimit), String(newLimit));
            showToast(`Daily budget set to ₹${newLimit} by JARVIS`);
          }}
          onAddKhataEntry={(friendName, amount, description) => {
            playQuickAddChirp();
            const normalizedTarget = friendName.trim().toLowerCase();
            const existing = khataFriends.find(
              (f) =>
                f.name.toLowerCase() === normalizedTarget ||
                f.name.toLowerCase().startsWith(normalizedTarget)
            );
            if (existing) {
              handleAddKhataEntry(existing.id, description, amount);
              showToast(
                `🤝 Khata updated: ${existing.name} (${
                  amount >= 0 ? "+" : "−"
                }₹${Math.abs(amount)} for ${description})`
              );
            } else {
              handleAddFriendAndEntry(
                friendName.trim(),
                "",
                description,
                amount
              );
              showToast(
                `🤝 Added ${friendName.trim()} to Khata (${
                  amount >= 0 ? "+" : "−"
                }₹${Math.abs(amount)} for ${description})`
              );
            }
          }}
        />

        {/* Undo & Confirmation Toast Banner */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed left-4 right-4 md:left-auto md:right-24 md:w-96 bottom-20 md:bottom-6 z-50 rounded-2xl border px-3.5 py-2.5 shadow-2xl flex items-center justify-between gap-2 backdrop-blur-md bg-slate-900/95 transition-all"
            style={{
              borderColor: `${theme.accentHex}40`,
              boxShadow: `0 0 24px ${theme.accentHex}25`,
            }}
          >
            <span className="text-xs font-medium text-slate-100 truncate">
              {toast.message}
            </span>
            {toast.deletedExpense && (
              <button
                type="button"
                onClick={handleUndoDelete}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-cyan-300 flex items-center gap-1 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}
          </div>
        )}

        {/* Add / Edit Transaction Modal */}
        <AddExpenseModal
          isOpen={isAddModalOpen}
          lockdownActive={lockdownActive}
          theme={theme}
          initialTab={addModalTab}
          initialType={addModalType}
          editingExpense={editingExpense}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingExpense(null);
          }}
          onAddExpense={handleAddExpense}
          onUpdateExpense={handleUpdateExpense}
        />

        {/* CRED-Style Profile Drawer */}
        <ProfileDrawer
          isOpen={isProfileOpen}
          theme={theme}
          dailyLimit={dailyLimit}
          todaySpent={todaySpent}
          streakDays={streakDays}
          isProActive={isProActive}
          myUpiId={myUpiId}
          pinnedBadgeIds={pinnedBadgeIds}
          onUpdateMyUpiId={(newId) => {
            setMyUpiId(newId);
            showToast(`Receiving UPI set to ${newId}`);
          }}
          onClose={() => setIsProfileOpen(false)}
          onUpdateDailyLimit={(newLimit) => {
            setDailyLimit(newLimit);
            localStorage.setItem(scopedStorageKey(STORAGE_KEYS.dailyLimit), String(newLimit));
            showToast(`Daily budget set to ₹${newLimit}`);
          }}
          onResetExpenses={handleResetAllExpenses}
          onTogglePro={() => {
            const next = !isProActive;
            setIsProActive(next);
            localStorage.setItem(scopedStorageKey(STORAGE_KEYS.pro), String(next));
            showToast(next ? "KHARCHE PRO Black Active" : "Standard Tier");
          }}
          onShowToast={showToast}
          onReplayTour={handleReplayTour}
          onOpenRewardVault={() => setIsRewardVaultOpen(true)}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
            onSignOut={signOutCurrentUser}
        />

        {/* Stark Reward Vault (Daily Discipline Cyber Roulette Wheel) */}
        <StarkRewardVaultModal
          isOpen={isRewardVaultOpen}
          theme={theme}
          unlockedBadgeIds={unlockedBadgeIds}
          pinnedBadgeIds={pinnedBadgeIds}
          todaySpent={todaySpent}
          dailyLimit={dailyLimit}
          expensesCount={expenses.length}
          onUnlockAndPinBadge={handleUnlockAndPinBadge}
          onTogglePinBadge={handleTogglePinBadge}
          onClose={() => setIsRewardVaultOpen(false)}
        />

        {/* First-Time User Onboarding Modal (CRED Style) */}
        <OnboardingModal
          isOpen={isOnboardingOpen}
          theme={theme}
          initialIncome={25000}
          onComplete={handleOnboardingComplete}
        />

        {/* Interactive Quick App Tour with Spotlight Overlay */}
        <AppTour
          isOpen={isTourActive}
          theme={theme}
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
        />

        {/* PRO Upgrade Encouragement / 3-Day Free Trial Modal */}
        <ProTrialModal
          isOpen={isProTeaserOpen}
          theme={theme}
          onClaimTrial={handleClaimProTrial}
          onDismiss={() => setIsProTeaserOpen(false)}
        />

        {/* Quick Header Theme Selector Modal */}
        {isThemeModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select Appearance"
            onClick={() => setIsThemeModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[420px] rounded-3xl border border-slate-800 bg-[#0b101d] p-5 space-y-3 shadow-2xl"
            >
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-bold tracking-wider uppercase text-white">
                    Select Accent / Club Theme
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Choose your preferred dashboard accent theme
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsThemeModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ThemeSelector
                currentTheme={themeId}
                onSelectTheme={(id) => {
                  playQuickAddChirp();
                  setThemeId(id);
                  setIsThemeModalOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar (5 Tabs) - Shown on mobile/narrow viewports (<768px) */}
        <nav
          aria-label="Mobile Navigation"
          style={{
            backgroundColor: "#080c14",
            backgroundImage: "none",
            borderTop: "1px solid #1e293b",
          }}
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#080c14] px-2 flex items-center justify-around shrink-0"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const isProTab = item.id === "pro";

            if (isProTab) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl mx-0.5 transition-colors cursor-pointer relative ${
                    active
                      ? "bg-amber-500/15 border border-amber-400/50"
                      : "bg-transparent hover:bg-slate-900 border border-transparent"
                  }`}
                >
                  <span className="absolute -top-2 px-1.5 py-[1px] rounded-full bg-amber-400 text-black font-mono text-[8px] font-black uppercase tracking-wider leading-tight whitespace-nowrap">
                    ★ VIP
                  </span>

                  <div className="relative flex flex-col items-center mt-1">
                    <Crown
                      className="w-4 h-4 text-amber-400 transition-transform duration-200"
                      style={{
                        fill: active ? "rgba(251, 191, 36, 0.35)" : "rgba(251, 191, 36, 0.15)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-amber-400 mt-0.5">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl mx-0.5 transition-colors cursor-pointer relative ${
                  active
                    ? "text-indigo-300 bg-indigo-500/15 border border-indigo-500/35"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <div className="relative flex flex-col items-center">
                  <Icon
                    className={`w-4 h-4 transition-transform duration-200 ${
                      active ? "text-indigo-400" : ""
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold tracking-tight mt-0.5 transition-colors ${
                    active ? "text-indigo-200" : ""
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default App;
