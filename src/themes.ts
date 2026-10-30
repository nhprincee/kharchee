import type { FanTheme, ThemeId } from "./types";

export const DEFAULT_THEME_ID: ThemeId = "stark";

export const FAN_THEMES: Record<ThemeId, FanTheme> = {
  stark: {
    id: "stark",
    name: "Arc Core HUD",
    subtitle: "Obsidian titanium & arc cyan",
    symbol: "⚡",
    isProExclusive: false,
    accentHex: "#06b6d4",
    secondaryHex: "#38bdf8",
    ringStroke: "#06b6d4",
    ringGlow: "rgba(6, 182, 212, 0.85)",
    buttonBg: "bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400",
    buttonText: "text-slate-950 font-black",
    borderAccent: "border-cyan-500/40",
    cardBorder: "border-cyan-500/40",
    cardShadow: "shadow-[0_0_25px_rgba(6,182,212,0.5)]",
    hudGlowColor: "rgba(6, 182, 212, 0.5)",
    borderGlow: "rgba(6, 182, 212, 0.5)",
    auraGlow: "rgba(6, 182, 212, 0.75)",
    textAccent: "text-cyan-400",
    surfaceTint: "bg-slate-900/85",
    ambientPattern:
      "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(6, 182, 212, 0.35) 0%, rgba(14, 165, 233, 0.18) 45%, rgba(3, 7, 18, 0.96) 85%)",
  },
  midnight: {
    id: "midnight",
    name: "Midnight Titanium",
    subtitle: "Pitch-black titanium & sovereign gold",
    symbol: "◆",
    isProExclusive: false,
    accentHex: "#fbbf24",
    secondaryHex: "#64748b",
    ringStroke: "#fbbf24",
    ringGlow: "rgba(251, 191, 36, 0.8)",
    buttonBg: "bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400",
    buttonText: "text-slate-950 font-black",
    borderAccent: "border-amber-500/40",
    cardBorder: "border-amber-500/40",
    cardShadow: "shadow-[0_0_25px_rgba(245,158,11,0.38)]",
    hudGlowColor: "rgba(245, 158, 11, 0.4)",
    borderGlow: "rgba(251, 191, 36, 0.45)",
    auraGlow: "rgba(251, 191, 36, 0.7)",
    textAccent: "text-amber-300",
    surfaceTint: "bg-slate-950/90",
    ambientPattern:
      "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(251, 191, 36, 0.24) 0%, rgba(71, 85, 105, 0.18) 45%, rgba(2, 6, 23, 0.98) 85%)",
  },
  emerald: {
    id: "emerald",
    name: "Cyberpunk Emerald",
    subtitle: "Quantum matrix & neon emerald",
    symbol: "◈",
    isProExclusive: false,
    accentHex: "#10b981",
    secondaryHex: "#06b6d4",
    ringStroke: "#10b981",
    ringGlow: "rgba(16, 185, 129, 0.85)",
    buttonBg: "bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400",
    buttonText: "text-slate-950 font-black",
    borderAccent: "border-emerald-500/40",
    cardBorder: "border-emerald-500/40",
    cardShadow: "shadow-[0_0_25px_rgba(16,185,129,0.45)]",
    hudGlowColor: "rgba(16, 185, 129, 0.45)",
    borderGlow: "rgba(16, 185, 129, 0.5)",
    auraGlow: "rgba(16, 185, 129, 0.75)",
    textAccent: "text-emerald-400",
    surfaceTint: "bg-slate-950/88",
    ambientPattern:
      "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(16, 185, 129, 0.32) 0%, rgba(6, 182, 212, 0.16) 48%, rgba(2, 6, 23, 0.96) 85%)",
  },
  armor: {
    id: "armor",
    name: "Stark Armor",
    subtitle: "Molten titanium & solar alloy",
    symbol: "⬢",
    isProExclusive: false,
    accentHex: "#f97316",
    secondaryHex: "#ef4444",
    ringStroke: "#f97316",
    ringGlow: "rgba(249, 115, 22, 0.85)",
    buttonBg: "bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500",
    buttonText: "text-slate-950 font-black",
    borderAccent: "border-orange-500/50",
    cardBorder: "border-orange-500/50",
    cardShadow: "shadow-[0_0_25px_rgba(249,115,22,0.5)]",
    hudGlowColor: "rgba(249, 115, 22, 0.5)",
    borderGlow: "rgba(249, 115, 22, 0.5)",
    auraGlow: "rgba(255, 123, 0, 0.75)",
    textAccent: "text-amber-400",
    surfaceTint: "bg-stone-950/88",
    ambientPattern:
      "radial-gradient(ellipse 95% 60% at 50% -5%, rgba(249, 115, 22, 0.35) 0%, rgba(220, 38, 38, 0.2) 45%, rgba(10, 8, 7, 0.98) 85%)",
  },
};

export const THEME_LIST: FanTheme[] = [
  FAN_THEMES.stark,
  FAN_THEMES.midnight,
  FAN_THEMES.emerald,
  FAN_THEMES.armor,
];

export function isValidThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(FAN_THEMES, value)
  );
}

export function getSafeThemeId(value: unknown): ThemeId {
  return isValidThemeId(value) ? value : DEFAULT_THEME_ID;
}
