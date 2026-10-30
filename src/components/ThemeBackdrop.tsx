import React from "react";
import type { FanTheme } from "../types";

interface ThemeBackdropProps {
  theme: FanTheme;
}

export const ThemeBackdrop: React.FC<ThemeBackdropProps> = ({ theme }) => {
  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-slate-950 transition-colors duration-500"
      aria-hidden="true"
    >
      {/* 1. Dynamic Ambient Gradient Pattern from Theme */}
      <div
        className="absolute inset-0 transition-all duration-500 ease-out"
        style={{ background: theme.ambientPattern }}
      />

      {/* 2. Neon Theme Core Glow right behind Budget Ring */}
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-500 opacity-60"
        style={{
          background: `radial-gradient(circle, ${theme.accentHex}40 0%, ${theme.secondaryHex}20 50%, transparent 75%)`,
        }}
      />

      {/* 3. Subtle Bottom Reflection */}
      <div
        className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-96 h-60 rounded-full blur-3xl pointer-events-none transition-all duration-500 opacity-30"
        style={{
          background: `radial-gradient(circle, ${theme.secondaryHex}35 0%, transparent 70%)`,
        }}
      />

      {/* Stark Arc HUD Geometry */}
      {theme.id === "stark" && (
        <svg
          className="absolute inset-0 w-full h-full opacity-55 transition-opacity duration-500"
          viewBox="0 0 430 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="215" cy="140" r="115" stroke="#06b6d4" strokeOpacity="0.35" strokeWidth="1.2" />
          <circle cx="215" cy="140" r="80" stroke="#38bdf8" strokeOpacity="0.4" strokeDasharray="6 4" strokeWidth="1.2" />
          <circle cx="215" cy="140" r="145" stroke="#06b6d4" strokeOpacity="0.2" strokeWidth="1" />
        </svg>
      )}

      {/* Midnight Pitch-Black Titanium Geometry */}
      {theme.id === "midnight" && (
        <svg
          className="absolute inset-0 w-full h-full opacity-50 transition-opacity duration-500"
          viewBox="0 0 430 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="215" cy="150" r="120" stroke="#fbbf24" strokeOpacity="0.28" strokeWidth="1.1" />
          <circle cx="215" cy="150" r="85" stroke="#94a3b8" strokeOpacity="0.25" strokeDasharray="4 4" strokeWidth="1.1" />
        </svg>
      )}

      {/* Cyberpunk Emerald Matrix Geometry */}
      {theme.id === "emerald" && (
        <svg
          className="absolute inset-0 w-full h-full opacity-50 transition-opacity duration-500"
          viewBox="0 0 430 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="215" cy="145" r="115" stroke="#10b981" strokeOpacity="0.32" strokeWidth="1.2" />
          <circle cx="215" cy="145" r="82" stroke="#34d399" strokeOpacity="0.35" strokeDasharray="5 4" strokeWidth="1.1" />
        </svg>
      )}

      {/* Stark Armor Solar Alloy Geometry */}
      {theme.id === "armor" && (
        <svg
          className="absolute inset-0 w-full h-full opacity-50 transition-opacity duration-500"
          viewBox="0 0 430 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="215" cy="145" r="118" stroke="#f97316" strokeOpacity="0.32" strokeWidth="1.2" />
          <circle cx="215" cy="145" r="84" stroke="#ef4444" strokeOpacity="0.3" strokeDasharray="6 4" strokeWidth="1.1" />
        </svg>
      )}

      {/* Balanced Legibility Scrim */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/70 to-slate-950/95" />
    </div>
  );
};
