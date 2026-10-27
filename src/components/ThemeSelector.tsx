import React from "react";
import { Shield, Sparkles, Check } from "lucide-react";
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
    primaryColor: "#00f0ff",
    accentGlow: "rgba(0, 240, 255, 0.4)",
    badgeSvg: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="44" stroke="#00f0ff" strokeWidth="4" strokeDasharray="6 4" />
        <circle cx="50" cy="50" r="32" stroke="#00f0ff" strokeWidth="3" opacity="0.8" />
        <circle cx="50" cy="50" r="16" fill="#00f0ff" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="3" />
        <path d="M50 10 L50 24 M50 76 L50 90 M10 50 L24 50 M76 50 L90 50" stroke="#00f0ff" strokeWidth="4" />
      </svg>
    ),
  },
  {
    id: "avengers",
    appThemeId: "avengers",
    name: "Avengers",
    tagline: "Fiery Armor & molten sparks",
    primaryColor: "#f97316",
    accentGlow: "rgba(249, 115, 22, 0.45)",
    badgeSvg: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="44" stroke="#ea580c" strokeWidth="6" />
        <path d="M48 18 L32 78 H44 L48 62 H62 L57 46 H50 L53 32 Z" fill="#f97316" />
        <path d="M22 55 L78 55 L68 67 L22 67 Z" fill="#ef4444" opacity="0.9" />
      </svg>
    ),
  },
  {
    id: "real-madrid",
    appThemeId: "realmadrid",
    name: "Real Madrid",
    tagline: "Hala Madrid navy & metallic gold",
    primaryColor: "#f59e0b",
    accentGlow: "rgba(245, 158, 11, 0.4)",
    badgeSvg: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
        {/* Crown */}
        <path d="M28 32 L36 42 L50 26 L64 42 L72 32 L78 46 H22 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
        <circle cx="50" cy="22" r="3" fill="#fbbf24" />
        {/* Shield Circle */}
        <circle cx="50" cy="64" r="28" stroke="#fbbf24" strokeWidth="4" fill="#0f172a" />
        <path d="M30 50 L70 78" stroke="#818cf8" strokeWidth="6" strokeLinecap="round" />
        <text x="50" y="70" textAnchor="middle" fill="#fbbf24" fontSize="16" fontWeight="bold" fontFamily="sans-serif">
          MCF
        </text>
      </svg>
    ),
  },
  {
    id: "barcelona",
    appThemeId: "barcelona",
    name: "FC Barcelona",
    tagline: "Neon blaugrana sapphire & garnet",
    primaryColor: "#ec4899",
    accentGlow: "rgba(236, 72, 153, 0.4)",
    badgeSvg: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
        <path d="M22 24 C22 24 50 16 78 24 C78 54 68 84 50 92 C32 84 22 54 22 24 Z" fill="#1e1b4b" stroke="#fbbf24" strokeWidth="3" />
        <path d="M24 48 H76 V52 H24 Z" fill="#fbbf24" />
        <path d="M36 52 V84 M50 52 V90 M64 52 V84" stroke="#dc2626" strokeWidth="6" />
        <circle cx="50" cy="68" r="8" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: "liverpool",
    appThemeId: "liverpool",
    name: "Liverpool",
    tagline: "Anfield stadium & crimson Liverbird",
    primaryColor: "#ef4444",
    accentGlow: "rgba(239, 68, 68, 0.45)",
    badgeSvg: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
        <path d="M26 26 H74 V70 C74 82 50 92 50 92 C50 92 26 82 26 70 Z" fill="#991b1b" stroke="#fef08a" strokeWidth="3" />
        {/* Liverbird silhouette */}
        <path d="M50 36 C46 36 42 42 45 48 C42 48 38 52 40 58 C42 64 48 68 50 74 C52 68 58 64 60 58 C62 52 58 48 55 48 C58 42 54 36 50 36 Z" fill="#fef08a" />
        <text x="50" y="84" textAnchor="middle" fill="#fef08a" fontSize="10" fontWeight="bold">
          L.F.C.
        </text>
      </svg>
    ),
  },
  {
    id: "man-united",
    appThemeId: "manutd",
    name: "Manchester United",
    tagline: "Red Devils grunge crest & splatter",
    primaryColor: "#dc2626",
    accentGlow: "rgba(220, 38, 38, 0.45)",
    badgeSvg: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="44" fill="#b91c1c" stroke="#fbbf24" strokeWidth="4" />
        <rect x="18" y="42" width="64" height="16" fill="#fbbf24" />
        {/* Red Devil emblem */}
        <path d="M42 34 L50 40 L58 34 L54 44 H46 Z" fill="#b91c1c" />
        <path d="M50 58 L46 72 H54 Z" fill="#fbbf24" />
        <path d="M40 60 L36 50 M60 60 L64 50" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function resolveAppThemeId(id: string): ThemeId {
  switch (id) {
    case "arc-core":
    case "stark":
      return "stark";
    case "avengers":
      return "avengers";
    case "real-madrid":
    case "realmadrid":
      return "realmadrid";
    case "barcelona":
      return "barcelona";
    case "liverpool":
      return "liverpool";
    case "man-united":
    case "manutd":
      return "manutd";
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
                ? "border-amber-400/50 shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
                : "border-white/5 hover:border-amber-400/30"
            }`}
          >
            {isActive && (
              <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-black tracking-wider bg-[#e6c875] text-black px-2 py-0.5 rounded-full">
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
