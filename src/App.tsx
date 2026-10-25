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

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [now, setNow] = useState<Date>(() => new Date());

  // Persistent State
  const [dailyLimit, setDailyLimit] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.dailyLimit);
    return saved ? Number(saved) || 500 : 500;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.expenses);
    if (saved) {
      try {
        return JSON.parse(saved) as Expense[];
      } catch {
        return createInitialExpenses();
      }
    }
    return createInitialExpenses();
  });

  const [khataFriends, setKhataFriends] = useState<KhataFriend[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.khata);
    if (saved) {
      try {
        return JSON.parse(saved) as KhataFriend[];
      } catch {
        return createInitialKhata();
      }
    }
    return createInitialKhata();
  });

  const [lockdownActive, setLockdownActive] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.lockdown) === "true";
  });

  const [themeId, setThemeId] = useState<ThemeId>(() => {
    return "avengers";
  });

  const [customThemeOverride, setCustomThemeOverride] = useState<{
    name: string;
    primaryHex: string;
    glowIntensity: number;
  } | null>(null);

  const [isProActive, setIsProActive] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.pro) === "true";
  });

  const [autoLockdownAt90, setAutoLockdownAt90] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.autoLockdown) === "true";
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.notifications);
    return saved !== null ? saved === "true" : true;
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() =>
    getNotificationPermission()
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [isJarvisBooting, setIsJarvisBooting] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isRewardVaultOpen, setIsRewardVaultOpen] = useState(false);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("kharche_stark_unlocked_badges_v1");
      return saved ? JSON.parse(saved) : ["iron-discipline", "zero-leak-legend"];
    } catch {
      return ["iron-discipline", "zero-leak-legend"];
    }
  });
  const [pinnedBadgeIds, setPinnedBadgeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("kharche_stark_pinned_badges_v1");
      return saved ? JSON.parse(saved) : ["iron-discipline", "zero-leak-legend"];
    } catch {
      return ["iron-discipline", "zero-leak-legend"];
    }
  });
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.onboarding) !== "true";
  });
  const [isTourActive, setIsTourActive] = useState(false);
  const [isProTeaserOpen, setIsProTeaserOpen] = useState(false);

  // Feature 4: "STEALTH ZERO-BALANCE SHIELD" (Privacy Toggle)
  const [stealthMode, setStealthMode] = useState<boolean>(() => {
    return localStorage.getItem("kharche_stealth_mode_v1") === "true";
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
      localStorage.setItem("kharche_stark_unlocked_badges_v1", JSON.stringify(next));
      return next;
    });
    setPinnedBadgeIds((prev) => {
      const next = prev.includes(badgeId) ? prev : [...prev, badgeId];
      localStorage.setItem("kharche_stark_pinned_badges_v1", JSON.stringify(next));
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
      localStorage.setItem("kharche_stark_pinned_badges_v1", JSON.stringify(next));
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
    return localStorage.getItem("kharche_my_upi_id_v1") || "mrigander@upi";
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
    const lastBriefedDate = localStorage.getItem("kharche_morning_briefing_date_v1");
    if (lastBriefedDate !== todayKey) {
      localStorage.setItem("kharche_morning_briefing_date_v1", todayKey);
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
    localStorage.setItem(STORAGE_KEYS.dailyLimit, String(dailyLimit));
  }, [dailyLimit]);

  useEffect(() => {
    localStorage.setItem("kharche_my_upi_id_v1", myUpiId);
  }, [myUpiId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.khata, JSON.stringify(khataFriends));
  }, [khataFriends]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.lockdown, String(lockdownActive));
  }, [lockdownActive]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, themeId);
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.pro, String(isProActive));
  }, [isProActive]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.autoLockdown, String(autoLockdownAt90));
  }, [autoLockdownAt90]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notifications, String(notificationsEnabled));
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

  // Calculate Today's Spend
  const todaySpent = useMemo(() => {
    const todayStr = now.toDateString();
    return expenses
      .filter((e) => new Date(e.timestamp).toDateString() === todayStr)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, now]);

  // Calculate Dynamic Discipline Streak
  const streakDays = useMemo(() => {
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() - i);
      const dayStr = checkDate.toDateString();
      const dayTotal = expenses
        .filter((e) => new Date(e.timestamp).toDateString() === dayStr)
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
      .slice(0, 5);
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
    localStorage.setItem(STORAGE_KEYS.onboarding, "true");
    localStorage.setItem("kharche_user_name_v1", data.userName);
    localStorage.setItem("kharche_user_email_v1", data.email);
    localStorage.setItem(
      STORAGE_KEYS.financialProfile,
      JSON.stringify({
        income: data.monthlyIncome,
        savings: data.savingsTarget,
        calibratedAt: new Date().toISOString(),
      })
    );
    setDailyLimit(data.dailyLimit);
    localStorage.setItem(STORAGE_KEYS.dailyLimit, String(data.dailyLimit));
    setNotificationsEnabled(data.notificationsEnabled);
    localStorage.setItem(STORAGE_KEYS.notifications, String(data.notificationsEnabled));

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
    setIsProActive(true);
    localStorage.setItem(STORAGE_KEYS.pro, "true");
    localStorage.setItem("kharche_pro_trial_v1", "claimed");
    setIsProTeaserOpen(false);
    showToast("🎉 3-Day PRO Black Trial Activated! All themes & AI uncapped");
  };

  const handleReplayTour = () => {
    setIsOnboardingOpen(true);
  };

  const handleAddExpense = (data: {
    title: string;
    amount: number;
    category: ExpenseCategory;
    paymentMode: PaymentMode;
    note?: string;
  }) => {
    const currentHour = new Date().getHours();
    const isMidnightCraving =
      (currentHour >= 22 || currentHour < 4) &&
      (data.category === "Food" || data.category === "Chai & Snacks");

    if (isMidnightCraving) {
      playMidnightCravingsChime();
    } else {
      playQuickAddChirp();
    }

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      title: data.title,
      category: data.category,
      amount: data.amount,
      paymentMode: data.paymentMode,
      note: data.note,
      timestamp: new Date().toISOString(),
    };
    setExpenses((prev) => [newExp, ...prev]);
    const nextToday = todaySpent + data.amount;
    checkAutoLockdown(nextToday);
    checkBudgetThresholdAlerts(todaySpent, nextToday);
    if (isMidnightCraving) {
      showToast(
        `🌙 Midnight Impulse Alert! Late-night ${data.category} (−₹${data.amount}) leaks daily budgets!`
      );
    } else {
      showToast(`Logged ₹${data.amount} for ${data.title}`);
    }
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
      playQuickAddChirp();
    }

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      title: preset.label,
      category: preset.category,
      amount: preset.amount,
      paymentMode: "UPI",
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
    showToast(`Deleted ${target.title} (−₹${target.amount})`, target);
  };

  const handleUndoDelete = () => {
    if (!toast?.deletedExpense) return;
    const restored = toast.deletedExpense;
    setExpenses((prev) => [restored, ...prev]);
    setToast(null);
  };

  const handleResetAllExpenses = () => {
    const initial = createInitialExpenses();
    setExpenses(initial);
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(initial));
    setLockdownActive(false);
    localStorage.setItem(STORAGE_KEYS.lockdown, "false");
    showToast("All expense records reset to demo defaults");
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
      phone: phone.replace(/\D/g, "") || "919800000000",
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

  const navItems: Array<{
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }> = [
    { id: "home", label: "Home", icon: Home },
    { id: "history", label: "History", icon: History },
    { id: "insights", label: "Insights", icon: PieChart },
    { id: "khata", label: "Khata", icon: Users },
    { id: "pro", label: "PRO", icon: Crown },
  ];

  return (
    <div className="min-h-screen bg-black flex justify-center items-start sm:py-3 sm:px-4">
      {/* 1. MOBILE-FIRST COMPACT CONTAINER (max-w-[430px] mx-auto min-h-screen px-4 py-3) */}
      <div
        className="w-full max-w-[430px] min-h-screen sm:min-h-[860px] sm:max-h-[920px] bg-slate-950 sm:border sm:rounded-[40px] flex flex-col relative overflow-hidden transition-all duration-500"
        style={{
          borderColor: `${theme.accentHex}40`,
          boxShadow: `0 0 45px ${theme.accentHex}18, 0 25px 60px rgba(0,0,0,0.95)`,
        }}
      >
        <ThemeBackdrop theme={theme} />

        {/* 2. AUTHENTIC LOGO & GAMIFIED STREAK HEADER */}
        <Header
          currentThemeId={themeId}
          streakCount={streakDays}
          userInitials="MS"
          vaultReady={expenses.length > 0 || todaySpent <= dailyLimit}
          stealthMode={stealthMode}
          onToggleStealthMode={() => {
            playQuickAddChirp();
            setStealthMode((prev) => {
              const next = !prev;
              localStorage.setItem("kharche_stealth_mode_v1", String(next));
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
        />

        {/* Sub-Header Telemetry & Quick Utility Strip */}
        <div
          className="px-4 py-2 bg-[#0b0f17]/95 border-b flex items-center justify-between gap-1.5 shrink-0 backdrop-blur-xl"
          style={{ borderColor: `${theme.accentHex}20` }}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Live date badge */}
            <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-900/90 border border-white/10 text-[10px] font-medium text-slate-300 font-mono shadow-xs">
              {formatLiveHeaderDate(now)}
            </div>

            {/* Discipline Shield: Awarded when daily spend remains strictly under 50% limit */}
            {dailyLimit > 0 && todaySpent <= dailyLimit * 0.5 && (
              <button
                type="button"
                onClick={() => handleTriggerCelebration("shield")}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 font-mono shadow-xs hover:border-emerald-300 active:scale-95 transition-all cursor-pointer"
                title="Discipline Shield Active (Spend < 50% limit) · Tap to celebrate"
              >
                <Shield className="w-2.5 h-2.5 text-emerald-400" />
                <span>Shield 50%</span>
              </button>
            )}

            {/* Glowing Mystery Vault Chest when user logs expenses or stays under budget */}
            {(expenses.length > 0 || todaySpent <= dailyLimit) && (
              <button
                type="button"
                onClick={() => setIsRewardVaultOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-[10px] font-bold text-amber-300 font-mono shadow-[0_0_12px_rgba(251,191,36,0.35)] hover:border-amber-300 active:scale-95 transition-all cursor-pointer"
                title="Stark Reward Vault · Spin Daily Discipline Roulette"
              >
                <span>🎁</span>
                <span>Mystery Vault</span>
              </button>
            )}

            {/* 1-Tap "Bail Me Out" (Fake Mom Call Escape) */}
            <button
              type="button"
              onClick={handleTriggerFakeMomCall}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-[10px] font-bold text-emerald-300 font-mono shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:border-emerald-300 active:scale-95 transition-all cursor-pointer"
              title="Fake Mom Call Escape · Trigger Incoming Call: Mummy ❤️"
            >
              <span>📞</span>
              <span>Bail Me Out</span>
            </button>

            {/* 1-Tap Manual Paste SMS trigger for Clipboard Detection */}
            <button
              type="button"
              onClick={() => void checkClipboardForTransactions(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/90 border border-cyan-400/40 text-[10px] font-bold text-cyan-300 font-mono shadow-xs hover:border-cyan-300 active:scale-95 transition-all cursor-pointer"
              title="Inspect clipboard for bank/UPI transaction SMS"
            >
              <span>📋</span>
              <span>Paste SMS</span>
            </button>

            {/* 1-Tap Replay Stark Morning Briefing Audio HUD */}
            <button
              type="button"
              onClick={() => triggerStarkMorningBriefing(dailyLimit)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/90 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 font-mono shadow-xs hover:border-emerald-300 active:scale-95 transition-all cursor-pointer"
              title="Replay Stark Morning Briefing Audio HUD"
            >
              <span>🎙️</span>
              <span>Briefing</span>
            </button>
          </div>

          {!isProActive ? (
            <button
              type="button"
              onClick={() => setIsProTeaserOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-amber-400/40 text-[10px] font-bold text-amber-300 font-mono shadow-xs hover:border-amber-400 hover:text-amber-200 active:scale-95 transition-all cursor-pointer shrink-0"
              title="Unlock Kharche PRO Black · 3 Days Free Trial"
            >
              <Crown className="w-3 h-3 text-amber-400" />
              <span>PRO · 3d Free</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab("pro")}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/20 text-[10px] font-bold text-slate-200 font-mono shadow-xs cursor-pointer hover:border-white/40 shrink-0"
              title="PRO Active Member"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-amber-300">★ PRO Black</span>
            </button>
          )}
        </div>

        {/* "STARK MORNING BRIEFING" 3-SECOND AUTOMATIC AUDIO HUD BOOT-UP OVERLAY */}
        {isMorningBriefingOpen && (
          <aside
            role="status"
            aria-label="Stark Morning Telemetry Briefing"
            onClick={() => setIsMorningBriefingOpen(false)}
            className="mx-4 my-2 p-3.5 rounded-2xl border-2 border-cyan-400/80 bg-slate-950/95 backdrop-blur-2xl shadow-[0_0_35px_rgba(34,211,238,0.45)] relative z-40 animate-in fade-in slide-in-from-top-3 duration-300 cursor-pointer overflow-hidden"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.9)] shrink-0 bg-black flex items-center justify-center">
                  <img
                    src="/assets/aistudio/image_34394344.png"
                    alt="J.A.R.V.I.S."
                    className="w-full h-full object-cover scale-110"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-300">
                      STARK MORNING BRIEFING · HUD SYNC
                    </span>
                  </div>
                  <p className="text-xs font-medium text-cyan-50 mt-1 leading-relaxed">
                    &ldquo;Good morning, Sir. Systems synchronized. Daily limit calibrated to{" "}
                    <span className="font-mono font-black text-emerald-400">
                      ₹{dailyLimit.toLocaleString("en-IN")}
                    </span>
                    . Let&apos;s maintain operational discipline today.&rdquo;
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
                className="w-6 h-6 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center shrink-0"
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
            className="mx-4 my-2 p-3.5 rounded-2xl border bg-slate-900/95 backdrop-blur-xl shadow-2xl relative z-30 animate-in slide-in-from-top-2 duration-300"
            style={{
              borderColor: `${theme.accentHex}70`,
              boxShadow: `0 8px 30px rgba(0,0,0,0.8), 0 0 25px ${theme.ringGlow}`,
            }}
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-slate-950 shrink-0 shadow-sm"
                  style={{ background: theme.accentHex }}
                >
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-[10px] font-black uppercase tracking-wider"
                      style={{ color: theme.accentHex }}
                    >
                      Bank SMS Detected
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-slate-950 border border-white/10 text-slate-400">
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
                className="w-6 h-6 rounded-full bg-slate-950 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer shrink-0 transition-colors"
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
                className={`flex-1 h-9 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md ${theme.buttonBg} ${theme.buttonText}`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Confirm &amp; Add</span>
              </button>
              <button
                type="button"
                onClick={() => setDetectedTxn(null)}
                className="px-3.5 h-9 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
              >
                Dismiss
              </button>
            </div>
          </aside>
        )}

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 pb-20">
          {activeTab === "home" && (
            <div className="space-y-4">
              {/* 3 & 4. SYMMETRICAL BUDGET METER + COMPACT DUAL BUTTONS + QUICK ADD */}
              <BudgetWidget
                dailyLimit={dailyLimit}
                todaySpent={todaySpent}
                lockdownActive={lockdownActive}
                theme={theme}
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
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onQuickAdd={handleQuickAdd}
                onTriggerCelebration={handleTriggerCelebration}
                onTriggerFakeMomCall={handleTriggerFakeMomCall}
              />

              {/* 5. FAN-ZONE THEMES WITH CUSTOM VECTOR BADGES & GRID SELECTOR */}
              <section id="tour-themes-bar" aria-label="Fan-Zone Themes" className="pt-1 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider transition-colors duration-300"
                    style={{ color: theme.accentHex }}
                  >
                    Fan-Zone Themes
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("pro")}
                    className="text-[10px] text-slate-400 hover:text-white font-medium cursor-pointer"
                  >
                    Full Theme Studio →
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

              {/* 5. PRESERVED RECENT EXPENSES LIST ("Your Money, At A Glance") */}
              <section aria-label="Recent Expenses" className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider transition-colors duration-300"
                    style={{ color: theme.accentHex }}
                  >
                    Your Money, At A Glance
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Swipe to delete</span>
                </div>

                {recentExpenses.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 text-center">
                    <p className="text-xs text-slate-400">No expenses logged today yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentExpenses.map((expense) => (
                      <SwipeableExpenseRow
                        key={expense.id}
                        expense={expense}
                        onDelete={handleDeleteExpense}
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
            </div>
          )}

          {activeTab === "history" && (
            <HistoryView
              expenses={expenses}
              theme={theme}
              onDeleteExpense={handleDeleteExpense}
              onOpenAddModal={() => setIsAddModalOpen(true)}
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
              onTogglePro={() => {
                const next = !isProActive;
                setIsProActive(next);
                showToast(
                  next
                    ? "👑 KHARCHE PRO Black Edition Vault Unlocked"
                    : "Standard Tier Active"
                );
              }}
              onToggleAutoLockdown={() => setAutoLockdownAt90((v) => !v)}
              onToggleNotifications={handleToggleNotifications}
              onSendTestNotification={handleSendTestNotification}
              onShowToast={showToast}
            />
          )}
        </div>

        {/* Floating 3D Iron Man Arc Reactor HUD Orb (64x64px) */}
        <button
          id="tour-jarvis-btn"
          type="button"
          onClick={handleOpenJarvisWithBootSequence}
          aria-label="J.A.R.V.I.S. Online - Open Tactical Financial Butler"
          className="fixed bottom-20 right-4 z-40 w-16 h-16 rounded-full bg-[#0b0f17] flex items-center justify-center active:scale-95 transition-transform cursor-pointer group"
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
            localStorage.setItem(STORAGE_KEYS.lockdown, String(active));
            showToast(active ? "🚨 Emergency Lockdown ACTIVATED by JARVIS" : "🛡️ Lockdown lifted by JARVIS");
          }}
          onUpdateDailyLimit={(newLimit) => {
            setDailyLimit(newLimit);
            localStorage.setItem(STORAGE_KEYS.dailyLimit, String(newLimit));
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
                "919800000000",
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

        {/* Undo Toast Banner */}
        {toast && (
          <div
            role="status"
            className="absolute left-3 right-3 bottom-20 z-40 rounded-2xl border px-3.5 py-2.5 shadow-2xl flex items-center justify-between gap-2 backdrop-blur-md bg-slate-900/95 transition-all"
            style={{
              borderColor: `${theme.accentHex}40`,
              boxShadow: `0 0 24px ${theme.accentHex}25`,
            }}
          >
            <span className="text-[11px] font-medium text-slate-100 truncate">
              {toast.message}
            </span>
            {toast.deletedExpense && (
              <button
                type="button"
                onClick={handleUndoDelete}
                className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-cyan-300 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}
          </div>
        )}

        {/* Add Expense Bottom Sheet Modal */}
        <AddExpenseModal
          isOpen={isAddModalOpen}
          lockdownActive={lockdownActive}
          theme={theme}
          onClose={() => setIsAddModalOpen(false)}
          onAddExpense={handleAddExpense}
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
            localStorage.setItem(STORAGE_KEYS.dailyLimit, String(newLimit));
            showToast(`Daily budget set to ₹${newLimit}`);
          }}
          onResetExpenses={handleResetAllExpenses}
          onTogglePro={() => {
            const next = !isProActive;
            setIsProActive(next);
            localStorage.setItem(STORAGE_KEYS.pro, String(next));
            showToast(next ? "KHARCHE PRO Black Active" : "Standard Tier");
          }}
          onShowToast={showToast}
          onReplayTour={handleReplayTour}
          onOpenRewardVault={() => setIsRewardVaultOpen(true)}
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
            aria-label="Select Fan-Zone Theme"
            onClick={() => setIsThemeModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                borderColor: `${theme.accentHex}50`,
                boxShadow: `0 0 40px ${theme.ringGlow}`,
              }}
              className="w-full max-w-[398px] rounded-3xl border bg-[#0b0f17]/95 p-4 space-y-3 shadow-2xl"
            >
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-black tracking-wider uppercase text-white">
                    Select Active Armor / Club Crest
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Tap any emblem to switch HUD telemetry theme
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsThemeModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
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

        {/* Native Mobile Bottom Navigation Bar (5 Tabs) - Elevated Obsidian Titanium Dock */}
        <nav
          aria-label="Navigation"
          className="sticky bottom-0 z-30 h-16 bg-[#0b0f17]/95 backdrop-blur-xl border-t border-cyan-500/20 px-2 flex items-center justify-around shrink-0 transition-all duration-300 shadow-[0_-8px_28px_rgba(0,0,0,0.85),0_-2px_18px_rgba(6,182,212,0.16)]"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-2xl mx-0.5 transition-all cursor-pointer relative ${
                  active
                    ? "text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <div className="relative flex flex-col items-center">
                  <Icon
                    className="w-5 h-5 transition-transform duration-200"
                    style={{
                      color: active ? "#22d3ee" : undefined,
                      filter: active
                        ? "drop-shadow(0 0 8px rgba(34, 211, 238, 0.75))"
                        : undefined,
                    }}
                  />
                  {active && (
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                    />
                  )}
                </div>
                <span
                  className="text-[10px] font-bold tracking-tight transition-colors"
                  style={{ color: active ? "#67e8f9" : undefined }}
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
