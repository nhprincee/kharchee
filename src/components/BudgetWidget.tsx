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
  Flame,
  Volume2,
  Zap,
} from "lucide-react";
import type { FanTheme, QuickAddPreset } from "../types";
import { QUICK_ADD_PRESETS } from "../data/initialData";
import {
  playMechanicalKeyTick,
  playStarkPowerSurgeSwoosh,
  playMetallicCoinChime,
} from "../utils/celebration";

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

  // "Salary Day vs Month-End" Survival Meter state (defaults to actual calendar date)
  const nowDate = new Date();
  const realDayOfMonth = nowDate.getDate();
  const totalDaysInMonth = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth() + 1,
    0
  ).getDate();
  const [simulatedPhase, setSimulatedPhase] = useState<"auto" | "optimal" | "month-end">("auto");
  const [simulateHazardBreach, setSimulateHazardBreach] = useState(false);

  const isMonthEndPhase =
    simulatedPhase === "month-end"
      ? true
      : simulatedPhase === "optimal"
      ? false
      : realDayOfMonth >= 21;

  const activeDayDisplay =
    simulatedPhase === "optimal"
      ? Math.min(realDayOfMonth, 12)
      : simulatedPhase === "month-end"
      ? Math.max(realDayOfMonth, 25)
      : realDayOfMonth;

  const daysUntilFirst = Math.max(1, totalDaysInMonth - activeDayDisplay + 1);

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
  const isSafeBurnBreached = isOverBudget || simulateHazardBreach || rawPercent >= 100;
  const isShieldActive = dailyLimit > 0 && todaySpent <= dailyLimit * 0.5;

  // Symmetrical SVG Ring Math
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  const monthName = nowDate.toLocaleString("en-US", { month: "long" }).toUpperCase();
  const formattedHeroAmount = `₹${Math.abs(remaining).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(limitInput);
    if (!Number.isNaN(parsed) && parsed >= 50 && parsed <= 100000) {
      onUpdateLimit(Math.round(parsed));
      setIsEditingLimit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AESTHETIC HERO CARD (APPLE CARD / LINEAR / CRED STYLE) */}
      <section
        id="tour-budget-ring"
        aria-label="Today's Budget"
        className="bg-gradient-to-b from-[#111622]/80 to-[#080c14]/90 backdrop-blur-3xl border border-white/[0.07] rounded-3xl p-6 transition-all duration-300 relative overflow-hidden"
      >
        {/* Top Row: Tracked Mini Label & Edit Limit Trigger */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
              {monthName} RUNWAY
            </span>
            {lockdownActive && (
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#e6c875] bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-full">
                Locked
              </span>
            )}
            {isOverBudget && (
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-rose-300 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-full">
                Deficit
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
              className="text-[11px] font-medium text-white/60 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <Pencil className="w-2.5 h-2.5 text-white/60" />
              <span className="tracking-tight">
                {stealthMode
                  ? "₹0.00"
                  : `Limit ₹${dailyLimit.toLocaleString("en-IN")}`}
              </span>
            </button>
          ) : (
            <form onSubmit={handleSaveLimit} className="flex items-center gap-1">
              <div className="relative flex items-center">
                <span className="absolute left-2 text-xs font-mono text-white/50">₹</span>
                <input
                  type="number"
                  min={50}
                  max={100000}
                  step={10}
                  value={limitInput}
                  onChange={(e) => {
                    playMechanicalKeyTick();
                    setLimitInput(e.target.value);
                  }}
                  autoFocus
                  className="w-20 h-7 pl-5 pr-1 rounded-lg bg-black/60 border border-white/15 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-[#e6c875]"
                />
              </div>
              <button
                type="submit"
                aria-label="Save limit"
                className="w-6 h-6 rounded-md bg-white text-black flex items-center justify-center cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingLimit(false)}
                aria-label="Cancel editing"
                className="w-6 h-6 rounded-md bg-white/[0.06] text-white/70 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

        {/* Giant Crisp White Hero Number */}
        <div className="mt-5 mb-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-mono tabular-nums text-4xl sm:text-5xl font-black tracking-tight text-white">
              {stealthMode
                ? "₹0.00"
                : isOverBudget
                ? `−${formattedHeroAmount}`
                : formattedHeroAmount}
            </h2>
            <span className="font-mono tabular-nums text-xs font-medium tracking-tight text-white/50">
              {stealthMode ? "STEALTH" : `${rawPercent}% used`}
            </span>
          </div>
          <p className="text-xs text-white/50 tracking-tight mt-1.5 font-mono tabular-nums">
            {stealthMode
              ? "Zero-Balance Shield Engaged · Balances Hidden"
              : `Spent ₹${todaySpent.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} of ₹${dailyLimit.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} daily allowance`}
          </p>
        </div>

        {/* Thin Minimalist 3px Progress Line with Subtle Champagne-Gold Glow */}
        <div
          role="img"
          aria-label={`${rawPercent} percent of daily budget used`}
          className="w-full h-[3px] rounded-full bg-white/[0.07] overflow-hidden relative"
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.max(2, clampedPercent)}%`,
              backgroundColor: isOverBudget ? "#f43f5e" : "#e6c875",
              boxShadow: isOverBudget
                ? "0 0 10px rgba(244, 63, 94, 0.5)"
                : "0 0 10px rgba(230, 200, 117, 0.45)",
            }}
          />
        </div>

        {/* Subtle Minimalist Runway Telemetry Strip */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSafeBurnBreached
                  ? "bg-rose-400 animate-ping"
                  : isMonthEndPhase
                  ? "bg-[#e6c875]"
                  : "bg-emerald-400"
              }`}
            />
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-white/70">
              {isMonthEndPhase
                ? "Critical Oxygen / Broke Alert"
                : "Stark Vault: Optimal Runway"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                playMechanicalKeyTick();
                setSimulatedPhase((prev) =>
                  prev === "auto"
                    ? isMonthEndPhase
                      ? "optimal"
                      : "month-end"
                    : prev === "optimal"
                    ? "month-end"
                    : "auto"
                );
              }}
              className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              Day {activeDayDisplay} · {daysUntilFirst}d to 1st
            </button>
            {isShieldActive && (
              <button
                type="button"
                onClick={() => onTriggerCelebration?.("shield")}
                className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-[#e6c875] hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Celebrate Discipline Shield"
              >
                Shield 50%
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] font-mono text-white/50 mt-2 tracking-tight">
          Remaining Daily Quota:{" "}
          <span className="text-white font-semibold">
            ₹{dailyLimit.toLocaleString("en-IN")}
          </span>{" "}
          to survive until the 1st.
        </p>

        {/* Emergency Lockdown Overlay (Minimalist Dark Glass) */}
        {lockdownActive && (
          <div
            role="region"
            aria-label="Emergency Lockdown HUD Overlay"
            className="mt-4 w-full rounded-2xl border border-white/[0.08] bg-black/50 p-3.5 text-left"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-[#e6c875]">
                Lockdown Protocol
              </span>
              <div className="inline-flex items-center gap-1 font-mono text-[11px] text-white/80 tabular-nums">
                <Timer className="w-3 h-3 text-[#e6c875]" />
                <span>{cooldownStr}</span>
              </div>
            </div>
            <p className="text-[11px] text-white/60 mt-2 leading-relaxed">
              Outgoing discretionary UPI transfers paused until{" "}
              <span className="text-white font-medium">06:00 AM</span>.
            </p>
          </div>
        )}
      </section>

      {/* DUAL ACTION CONTROLS — SLEEK FROSTED GLASS & REFINED CHAMPAGNE */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onToggleLockdown}
          className={`min-h-[46px] px-4 py-2.5 rounded-2xl font-medium text-xs flex items-center justify-center gap-2 border transition-all active:scale-[0.98] cursor-pointer ${
            lockdownActive
              ? "bg-white/[0.08] border-[#e6c875]/40 text-[#e6c875]"
              : "bg-white/[0.04] border-white/[0.08] text-white/80 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          {lockdownActive ? (
            <>
              <Unlock className="w-3.5 h-3.5 text-[#e6c875]" />
              <span>Lift Lockdown</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-white/70" />
              <span>Lockdown Mode</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="min-h-[46px] px-4 py-2.5 rounded-2xl font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer bg-white text-black hover:bg-white/90"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* QUICK-ADD CHIPS — MINIMALIST DARK OBSIDIAN GLASS */}
      <div id="tour-quick-add" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Quick Add
          </span>
          <span className="text-[10px] text-white/40 font-mono tracking-tight">1-Tap Log</span>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {QUICK_ADD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onQuickAdd(preset)}
              className="min-h-[54px] p-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] active:scale-[0.97] transition-all flex flex-col items-center justify-center text-center cursor-pointer"
            >
              <div className="flex items-center gap-1">
                <span className="text-xs" aria-hidden="true">
                  {preset.emoji}
                </span>
                <span className="text-[11px] font-medium text-white/85">
                  {preset.label}
                </span>
              </div>
              <span className="font-mono tabular-nums text-[11px] font-semibold tracking-tight text-white/50 mt-0.5">
                ₹{preset.amount}
              </span>
            </button>
          ))}
        </div>

        {/* Minimalist Acoustic Feedback Bar */}
        <div className="pt-1 flex items-center justify-between gap-2 px-1">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 flex items-center gap-1.5">
            <Volume2 className="w-3 h-3 text-white/50" />
            <span>Tactile Synth</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => playMechanicalKeyTick()}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white text-[10px] font-mono transition-colors cursor-pointer"
            >
              Key Tick
            </button>
            <button
              type="button"
              onClick={() => playStarkPowerSurgeSwoosh()}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white text-[10px] font-mono transition-colors cursor-pointer"
            >
              Swoosh
            </button>
            <button
              type="button"
              onClick={() => playMetallicCoinChime()}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white text-[10px] font-mono transition-colors cursor-pointer"
            >
              Chime
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
