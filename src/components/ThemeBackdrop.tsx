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

      {/* Bespoke Avengers Fiery Insignia Artwork from User Upload */}
      {theme.id === "avengers" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {/* User's Uploaded Fiery Avengers Insignia Artwork */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-full max-w-[460px] h-[520px] pointer-events-none select-none overflow-hidden flex items-center justify-center">
            <img
              src="/assets/aistudio/avenger_5312ae19.jpg"
              alt="Avengers Fiery Insignia"
              className="w-full h-full object-cover object-top mix-blend-screen opacity-65 filter contrast-125 saturate-140 brightness-110 pointer-events-none select-none scale-105 transition-all duration-700"
            />
            {/* Atmospheric fiery radial vignette */}
            <div className="absolute inset-0 bg-radial from-transparent via-stone-950/40 to-slate-950/90 pointer-events-none" />
          </div>

          {/* Intense Molten Core Glow right beneath Budget Ring */}
          <div
            className="absolute top-28 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl opacity-75 pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(255, 123, 0, 0.55) 0%, rgba(239, 68, 68, 0.35) 45%, transparent 75%)",
            }}
          />

          {/* Sparks & Embers overlay */}
          <svg
            className="absolute inset-0 w-full h-full opacity-65 transition-opacity duration-500"
            viewBox="0 0 430 800"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="110" cy="180" r="2.5" fill="#fef08a" className="animate-pulse" />
            <circle cx="330" cy="140" r="3" fill="#ffedd5" className="animate-pulse" />
            <circle cx="215" cy="80" r="2" fill="#fdba74" />
            <circle cx="360" cy="270" r="2.5" fill="#f97316" />
            <circle cx="70" cy="340" r="2" fill="#ef4444" />
            <circle cx="160" cy="460" r="1.5" fill="#fdba74" />
            <circle cx="290" cy="550" r="2.5" fill="#f97316" />
            <circle cx="140" cy="670" r="2" fill="#ef4444" />
          </svg>
        </div>
      )}

      {/* Bespoke Real Madrid Regal Vault Lines */}
      {theme.id === "realmadrid" && (
        <svg
          className="absolute inset-0 w-full h-full opacity-55 transition-opacity duration-500"
          viewBox="0 0 430 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="215" cy="160" r="130" stroke="#fbbf24" strokeOpacity="0.35" strokeWidth="1.2" />
          <circle cx="215" cy="160" r="85" stroke="#fbbf24" strokeOpacity="0.4" strokeDasharray="4 4" strokeWidth="1.2" />
          <path d="M-50 480 L480 480" stroke="#3b82f6" strokeOpacity="0.25" strokeWidth="1" />
          <circle cx="215" cy="160" r="170" stroke="#fbbf24" strokeOpacity="0.15" strokeWidth="1" />
        </svg>
      )}

      {/* Bespoke Barcelona Blaugrana Light Streaks */}
      {theme.id === "barcelona" && (
        <svg
          className="absolute inset-0 w-full h-full opacity-55 transition-opacity duration-500"
          viewBox="0 0 430 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M-50 120 L480 320" stroke="#3b82f6" strokeOpacity="0.4" strokeWidth="2.5" />
          <path d="M-50 160 L480 360" stroke="#f43f5e" strokeOpacity="0.4" strokeWidth="2.5" />
          <circle cx="215" cy="160" r="120" stroke="#f43f5e" strokeOpacity="0.25" strokeWidth="1" />
        </svg>
      )}

      {/* Bespoke Liverpool Anfield Crimson Mist Lines */}
      {theme.id === "liverpool" && (
        <svg
          className="absolute inset-0 w-full h-full opacity-55 transition-opacity duration-500"
          viewBox="0 0 430 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M60 -20 L215 280 L370 -20" stroke="#ef4444" strokeOpacity="0.35" strokeWidth="1.8" />
          <circle cx="215" cy="180" r="75" stroke="#f59e0b" strokeOpacity="0.3" strokeWidth="1.2" />
        </svg>
      )}

      {/* Bespoke Man Utd Red Devils Grunge Accents */}
      {theme.id === "manutd" && (
        <svg
          className="absolute inset-0 w-full h-full opacity-55 transition-opacity duration-500"
          viewBox="0 0 430 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="360" cy="100" r="80" stroke="#dc2626" strokeOpacity="0.4" strokeWidth="1.8" />
          <path d="M30 240 L180 310 L80 460" stroke="#dc2626" strokeOpacity="0.3" strokeWidth="1.5" />
          <circle cx="90" cy="260" r="3.5" fill="#dc2626" fillOpacity="0.9" />
          <circle cx="280" cy="380" r="3" fill="#ea580c" fillOpacity="0.8" />
        </svg>
      )}

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

      {/* Balanced Legibility Scrim */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/70 to-slate-950/95" />
    </div>
  );
};
