import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  ArrowLeft,
  X,
  PieChart,
  Zap,
  Palette,
  Bot,
  Sparkles,
} from "lucide-react";
import type { FanTheme } from "../types";

export interface TourStep {
  targetId: string;
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  positionPreference?: "top" | "bottom";
}

interface AppTourProps {
  isOpen: boolean;
  theme: FanTheme;
  onComplete: () => void;
  onSkip: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "tour-budget-ring",
    badge: "CORE ENGINE",
    title: "Today's Budget Ring & Meter",
    description:
      "Your primary financial dashboard. The symmetrical ring tracks today's spending in real time, shifting from signature neon to alert amber and lockdown red as you approach your limit.",
    icon: <PieChart className="w-5 h-5" />,
    positionPreference: "bottom",
  },
  {
    targetId: "tour-quick-add",
    badge: "RAPID LOGGING",
    title: "1-Tap Quick Add Chips",
    description:
      "Never let small daily leaks slide under the radar. Tap Chai, Diet, Petrol, or Grocery to record frequent micro-expenses in under one second flat.",
    icon: <Zap className="w-5 h-5" />,
    positionPreference: "bottom",
  },
  {
    targetId: "tour-themes-bar",
    badge: "LUXURY TECH THEMES",
    title: "Dynamic HUD Themes",
    description:
      "Switch between Arc Core HUD, Midnight Titanium, Cyberpunk Emerald, and Stark Armor anytime to customize your financial cockpit.",
    icon: <Palette className="w-5 h-5" />,
    positionPreference: "top",
  },
  {
    targetId: "tour-jarvis-btn",
    badge: "AI COMPANION",
    title: "J.A.R.V.I.S. Butler Voice AI",
    description:
      "Inspired by Tony Stark's legendary assistant. Tap the cyan holographic arc core for classy yet witty telemetry reports, budget roasts, and tactical debt recovery advice spoken aloud.",
    icon: (
      <div className="w-5 h-5 rounded-full overflow-hidden border border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] inline-flex items-center justify-center shrink-0">
        <img
          src="/assets/aistudio/image_34394344.png"
          alt=""
          className="w-full h-full object-cover object-[center_50.5%] scale-110"
        />
      </div>
    ),
    positionPreference: "top",
  },
];

export const AppTour: React.FC<AppTourProps> = ({
  isOpen,
  theme,
  onComplete,
  onSkip,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStepIndex];

  const updateTargetRect = useCallback(() => {
    if (!step) return;
    const element = document.getElementById(step.targetId);
    if (element) {
      // Scroll element smoothly into center view
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;
    updateTargetRect();

    // Re-check bounding box on window resize or scroll
    const handleScrollOrResize = () => {
      const element = document.getElementById(step.targetId);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };

    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    const timeout = setTimeout(updateTargetRect, 200);

    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      clearTimeout(timeout);
    };
  }, [isOpen, currentStepIndex, step, updateTargetRect]);

  if (!isOpen || !step) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Tooltip position calculation
  const padding = 8;
  const spotlightTop = targetRect ? Math.max(0, targetRect.top - padding) : 0;
  const spotlightLeft = targetRect ? Math.max(0, targetRect.left - padding) : 0;
  const spotlightWidth = targetRect ? targetRect.width + padding * 2 : 0;
  const spotlightHeight = targetRect ? targetRect.height + padding * 2 : 0;

  // Decide whether tooltip sits above or below the target
  const showBelow = targetRect
    ? targetRect.top < window.innerHeight / 2
    : true;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Interactive App Tour"
      className="fixed inset-0 z-50 pointer-events-auto overflow-hidden animate-in fade-in duration-200"
    >
      {/* Dark Translucent Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xs transition-all duration-300" />

      {/* Dynamic Glowing Spotlight Cutout Box */}
      {targetRect && (
        <div
          style={{
            top: spotlightTop,
            left: spotlightLeft,
            width: spotlightWidth,
            height: spotlightHeight,
            borderColor: theme.accentHex,
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.78), 0 0 24px ${theme.ringGlow}, inset 0 0 15px ${theme.ringGlow}`,
          }}
          className="absolute rounded-3xl border-2 pointer-events-none transition-all duration-300 ease-out animate-pulse"
        />
      )}

      {/* Floating Tour Tooltip Card */}
      <div
        className="absolute inset-x-3 max-w-[420px] mx-auto z-50 transition-all duration-300"
        style={{
          top: targetRect
            ? showBelow
              ? Math.min(window.innerHeight - 240, targetRect.bottom + 16)
              : Math.max(16, targetRect.top - 230)
            : "50%",
          transform: !targetRect ? "translateY(-50%)" : undefined,
        }}
      >
        <div
          className="rounded-3xl border bg-slate-950/95 backdrop-blur-xl p-4 sm:p-5 shadow-2xl relative overflow-hidden"
          style={{
            borderColor: `${theme.accentHex}50`,
            boxShadow: `0 0 35px ${theme.accentHex}25, 0 20px 40px rgba(0,0,0,0.8)`,
          }}
        >
          {/* Subtle Accent Glow Corner */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-20 blur-2xl"
            style={{ background: theme.accentHex }}
          />

          {/* Top Row: Badge, Step indicator, Close Button */}
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 border border-white/10"
                style={{ color: theme.accentHex }}
              >
                {step.badge}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                STEP {currentStepIndex + 1} OF {TOUR_STEPS.length}
              </span>
            </div>

            <button
              type="button"
              onClick={onSkip}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              title="Skip Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Icon + Title */}
          <div className="flex items-center gap-2.5 mb-2 relative z-10">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: `linear-gradient(135deg, ${theme.accentHex}30, rgba(15,23,42,0.9))`,
                borderColor: `${theme.accentHex}50`,
                borderWidth: "1px",
                color: theme.accentHex,
              }}
            >
              {step.icon}
            </div>
            <h3 className="text-base font-black text-white tracking-tight leading-snug">
              {step.title}
            </h3>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-300 leading-relaxed mb-4 relative z-10">
            {step.description}
          </p>

          {/* Step Dots & Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] relative z-10">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex
                      ? "w-5 bg-white"
                      : "w-1.5 bg-slate-700"
                  }`}
                  style={
                    idx === currentStepIndex
                      ? { background: theme.accentHex }
                      : undefined
                  }
                />
              ))}
            </div>

            {/* Back & Next Buttons */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="h-8 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-bold text-slate-300 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className={`h-8 px-4 rounded-xl font-bold text-[11px] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all ${theme.buttonBg} ${theme.buttonText}`}
                style={{
                  boxShadow: `0 0 14px ${theme.ringGlow}`,
                }}
              >
                <span>{isLast ? "Finish Tour" : "Next"}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
