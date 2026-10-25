import React, { useState, useRef, useEffect } from "react";
import { X, Sparkles, Trophy, Check, Pin, Gift, Shield, Clock } from "lucide-react";
import type { FanTheme } from "../types";
import {
  playRouletteTick,
  celebrateStreakMilestone,
  playProVaultChime,
} from "../utils/celebration";

function getTimeUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, midnight.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export interface StarkArcBadge {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  rarity: "LEGENDARY" | "MYTHIC" | "EPIC";
}

export const STARK_ARC_BADGES: StarkArcBadge[] = [
  {
    id: "iron-discipline",
    name: "Iron Discipline",
    tagline: "Survived daily quota with Titanium resolve",
    icon: "🛡️",
    color: "#00f0ff",
    rarity: "MYTHIC",
  },
  {
    id: "zero-leak-legend",
    name: "Zero-Leak Legend",
    tagline: "Sealed impulse leaks across all sectors",
    icon: "⚡",
    color: "#10b981",
    rarity: "LEGENDARY",
  },
  {
    id: "master-tactician",
    name: "Master Tactician",
    tagline: "Precision capital allocation under pressure",
    icon: "🎯",
    color: "#f59e0b",
    rarity: "LEGENDARY",
  },
  {
    id: "arc-core-sovereign",
    name: "Arc Core Sovereign",
    tagline: "Peak financial output & vault supremacy",
    icon: "👑",
    color: "#a855f7",
    rarity: "MYTHIC",
  },
  {
    id: "chai-auditor",
    name: "Chai Auditor",
    tagline: "Monitored micro-snacks with Stark telemetry",
    icon: "☕",
    color: "#eab308",
    rarity: "EPIC",
  },
  {
    id: "quantum-saver",
    name: "Quantum Saver",
    tagline: "Sub-50% daily burn rate achieved",
    icon: "💎",
    color: "#38bdf8",
    rarity: "EPIC",
  },
];

interface StarkRewardVaultModalProps {
  isOpen: boolean;
  theme: FanTheme;
  unlockedBadgeIds: string[];
  pinnedBadgeIds: string[];
  todaySpent: number;
  dailyLimit: number;
  expensesCount: number;
  onUnlockAndPinBadge: (badgeId: string) => void;
  onTogglePinBadge: (badgeId: string) => void;
  onClose: () => void;
}

export const StarkRewardVaultModal: React.FC<StarkRewardVaultModalProps> = ({
  isOpen,
   unlockedBadgeIds,
  pinnedBadgeIds,
  todaySpent,
  dailyLimit,
  expensesCount,
  onUnlockAndPinBadge,
  onTogglePinBadge,
  onClose,
}) => {
  const [rotationDeg, setRotationDeg] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonBadge, setWonBadge] = useState<StarkArcBadge | null>(null);
  const [lastSpunDate, setLastSpunDate] = useState<string>(() => {
    return (
      localStorage.getItem("lastSpunDate") ||
      localStorage.getItem("kharche_stark_last_spun_date_v1") ||
      ""
    );
  });
  const [countdownStr, setCountdownStr] = useState<string>(() =>
    getTimeUntilMidnight()
  );
  const tickTimersRef = useRef<number[]>([]);

  const todayDateStr = new Date().toDateString();
  const hasSpunToday = lastSpunDate === todayDateStr;

  useEffect(() => {
    if (!isOpen) return;
    const saved =
      localStorage.getItem("lastSpunDate") ||
      localStorage.getItem("kharche_stark_last_spun_date_v1") ||
      "";
    setLastSpunDate(saved);
    setCountdownStr(getTimeUntilMidnight());

    const timer = window.setInterval(() => {
      setCountdownStr(getTimeUntilMidnight());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const isUnderBudget = todaySpent <= dailyLimit;

  const clearTickTimers = () => {
    tickTimersRef.current.forEach((id) => window.clearTimeout(id));
    tickTimersRef.current = [];
  };

  const handleSpinWheel = () => {
    if (isSpinning || hasSpunToday) return;
    clearTickTimers();
    setIsSpinning(true);
    setWonBadge(null);

    // Prefer awarding an uncollected badge first, or random if all unlocked
    const lockedIndices = STARK_ARC_BADGES.map((b, idx) =>
      unlockedBadgeIds.includes(b.id) ? -1 : idx
    ).filter((idx) => idx !== -1);

    const targetIndex =
      lockedIndices.length > 0
        ? lockedIndices[Math.floor(Math.random() * lockedIndices.length)]
        : Math.floor(Math.random() * STARK_ARC_BADGES.length);

    // Each sector is 60 degrees (360 / 6). Pointer is at top (0 deg).
    const sectorCenterAngle = targetIndex * 60 + 30;
    const desiredMod = (360 - sectorCenterAngle) % 360;
    const currentMod = ((rotationDeg % 360) + 360) % 360;
    const deltaToTarget = (desiredMod - currentMod + 360) % 360;

    // Spin 5 full turns + alignment
    const nextRotation = rotationDeg + 360 * 5 + deltaToTarget;
    setRotationDeg(nextRotation);

    // Schedule decelerating cyber roulette ticks over 3.2 seconds
    const tickScheduleMs = [
      60, 130, 210, 300, 400, 510, 630, 760, 900, 1060, 1240, 1440, 1660, 1910,
      2190, 2510, 2860, 3180,
    ];
    tickScheduleMs.forEach((ms, i) => {
      const tid = window.setTimeout(() => {
        playRouletteTick(0.85 + (i / tickScheduleMs.length) * 0.45);
      }, ms);
      tickTimersRef.current.push(tid);
    });

    const finishTimer = window.setTimeout(() => {
      const awarded = STARK_ARC_BADGES[targetIndex];
      const nowDateStr = new Date().toDateString();
      localStorage.setItem("lastSpunDate", nowDateStr);
      localStorage.setItem("kharche_stark_last_spun_date_v1", nowDateStr);
      setLastSpunDate(nowDateStr);
      setIsSpinning(false);
      setWonBadge(awarded);
      onUnlockAndPinBadge(awarded.id);
      celebrateStreakMilestone(7, awarded.color);
    }, 3350);
    tickTimersRef.current.push(finishTimer);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Stark Reward Vault - Daily Discipline Cyber Roulette"
      onClick={() => {
        if (!isSpinning) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/88 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[405px] max-h-[92vh] overflow-y-auto rounded-3xl bg-[#04070d] border-2 border-cyan-400/60 shadow-[0_0_50px_rgba(0,240,255,0.28)] p-4 sm:p-5 space-y-4 text-slate-100 relative"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.24em] text-amber-300">
                STARK REWARD VAULT · MYSTERY CHEST
              </span>
            </div>
            <h3 className="text-base font-black tracking-tight text-white mt-0.5">
              Daily Discipline Cyber Roulette
            </h3>
            <p className="text-[11px] text-slate-400">
              {isUnderBudget
                ? `Under budget (₹${todaySpent}/₹${dailyLimit}) & ${expensesCount} logs active — Spin unlocked!`
                : `${expensesCount} expenses logged today — Spin for Stark Arc Badges!`}
            </p>
          </div>

          <button
            type="button"
            disabled={isSpinning}
            onClick={onClose}
            aria-label="Close Stark Reward Vault"
            className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cyber Roulette Wheel Stage */}
        <div className="relative flex flex-col items-center justify-center py-2">
          {/* Top Laser Pointer */}
          <div className="relative z-20 -mb-2.5 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.95)]" />
          </div>

          {/* Outer Glowing Halo Ring */}
          <div className="relative w-64 h-64 rounded-full p-2 bg-[#020408] border-2 border-cyan-400/60 shadow-[0_0_35px_rgba(0,240,255,0.35),inset_0_0_20px_rgba(0,240,255,0.25)] flex items-center justify-center">
            {/* Rotating SVG Roulette Wheel */}
            <div
              style={{
                transform: `rotate(${rotationDeg}deg)`,
                transition: isSpinning
                  ? "transform 3.3s cubic-bezier(0.12, 0.82, 0.16, 1)"
                  : "none",
              }}
              className="w-full h-full rounded-full overflow-hidden relative"
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {STARK_ARC_BADGES.map((badge, index) => {
                  const startAngle = index * 60 - 90;
                  const endAngle = (index + 1) * 60 - 90;
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;

                  const x1 = 100 + 98 * Math.cos(startRad);
                  const y1 = 100 + 98 * Math.sin(startRad);
                  const x2 = 100 + 98 * Math.cos(endRad);
                  const y2 = 100 + 98 * Math.sin(endRad);

                  const midAngle = startAngle + 30;
                  const midRad = (midAngle * Math.PI) / 180;
                  const iconX = 100 + 62 * Math.cos(midRad);
                  const iconY = 100 + 62 * Math.sin(midRad);

                  return (
                    <g key={badge.id}>
                      <path
                        d={`M 100 100 L ${x1} ${y1} A 98 98 0 0 1 ${x2} ${y2} Z`}
                        fill={index % 2 === 0 ? "#09101d" : "#050912"}
                        stroke="rgba(34, 211, 238, 0.35)"
                        strokeWidth="1.2"
                      />
                      <path
                        d={`M 100 100 L ${x1} ${y1} A 98 98 0 0 1 ${x2} ${y2} Z`}
                        fill={badge.color}
                        fillOpacity="0.14"
                      />
                      <text
                        x={iconX}
                        y={iconY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="18"
                        transform={`rotate(${midAngle + 90}, ${iconX}, ${iconY})`}
                      >
                        {badge.icon}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Center Arc Reactor Hub */}
            <button
              type="button"
              disabled={isSpinning || hasSpunToday}
              onClick={handleSpinWheel}
              className={`absolute z-10 w-16 h-16 rounded-full bg-[#020408] border-2 flex flex-col items-center justify-center transition-transform ${
                hasSpunToday
                  ? "border-slate-700 text-slate-500 cursor-not-allowed opacity-75"
                  : "border-cyan-300 shadow-[0_0_25px_rgba(0,240,255,0.9)] cursor-pointer active:scale-95"
              }`}
            >
              <Sparkles
                className={`w-4 h-4 ${
                  hasSpunToday
                    ? "text-slate-500"
                    : isSpinning
                    ? "text-cyan-300 animate-spin"
                    : "text-cyan-300 animate-pulse"
                }`}
              />
              <span className="font-mono text-[9px] font-black tracking-widest uppercase text-cyan-200 mt-0.5">
                {hasSpunToday ? "LOCKED" : isSpinning ? "SPIN" : "CORE"}
              </span>
            </button>
          </div>
        </div>

        {/* Spin CTA Button & Daily 1-Spin Limit Countdown */}
        <div className="space-y-2.5">
          <button
            type="button"
            disabled={isSpinning || hasSpunToday}
            onClick={handleSpinWheel}
            className={`w-full h-11 rounded-2xl font-black text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2 transition-all ${
              hasSpunToday
                ? "bg-slate-900 border border-amber-500/30 text-amber-300 cursor-not-allowed opacity-90"
                : "bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400 text-slate-950 shadow-[0_0_25px_rgba(251,191,36,0.45)] cursor-pointer active:scale-[0.98]"
            }`}
          >
            {hasSpunToday ? (
              <>
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="font-mono">Next Spin in {countdownStr}</span>
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isSpinning
                    ? "SPINNING STARK CYBER WHEEL..."
                    : "SPIN FOR STARK ARC BADGE"}
                </span>
              </>
            )}
          </button>

          {hasSpunToday && (
            <div
              role="status"
              className="p-3 rounded-2xl bg-[#070b14] border border-amber-400/40 text-center space-y-1 shadow-[0_0_18px_rgba(251,191,36,0.12)]"
            >
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-widest text-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Next Spin in {countdownStr}</span>
              </div>
              <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                Daily Quota Depleted. Maintain tomorrow&apos;s streak for your next Stark Core spin.
              </p>
            </div>
          )}
        </div>

        {/* Awarded Badge Spotlight Banner */}
        {wonBadge && (
          <div
            style={{
              borderColor: `${wonBadge.color}80`,
              boxShadow: `0 0 25px ${wonBadge.color}30`,
            }}
            className="p-3.5 rounded-2xl bg-[#080d18] border-2 flex items-center justify-between gap-3 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                style={{
                  borderColor: wonBadge.color,
                  backgroundColor: `${wonBadge.color}20`,
                }}
                className="w-11 h-11 rounded-2xl border flex items-center justify-center text-xl shrink-0 shadow-lg"
              >
                {wonBadge.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    style={{ color: wonBadge.color }}
                    className="text-[9px] font-mono font-black uppercase tracking-widest"
                  >
                    {wonBadge.rarity} UNLOCKED
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    Pinned to Profile
                  </span>
                </div>
                <p className="text-xs font-black text-white truncate mt-0.5">
                  {wonBadge.name}
                </p>
                <p className="text-[10px] text-slate-400 leading-snug">
                  {wonBadge.tagline}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stark Arc Badge Armory & Profile Pin Selector */}
        <div className="space-y-2 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-300 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Stark Arc Badge Vault ({unlockedBadgeIds.length}/6)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Tap unlocked badge to pin
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {STARK_ARC_BADGES.map((badge) => {
              const unlocked = unlockedBadgeIds.includes(badge.id);
              const pinned = pinnedBadgeIds.includes(badge.id);

              return (
                <button
                  key={badge.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    playProVaultChime();
                    onTogglePinBadge(badge.id);
                  }}
                  style={{
                    borderColor: pinned
                      ? badge.color
                      : unlocked
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(255,255,255,0.06)",
                  }}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                    unlocked
                      ? "bg-[#0a101d] cursor-pointer hover:brightness-110"
                      : "bg-slate-950/50 opacity-45 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{badge.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">
                        {badge.name}
                      </p>
                      <span
                        style={{ color: badge.color }}
                        className="block text-[8px] font-mono font-bold uppercase tracking-wider"
                      >
                        {unlocked ? badge.rarity : "LOCKED"}
                      </span>
                    </div>
                  </div>

                  {unlocked && (
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        pinned
                          ? "bg-amber-400 text-slate-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                      title={pinned ? "Pinned on Profile Card" : "Pin to Profile"}
                    >
                      {pinned ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <Pin className="w-2.5 h-2.5" />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
