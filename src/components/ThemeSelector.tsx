import React from "react";
import { Check, Shield } from "lucide-react";
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
    id: "obsidian-silver",
    appThemeId: "stark",
    name: "Obsidian Silver",
    tagline: "Black glass · brushed titanium · silver highlights",
    primaryColor: "#cbd5e1",
    accentGlow: "rgba(203, 213, 225, 0.22)",
    badgeSvg: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="silverBadge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="48%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="43" fill="#090b10" stroke="url(#silverBadge)" strokeWidth="5" />
        <circle cx="50" cy="50" r="30" stroke="#64748b" strokeWidth="2" />
        <path d="M28 60 L43 32 L53 50 L66 37 L73 66" stroke="url(#silverBadge)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="50" r="5" fill="#f8fafc" />
      </svg>
    ),
  },
];

export function resolveAppThemeId(_id: string): ThemeId {
  return "stark";
}

interface ThemeSelectorProps {
  currentTheme: string;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onSelectTheme }) => {
  const isActive = resolveAppThemeId(currentTheme) === "stark";
  return (
    <div className="p-1">
      <button
        type="button"
        onClick={() => onSelectTheme("stark")}
        aria-pressed={isActive}
        className="relative flex w-full items-center gap-4 rounded-2xl border border-slate-400/25 bg-gradient-to-br from-slate-900 via-[#11151d] to-black p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_18px_40px_rgba(0,0,0,.35)] transition hover:border-slate-300/45"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-300/20 bg-black shadow-inner">
          {THEMES[0].badgeSvg}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
            {THEMES[0].name}
            {isActive && <Check className="h-4 w-4 text-slate-200" />}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-400">{THEMES[0].tagline}</span>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-400/20 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            <Shield className="h-3 w-3" /> Default appearance
          </span>
        </span>
      </button>
    </div>
  );
};
