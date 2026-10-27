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
    <header
      style={{
        backgroundColor: "#000000",
        backgroundImage: "none",
        borderBottom: "1px solid #1a2234",
        boxShadow: "none",
      }}
      className="sticky top-0 z-50 w-full px-4 py-3 !bg-black !bg-none !shadow-none !backdrop-blur-none flex items-center justify-between"
    >
      {/* Brand & Active Authentic Logo — 100% Flat Stealth Matte Black (Zero Glow) */}
      <div
        style={{ backgroundColor: "#000000", backgroundImage: "none", boxShadow: "none", filter: "none" }}
        className="flex items-center gap-2 shrink-0 flex-nowrap !bg-black !bg-none !shadow-none"
      >
        <button
          type="button"
          onClick={onOpenThemes}
          title="Change Theme"
          style={{ backgroundColor: "#0a0e17", backgroundImage: "none", boxShadow: "none", filter: "none" }}
          className="relative p-1 rounded-xl !bg-[#0a0e17] !bg-none !shadow-none border border-[#1a2234] hover:border-slate-700 transition-colors cursor-pointer shrink-0"
        >
          <div
            style={{ boxShadow: "none", filter: "none" }}
            className="w-8 h-8 flex items-center justify-center !shadow-none"
          >
            {activeTheme.badgeSvg}
          </div>
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-slate-400 ring-2 ring-black" />
        </button>

        <div
          style={{ backgroundColor: "#000000", backgroundImage: "none", boxShadow: "none", filter: "none" }}
          className="shrink-0 !bg-black !bg-none !shadow-none"
        >
          <div className="flex items-center flex-nowrap whitespace-nowrap">
            <span
              style={{ textShadow: "none", filter: "none" }}
              className="font-black text-xs sm:text-sm whitespace-nowrap shrink-0 flex-nowrap tracking-[0.2em] text-white !shadow-none"
            >
              K H A R C H E
            </span>
          </div>
          <span className="text-[10px] tracking-wider text-slate-400 font-semibold block uppercase whitespace-nowrap">
            {stealthMode ? "₹0.00 / Empty Vault" : "Late Night Watch"}
          </span>
        </div>
      </div>

      {/* Minimalist Monochrome & Subtle Champagne Controls */}
      <div className="flex items-center gap-2">
        {onToggleStealthMode && (
          <button
            type="button"
            onClick={onToggleStealthMode}
            title={
              stealthMode
                ? "Stealth Zero-Balance Shield ON (₹0.00 / Empty Vault)"
                : "Enable Stealth Zero-Balance Shield"
            }
            aria-label="Toggle Stealth Zero-Balance Shield"
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              stealthMode
                ? "bg-white/[0.1] border-white/20 text-white"
                : "bg-white/[0.04] border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {stealthMode ? (
              <EyeOff className="w-3.5 h-3.5 text-white" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-white/80" />
            )}
          </button>
        )}

        {onOpenRewardVault && (
          <button
            type="button"
            onClick={onOpenRewardVault}
            title="Open Stark Reward Vault"
            aria-label="Open Stark Reward Vault"
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors active:scale-95 cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 text-white/80" />
            <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-white/80 hidden xs:inline">
              Vault
            </span>
            {vaultReady && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#e6c875]" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenStreakCelebration}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/80 hover:bg-white/[0.08] transition-colors active:scale-95 cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5 text-[#e6c875]" />
          <span className="text-[11px] font-mono font-semibold tracking-tight text-white leading-none">
            {streakCount}d
          </span>
        </button>

        {/* Profile Avatar Chip */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] flex items-center justify-center text-[11px] font-semibold tracking-wider text-white cursor-pointer transition-colors"
        >
          {userInitials || "MS"}
        </button>
      </div>
    </header>
  );
};

