import React, { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  Plus,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Shield,
  PartyPopper,
  Sparkles,
  Timer,
  PhoneIncoming,
  EyeOff,
} from "lucide-react";
import type { FanTheme, QuickAddPreset } from "../types";
import { QUICK_ADD_PRESETS } from "../data/initialData";

interface BudgetWidgetProps {
  dailyLimit: number;
  todaySpent: number;
  lockdownActive: boolean;
  theme: FanTheme;
  streakDays?: number;
  stealthMode?: boolean;
  onUpdateLimit: (newLimit: number) => void;
  onToggleLockdown: () => void;
  onOpenAddModal: () => void;
  onQuickAdd: (preset: QuickAddPreset) => void;
  onTriggerCelebration?: (type: "streak" | "shield") => void;
  onTriggerFakeMomCall?: () => void;
}

function getNextMorningCooldown(): string {
  const now = new Date();
  const nextMorning = new Date(now);
  // Target 6:00 AM next morning (or 6:00 AM today if currently between midnight and 6 AM)
  if (now.getHours() >= 6) {
    nextMorning.setDate(now.getDate() + 1);
  }
  nextMorning.setHours(6, 0, 0, 0);

  const diffMs = Math.max(0, nextMorning.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export const BudgetWidget: React.FC<BudgetWidgetProps> = ({
  dailyLimit,
  todaySpent,
  lockdownActive,
  theme,
  streakDays = 0,
  stealthMode = false,
  onUpdateLimit,
  onToggleLockdown,
  onOpenAddModal,
  onQuickAdd,
  onTriggerCelebration,
  onTriggerFakeMomCall,
}) => {
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState(String(dailyLimit));
  const [cooldownStr, setCooldownStr] = useState<string>(() => getNextMorningCooldown());

  useEffect(() => {
    if (!lockdownActive) return;
    setCooldownStr(getNextMorningCooldown());
    const interval = setInterval(() => {
      setCooldownStr(getNextMorningCooldown());
    }, 1000);
    return () => clearInterval(interval);
  }, [lockdownActive]);

  const remaining = dailyLimit - todaySpent;
  const rawPercent = dailyLimit > 0 ? Math.round((todaySpent / dailyLimit) * 100) : 0;
  const clampedPercent = Math.min(100, Math.max(0, rawPercent));
  const isOverBudget = remaining < 0;
  const isShieldActive = dailyLimit > 0 && todaySpent <= dailyLimit * 0.5;

  // Symmetrical SVG Ring Math
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  const activeRingColor = lockdownActive
    ? "#f59e0b"
    : isOverBudget
    ? "#f43f5e"
    : theme.ringStroke;

  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(limitInput);
    if (!Number.isNaN(parsed) && parsed >= 50 && parsed <= 100000) {
      onUpdateLimit(Math.round(parsed));
      setIsEditingLimit(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* 3. SYMMETRICAL CIRCULAR BUDGET METER CARD WITH CRISP NEON GLOWING BORDER */}
      <section
        id="tour-budget-ring"
        aria-label="Today's Budget"
        className={`rounded-3xl border backdrop-blur-xl p-5 transition-all duration-300 relative overflow-hidden ${
          lockdownActive
            ? "border-amber-500/80 bg-amber-950/25 shadow-[0_0_35px_rgba(245,158,11,0.35)]"
            : isOverBudget
            ? "border-rose-500/90 bg-rose-950/20 shadow-[0_0_32px_rgba(244,63,94,0.45)] ring-1 ring-amber-500/40"
            : `bg-slate-900/85 ${theme.cardBorder} ${theme.cardShadow}`
        }`}
      >
        {/* Pulsing Emergency Amber/Red Neon Perimeter when Over Budget (>100%) */}
        {isOverBudget && !lockdownActive && (
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-3xl border-2 border-rose-500/60 animate-pulse pointer-events-none"
            style={{
              boxShadow: "inset 0 0 28px rgba(244, 63, 94, 0.35), 0 0 24px rgba(245, 158, 11, 0.35)",
            }}
          />
        )}

        {/* Subtle Ambient Radial Backlight in Center */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-40"
          style={{
            background: isOverBudget
              ? "radial-gradient(circle at 50% 50%, rgba(244, 63, 94, 0.32) 0%, rgba(245, 158, 11, 0.12) 45%, transparent 72%)"
              : `radial-gradient(circle at 50% 50%, ${theme.hudGlowColor || `${theme.accentHex}40`} 0%, transparent 70%)`,
          }}
        />

        {/* Top Header: Title & Subtle "Edit daily limit ₹500" */}
        <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-xs font-bold tracking-wider uppercase transition-colors duration-300"
              style={{ color: isOverBudget ? "#fb7185" : theme.accentHex }}
            >
              Today&apos;s Budget
            </span>
            {isOverBudget && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-200 bg-gradient-to-r from-rose-600/40 to-amber-600/40 border border-rose-400/60 px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(244,63,94,0.5)] animate-pulse">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-300" />
                <span>Deficit Alert</span>
              </span>
            )}
            {lockdownActive && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-400/50 px-1.5 py-0.5 rounded-full shadow-sm">
                LOCKED HUD
              </span>
            )}
          </div>

          {!isEditingLimit ? (
            <button
              type="button"
              onClick={() => {
                setLimitInput(String(dailyLimit));
                setIsEditingLimit(true);
              }}
              className="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/60 border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
              <span>
                {stealthMode
                  ? "₹0.00 / Empty Vault"
                  : `Edit limit ₹${dailyLimit.toLocaleString("en-IN")}`}
              </span>
            </button>
          ) : (
            <form onSubmit={handleSaveLimit} className="flex items-center gap-1">
              <div className="relative flex items-center">
                <span className="absolute left-2 text-xs font-mono text-slate-400">₹</span>
                <input
                  type="number"
                  min={50}
                  max={100000}
                  step={10}
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  autoFocus
                  className="w-20 h-7 pl-5 pr-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <button
                type="submit"
                aria-label="Save limit"
                className="w-6 h-6 rounded-md bg-emerald-500 text-slate-950 flex items-center justify-center cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingLimit(false)}
                aria-label="Cancel editing"
                className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

        {/* Centered Symmetrical Circular Progress Meter with Signature Neon Glow */}
        <div className="flex flex-col items-center justify-center py-2 text-center relative z-10">
          <div className="relative flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="-rotate-90 transform"
              role="img"
              aria-label={`${rawPercent} percent of daily budget used`}
            >
              {/* Subtle outer guide ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius + 4}
                stroke={isOverBudget ? "#f43f5e" : theme.accentHex}
                strokeOpacity={isOverBudget ? "0.35" : "0.08"}
                strokeWidth={isOverBudget ? 1.5 : 1}
                fill="transparent"
              />

              {/* Background Track with soft theme tone */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={isOverBudget ? "#f43f5e" : theme.accentHex}
                strokeOpacity="0.15"
                strokeWidth={strokeWidth}
                fill="transparent"
              />

              {/* Glowing Active Ring Stroke */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={activeRingColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  filter: `drop-shadow(0 0 14px ${
                    isOverBudget ? "rgba(244, 63, 94, 0.85)" : theme.ringGlow
                  })`,
                  transition: "stroke-dashoffset 300ms cubic-bezier(0.16, 1, 0.3, 1), stroke 300ms ease",
                }}
              />
            </svg>

            {/* Inner Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {stealthMode ? (
                <EyeOff className="w-4 h-4 text-cyan-400 mb-0.5 animate-pulse" />
              ) : lockdownActive ? (
                <Lock className="w-4 h-4 text-amber-400 mb-0.5 animate-pulse" />
              ) : isOverBudget ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 mb-0.5 animate-bounce" />
              ) : isShieldActive ? (
                <Shield className="w-4 h-4 text-emerald-400 mb-0.5" />
              ) : null}
              <span
                className={`font-mono tabular-nums text-3xl font-extrabold tracking-tight ${
                  stealthMode
                    ? "text-cyan-300"
                    : isOverBudget
                    ? "text-rose-400"
                    : "text-white"
                }`}
              >
                {stealthMode ? "₹0.00" : `${rawPercent}%`}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                {stealthMode ? "Empty Vault" : isOverBudget ? "deficit" : "used"}
              </span>
            </div>
          </div>

          {/* Directly Below The Circle Meter: Remaining & Spent Overview */}
          <div className="mt-3">
            <p
              className={`font-display font-mono tabular-nums text-2xl sm:text-3xl font-black tracking-tight ${
                stealthMode
                  ? "text-cyan-300"
                  : isOverBudget
                  ? "text-rose-400"
                  : "text-white"
              }`}
            >
              {stealthMode
                ? "₹0.00 / Empty Vault"
                : isOverBudget
                ? `Over by ₹${Math.abs(remaining).toLocaleString("en-IN")}`
                : `You have ₹${remaining.toLocaleString("en-IN")}`}
            </p>
            <p className="font-mono tabular-nums text-xs text-slate-400 mt-1">
              {stealthMode
                ? "Stealth Zero-Balance Shield Active · Bank Stats Masked"
                : `Spent ₹${todaySpent.toLocaleString("en-IN")} of ₹${dailyLimit.toLocaleString("en-IN")}`}
            </p>
          </div>

          {/* Emergency Lockdown Locked HUD Overlay Banner with Witty JARVIS Cooldown Timer */}
          {lockdownActive && (
            <div
              role="region"
              aria-label="Emergency Lockdown HUD Overlay"
              className="mt-3.5 w-full rounded-2xl border border-amber-400/50 bg-slate-950/90 p-3 text-left shadow-[0_0_25px_rgba(245,158,11,0.25)] relative overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-300">
                    J.A.R.V.I.S. LOCKDOWN PROTOCOL
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 font-mono text-[11px] font-extrabold text-amber-200 tabular-nums">
                  <Timer className="w-3 h-3 text-amber-400" />
                  <span>{cooldownStr}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed font-medium">
                &ldquo;Sir, your UPI trigger finger has been quarantined until{" "}
                <span className="text-amber-300 font-bold">06:00 AM tomorrow</span>. Step away from Swiggy &amp; Zomato.&rdquo;
              </p>
            </div>
          )}

          {/* Discipline Shield & Streak Celebration Badges */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {isShieldActive && (
              <button
                type="button"
                onClick={() => onTriggerCelebration?.("shield")}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold shadow-xs hover:bg-emerald-500/25 active:scale-95 transition-all cursor-pointer"
                title="Tap to celebrate Discipline Shield"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Discipline Shield (50% Under Limit)</span>
                <Sparkles className="w-3 h-3 text-emerald-300 animate-pulse" />
              </button>
            )}

            {streakDays >= 3 && (
              <button
                type="button"
                onClick={() => onTriggerCelebration?.("streak")}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-bold shadow-xs hover:border-amber-300 active:scale-95 transition-all cursor-pointer"
                title="Tap to celebrate streak milestone"
              >
                <PartyPopper className="w-3.5 h-3.5 text-amber-400" />
                <span>{streakDays}d Streak Milestone! Celebrate 🎊</span>
              </button>
            )}
          </div>
        </div>
      </section>


      {/* 4. COMPACT DUAL ACTION BUTTONS (With Signature Add Expense Glow) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onToggleLockdown}
          className={`min-h-[46px] px-3 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all active:scale-[0.98] cursor-pointer ${
            lockdownActive
              ? "bg-amber-500/20 border-amber-400/60 text-amber-200 hover:bg-amber-500/30 shadow-lg shadow-amber-950/40"
              : "bg-slate-900/90 text-slate-300 hover:bg-slate-800/90 hover:text-white"
          }`}
          style={
            !lockdownActive
              ? {
                  borderColor: `${theme.accentHex}30`,
                }
              : undefined
          }
        >
          {lockdownActive ? (
            <>
              <Unlock className="w-3.5 h-3.5 text-amber-300" />
              <span>Lift Lockdown</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Emergency Lockdown</span>
            </>
          )}
        </button>

        {/* Add Expense Button with Dynamic Signature Neon Glow */}
        <button
          type="button"
          onClick={onOpenAddModal}
          style={{
            boxShadow: `0 0 24px ${theme.ringGlow}, 0 2px 8px rgba(0,0,0,0.4)`,
          }}
          className={`min-h-[46px] px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer ${theme.buttonBg} ${theme.buttonText}`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Add Expense</span>
        </button>
      </div>

      {/* 5. PRESERVED QUICK-ADD CHIPS WITH CRISP THEME BORDERS */}
      <div id="tour-quick-add" className="pt-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <span
            className="text-[11px] font-bold uppercase tracking-wider transition-colors duration-300"
            style={{ color: theme.accentHex }}
          >
            Quick Add
          </span>
          <span className="text-[10px] text-slate-400 font-mono">1-Tap Log</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {QUICK_ADD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onQuickAdd(preset)}
              style={{
                borderColor: `${theme.accentHex}30`,
              }}
              className="min-h-[48px] p-2 rounded-2xl border bg-slate-900/80 hover:bg-slate-800/90 active:scale-[0.96] transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-xs hover:shadow"
            >
              <div className="flex items-center gap-1">
                <span className="text-sm" aria-hidden="true">
                  {preset.emoji}
                </span>
                <span className="text-[11px] font-semibold text-slate-200">
                  {preset.label}
                </span>
              </div>
              <span
                className="font-mono tabular-nums text-[11px] font-bold transition-colors duration-300"
                style={{ color: theme.accentHex }}
              >
                ₹{preset.amount}
              </span>
            </button>
          ))}
        </div>

        {/* FEATURE 1: "FAKE MOM CALL ESCAPE" (Under Home Quick Tools) */}
        {onTriggerFakeMomCall && (
          <div className="mt-2.5 p-2.5 rounded-2xl bg-[#0b0f17] border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.18)] flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shrink-0">
                <PhoneIncoming className="w-4 h-4 text-emerald-400 animate-bounce" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-300 block">
                  FAKE MOM CALL ESCAPE
                </span>
                <p className="text-[11px] text-slate-300 truncate">
                  Incoming Call: Mummy ❤️ · Escape pricey bill splits
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onTriggerFakeMomCall}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-[11px] uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-[0_0_16px_rgba(16,185,129,0.45)] cursor-pointer active:scale-95 transition-all"
            >
              <PhoneIncoming className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Bail Me Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
