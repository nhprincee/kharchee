import React from "react";
import { Flame, Gift, Eye, EyeOff } from "lucide-react";
import { THEMES } from "./ThemeSelector";

interface HeaderProps {
  currentThemeId: string;
  streakCount: number;
  userInitials: string;
  vaultReady?: boolean;
  stealthMode?: boolean;
  onToggleStealthMode?: () => void;
  onOpenProfile: () => void;
  onOpenThemes: () => void;
  onOpenStreakCelebration: () => void;
  onOpenRewardVault?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentThemeId,
  streakCount,
  userInitials,
  vaultReady = true,
  stealthMode = false,
  onToggleStealthMode,
  onOpenProfile,
  onOpenThemes,
  onOpenStreakCelebration,
  onOpenRewardVault,
}) => {
  const activeTheme =
    THEMES.find(
      (t) => t.id === currentThemeId || t.appThemeId === currentThemeId
    ) || THEMES[0];

  const getStreakTier = (days: number) => {
    if (days >= 7) return "Stark Elite";
    if (days >= 4) return "Iron Vault";
    return "Novice Saver";
  };

  return (
    <header className="sticky top-0 z-40 w-full px-4 py-3 bg-[#0b0f17]/95 backdrop-blur-xl border-b border-cyan-500/20 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
      {/* Brand & Active Authentic Logo */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenThemes}
          title="Change Theme"
          className="relative group p-1 rounded-xl bg-slate-900/80 border border-white/10 hover:border-cyan-400/60 transition-all shadow-[0_0_12px_rgba(0,0,0,0.4)] cursor-pointer"
        >
          <div className="w-8 h-8 flex items-center justify-center transform group-hover:scale-105 transition-transform">
            {activeTheme.badgeSvg}
          </div>
          <span
            style={{ backgroundColor: activeTheme.primaryColor }}
            className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-slate-950"
          />
        </button>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm tracking-[0.25em] text-white">
              K H A R C H E
            </span>
            <span
              style={{ color: activeTheme.primaryColor }}
              className="text-[10px] font-mono uppercase px-1 py-0.5 rounded bg-white/5 border border-white/10"
            >
              {activeTheme.name}
            </span>
          </div>
          <span className="text-[10px] tracking-wider text-slate-400 font-semibold block uppercase">
            {stealthMode ? "₹0.00 / Empty Vault" : "Late Night Watch"}
          </span>
        </div>
      </div>

      {/* Stealth Zero-Balance Shield + Glowing Mystery Vault Chest + Streak Badge + Profile Avatar */}
      <div className="flex items-center gap-1.5">
        {onToggleStealthMode && (
          <button
            type="button"
            onClick={onToggleStealthMode}
            title={
              stealthMode
                ? "Stealth Zero-Balance Shield ON (₹0.00 / Empty Vault)"
                : "Enable Stealth Zero-Balance Shield (Hide Balance from Snooping Friends)"
            }
            aria-label="Toggle Stealth Zero-Balance Shield"
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              stealthMode
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.55)]"
                : "bg-slate-900/80 border-white/15 text-slate-300 hover:text-white hover:border-cyan-400/50"
            }`}
          >
            {stealthMode ? (
              <EyeOff className="w-4 h-4 text-cyan-300" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}

        {onOpenRewardVault && (
          <button
            type="button"
            onClick={onOpenRewardVault}
            title="Open Stark Reward Vault Mystery Chest"
            aria-label="Open Stark Reward Vault Mystery Chest"
            className="relative flex items-center gap-1 px-2 py-1.5 rounded-full bg-gradient-to-r from-cyan-950/70 via-slate-900 to-amber-950/60 border border-amber-400/60 shadow-[0_0_16px_rgba(251,191,36,0.45)] hover:border-amber-300 transition-all active:scale-95 cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-200 hidden xs:inline">
              Vault
            </span>
            {vaultReady && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.95)] animate-ping" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenStreakCelebration}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-amber-950/50 to-orange-950/40 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.35)] hover:border-amber-400 transition-all active:scale-95 cursor-pointer"
        >
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-black text-amber-300 leading-none">
              {streakCount} d streak
            </span>
            <span className="text-[8px] font-mono tracking-tight text-amber-200/70 leading-tight">
              {getStreakTier(streakCount)}
            </span>
          </div>
        </button>

        {/* Profile Avatar Chip */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 border border-cyan-300/40 shadow-[0_0_10px_rgba(6,182,212,0.4)] flex items-center justify-center text-xs font-black text-white active:scale-95 transition-transform cursor-pointer"
        >
          {userInitials || "MS"}
        </button>
      </div>
    </header>
  );
};

