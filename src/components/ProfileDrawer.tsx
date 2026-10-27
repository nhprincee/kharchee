import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Check,
  CheckCircle2,
  Pencil,
  LogOut,
  Crown,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Mail,
  Phone,
  Shield,
  Zap,
  Gift,
  Download,
  Upload,
  Database,
} from "lucide-react";
import type { FanTheme } from "../types";
import { STARK_ARC_BADGES } from "./StarkRewardVaultModal";

interface ProfileDrawerProps {
  isOpen: boolean;
  theme: FanTheme;
  dailyLimit: number;
  todaySpent: number;
  streakDays: number;
  isProActive: boolean;
  myUpiId?: string;
  pinnedBadgeIds?: string[];
  onClose: () => void;
  onUpdateDailyLimit: (newLimit: number) => void;
  onUpdateMyUpiId?: (newUpiId: string) => void;
  onResetExpenses: () => void;
  onTogglePro: () => void;
  onShowToast: (message: string) => void;
  onReplayTour?: () => void;
  onOpenRewardVault?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  theme,
  dailyLimit,
  todaySpent,
  streakDays,
  isProActive,
  myUpiId = "mrigander@upi",
  pinnedBadgeIds = ["iron-discipline", "zero-leak-legend"],
  onClose,
  onUpdateDailyLimit,
  onUpdateMyUpiId,
  onResetExpenses,
  onTogglePro,
  onShowToast,
  onReplayTour,
  onOpenRewardVault,
  onExportBackup,
  onImportBackup,
}) => {
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  // User Profile State
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("kharche_user_name_v1") || "Mrigander Singh";
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);

  const [isLoggedInWithGoogle, setIsLoggedInWithGoogle] = useState(() => {
    const saved = localStorage.getItem("kharche_google_auth_v1");
    return saved !== null ? saved === "true" : true;
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Danger Zone Double-Tap Safety Lock State
  const [resetArmTimer, setResetArmTimer] = useState<number | null>(null);

  // Quick Daily Limit Override State
  const [limitInput, setLimitInput] = useState(String(dailyLimit));

  // Receiving UPI ID State
  const [upiInput, setUpiInput] = useState(myUpiId);
  const [upiError, setUpiError] = useState("");

  // PRO Tier UTR / Transaction Reference Verification State
  const [proUtrInput, setProUtrInput] = useState(() => {
    return localStorage.getItem("kharche_pro_utr_v1") || "";
  });
  const [proUtrError, setProUtrError] = useState("");

  useEffect(() => {
    setUpiInput(myUpiId);
  }, [myUpiId]);

  useEffect(() => {
    setLimitInput(String(dailyLimit));
  }, [dailyLimit]);

  useEffect(() => {
    if (resetArmTimer === null) return;
    if (resetArmTimer <= 0) {
      setResetArmTimer(null);
      return;
    }
    const timer = setTimeout(() => {
      setResetArmTimer((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resetArmTimer]);

  useEffect(() => {
    localStorage.setItem("kharche_user_name_v1", userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem("kharche_google_auth_v1", String(isLoggedInWithGoogle));
  }, [isLoggedInWithGoogle]);

  // Dynamic CRED-Style Financial Discipline Score Calculation (300 to 900 scale)
  const disciplineScore = useMemo(() => {
    let score = 740;
    // Streak contribution (+8 per day, up to +96)
    score += Math.min(streakDays * 8, 96);

    // Today's budget adherence
    if (dailyLimit > 0) {
      const ratio = todaySpent / dailyLimit;
      if (ratio <= 0.7) {
        score += 35; // Under 70% spend bonus
      } else if (ratio <= 1.0) {
        score += 15;
      } else {
        const overPercent = (ratio - 1.0) * 100;
        score -= Math.min(Math.round(overPercent * 1.5), 120);
      }
    }

    return Math.min(885, Math.max(420, score));
  }, [streakDays, todaySpent, dailyLimit]);

  const scoreTier = useMemo(() => {
    if (disciplineScore >= 800) return { label: "EXCELLENT · TOP 3% DISCIPLINE", color: "#10b981" };
    if (disciplineScore >= 720) return { label: "VERY GOOD · TOP 15%", color: "#06b6d4" };
    if (disciplineScore >= 650) return { label: "AVERAGE · ROOM TO IMPROVE", color: "#f59e0b" };
    return { label: "CRITICAL · NEEDS BRAKES", color: "#f43f5e" };
  }, [disciplineScore]);

  // Save User Name
  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nameInput.trim();
    if (clean) {
      setUserName(clean);
      setIsEditingName(false);
      onShowToast(`Display name updated to "${clean}"`);
    }
  };

  // Google Auth Handlers
  const handleGoogleLogin = () => {
    setIsLoggedInWithGoogle(true);
    onShowToast("Signed in as Mrigander Singh with Google");
  };

  const handleLogout = () => {
    setIsLoggedInWithGoogle(false);
    setShowLogoutConfirm(false);
    onShowToast("Logged out of Google account");
  };

  // Quick Daily Limit Save
  const handleSaveLimit = (newVal: number) => {
    if (newVal >= 50 && newVal <= 100000) {
      onUpdateDailyLimit(newVal);
      setLimitInput(String(newVal));
      onShowToast(`Daily limit set to ₹${newVal.toLocaleString("en-IN")}`);
    }
  };

  // Danger Zone Double-Tap Handler
  const handleResetClick = () => {
    if (resetArmTimer === null) {
      // First tap: Arm safety lock for 4 seconds
      setResetArmTimer(4);
    } else {
      // Second tap within 4 seconds: Confirm action
      setResetArmTimer(null);
      onResetExpenses();
      onShowToast("Reset all transactions to clean slate.");
    }
  };

  if (!isOpen) return null;

  // Symmetrical CRED Dial Math
  const dialRadius = 50;
  const dialCircumference = 2 * Math.PI * dialRadius;
  const dialPercent = Math.round(((disciplineScore - 300) / 600) * 100);
  const dialOffset = dialCircumference - (dialPercent / 100) * dialCircumference;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/85 backdrop-blur-md p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-drawer-title"
    >
      {/* Click outside to close backdrop */}
      <div
        className="hidden sm:block flex-1 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="w-full sm:w-[420px] max-w-full h-[90vh] sm:h-full rounded-t-[36px] sm:rounded-none sm:border-l bg-slate-950 text-slate-100 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right sm:slide-in-from-right duration-300 relative"
        style={{
          borderColor: `${theme.accentHex}35`,
          boxShadow: `0 0 50px ${theme.accentHex}20, -10px 0 30px rgba(0,0,0,0.8)`,
        }}
      >
        {/* Subtle dynamic backdrop gradient */}
        <div
          className="absolute top-0 right-0 w-80 h-72 rounded-full blur-3xl pointer-events-none opacity-25"
          style={{
            background: `radial-gradient(circle, ${theme.accentHex} 0%, transparent 70%)`,
          }}
        />

        {/* 1. HEADER BAR WITH SLEEK CLOSE BUTTON */}
        <div
          className="p-4 border-b flex items-center justify-between bg-slate-950/85 backdrop-blur-md relative z-10 shrink-0"
          style={{ borderColor: `${theme.accentHex}25` }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] tracking-[0.24em] font-extrabold uppercase"
              style={{ color: theme.accentHex }}
            >
              MEMBERSHIP DOSSIER
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile drawer"
            className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 relative z-10">
          {/* 2. USER PROFILE HEADER & GLOWING AVATAR */}
          <section className="flex flex-col items-center text-center space-y-2 pt-1">
            {/* Glowing Neon Circular Avatar with Elite Golden Badge */}
            <div className="relative">
              {/* Outer pulsing neon halo */}
              <div
                className="absolute -inset-1.5 rounded-full blur-md opacity-75"
                style={{
                  background: theme.accentHex,
                  boxShadow: `0 0 24px ${theme.ringGlow}`,
                }}
              />
              <div
                className="w-20 h-20 rounded-full bg-slate-950 border-2 flex items-center justify-center text-2xl font-black text-white relative z-10 shadow-2xl"
                style={{
                  borderColor: theme.accentHex,
                }}
              >
                MS
              </div>

              {/* Golden Elite Club Member Pill */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-lg border border-yellow-200">
                <Crown className="w-3 h-3 stroke-[3]" />
                <span>ELITE CLUB</span>
              </div>
            </div>

            {/* Editable Display Name */}
            <div className="pt-2">
              {!isEditingName ? (
                <div className="flex items-center justify-center gap-1.5">
                  <h2
                    id="profile-drawer-title"
                    className="text-lg font-black text-white tracking-tight"
                  >
                    {userName}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(userName);
                      setIsEditingName(true);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label="Edit display name"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSaveName}
                  className="flex items-center gap-1.5 justify-center mt-1"
                >
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    autoFocus
                    className="h-8 px-2.5 rounded-xl bg-slate-900 border border-cyan-400 text-xs font-bold text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Save display name"
                    className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    aria-label="Cancel editing display name"
                    className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {/* Registered Contact Info with Verified Checkmark Badges */}
              <div className="flex flex-col items-center gap-1 mt-1 text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-slate-500" />
                  <span>mrigandersinghrajput@gmail.com</span>
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Verified
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Phone className="w-3 h-3" />
                  <span>+91 98000 00000</span>
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Secured
                  </span>
                </div>
              </div>

              {/* Pinned Stark Arc Badges Showcase directly on Profile Card */}
              <div className="pt-3 flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {STARK_ARC_BADGES.filter((b) =>
                    pinnedBadgeIds.includes(b.id)
                  ).map((badge) => (
                    <span
                      key={badge.id}
                      style={{
                        borderColor: `${badge.color}70`,
                        backgroundColor: `${badge.color}15`,
                        color: badge.color,
                        boxShadow: `0 0 12px ${badge.color}25`,
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-mono font-black tracking-wider uppercase"
                      title={badge.tagline}
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.name}</span>
                    </span>
                  ))}
                </div>

                {onOpenRewardVault && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRewardVault();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-[10px] font-mono font-black uppercase tracking-wider text-amber-300 cursor-pointer active:scale-95 transition-all"
                  >
                    <Gift className="w-3 h-3 text-amber-400" />
                    <span>Spin Stark Reward Vault Wheel →</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* CRED-INSPIRED GLOWING CIRCULAR DISCIPLINE SCORE DIAL */}
          <section
            style={{ borderColor: `${theme.accentHex}30` }}
            className="p-4 rounded-3xl border bg-slate-900/80 backdrop-blur-md shadow-xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>CRED FINANCIAL DISCIPLINE METER</span>
              </span>
              <span
                className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border"
                style={{
                  borderColor: `${scoreTier.color}40`,
                  color: scoreTier.color,
                  background: `${scoreTier.color}15`,
                }}
              >
                {streakDays}D STREAK
              </span>
            </div>

            <div className="flex items-center justify-center gap-5 py-2">
              {/* Dial Gauge */}
              <div className="relative flex items-center justify-center">
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 120 120"
                  className="-rotate-90 transform"
                  role="img"
                  aria-label={`Discipline score ${disciplineScore} out of 900`}
                >
                  <circle
                    cx="60"
                    cy="60"
                    r={dialRadius}
                    stroke="rgba(51, 65, 85, 0.4)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={dialRadius}
                    stroke={scoreTier.color}
                    strokeWidth="8"
                    strokeDasharray={dialCircumference}
                    strokeDashoffset={dialOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{
                      filter: `drop-shadow(0 0 10px ${scoreTier.color}80)`,
                      transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono tabular-nums text-2xl font-black text-white tracking-tight">
                    {disciplineScore}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                    / 900
                  </span>
                </div>
              </div>

              {/* Status details */}
              <div className="space-y-1">
                <p className="text-xs font-black" style={{ color: scoreTier.color }}>
                  {scoreTier.label}
                </p>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Based on daily ₹{dailyLimit} budget intent &amp; {streakDays}-day streak resilience.
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Today spent: ₹{todaySpent} ({Math.round((todaySpent / Math.max(1, dailyLimit)) * 100)}%)
                </p>
                {dailyLimit > 0 && todaySpent <= dailyLimit * 0.5 && (
                  <div className="pt-2 mt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Discipline Shield Unlocked</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                      50% Under Limit
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 3. AUTH & ACCOUNT SECTION (GOOGLE SIGN-IN) */}
          <section
            style={{ borderColor: `${theme.accentHex}25` }}
            className="p-4 rounded-3xl border bg-slate-900/70 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Authentication &amp; Account
              </span>
              {isLoggedInWithGoogle ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Session
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500">Guest Mode</span>
              )}
            </div>

            {isLoggedInWithGoogle ? (
              <div className="space-y-2.5">
                {/* Logged in state box */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Official Google 'G' Icon */}
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm p-1">
                      <svg viewBox="0 0 24 24" className="w-5 h-5">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">Logged in via Google</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        mrigandersinghrajput@gmail.com
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                    Synced
                  </span>
                </div>

                {/* Logout Action Button */}
                {!showLogoutConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full h-9 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                ) : (
                  <div className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-rose-200">Confirm log out?</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] cursor-pointer"
                      >
                        Yes, Log Out
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(false)}
                        className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Google Sign In Button */
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl border border-white/20 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            )}
          </section>

          {/* 4. CRED-STYLE "KHARCHE PRO BLACK EDITION" METALLIC CARD */}
          <section className="relative rounded-3xl p-5 overflow-hidden shadow-2xl border border-white/20 bg-gradient-to-br from-neutral-900 via-stone-950 to-black">
            {/* Holographic metallic edge accent */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40 mix-blend-color-dodge"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255, 215, 0, 0.4) 0%, rgba(255, 0, 128, 0.25) 50%, rgba(0, 240, 255, 0.35) 100%)",
              }}
            />

            <div className="relative z-10 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] tracking-[0.2em] font-black text-amber-400 uppercase">
                    KHARCHE BLACK EDITION
                  </span>
                  <h3 className="text-base font-extrabold text-white mt-0.5">
                    Lifetime VIP Pass
                  </h3>
                </div>
                <div className="w-9 h-7 rounded-md bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-md flex items-center justify-center text-slate-950">
                  <Zap className="w-4 h-4 fill-current stroke-[2.5]" />
                </div>
              </div>

              {/* Holographic card chip aesthetic */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300 tracking-wider">
                  <span>••••</span>
                  <span>••••</span>
                  <span>••••</span>
                  <span className="text-amber-300 font-bold">2026</span>
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300">
                  {isProActive ? "ACTIVE · LIFETIME" : "READY TO UPGRADE"}
                </span>
              </div>

              {/* Membership Features List */}
              <div className="pt-2 border-t border-white/10 space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Unlimited Fan-Zone Club Themes (Avengers, Arc HUD, Madrid, Barca)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>AI Jarvis Sarcastic Hinglish Voice Assistant (Uncapped)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>1-Tap WhatsApp Khata Reminders &amp; Bill Splitting</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Smart 90% Auto-Lockdown &amp; Device Notifications</span>
                </div>
              </div>

              {/* PRO Transaction Reference / UTR Number Verification */}
              {!isProActive ? (
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <label
                    htmlFor="profile-pro-utr-input"
                    className="block text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300"
                  >
                    Enter Transaction Reference / UTR Number
                  </label>
                  <input
                    id="profile-pro-utr-input"
                    type="text"
                    value={proUtrInput}
                    onChange={(e) => {
                      setProUtrInput(e.target.value);
                      setProUtrError("");
                    }}
                    placeholder="e.g. 430189234512 (12-digit UPI UTR)"
                    className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-amber-400/40 text-xs font-mono font-bold text-amber-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {proUtrError && (
                    <p className="text-[10px] text-rose-400 font-medium">{proUtrError}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const cleanUtr = proUtrInput.trim();
                      if (!/^\d{12}$/.test(cleanUtr)) {
                        setProUtrError(
                          "Please enter a valid 12-digit numeric UPI UTR / Reference Number (e.g. 430189234512) to verify and activate PRO."
                        );
                        return;
                      }
                      localStorage.setItem("kharche_pro_utr_v1", cleanUtr);
                      setProUtrError("");
                      onTogglePro();
                      onShowToast(`👑 Verified UTR #${cleanUtr} · PRO Black Edition Activated!`);
                    }}
                    className={`w-full min-h-[42px] rounded-2xl text-xs font-black shadow-lg cursor-pointer active:scale-95 transition-all ${theme.buttonBg} ${theme.buttonText}`}
                  >
                    Verify UTR &amp; Activate Black Edition
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-emerald-300 bg-emerald-950/30 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl">
                    <span>Verified UTR Ref:</span>
                    <span className="font-bold">
                      {proUtrInput || localStorage.getItem("kharche_pro_utr_v1") || "UTR-VERIFIED"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onTogglePro}
                    className="w-full min-h-[38px] rounded-2xl text-xs font-black bg-slate-800 border border-amber-400/50 text-amber-300 hover:bg-slate-700 cursor-pointer active:scale-95 transition-all"
                  >
                    Manage Subscription (Active)
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 5. APP PREFERENCES, CUSTOM UPI & LOCALSTORAGE BACKUP SAFEGUARD */}
          <section
            style={{ borderColor: `${theme.accentHex}25` }}
            className="p-4 rounded-3xl border bg-slate-900/70 space-y-4"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sliders className="w-3 h-3" />
              <span>Budget Preferences, Custom UPI &amp; Backup</span>
            </span>

            {/* Daily Budget Quick Override */}
            <div className="space-y-1.5">
              <label htmlFor="daily-budget-override" className="text-xs font-bold text-slate-200 block">
                Daily Budget Quick Override
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    ₹
                  </span>
                  <input
                    id="daily-budget-override"
                    type="number"
                    min="50"
                    max="100000"
                    step="50"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono tabular-nums font-bold text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveLimit(Number(limitInput) || 500)}
                  className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-white cursor-pointer transition-all active:scale-95"
                >
                  Save
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                {[500, 1000, 2000, 5000].map((presetVal) => (
                  <button
                    key={presetVal}
                    type="button"
                    onClick={() => handleSaveLimit(presetVal)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                      dailyLimit === presetVal
                        ? "bg-slate-800 border-white/40 text-white"
                        : "bg-slate-950/70 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    ₹{presetVal}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Personal UPI ID Configuration */}
            <div className="space-y-1.5 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <label htmlFor="my-upi-input" className="text-xs font-bold text-slate-200 block">
                  My Personal Receiving UPI ID
                </label>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Dynamic QR &amp; Links</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Enter your own UPI VPA (e.g. <code className="text-cyan-300">user@okhdfcbank</code>). Used dynamically across all Split QR codes, Khata reminders, and payment deep-links.
              </p>
              <div className="flex items-center gap-2">
                <input
                  id="my-upi-input"
                  type="text"
                  placeholder="e.g. user@okhdfcbank"
                  value={upiInput}
                  onChange={(e) => {
                    setUpiInput(e.target.value);
                    setUpiError("");
                  }}
                  className="flex-1 h-10 px-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono font-bold text-cyan-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const clean = upiInput.trim().toLowerCase();
                    if (!clean || !clean.includes("@")) {
                      setUpiError("Enter a valid UPI ID containing '@' (e.g. user@okhdfcbank)");
                      return;
                    }
                    setUpiError("");
                    onUpdateMyUpiId?.(clean);
                    onShowToast(`✅ Personal UPI ID saved: ${clean}`);
                  }}
                  className="h-10 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-xs font-bold text-cyan-200 cursor-pointer transition-all active:scale-95"
                >
                  Save UPI
                </button>
              </div>
              {upiError && <p className="text-[10px] text-rose-400 font-medium">{upiError}</p>}
            </div>

            {/* LocalStorage Backup & Export/Import Safeguard */}
            <div className="space-y-2 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>LocalStorage Backup &amp; Safeguard</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">JSON Snapshot</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Download your complete transaction &amp; Khata history locally or restore a previous backup so data is never lost if browser cache clears.
              </p>

              <input
                ref={backupInputRef}
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && onImportBackup) {
                    onImportBackup(file);
                  }
                  e.target.value = "";
                }}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => onExportBackup?.()}
                  className="h-10 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-xs font-bold text-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Export Backup (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={() => backupInputRef.current?.click()}
                  className="h-10 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-xs font-bold text-cyan-200 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Import / Restore Backup</span>
                </button>
              </div>
            </div>

            {/* Tour & Onboarding Replay */}
            {onReplayTour && (
              <div className="pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReplayTour();
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Replay App Tour &amp; Onboarding</span>
                </button>
              </div>
            )}

            {/* Danger Zone: Reset All Expenses / Clear Data */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Danger Zone</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Double-Tap Lock</span>
              </div>

              <p className="text-[11px] text-slate-400 leading-snug">
                Permanently purge all logged transactions and restore clean slate.
              </p>

              <button
                type="button"
                onClick={handleResetClick}
                className={`w-full min-h-[42px] rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  resetArmTimer !== null
                    ? "bg-rose-600 border-rose-400 text-white shadow-lg animate-pulse"
                    : "bg-rose-950/20 border-rose-500/30 text-rose-300 hover:bg-rose-950/40"
                }`}
              >
                {resetArmTimer !== null ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>TAP AGAIN TO CONFIRM ({resetArmTimer}s)</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset All Expenses / Clear Data</span>
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
