import React from "react";
import { Check } from "lucide-react";
import type { ThemeId } from "../types";

export interface ThemeOption {
  id: string;
  appThemeId: ThemeId;
  name: string;
  tagline: string;
  primaryColor: string;
  accentGlow: string;
  badgeSvg: React.ReactNode;
}

export const THEMES: ThemeOption[] = [
  {
    id: "arc-core",
    appThemeId: "stark",
    name: "Arc Core HUD",
    tagline: "Obsidian titanium & arc cyan",
    primaryColor: "#06b6d4",
    accentGlow: "rgba(6, 182, 212, 0.4)",
    badgeSvg: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="44" stroke="#06b6d4" strokeWidth="4" strokeDasharray="6 4" />
        <circle cx="50" cy="50" r="32" stroke="#06b6d4" strokeWidth="3" opacity="0.8" />
        <circle cx="50" cy="50" r="16" fill="#06b6d4" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="3" />
        <path d="M50 10 L50 24 M50 76 L50 90 M10 50 L24 50 M76 50 L90 50" stroke="#06b6d4" strokeWidth="4" />
      </svg>
    ),
  },
  {
    id: "midnight-titanium",
    appThemeId: "midnight",
    name: "Midnight Titanium",
    tagline: "Pitch-black titanium & sovereign gold",
    primaryColor: "#fbbf24",
    accentGlow: "rgba(251, 191, 36, 0.4)",
    badgeSvg: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
        <rect x="16" y="16" width="68" height="68" rx="16" stroke="#fbbf24" strokeWidth="3.5" fill="#090d16" />
        <path d="M50 26 L74 50 L50 74 L26 50 Z" stroke="#fbbf24" strokeWidth="3" fill="#fbbf24" fillOpacity="0.2" />
        <circle cx="50" cy="50" r="8" fill="#fbbf24" />
      </svg>
    ),
  },
  {
    id: "cyberpunk-emerald",
    appThemeId: "emerald",
    name: "Cyberpunk Emerald",
    tagline: "Quantum matrix & neon emerald",
    primaryColor: "#10b981",
    accentGlow: "rgba(16, 185, 129, 0.4)",
    badgeSvg: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
        <polygon points="50,10 86,30 86,70 50,90 14,70 14,30" stroke="#10b981" strokeWidth="3.5" fill="#061411" />
        <polygon points="50,24 72,37 72,63 50,76 28,63 28,37" stroke="#34d399" strokeWidth="2.5" strokeDasharray="5 3" />
        <circle cx="50" cy="50" r="10" fill="#10b981" fillOpacity="0.45" stroke="#34d399" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: "stark-armor",
    appThemeId: "armor",
    name: "Stark Armor",
    tagline: "Molten titanium & solar alloy",
    primaryColor: "#f97316",
    accentGlow: "rgba(249, 115, 22, 0.45)",
    badgeSvg: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
        <polygon points="50,12 84,28 76,74 50,90 24,74 16,28" stroke="#f97316" strokeWidth="3.5" fill="#170d08" />
        <path d="M32 42 H68 L62 58 H38 Z" fill="#f97316" fillOpacity="0.35" stroke="#fb923c" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="7" fill="#ef4444" />
      </svg>
    ),
  },
];

export function resolveAppThemeId(id: string): ThemeId {
  switch (id) {
    case "arc-core":
    case "stark":
      return "stark";
    case "midnight-titanium":
    case "midnight":
      return "midnight";
    case "cyberpunk-emerald":
    case "emerald":
      return "emerald";
    case "stark-armor":
    case "armor":
      return "armor";
    default:
      return "stark";
  }
}

interface ThemeSelectorProps {
  currentTheme: string;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onSelectTheme,
}) => {
  const normalizedCurrent = resolveAppThemeId(currentTheme);

  return (
    <div className="grid grid-cols-2 gap-3 p-1">
      {THEMES.map((theme) => {
        const isActive =
          currentTheme === theme.id || normalizedCurrent === theme.appThemeId;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onSelectTheme(theme.appThemeId)}
            className={`relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all duration-300 cursor-pointer active:scale-[0.98] bg-[#0a0e17] ${
              isActive
                ? "border-cyan-400/50 shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
                : "border-white/5 hover:border-cyan-400/30"
            }`}
          >
            {isActive && (
              <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-black tracking-wider bg-cyan-400 text-slate-950 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3 stroke-[3]" /> ACTIVE
              </span>
            )}

            <div className="p-2 rounded-xl bg-[#090d15] border border-white/5 mb-2.5">
              {theme.badgeSvg}
            </div>

            <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              {theme.name}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              {theme.tagline}
            </span>
          </button>
        );
      })}
    </div>
  );
};
