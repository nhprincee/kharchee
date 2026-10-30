import React from "react";
import {
  Crown,
  Sparkles,
  Zap,
  Palette,
  Cloud,
  Share2,
  ShieldCheck,
  X,
  ArrowRight,
  Flame,
} from "lucide-react";
import type { FanTheme } from "../types";

interface ProTrialModalProps {
  isOpen: boolean;
  theme: FanTheme;
  onClaimTrial: () => void;
  onDismiss: () => void;
}

export const ProTrialModal: React.FC<ProTrialModalProps> = ({
  isOpen,
  theme,
  onClaimTrial,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-teaser-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
    >
      <div
        className="w-full max-w-[420px] rounded-[32px] border border-white/10 bg-[#05070c] p-5 sm:p-6 shadow-2xl relative overflow-hidden"
        style={{
          boxShadow: `0 0 45px rgba(251, 191, 36, 0.25), 0 20px 50px rgba(0,0,0,0.95)`,
        }}
      >
        {/* Holographic Rainbow Border Shimmer Line */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-yellow-500 to-cyan-400 opacity-90 animate-pulse" />

        {/* Ambient Golden Radial Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-20 blur-3xl bg-amber-400" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#0a0e17] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
          aria-label="Close Pro Offer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Privilege Badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-extrabold tracking-wider uppercase shadow-xs">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>PRO SUBSCRIPTIONS · FROM ₹30/MO</span>
          </div>
        </div>

        {/* Main Title & Card Header */}
        <div className="space-y-1 mb-4">
          <h2
            id="pro-teaser-title"
            className="text-2xl font-black text-white tracking-tight leading-tight flex items-center gap-2"
          >
            <span>Kharche PRO</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 text-sm px-2 py-0.5 rounded-lg border border-amber-500/30 bg-amber-950/40 font-mono font-bold">
              BLACK
            </span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Elevate your financial discipline with uncapped AI horsepower and holographic aesthetics.
          </p>
        </div>

        {/* Metallic Holographic Feature Roster */}
        <div className="space-y-2.5 mb-5">
          <div className="p-3 rounded-2xl bg-[#0a0e17] border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>Uncapped Gemini Voice AI</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-cyan-500/20 text-cyan-300 font-mono">
                  PRO
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                Infinite sarcastic roasts, deep category breakdowns, and audio speech answers without limits.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#0a0e17] border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>Luxury Tech Themes &amp; Studio</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-amber-500/20 text-amber-300 font-mono">
                  UNLOCKED
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                Full access to Arc Core HUD, Midnight Titanium, Cyberpunk Emerald, Stark Armor, and Custom Theme Studio.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#0a0e17] border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>Smart WhatsApp Khata &amp; Split</span>
              </h4>
              <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                1-tap formatted settlement messages and pre-filled UPI payment links sent straight to friends.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#0a0e17] border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>Cloud Sync &amp; Multi-Device</span>
              </h4>
              <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                Automatic ledger sync across phone, tablet, and browser sessions.
              </p>
            </div>
          </div>
        </div>

        {/* Open the real subscription plans */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onClaimTrial}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-all cursor-pointer"
            style={{
              boxShadow: "0 0 30px rgba(251, 191, 36, 0.45)",
            }}
          >
            <Crown className="w-4 h-4 fill-slate-950" />
            <span>VIEW PRO SUBSCRIPTION PLANS</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-2 text-center text-xs text-slate-400 hover:text-white font-medium transition-colors cursor-pointer"
          >
            Continue on Standard Free Tier
          </button>
        </div>

        {/* Safety Note */}
        <div className="mt-3 text-center">
          <span className="text-[10px] font-mono text-slate-500">
            Secure checkout · Pro unlocks after payment verification
          </span>
        </div>
      </div>
    </div>
  );
};
