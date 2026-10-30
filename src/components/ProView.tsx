import React, { useState, useEffect, useMemo } from "react";
import {
  Check,
  Crown,
  Shield,
  Palette,
  Bell,
  Vibrate,
  AlertTriangle,
  Flame,
  Sparkles,
  FileDown,
  QrCode,
  Zap,
  Sliders,
  Volume2,
  Cpu,
  Lock,
  X,
  Bot,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Expense, FanTheme, KhataFriend, ThemeId } from "../types";
import { ThemeSelector } from "./ThemeSelector";
import { EpicDebtCardModal } from "./EpicDebtCardModal";
import { playProVaultChime, fireConfettiBurst } from "../utils/celebration";

interface ProViewProps {
  activeThemeId: ThemeId;
  theme: FanTheme;
  isProActive: boolean;
  autoLockdownAt90: boolean;
  notificationsEnabled: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  disciplineScore?: number;
  dailyLimit?: number;
  todaySpent?: number;
  expenses?: Expense[];
  friends?: KhataFriend[];
  myUpiId?: string;
  cardholderName?: string;
  onSelectTheme: (id: ThemeId) => void;
  onApplyCustomTheme?: (custom: {
    name: string;
    primaryHex: string;
    glowIntensity: number;
  }) => void;
  onPurchasePro: (plan: "monthly" | "quarterly") => Promise<void>;
  onCancelPro: () => Promise<void>;
  onToggleAutoLockdown: () => void;
  onToggleNotifications: () => void;
  onSendTestNotification: () => void;
  onShowToast?: (msg: string) => void;
}

const CUSTOM_SWATCHES = [
  { name: "Sovereign Gold", hex: "#fbbf24" },
  { name: "Arc Reactor Cyan", hex: "#00f0ff" },
  { name: "Vibranium Violet", hex: "#a855f7" },
  { name: "Emerald Matrix", hex: "#10b981" },
  { name: "Crimson Neon", hex: "#f43f5e" },
  { name: "Solar Flare", hex: "#f97316" },
];

export const ProView: React.FC<ProViewProps> = ({
  activeThemeId,
  theme,
  isProActive,
  autoLockdownAt90,
  notificationsEnabled,
  notificationPermission,
  disciplineScore = 785,
  dailyLimit = 500,
  todaySpent = 0,
  expenses = [],
  friends = [],
  myUpiId = "",
  cardholderName = "MRIGANDER SINGH",
  onSelectTheme,
  onApplyCustomTheme,
  onPurchasePro,
  onCancelPro,
  onToggleAutoLockdown,
  onToggleNotifications,
  onSendTestNotification,
  onShowToast,
}) => {
  // 1. 3D Obsidian VIP Card Tilt & Shimmer State
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, shimmerX: 50, shimmerY: 30 });
  const [isHoveringCard, setIsHoveringCard] = useState(false);

  // 2. PRO-Exclusive Feature States
  const [savageJarvisEnabled, setSavageJarvisEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("kharche_savage_jarvis_v1");
    return saved !== null ? saved === "true" : true;
  });

  // Autonomous Auto-Pilot Recovery Agent State (1-Time Initial Permission)
  const [autoPilotRecoveryEnabled, setAutoPilotRecoveryEnabled] = useState<boolean>(() => {
    return localStorage.getItem("autoPilotRecoveryEnabled") === "true";
  });
  const [showAutoPilotConsentModal, setShowAutoPilotConsentModal] = useState<boolean>(false);

  const [selectedDebtFriend, setSelectedDebtFriend] = useState<{
    friend: KhataFriend;
    amount: number;
  } | null>(null);

  // Custom Theme Studio State
  const [customThemeName, setCustomThemeName] = useState<string>(() => {
    return localStorage.getItem("kharche_custom_theme_name_v1") || "Obsidian Gold";
  });
  const [customHex, setCustomHex] = useState<string>(() => {
    return localStorage.getItem("kharche_custom_theme_hex_v1") || "#fbbf24";
  });
  const [glowIntensity, setGlowIntensity] = useState<number>(() => {
    const saved = localStorage.getItem("kharche_custom_theme_glow_v1");
    return saved ? Number(saved) : 75;
  });

  // Executive Audit Export State
  const [auditExported, setAuditExported] = useState(false);
  const [showAuditPreview, setShowAuditPreview] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Truecaller-Style Gold / Platinum Elite Carousel & Checkout Drawer State
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "quarterly">("quarterly");
  const [isCheckoutDrawerOpen, setIsCheckoutDrawerOpen] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  const activeReceivingUpi = (myUpiId || "").trim();
  const hasConfiguredUpi = Boolean(
    activeReceivingUpi &&
      activeReceivingUpi.includes("@") &&
      activeReceivingUpi.toLowerCase() !== "mrigander@upi"
  );
  const selectedPlanAmount = selectedPlan === "monthly" ? 30 : 99;
  const selectedPlanTitle =
    selectedPlan === "monthly" ? "PRO GOLD EDITION" : "PRO PLATINUM ELITE";
  const selectedPlanCtaLabel =
    selectedPlan === "quarterly"
      ? "START 3-MONTH ELITE PASS (₹99)"
      : "START MONTHLY GOLD PASS (₹30 · ₹1/day equivalent)";

  // Device orientation listener for subtle mobile 3D card tilt
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (isHoveringCard) return;
      const gamma = Math.max(-25, Math.min(25, e.gamma || 0)); // left/right
      const beta = Math.max(-25, Math.min(25, (e.beta || 45) - 45)); // front/back
      setTilt({
        rotateX: Number((-beta * 0.4).toFixed(2)),
        rotateY: Number((gamma * 0.45).toFixed(2)),
        shimmerX: Math.round(50 + gamma * 1.6),
        shimmerY: Math.round(50 + beta * 1.6),
      });
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [isHoveringCard]);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pctX = x / rect.width;
    const pctY = y / rect.height;

    const rotateY = (pctX - 0.5) * 22; // -11deg to +11deg
    const rotateX = (0.5 - pctY) * 18; // -9deg to +9deg

    setIsHoveringCard(true);
    setTilt({
      rotateX: Number(rotateX.toFixed(2)),
      rotateY: Number(rotateY.toFixed(2)),
      shimmerX: Math.round(pctX * 100),
      shimmerY: Math.round(pctY * 100),
    });
  };

  const handleCardTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, touch.clientY - rect.top));
    const pctX = x / rect.width;
    const pctY = y / rect.height;

    setTilt({
      rotateX: Number(((0.5 - pctY) * 16).toFixed(2)),
      rotateY: Number(((pctX - 0.5) * 20).toFixed(2)),
      shimmerX: Math.round(pctX * 100),
      shimmerY: Math.round(pctY * 100),
    });
  };

  const handleCardReset = () => {
    setIsHoveringCard(false);
    setTilt({ rotateX: 0, rotateY: 0, shimmerX: 50, shimmerY: 30 });
  };

  // Compute pending Khata debtors for WhatsApp Khata Auto-Collector
  const debtors = useMemo(() => {
    const list = friends
      .map((f) => {
        const net = f.entries
          .filter((e) => !e.settled)
          .reduce((acc, e) => acc + e.amount, 0);
        return { friend: f, net };
      })
      .filter((item) => item.net > 0);

    if (list.length > 0) return list;

    // Fallback sample if all settled (Rohan ₹300, Kabir ₹420)
    return [
      {
        friend: {
          id: "sample-rohan",
          name: "Rohan",
          phone: "919811122233",
          avatarInitials: "RH",
          entries: [
            {
              id: "e0",
              description: "Midnight Biryani & Cold Drink",
              amount: 300,
              timestamp: new Date().toISOString(),
              settled: false,
            },
          ],
        },
        net: 300,
      },
      {
        friend: {
          id: "sample-kabir",
          name: "Kabir",
          phone: "919876543210",
          avatarInitials: "KB",
          entries: [
            {
              id: "e1",
              description: "Late Night Shawarma & Cold Coffee",
              amount: 420,
              timestamp: new Date().toISOString(),
              settled: false,
            },
          ],
        },
        net: 420,
      },
    ];
  }, [friends]);

  // Compute Monthly Audit Metrics (strictly excludes income from spend totals)
  const auditStats = useMemo(() => {
    const expenseOnly = expenses.filter((e) => e.type !== "income");
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthExpenses = expenseOnly.filter((e) => {
      const d = new Date(e.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const thisMonthSpent = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const allTimeSpent = expenseOnly.reduce((sum, e) => sum + e.amount, 0);
    const monthlyBudget = dailyLimit * 30;
    const remainingMonthly = Math.max(0, monthlyBudget - thisMonthSpent);
    const avgDailySpend = Math.max(
      1,
      Math.round(
        thisMonthSpent /
          Math.max(1, new Set(thisMonthExpenses.map((e) => e.timestamp.slice(0, 10))).size)
      )
    );
    const runwayDays = Math.min(99, Math.round(remainingMonthly / avgDailySpend));

    const categoryTotals: Record<string, number> = {};
    thisMonthExpenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const sortedCategories = Object.entries(categoryTotals).sort(
      (a, b) => b[1] - a[1]
    );

    return {
      totalSpent: thisMonthSpent,
      thisMonthSpent,
      allTimeSpent,
      monthlyBudget,
      remainingMonthly,
      avgDailySpend,
      runwayDays,
      sortedCategories,
      txCount: thisMonthExpenses.length,
    };
  }, [expenses, dailyLimit]);

  const handleToggleSavageJarvis = () => {
    playProVaultChime();
    const next = !savageJarvisEnabled;
    setSavageJarvisEnabled(next);
    localStorage.setItem("kharche_savage_jarvis_v1", String(next));
    onShowToast?.(
      next
        ? "🔥 Savage JARVIS Uncapped Mode ENGAGED"
        : "Savage JARVIS Mode set to Standard"
    );
  };

  const handleToggleAutoPilotRecovery = () => {
    playProVaultChime();
    if (autoPilotRecoveryEnabled) {
      setAutoPilotRecoveryEnabled(false);
      localStorage.setItem("autoPilotRecoveryEnabled", "false");
      onShowToast?.("Auto-Pilot Recovery Agent Paused");
    } else {
      const consentGranted =
        localStorage.getItem("autoPilotRecoveryConsentGranted") === "true";
      if (!consentGranted) {
        setShowAutoPilotConsentModal(true);
      } else {
        setAutoPilotRecoveryEnabled(true);
        localStorage.setItem("autoPilotRecoveryEnabled", "true");
        onShowToast?.("⚡ Auto-Pilot Active · Next Sweep at 10:00 PM");
      }
    }
  };

  const handleAuthorizeAutoPilotConsent = () => {
    playProVaultChime();
    localStorage.setItem("autoPilotRecoveryConsentGranted", "true");
    localStorage.setItem("autoPilotRecoveryEnabled", "true");
    setAutoPilotRecoveryEnabled(true);
    setShowAutoPilotConsentModal(false);
    onShowToast?.("⚡ J.A.R.V.I.S. Auto-Recovery Authorized · Next Sweep at 10:00 PM");
  };

  const handleTriggerSavageVoiceSample = () => {
    playProVaultChime();
    const roast =
      todaySpent > dailyLimit
        ? `Sir, spending ₹${todaySpent} on a ₹${dailyLimit} limit is pure financial self-sabotage. Even Ultron had better resource management.`
        : `Savage Protocol online, Sir. Your spend is ₹${todaySpent} of ₹${dailyLimit}. Step one rupee over line and I will personally liquidate your snack budget.`;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(roast);
      utter.rate = 1.05;
      window.speechSynthesis.speak(utter);
    }
    onShowToast?.("🎙️ Savage JARVIS Reality Check Deployed");
  };

  const handleApplyCustomStudio = () => {
    playProVaultChime();
    localStorage.setItem("kharche_custom_theme_name_v1", customThemeName);
    localStorage.setItem("kharche_custom_theme_hex_v1", customHex);
    localStorage.setItem("kharche_custom_theme_glow_v1", String(glowIntensity));
    onApplyCustomTheme?.({
      name: customThemeName.trim() || "Custom Vault",
      primaryHex: customHex,
      glowIntensity,
    });
    onShowToast?.(`🎨 Applied "${customThemeName}" Custom Neon Theme`);
  };

  const handleExportMonthlyAudit = () => {
    playProVaultChime();
    const reportDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const catRowsHtml = auditStats.sortedCategories
      .map(
        ([cat, amt]) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #1e293b;color:#e2e8f0;font-weight:600;">${cat}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #1e293b;color:#fbbf24;font-family:monospace;text-align:right;font-weight:700;">₹${amt.toLocaleString("en-IN")}</td>
        </tr>`
      )
      .join("");

    const txRowsHtml = expenses
      .filter((e) => e.type !== "income")
      .slice(0, 25)
      .map(
        (e) => `
        <tr>
          <td style="padding:8px 14px;border-bottom:1px solid #1e293b;color:#94a3b8;font-family:monospace;">${new Date(e.timestamp).toLocaleDateString("en-IN")}</td>
          <td style="padding:8px 14px;border-bottom:1px solid #1e293b;color:#f8fafc;font-weight:600;">${e.title}</td>
          <td style="padding:8px 14px;border-bottom:1px solid #1e293b;color:#38bdf8;">${e.category}</td>
          <td style="padding:8px 14px;border-bottom:1px solid #1e293b;color:#10b981;font-family:monospace;text-align:right;font-weight:700;">₹${e.amount.toLocaleString("en-IN")}</td>
        </tr>`
      )
      .join("");

    const auditHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>KHARCHE PRO BLACK - Executive Stark Monthly Audit</title>
  <style>
    body { background:#060911; color:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; padding:40px; max-width:820px; margin:0 auto; }
    .header { border:2px solid #fbbf24; border-radius:20px; padding:28px; background:linear-gradient(135deg,#0f172a 0%,#090d16 100%); display:flex; justify-content:space-between; align-items:center; }
    .badge { color:#fbbf24; font-family:monospace; font-size:12px; letter-spacing:3px; text-transform:uppercase; }
    .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:24px 0; }
    .stat { background:#0f172a; border:1px solid rgba(251,191,36,0.3); border-radius:14px; padding:16px; }
    .stat-label { color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:1px; }
    .stat-val { color:#fff; font-size:22px; font-weight:800; font-family:monospace; margin-top:6px; }
    table { width:100%; border-collapse:collapse; background:#0b1120; border-radius:14px; overflow:hidden; margin-top:12px; }
    th { background:#111827; color:#fbbf24; text-align:left; padding:12px 14px; font-size:11px; text-transform:uppercase; letter-spacing:1.5px; }
    @media print { body { background:#060911 !important; -webkit-print-color-adjust:exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="badge">STARK INDUSTRIES FINANCIAL DOSSIER · PRO BLACK EDITION</div>
      <h1 style="margin:8px 0 4px;font-size:26px;letter-spacing:1px;">EXECUTIVE MONTHLY AUDIT</h1>
      <div style="color:#94a3b8;font-size:13px;">Cardholder: <strong style="color:#fff;">${cardholderName}</strong> · Generated: ${reportDate}</div>
    </div>
    <div style="text-align:right;">
      <div style="color:#fbbf24;font-size:11px;font-family:monospace;">DISCIPLINE SCORE</div>
      <div style="font-size:28px;font-weight:900;color:#fbbf24;font-family:monospace;">${disciplineScore} / 900</div>
      <div style="color:#38bdf8;font-size:10px;font-family:monospace;">LIFETIME ELITE VAULT MEMBER</div>
    </div>
  </div>

  <div class="grid">
    <div class="stat">
      <div class="stat-label">Monthly Budget</div>
      <div class="stat-val">₹${auditStats.monthlyBudget.toLocaleString("en-IN")}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Total Deployed</div>
      <div class="stat-val" style="color:#f43f5e;">₹${auditStats.totalSpent.toLocaleString("en-IN")}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Avg Daily Outlay</div>
      <div class="stat-val" style="color:#38bdf8;">₹${auditStats.avgDailySpend.toLocaleString("en-IN")}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Wallet Runway</div>
      <div class="stat-val" style="color:#10b981;">${auditStats.runwayDays} Days</div>
    </div>
  </div>

  <h3 style="color:#fbbf24;text-transform:uppercase;letter-spacing:1.5px;font-size:13px;margin-top:28px;">Category Breakdown</h3>
  <table>
    <thead><tr><th>Category</th><th style="text-align:right;">Amount Deployed</th></tr></thead>
    <tbody>${catRowsHtml}</tbody>
  </table>

  <h3 style="color:#38bdf8;text-transform:uppercase;letter-spacing:1.5px;font-size:13px;margin-top:28px;">Recent Ledger Entries (${auditStats.txCount} Total)</h3>
  <table>
    <thead><tr><th>Date</th><th>Description</th><th>Category</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody>${txRowsHtml}</tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([auditHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Stark_Executive_Monthly_Audit_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setAuditExported(true);
    setShowAuditPreview(true);
    setTimeout(() => setAuditExported(false), 3500);
    onShowToast?.("📄 Executive Stark Monthly Audit Exported");
  };

  const handleOpenCheckoutDrawer = (planOverride?: "monthly" | "quarterly") => {
    playProVaultChime();
    const activePlan = planOverride || selectedPlan;
    setSelectedPlan(activePlan);
    setBillingError(null);
    setIsCheckoutDrawerOpen(true);
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Cancel automatic renewal for Kharchee Pro? You will keep access until the current paid period ends.")) return;
    setIsCancelling(true);
    try {
      await onCancelPro();
    } catch (error) {
      onShowToast?.(error instanceof Error ? error.message : "Could not cancel the subscription.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSecurePurchase = async () => {
    setBillingBusy(true);
    setBillingError(null);
    try {
      await onPurchasePro(selectedPlan);
      setIsCheckoutDrawerOpen(false);
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Checkout could not be completed.");
    } finally {
      setBillingBusy(false);
    }
  };

  const handleTestClick = () => {
    playProVaultChime();
    setIsTesting(true);
    onSendTestNotification();
    setTimeout(() => setIsTesting(false), 2000);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* =====================================================================
          1. CRED-STYLE 3D METALLIC BLACK TITANIUM CARD
         ===================================================================== */}
      <div className="pt-1" style={{ perspective: "1200px" }}>
        <div
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardReset}
          onTouchMove={handleCardTouchMove}
          onTouchEnd={handleCardReset}
          style={{
            transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(${
              isHoveringCard ? "1.015, 1.015, 1.015" : "1, 1, 1"
            })`,
            transition: isHoveringCard
              ? "transform 80ms ease-out"
              : "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)",
            transformStyle: "preserve-3d",
          }}
          className="relative rounded-3xl p-6 bg-gradient-to-tr from-[#0a0d14] via-[#151c2c] to-[#0d121c] border border-amber-400/40 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(251,191,36,0.15)] overflow-hidden select-none cursor-grab active:cursor-grabbing"
        >
          {/* Holographic Double-Edge Inner Rim */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[3px] rounded-[21px] border border-amber-300/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)]"
          />

          {/* Dynamic Diagonal Specular Sheen */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(125deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.12) 32%, rgba(251,191,36,0.08) 48%, transparent 65%)",
            }}
          />

          {/* Interactive Mouse/Orientation Holographic Shimmer Overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle 240px at ${tilt.shimmerX}% ${tilt.shimmerY}%, rgba(251, 191, 36, 0.22) 0%, rgba(226, 232, 240, 0.1) 45%, transparent 80%)`,
            }}
          />

          {/* Fine Brushed Metallic Carbon Grain */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 6px)",
            }}
          />

          {/* Top Row: Brand Crest + Live CRED-Style Financial Discipline Score */}
          <div className="relative z-10 flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                <span className="text-[10px] font-black tracking-[0.28em] uppercase bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  KHARCHE · BLACK TITANIUM
                </span>
              </div>
              <span className="inline-block mt-1.5 text-[9px] font-mono font-bold tracking-[0.2em] uppercase px-2.5 py-0.5 rounded-md bg-black/60 border border-amber-400/40 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                LIFETIME ELITE VAULT MEMBER
              </span>
            </div>

            {/* Live CRED-Style Financial Discipline Score Pill */}
            <div className="px-3 py-1.5 rounded-xl bg-black/70 border border-amber-400/45 text-amber-300 font-mono tracking-widest text-right shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(251,191,36,0.25)]">
              <span className="block text-[8px] font-mono uppercase tracking-widest text-amber-200/75">
                CRED DISCIPLINE
              </span>
              <span className="font-mono text-xs font-black text-amber-300 tracking-widest drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]">
                Score: {disciplineScore} / 900
              </span>
            </div>
          </div>

          {/* Middle Row: High-Detail Golden Microchip with Laser-Etched Circuitry & Embossed Card Number */}
          <div className="relative z-10 my-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* High-Detail Realistic Golden Microchip with Laser-Etched Circuitry */}
              <div className="relative w-13 h-10 rounded-lg bg-gradient-to-br from-amber-100 via-amber-400 to-yellow-700 p-0.5 shadow-[0_4px_14px_rgba(0,0,0,0.85),0_0_10px_rgba(251,191,36,0.25),inset_0_1px_2px_rgba(255,255,255,0.85)] border border-amber-200/80 overflow-hidden">
                {/* Metallic Gold Foil Specular Grain */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 3px)",
                  }}
                />
                {/* Laser-Etched EMV Circuitry SVG */}
                <svg
                  viewBox="0 0 52 40"
                  className="w-full h-full relative z-10"
                  fill="none"
                >
                  <rect
                    x="1.5"
                    y="1.5"
                    width="49"
                    height="37"
                    rx="5"
                    stroke="rgba(120, 53, 15, 0.7)"
                    strokeWidth="1.1"
                  />
                  <rect
                    x="17"
                    y="10"
                    width="18"
                    height="20"
                    rx="3.5"
                    stroke="rgba(120, 53, 15, 0.8)"
                    strokeWidth="1.2"
                    fill="rgba(251, 191, 36, 0.35)"
                  />
                  <path
                    d="M1.5 13 H17 M1.5 20 H17 M1.5 27 H17 M35 13 H50.5 M35 20 H50.5 M35 27 H50.5 M26 1.5 V10 M26 30 V38.5 M21 16 H31 M21 24 H31"
                    stroke="rgba(120, 53, 15, 0.78)"
                    strokeWidth="1.15"
                    strokeLinecap="round"
                  />
                  <circle cx="26" cy="20" r="2.2" fill="rgba(120, 53, 15, 0.75)" />
                </svg>
              </div>
              <Cpu className="w-4 h-4 text-amber-300/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
            </div>

            {/* Embossed Raised Metallic Silver/Gold Foil Card Numbers */}
            <div
              style={{
                textShadow:
                  "0 2px 4px rgba(0,0,0,0.95), 0 -1px 0 rgba(255,255,255,0.35)",
              }}
              className="text-right font-mono text-xs sm:text-sm bg-gradient-to-b from-white via-slate-200 to-amber-200 bg-clip-text text-transparent tracking-[0.22em] uppercase font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
            >
              4890 •••• •••• 0785
            </div>
          </div>

          {/* Bottom Row: Embossed Cardholder Name & Vault Status */}
          <div className="relative z-10 flex items-end justify-between pt-3 border-t border-white/15">
            <div>
              <span className="block text-[8px] font-mono uppercase tracking-[0.24em] text-amber-200/70">
                CARDHOLDER
              </span>
              <span
                style={{
                  textShadow:
                    "0 2px 5px rgba(0,0,0,0.95), 0 -1px 0 rgba(255,255,255,0.4)",
                }}
                className="font-mono text-sm sm:text-base bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-400 bg-clip-text text-transparent tracking-[0.22em] uppercase font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
              >
                {cardholderName}
              </span>
            </div>

            <div className="text-right">
              <span className="block text-[8px] font-mono uppercase tracking-widest text-amber-200/70">
                3D TITANIUM FOIL
              </span>
              <span className="text-[10px] bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent tracking-[0.2em] uppercase font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center gap-1 justify-end">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                {isProActive ? "VAULT ACTIVE" : "BLACK EDITION"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. JUICY TRUECALLER GOLD & PLATINUM CAROUSEL
         ===================================================================== */}
      <section className="bg-[#080d16]/90 backdrop-blur-xl border border-white/10 border-t border-t-white/20 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="block text-[10px] font-mono font-black uppercase tracking-[0.22em] bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">
              TRUECALLER-STYLE SOVEREIGN TIERS
            </span>
            <h3 className="text-base font-black tracking-tight mt-0.5 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              Gold &amp; Platinum Elite Membership
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-amber-300 whitespace-nowrap">
            Swipe Cards →
          </span>
        </div>

        {/* Truecaller Gold / Platinum Swipeable Card Carousel (No Clipping) */}
        <div className="flex gap-4 overflow-x-auto py-2 px-1 -mx-1 snap-x snap-mandatory scrollbar-none">
          {/* Card 1: PRO GOLD (₹30/month, about ₹1/day) — Rich warm liquid gold gradient */}
          <div
            onClick={() => {
              playProVaultChime();
              setSelectedPlan("monthly");
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelectedPlan("monthly");
            }}
            className={`snap-center shrink-0 w-[85%] sm:w-[272px] min-h-[172px] rounded-2xl p-4 text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#241a06] via-[#3a2c0f] to-[#120e05] border border-amber-400/60 border-t border-t-amber-200/50 ${
              selectedPlan === "monthly"
                ? "ring-2 ring-amber-400 shadow-[0_10px_30px_rgba(0,0,0,0.85),0_0_24px_rgba(251,191,36,0.35)]"
                : "shadow-[0_8px_24px_rgba(0,0,0,0.7),0_0_12px_rgba(251,191,36,0.12)] opacity-90 hover:opacity-100"
            }`}
          >
            {/* Liquid Gold Metallic Sheen Overlay */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-35"
              style={{
                background:
                  "linear-gradient(125deg, rgba(251,191,36,0.32) 0%, transparent 48%, rgba(245,158,11,0.22) 100%)",
              }}
            />

            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-black border border-amber-100/60 font-mono text-[9px] font-black uppercase tracking-widest shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                  <Shield className="w-3 h-3 fill-black text-black" />
                  <span>POPULAR TIER</span>
                </span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedPlan === "monthly"
                      ? "border-amber-200 bg-gradient-to-r from-amber-300 to-yellow-500 text-black"
                      : "border-amber-400/50"
                  }`}
                >
                  {selectedPlan === "monthly" && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] shrink-0" />
                <h4 className="text-sm font-black bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent tracking-wider uppercase">
                  PRO GOLD EDITION
                </h4>
              </div>

              <div className="flex items-baseline gap-1.5 pt-0.5">
                <span className="font-mono text-2xl font-black text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] tabular-nums">
                  ₹30
                </span>
                <span className="text-[11px] font-mono text-amber-100/90 font-semibold">
                  / month · about ₹1/day
                </span>
              </div>
            </div>

            <div className="relative z-10 pt-3 mt-3 border-t border-amber-400/30 flex items-center justify-between text-[10px] font-mono text-amber-100">
              <span>All Themes + Savage AI</span>
              <span className="font-black text-amber-300">
                {selectedPlan === "monthly" ? "Selected ✓" : "Tap to Select →"}
              </span>
            </div>
          </div>

          {/* Card 2: PRO PLATINUM ELITE (₹99) — Electric cyber blue-gold Damascus steel finish */}
          <div
            onClick={() => {
              playProVaultChime();
              setSelectedPlan("quarterly");
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelectedPlan("quarterly");
            }}
            className={`snap-center shrink-0 w-[85%] sm:w-[272px] min-h-[172px] rounded-2xl p-4 text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0b2239] via-[#131d36] to-[#261b08] border border-cyan-400/50 border-t border-t-cyan-200/50 shadow-[0_0_20px_rgba(6,182,212,0.2)] ${
              selectedPlan === "quarterly"
                ? "ring-2 ring-cyan-400 shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_24px_rgba(6,182,212,0.35),0_0_16px_rgba(251,191,36,0.25)]"
                : "opacity-90 hover:opacity-100"
            }`}
          >
            {/* Damascus Steel & Cyber Blue-Gold Foil Texture */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-35"
              style={{
                background:
                  "linear-gradient(135deg, rgba(6,182,212,0.38) 0%, rgba(30,64,175,0.22) 48%, rgba(251,191,36,0.38) 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(115deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 7px)",
              }}
            />

            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gradient-to-r from-amber-300 via-yellow-400 to-cyan-300 text-black font-mono text-[9px] font-black uppercase tracking-widest shadow-[0_0_14px_rgba(6,182,212,0.5)]">
                  <Sparkles className="w-3 h-3 fill-black text-black" />
                  <span>3-MONTH ELITE</span>
                </span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedPlan === "quarterly"
                      ? "border-cyan-200 bg-gradient-to-r from-cyan-300 to-amber-400 text-black"
                      : "border-cyan-400/50"
                  }`}
                >
                  {selectedPlan === "quarterly" && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.85)] shrink-0" />
                <h4 className="text-sm font-black bg-gradient-to-r from-cyan-200 via-amber-200 to-amber-400 bg-clip-text text-transparent tracking-wider uppercase">
                  PRO PLATINUM ELITE
                </h4>
              </div>

              <div className="flex items-baseline gap-1.5 pt-0.5">
                <span className="font-mono text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(6,182,212,0.5)] tabular-nums">
                  ₹99
                </span>
                <span className="text-[10px] font-mono text-amber-300 font-bold">
                  / 3 Months · ₹33/month
                </span>
              </div>
            </div>

            <div className="relative z-10 pt-3 mt-3 border-t border-cyan-400/30 flex items-center justify-between text-[10px] font-mono text-cyan-100">
              <span>Full Auto-Pilot + Custom Forge</span>
              <span className="font-black text-amber-300">
                {selectedPlan === "quarterly" ? "Active Choice ★" : "Select Elite →"}
              </span>
            </div>
          </div>
        </div>

        {/* Horizontal Feature Swipe Bullets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-slate-400">
              ELITE VAULT PRIVILEGES
            </span>
            <span className="text-[9px] font-mono text-cyan-300/80">Swipe Perks →</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none -mx-1 px-1">
            {[
              "🛡️ Auto-Pilot WhatsApp Debt Recovery",
              "⚡ Uncensored Savage JARVIS Roasts",
              "🎨 Unlimited Armor & Theme Forging Studio",
              "📊 Stark Industries Monthly Financial Audit",
            ].map((bullet) => (
              <div
                key={bullet}
                className="snap-start shrink-0 px-3 py-2 rounded-xl bg-[#05080f] border border-white/10 border-t border-t-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.6)] flex items-center gap-2 text-xs font-bold text-slate-100 whitespace-nowrap"
              >
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Champagne Gold Inline Trigger Button */}
        <button
          type="button"
          disabled={isProActive}
          onClick={() => handleOpenCheckoutDrawer(selectedPlan)}
          className="relative overflow-hidden w-full min-h-[48px] rounded-xl text-xs uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-black font-extrabold tracking-wider border border-amber-100/70 shadow-[0_0_25px_rgba(251,191,36,0.45),inset_0_1px_1px_rgba(255,255,255,0.75)] hover:brightness-105 group disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* Continuous soft light reflection animation */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/75 to-transparent skew-x-[-25deg] animate-[pulse_2s_ease-in-out_infinite] group-hover:translate-x-[320%] transition-transform duration-1000"
          />
          <Crown className="w-4 h-4 fill-black text-black relative z-10 shrink-0" />
          <span className="relative z-10">{isProActive ? "PRO SUBSCRIPTION ACTIVE" : selectedPlanCtaLabel}</span>
        </button>
      </section>

      {isProActive && (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.04] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-200">Subscription verified</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Manage renewal for the current Pro plan.</p>
          </div>
          <button
            type="button"
            onClick={() => void handleCancelSubscription()}
            disabled={isCancelling}
            className="rounded-lg border border-slate-300/20 bg-white/[.04] px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/[.08] disabled:opacity-50"
          >
            {isCancelling ? "Cancelling…" : "Cancel auto-renewal"}
          </button>
        </div>
      )}

      {isProActive ? (
        <>

      {/* =====================================================================
          3. PRO-EXCLUSIVE FEATURE SUITE (ELEVATED FLOATING GLASS CONTAINERS)
         ===================================================================== */}
      <div className="space-y-4">
        <div className="px-1 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent font-mono">
            PRO-EXCLUSIVE FEATURE SUITE
          </span>
          <span className="text-[10px] font-mono text-slate-400">4 Modules Online</span>
        </div>

        {/* FEATURE 1: SAVAGE JARVIS UNCAPPED MODE */}
        <section
          className="bg-[#080d16]/90 backdrop-blur-xl border border-white/10 border-t border-t-white/20 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] space-y-3.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-orange-500/15 border border-orange-400/40 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Savage JARVIS Uncapped Mode
                  </h4>
                  <span className="text-[9px] font-mono font-bold text-orange-300">
                    · PRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Unlocks unhinged sarcastic insults and unfiltered financial reality checks when spending breaches daily limits.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={savageJarvisEnabled}
              onClick={handleToggleSavageJarvis}
              className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                savageJarvisEnabled
                  ? "bg-gradient-to-r from-orange-500 to-amber-400"
                  : "bg-slate-800 border border-white/10"
              }`}
            >
              <span
                className={`block w-5.5 h-5.5 rounded-full bg-slate-950 transition-transform shadow-md ${
                  savageJarvisEnabled ? "translate-x-5.5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {savageJarvisEnabled && (
            <div className="p-3 rounded-2xl bg-black/50 border border-orange-500/25 flex items-center justify-between gap-2">
              <p className="text-[11px] font-mono text-orange-200/90 italic leading-relaxed">
                &ldquo;Sir, your wallet is bleeding faster than Mark 42 armor. Step away from Zomato immediately.&rdquo;
              </p>
              <button
                type="button"
                onClick={handleTriggerSavageVoiceSample}
                className="px-2.5 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/40 text-[10px] font-black text-orange-300 shrink-0 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear Roast</span>
              </button>
            </div>
          )}
        </section>

        {/* FEATURE 2: AUTONOMOUS AUTO-PILOT RECOVERY AGENT (1-TIME INITIAL PERMISSION) */}
        <section
          className="bg-[#080d16]/90 backdrop-blur-xl border border-white/10 border-t border-t-white/20 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] space-y-3.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Auto-Pilot Recovery Agent
                  </h4>
                  {autoPilotRecoveryEnabled && (
                    <span className="text-[10px] font-mono font-bold text-emerald-300">
                      ⚡ Auto-Pilot Active · Next Sweep at 10:00 PM
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Autonomous J.A.R.V.I.S. agent monitors overdue balances and auto-drafts WhatsApp debt alerts without manual clicks.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={autoPilotRecoveryEnabled}
              onClick={handleToggleAutoPilotRecovery}
              className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                autoPilotRecoveryEnabled
                  ? "bg-gradient-to-r from-cyan-400 to-emerald-400"
                  : "bg-[#05070c] border border-white/10"
              }`}
            >
              <span
                className={`block w-5.5 h-5.5 rounded-full bg-slate-950 transition-transform shadow-md ${
                  autoPilotRecoveryEnabled ? "translate-x-5.5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Live Status Bar */}
          <div className="px-3 py-2 rounded-2xl bg-[#05070c] border border-cyan-500/30 flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  autoPilotRecoveryEnabled ? "bg-emerald-400 animate-ping" : "bg-slate-600"
                }`}
              />
              <span>
                {autoPilotRecoveryEnabled
                  ? "⚡ Auto-Pilot Active · Next Sweep at 10:00 PM"
                  : "Standby · Toggle ON for 1-time autonomous recovery authorization"}
              </span>
            </span>
          </div>

          {/* Automatically Queued Overdue Debts */}
          <div className="space-y-2 pt-0.5">
            {debtors.map(({ friend, net }) => (
              <div
                key={friend.id}
                className="p-2.5 rounded-2xl bg-[#05070c] border border-white/10 flex items-center justify-between gap-2"
              >
                <div>
                  <p className="text-xs font-bold text-white">
                    {friend.name}{" "}
                    <span className="font-mono text-emerald-400 font-black">
                      +₹{net.toLocaleString("en-IN")}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {autoPilotRecoveryEnabled
                      ? `Queued for 10:00 PM Auto-Sweep · UPI: ${hasConfiguredUpi ? activeReceivingUpi : "Not Configured"}`
                      : `Awaiting Auto-Pilot authorization · UPI: ${hasConfiguredUpi ? activeReceivingUpi : "Not Configured"}`}
                  </p>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold ${
                    autoPilotRecoveryEnabled ? "text-emerald-300" : "text-slate-500"
                  }`}
                >
                  {autoPilotRecoveryEnabled ? "⚡ Auto-Queued" : "Paused"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURE 3: CUSTOM THEME STUDIO */}
        <section
          className="bg-[#080d16]/90 backdrop-blur-xl border border-white/10 border-t border-t-white/20 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] space-y-3.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
                <Palette className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Custom Theme Studio
                  </h4>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    FORGE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Color picker and accent glow generator to craft your own custom aesthetic beyond the default 6.
                </p>
              </div>
            </div>
          </div>

          {/* Custom Color Picker + Name + Glow Intensity */}
          <div className="p-3.5 rounded-2xl bg-[#05070c]/95 border border-white/10 space-y-3">
            <div className="flex items-center gap-2.5">
              <label
                className="relative flex items-center justify-center w-11 h-11 rounded-2xl border-2 border-white/20 cursor-pointer overflow-hidden shrink-0 shadow-lg"
                style={{
                  backgroundColor: customHex,
                  boxShadow: `0 0 18px ${customHex}80`,
                }}
                title="Pick Custom Primary Color"
              >
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => {
                    setCustomHex(e.target.value);
                  }}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
                <Sliders className="w-4 h-4 text-slate-950 drop-shadow" />
              </label>

              <div className="flex-1">
                <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">
                  Custom HUD Theme Name
                </label>
                <input
                  type="text"
                  value={customThemeName}
                  onChange={(e) => setCustomThemeName(e.target.value)}
                  placeholder="e.g. Obsidian Titanium"
                  className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="text-right font-mono text-[11px] text-amber-300 font-bold">
                {customHex.toUpperCase()}
              </div>
            </div>

            {/* Preset Luxury Swatches */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {CUSTOM_SWATCHES.map((sw) => (
                <button
                  key={sw.hex}
                  type="button"
                  onClick={() => {
                    playProVaultChime();
                    setCustomHex(sw.hex);
                    setCustomThemeName(sw.name);
                  }}
                  style={{
                    borderColor: customHex === sw.hex ? sw.hex : "rgba(255,255,255,0.1)",
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-900 border text-[10px] font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer hover:border-white/30"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: sw.hex }}
                  />
                  <span>{sw.name}</span>
                </button>
              ))}
            </div>

            {/* Accent Glow Intensity Slider */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>NEON AURA GLOW INTENSITY</span>
                <span style={{ color: customHex }} className="font-bold">
                  {glowIntensity}%
                </span>
              </div>
              <input
                type="range"
                min={25}
                max={100}
                value={glowIntensity}
                onChange={(e) => setGlowIntensity(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleApplyCustomStudio}
              style={{
                backgroundColor: customHex,
                boxShadow: `0 0 ${Math.round(glowIntensity * 0.3)}px ${customHex}90`,
              }}
              className="w-full h-9 rounded-xl text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Apply Custom Theme to HUD</span>
            </button>
          </div>

          {/* Signature Luxury Tech Themes */}
          <div className="pt-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2 px-1">
              Or Select Signature Luxury Tech Theme:
            </p>
            <ThemeSelector
              currentTheme={activeThemeId}
              onSelectTheme={(id) => {
                playProVaultChime();
                onSelectTheme(id);
              }}
            />
          </div>
        </section>

        {/* FEATURE 4: EXECUTIVE STARK MONTHLY AUDIT (PDF / DOSSIER EXPORT) */}
        <section
          className="bg-[#080d16]/90 backdrop-blur-xl border border-white/10 border-t border-t-white/20 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] space-y-3.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center shrink-0">
                <FileDown className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Executive Stark Monthly Audit
                  </h4>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    PDF / DOSSIER
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  1-tap export of your full monthly ledger, runway metrics, and category breakdown.
                </p>
              </div>
            </div>
          </div>

          {/* Live Audit Telemetry Strip */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-[#05070c] border border-white/10 text-center font-mono">
            <div>
              <span className="block text-[9px] text-slate-400 uppercase">Spent</span>
              <span className="text-xs font-black text-rose-400">
                ₹{auditStats.totalSpent.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="border-x border-white/10">
              <span className="block text-[9px] text-slate-400 uppercase">Runway</span>
              <span className="text-xs font-black text-emerald-400">
                {auditStats.runwayDays} Days
              </span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-400 uppercase">Entries</span>
              <span className="text-xs font-black text-cyan-300">
                {auditStats.txCount} Txns
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportMonthlyAudit}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)]"
            >
              {auditExported ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Audit Dossier Downloaded</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>1-Tap Export Monthly Audit</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                playProVaultChime();
                setShowAuditPreview((v) => !v);
              }}
              className="px-3 h-10 rounded-xl bg-[#05070c] border border-white/10 text-[11px] font-bold text-slate-200 hover:text-white cursor-pointer"
            >
              {showAuditPreview ? "Hide" : "Preview"}
            </button>
          </div>

          {showAuditPreview && (
            <div className="p-3 rounded-2xl bg-[#05070c] border border-emerald-500/30 space-y-2 text-[11px] font-mono animate-in fade-in">
              <div className="flex items-center justify-between text-emerald-300 font-bold border-b border-white/10 pb-1.5">
                <span>STARK AUDIT SUMMARY</span>
                <span>SCORE: {disciplineScore}/900</span>
              </div>
              {auditStats.sortedCategories.map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between text-slate-300">
                  <span>{cat}</span>
                  <span className="text-amber-300 font-bold">
                    ₹{amt.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* =====================================================================
          4. SMART PERIMETER ALERTS & 90% AUTO-LOCKDOWN
         ===================================================================== */}
      <section
        className="bg-[#080d16]/90 backdrop-blur-xl border border-white/10 border-t border-t-white/20 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl bg-[#05070c] border border-white/10 flex items-center justify-center"
            >
              <Bell className="w-4 h-4" style={{ color: theme.accentHex }} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                <span>Perimeter Defense &amp; Auto-Lockdown</span>
                {notificationsEnabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Status: {notificationPermission === "granted" ? "Armed" : "Standby"}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={notificationsEnabled}
            onClick={() => {
              playProVaultChime();
              onToggleNotifications();
            }}
            className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              notificationsEnabled ? "bg-emerald-500" : "bg-[#05070c] border border-white/10"
            }`}
          >
            <span
              className={`block w-5.5 h-5.5 rounded-full bg-white transition-transform shadow-md ${
                notificationsEnabled ? "translate-x-5.5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Smart Auto-Lockdown at 90% */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-200">Auto-Lockdown at 90% Spend</p>
              <p className="text-[10px] text-slate-400">
                Automatically engage Stark Vault Freeze when daily spend hits 90%
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoLockdownAt90}
            onClick={() => {
              playProVaultChime();
              onToggleAutoLockdown();
            }}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              autoLockdownAt90 ? "bg-emerald-500" : "bg-[#05070c] border border-white/10"
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                autoLockdownAt90 ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={handleTestClick}
          disabled={isTesting}
          className="w-full min-h-[38px] px-4 py-2 rounded-2xl border border-white/10 bg-[#05070c] hover:bg-white/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs font-bold text-slate-200 cursor-pointer"
        >
          {isTesting ? (
            <>
              <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
              <span className="text-emerald-300">Haptic Alert Dispatched</span>
            </>
          ) : (
            <>
              <Vibrate className="w-4 h-4 text-cyan-400" />
              <span>Test Haptic Perimeter Alert</span>
            </>
          )}
        </button>
      </section>

      {/* POLISHED STICKY BOTTOM CTA WITH RICH CHAMPAGNE GOLD GRADIENT & METALLIC BORDER */}
      <div className="sticky bottom-2 z-20 pt-1">
        <div className="p-2 rounded-2xl bg-[#050811]/95 backdrop-blur-2xl border border-amber-400/35 border-t border-t-amber-200/40 shadow-[0_-12px_35px_rgba(0,0,0,0.95),0_0_25px_rgba(251,191,36,0.22)]">
          <button
            type="button"
            disabled={isProActive}
            onClick={() => handleOpenCheckoutDrawer(selectedPlan)}
            className="relative overflow-hidden w-full min-h-[50px] px-4 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-amber-100/80 shadow-[0_0_25px_rgba(251,191,36,0.55),inset_0_1px_1px_rgba(255,255,255,0.8)] active:scale-[0.98] transition-all cursor-pointer group disabled:cursor-not-allowed disabled:opacity-60"
          >
            {/* Continuous Soft Light Reflection Animation */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-[-25deg] animate-[pulse_2s_ease-in-out_infinite] group-hover:translate-x-[340%] transition-transform duration-1000"
            />
            <Crown className="w-4 h-4 fill-black text-black relative z-10 shrink-0" />
            <span className="relative z-10 whitespace-nowrap">
              {isProActive ? "PRO SUBSCRIPTION ACTIVE" : selectedPlanCtaLabel}
            </span>
          </button>
        </div>
      </div>

      {/* 1-TIME INITIAL PERMISSION CONSENT MODAL FOR JARVIS AUTO-RECOVERY */}
      {showAutoPilotConsentModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Authorize JARVIS Auto-Recovery"
          onClick={() => setShowAutoPilotConsentModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[390px] rounded-3xl bg-[#0b0f17] border-2 border-cyan-400/70 shadow-[0_0_45px_rgba(6,182,212,0.35)] p-5 space-y-4 text-slate-100"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-cyan-300 block">
                    ONE-TIME PROTOCOL CONSENT
                  </span>
                  <h3 className="text-sm font-black text-white mt-0.5">
                    Authorize JARVIS Auto-Recovery
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoPilotConsentModal(false)}
                className="w-7 h-7 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#060911] border border-cyan-500/25 rounded-2xl p-3.5">
              Authorize JARVIS Auto-Recovery: Allow J.A.R.V.I.S. to monitor overdue balances and auto-draft WhatsApp debt alerts when payments exceed due dates.
            </p>

            <div className="space-y-1.5 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>⚡ Auto-Pilot Active · Next Sweep at 10:00 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Queues overdue debts (Rohan ₹300, Kabir ₹420) automatically</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowAutoPilotConsentModal(false)}
                className="h-10 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={handleAuthorizeAutoPilotConsent}
                className="h-10 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.45)] cursor-pointer active:scale-95 transition-transform"
              >
                Authorize Agent
              </button>
            </div>
          </div>
        </div>
      )}

        </>
      ) : (
        <section className="rounded-2xl border border-slate-300/15 bg-gradient-to-br from-white/[.06] to-transparent p-5 text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-slate-300/20 bg-white/[.05]">
            <Lock className="h-5 w-5 text-slate-200" />
          </div>
          <h3 className="text-base font-black text-white">Pro features are locked</h3>
          <p className="mx-auto max-w-sm text-xs leading-5 text-slate-400">Preview the plans above. The feature suite opens only after the server confirms a valid subscription.</p>
        </section>
      )}

      {/* VERIFIED SUBSCRIPTION CHECKOUT */}
      {isCheckoutDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Kharchee Pro secure subscription checkout"
          onClick={() => !billingBusy && setIsCheckoutDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-end justify-center sm:items-center p-0 sm:p-4"
        >
          <section
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-300/20 bg-[#090d13] p-5 text-slate-100 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-[.22em] text-slate-400">Secure Razorpay checkout</p>
                <h3 className="mt-1 text-lg font-black">{selectedPlanTitle}</h3>
                <p className="mt-1 text-sm text-slate-300">₹{selectedPlanAmount} {selectedPlan === "monthly" ? "per month" : "every 3 months"}</p>
              </div>
              <button
                type="button"
                disabled={billingBusy}
                onClick={() => setIsCheckoutDrawerOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 disabled:opacity-40"
                aria-label="Close checkout"
              ><X className="h-4 w-4" /></button>
            </div>

            <div className="rounded-2xl border border-slate-300/15 bg-gradient-to-br from-white/[.07] to-transparent p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Payment verified by the server</div>
              <p className="text-xs leading-5 text-slate-400">Pro unlocks only after the payment signature and subscription status are verified with Razorpay. Typing a UTR or returning from checkout alone cannot unlock Pro.</p>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <p>• This is a recurring subscription, not a one-time UPI transfer.</p>
              <p>• Review the amount and renewal terms in Razorpay Checkout before approving.</p>
              <p>• If checkout is cancelled or verification fails, your account stays on the free tier.</p>
            </div>

            {billingError && <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/5 p-3 text-xs leading-5 text-rose-200">{billingError}</p>}

            <button
              type="button"
              onClick={() => void handleSecurePurchase()}
              disabled={billingBusy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200/50 bg-gradient-to-r from-slate-100 to-slate-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
            >
              {billingBusy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" /> Verifying checkout…</> : <><ShieldCheck className="h-4 w-4" /> Continue to secure payment · ₹{selectedPlanAmount}</>}
            </button>
            <button type="button" disabled={billingBusy} onClick={() => setIsCheckoutDrawerOpen(false)} className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-200 disabled:opacity-40">Not now</button>
          </section>
        </div>
      )}

      {/* Epic Debt Card Modal */}
      {selectedDebtFriend && (
        <EpicDebtCardModal
          isOpen={true}
          friend={selectedDebtFriend.friend}
          amountDue={selectedDebtFriend.amount}
          myUpiId={myUpiId}
          theme={theme}
          onClose={() => setSelectedDebtFriend(null)}
          onShowToast={(msg) => onShowToast?.(msg)}
        />
      )}
    </div>
  );
};
