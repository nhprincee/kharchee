import React from "react";
import type { FanTheme } from "../types";

interface ThemeBackdropProps {
  theme: FanTheme;
}

export const ThemeBackdrop: React.FC<ThemeBackdropProps> = () => (
  <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none bg-[#07090d]" aria-hidden="true">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-12%,rgba(148,163,184,0.16),transparent_48%),radial-gradient(ellipse_at_0%_45%,rgba(71,85,105,0.09),transparent_38%),linear-gradient(180deg,#090b10_0%,#07090d_55%,#050609_100%)]" />
    <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-slate-200/[0.045] blur-3xl" />
    <div className="absolute -bottom-24 left-1/2 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-slate-400/[0.035] blur-3xl" />
    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50" />
  </div>
);
