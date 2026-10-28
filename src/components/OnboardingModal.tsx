import React, { useState, useMemo } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Bell,
  Coins,
  TrendingUp,
  Shield,
  Zap,
  Crown,
  Lock,
} from "lucide-react";
import type { FanTheme } from "../types";
import { requestNotificationPermission, sendKharcheNotification } from "../utils/notifications";

interface OnboardingModalProps {
  isOpen: boolean;
  theme: FanTheme;
  initialIncome?: number;
  onComplete: (data: {
    userName: string;
    email: string;
    monthlyIncome: number;
    savingsTarget: number;
    dailyLimit: number;
    notificationsEnabled: boolean;
  }) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  theme,
  initialIncome = 0,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: User Profile & Auth
  const [userName, setUserName] = useState("");
  const [profileError, setProfileError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [authMethod, setAuthMethod] = useState<"google" | "custom">("google");

  // Step 2: Financial Calibration
  const [income, setIncome] = useState<number>(initialIncome);
  const [savingsPercent, setSavingsPercent] = useState<number>(20);
  const [customDailyLimit, setCustomDailyLimit] = useState<number | null>(null);

  // Step 3: Notifications
  const [notificationStatus, setNotificationStatus] = useState<"idle" | "granted" | "denied">("idle");

  // Calibration Math: (Income - Savings) / 30
  const monthlySavings = useMemo(() => {
    return Math.round((income * savingsPercent) / 100);
  }, [income, savingsPercent]);

  const disposableMonthly = useMemo(() => {
    return Math.max(0, income - monthlySavings);
  }, [income, monthlySavings]);

  const calculatedDailyLimit = useMemo(() => {
    if (customDailyLimit !== null) return customDailyLimit;
    const raw = Math.round(disposableMonthly / 30);
    // Round to nearest 50
    return Math.max(100, Math.round(raw / 50) * 50);
  }, [disposableMonthly, customDailyLimit]);

  // Dynamic Money-Saving Tips based on their numbers
  const tips = useMemo(() => {
    const dailyBuffer = Math.round(disposableMonthly / 30);
    const weekendBuffer = Math.round(dailyBuffer * 1.5);
    return [
      {
        id: "tip-buffer",
        icon: "🛡️",
        title: "The 30-Day Buffer Rule",
        desc: `Capping daily spending at ₹${dailyBuffer.toLocaleString("en-IN")} secures your ₹${monthlySavings.toLocaleString("en-IN")} (${savingsPercent}%) target at month-end without touching emergency funds.`,
      },
      {
        id: "tip-leaks",
        icon: "⚡",
        title: "Impulse Micro-Leak Protection",
        desc: `Frequent chai & snack spends (~₹100/day) eat ~${Math.min(50, Math.round((100 / Math.max(1, dailyBuffer)) * 100))}% of your daily budget. Log them in 1 tap before they accumulate!`,
      },
    ];
  }, [disposableMonthly, monthlySavings, savingsPercent]);

  if (!isOpen) return null;

  const handleContinueProfile = () => {
    if (!userName.trim() || !userEmail.trim()) {
      setProfileError("Please fill in your name and email to continue.");
      return;
    }
    setProfileError("");
    setAuthMethod("custom");
    setStep(2);
  };

  const handleRequestNotifications = async () => {
    const perm = await requestNotificationPermission();
    if (perm === "granted") {
      setNotificationStatus("granted");
      sendKharcheNotification(
        "🔔 KHARCHE Notifications Active",
        "80% threshold & Emergency Lockdown alerts are now active with vibration [100, 50, 100].",
        "test"
      );
    } else {
      setNotificationStatus("denied");
    }
  };

  const handleFinish = () => {
    onComplete({
      userName: userName.trim(),
      email: userEmail.trim(),
      monthlyIncome: income,
      savingsTarget: monthlySavings,
      dailyLimit: calculatedDailyLimit,
      notificationsEnabled: notificationStatus === "granted",
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300"
    >
      <div
        className="w-full max-w-[440px] rounded-[32px] border bg-slate-950/95 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative"
        style={{
          borderColor: `${theme.accentHex}40`,
          boxShadow: `0 0 50px ${theme.accentHex}20, 0 25px 60px rgba(0,0,0,0.9)`,
        }}
      >
        {/* Subtle Ambient Glow Orb */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ background: theme.accentHex }}
        />

        {/* Top Header / Progress Indicator */}
        <div className="p-5 pb-3 border-b border-white/[0.08] relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white"
              style={{
                background: `linear-gradient(135deg, ${theme.accentHex}, #000)`,
                boxShadow: `0 0 12px ${theme.ringGlow}`,
              }}
            >
              K
            </div>
            <div>
              <span className="font-display font-extrabold text-sm tracking-wider text-white">
                K H A R C H E
              </span>
              <span className="block text-[10px] text-slate-400 font-mono -mt-0.5">
                ONBOARDING & CALIBRATION
              </span>
            </div>
          </div>

          {/* Step Pill */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 px-2.5 py-1 rounded-full">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-4 bg-white shadow-xs"
                    : s < step
                    ? "w-2 bg-emerald-400"
                    : "w-1.5 bg-slate-700"
                }`}
                style={s === step ? { background: theme.accentHex } : undefined}
              />
            ))}
            <span className="text-[10px] font-mono text-slate-400 ml-1">
              {step}/3
            </span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 relative z-10 no-scrollbar">
          {/* ================= STEP 1: SIGN IN / SIGN UP ================= */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-1.5 pt-2">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/10"
                  style={{ color: theme.accentHex }}
                >
                  Step 1 · Profile Setup
                </span>
                <h1
                  id="onboarding-title"
                  className="text-2xl font-black text-white tracking-tight"
                >
                  Spend with Intent.
                </h1>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Set up your profile and budget. Your ledger starts empty, so only your real entries appear.
                </p>
              </div>

              <div className="rounded-xl border border-slate-300/15 bg-white/[0.035] p-3 text-xs leading-5 text-slate-400">
                <span className="font-semibold text-slate-200">Secure session ready.</span> Your sign-in was handled before setup. Add the profile details you want shown in the app below.
              </div>

              {/* Manual Name & Email */}
              <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-white/5">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your name" required
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="you@example.com" required
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>

              {profileError && <p role="alert" className="text-xs text-rose-300">{profileError}</p>}

              {/* Trust Badge */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-[11px]">
                <Shield className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Zero spam · Local-first encrypted browser storage.</span>
              </div>
            </div>
          )}

          {/* ================= STEP 2: FINANCIAL CALIBRATION ================= */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/10"
                  style={{ color: theme.accentHex }}
                >
                  Step 2 · Financial Calibration
                </span>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Calibrate Your Daily Engine
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We use your monthly income and savings goal to calculate a realistic daily allowance.
                </p>
              </div>

              {/* Monthly Income Input */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Monthly Take-Home Income</span>
                  </label>
                  <span className="font-mono text-sm font-extrabold text-white">
                    ₹{income.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="5000"
                    max="1000000"
                    step="1000"
                    value={income}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setIncome(val);
                      setCustomDailyLimit(null);
                    }}
                    className="w-full h-10 pl-7 pr-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {profileError && <p role="alert" className="text-xs text-rose-300">{profileError}</p>}

                {/* Quick Income Chips */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[20000, 35000, 50000, 80000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setIncome(amt);
                        setCustomDailyLimit(null);
                      }}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                        income === amt
                          ? "bg-slate-800 border-white/40 text-white"
                          : "bg-slate-950/60 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      ₹{amt / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Savings Target */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Monthly Savings Goal</span>
                  </label>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {savingsPercent}% (₹{monthlySavings.toLocaleString("en-IN")})
                  </span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={savingsPercent}
                  onChange={(e) => {
                    setSavingsPercent(Number(e.target.value));
                    setCustomDailyLimit(null);
                  }}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>5% (Light)</span>
                  <span>20% (Recommended)</span>
                  <span>50% (Hardcore)</span>
                </div>
              </div>

              {/* Formula & Recommended Daily Limit Card */}
              <div
                className="p-4 rounded-2xl border bg-gradient-to-br from-slate-900 to-slate-950 space-y-3"
                style={{
                  borderColor: theme.accentHex,
                  boxShadow: `0 0 20px ${theme.accentHex}15`,
                }}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Disposable Monthly Pool</span>
                  <span className="font-mono font-bold text-slate-200">
                    ₹{disposableMonthly.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-white/[0.08]">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Recommended Daily Budget
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      (Income − Savings) ÷ 30 days
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className="font-display font-mono text-2xl font-black"
                      style={{ color: theme.accentHex }}
                    >
                      ₹{calculatedDailyLimit.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] text-slate-400 block">/day</span>
                  </div>
                </div>
              </div>

              {/* 2 Smart Starter Tips */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Starter Financial Intelligence
                </span>
                <div className="space-y-2">
                  {tips.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-900/50 border border-white/5 flex items-start gap-2.5 text-left"
                    >
                      <span className="text-base shrink-0">{t.icon}</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{t.title}</h4>
                        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                          {t.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: PERMISSIONS & ALERTS ================= */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/10"
                  style={{ color: theme.accentHex }}
                >
                  Step 3 · Proactive Defense
                </span>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Smart Budget Notifications
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Stay disciplined before you accidentally drain your balance. Real-time threshold warnings and haptic alerts.
                </p>
              </div>

              {/* Notification Perks Cards */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/20 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0 font-bold">
                    80%
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-200">
                      Wallet ICU Warning (80% Limit)
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      Fires when daily spends hit 80%, recommending caution on evening chai/dining out.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/20 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-400/30 flex items-center justify-center text-rose-300 shrink-0 font-bold">
                    100%
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rose-200">
                      Emergency Lockdown Trigger (100%)
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      Instantly alerts you and suggests turning on Emergency Freeze to prevent debt leaks.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-cyan-200">
                      Tactile Vibration Pattern [100, 50, 100]
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      Distinctive double-pulse vibration pattern triggers on budget breaches for instant tactile awareness.
                    </p>
                  </div>
                </div>
              </div>

              {/* Permission Trigger Box */}
              <div className="pt-2 text-center space-y-2">
                {notificationStatus === "granted" ? (
                  <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Notifications & Vibration Activated</span>
                  </div>
                ) : notificationStatus === "denied" ? (
                  <div className="p-3 rounded-2xl bg-slate-900 border border-white/10 text-slate-300 text-xs flex items-center justify-center gap-2">
                    <span>Browser alerts blocked. In-app vibration active.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestNotifications}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-98 transition-all"
                    style={{
                      boxShadow: "0 0 24px rgba(6, 182, 212, 0.4)",
                    }}
                  >
                    <Bell className="w-4 h-4" />
                    <span>Enable Smart Notifications</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="p-4 border-t border-white/[0.08] bg-slate-950 relative z-10 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <span className="text-[11px] font-mono text-slate-500 px-2">
              Kharche v2.1
            </span>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  if (!userName.trim() || !userEmail.trim() || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(userEmail.trim())) {
                    setProfileError("Enter your name and a valid email address to continue.");
                    return;
                  }
                  setProfileError("");
                  setStep(2);
                } else {
                  setStep(3);
                }
              }}
              className={`h-10 px-5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer active:scale-95 transition-all ml-auto ${theme.buttonBg} ${theme.buttonText}`}
              style={{
                boxShadow: `0 0 16px ${theme.ringGlow}`,
              }}
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className={`h-11 px-6 rounded-xl font-extrabold text-xs flex items-center gap-2 cursor-pointer active:scale-95 transition-all ml-auto ${theme.buttonBg} ${theme.buttonText}`}
              style={{
                boxShadow: `0 0 24px ${theme.ringGlow}`,
              }}
            >
              <span>Launch App Tour</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
