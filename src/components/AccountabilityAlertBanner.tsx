import React from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Edit3,
  RotateCcw,
  Settings,
  X,
} from "lucide-react";
import type { AccountabilityAlertRecord } from "../utils/upiAccountabilityEngine";

interface AccountabilityAlertBannerProps {
  alert: AccountabilityAlertRecord | null;
  onDismiss: () => void;
  onEditDetectedExpense?: (expenseId: string) => void;
  onMarkFalseDetection?: (alertId: string, expenseId?: string) => void;
  onOpenSettings: () => void;
}

export const AccountabilityAlertBanner: React.FC<AccountabilityAlertBannerProps> = ({
  alert,
  onDismiss,
  onEditDetectedExpense,
  onMarkFalseDetection,
  onOpenSettings,
}) => {
  if (!alert || alert.dismissed) return null;

  const { evaluation } = alert;
  const isBreach = evaluation.urgency === "breach";
  const isWarning = evaluation.urgency === "warning";

  const borderClass = isBreach
    ? "border-rose-500/60 bg-[#140910]"
    : isWarning
    ? "border-amber-500/60 bg-[#141009]"
    : "border-emerald-500/50 bg-[#081512]";

  const badgeClass = isBreach
    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
    : isWarning
    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

  const sourceLabel =
    alert.source === "android_notification_listener"
      ? `${alert.appName} Notification`
      : alert.source === "manual_parser_test"
      ? `${alert.appName} (On-Device Parser Test)`
      : "Real-Time Budget Guard";

  return (
    <aside
      role="alert"
      aria-live="assertive"
      aria-label="Kharchee Spending Accountability Alert"
      className={`mx-4 sm:mx-6 my-2.5 p-4 rounded-2xl border shadow-2xl relative z-30 animate-in fade-in slide-in-from-top-2 duration-300 ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${badgeClass}`}
          >
            {isBreach || isWarning ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeClass}`}
              >
                {sourceLabel}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
                {evaluation.category} · −₹{evaluation.amount.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {evaluation.triggerReason}
              </span>
            </div>

            <h3 className="text-sm font-extrabold text-white leading-snug">
              {evaluation.headline}
            </h3>

            <p className="text-xs text-slate-200 leading-relaxed">
              {evaluation.message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss spending alert"
          className="w-7 h-7 rounded-full bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Real Budget Metrics Strip */}
      <div className="mt-3 pt-2.5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
        <div className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/5">
          <span className="text-slate-400 block text-[10px]">Today Remaining</span>
          <span
            className={`font-bold ${
              evaluation.dailyRemainingAfter < 0
                ? "text-rose-400"
                : evaluation.dailyUsedPercent >= 75
                ? "text-amber-300"
                : "text-emerald-300"
            }`}
          >
            {evaluation.dailyRemainingAfter < 0
              ? `−₹${Math.abs(evaluation.dailyRemainingAfter).toLocaleString("en-IN")} over`
              : `₹${evaluation.dailyRemainingAfter.toLocaleString("en-IN")} left`}{" "}
            ({evaluation.dailyUsedPercent}%)
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/5">
          <span className="text-slate-400 block text-[10px]">Monthly Budget Left</span>
          <span
            className={`font-bold ${
              evaluation.monthlyRemainingAfter <= 0
                ? "text-rose-400"
                : evaluation.monthlyUsedPercent >= 80
                ? "text-amber-300"
                : "text-slate-100"
            }`}
          >
            ₹{Math.max(0, evaluation.monthlyRemainingAfter).toLocaleString("en-IN")} left (
            {evaluation.monthlyUsedPercent}%)
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/5 col-span-2 sm:col-span-1">
          <span className="text-slate-400 block text-[10px]">
            {evaluation.category} Count Today
          </span>
          <span className="font-bold text-slate-100">
            #{evaluation.sameCategoryTodayCount} today
            {evaluation.categoryRemainingAfter !== null
              ? ` · ₹${Math.max(0, evaluation.categoryRemainingAfter).toLocaleString("en-IN")} cat left`
              : ""}
          </span>
        </div>
      </div>

      {/* Action Controls: Correct False Detection, Edit, Settings */}
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {alert.linkedExpenseId && onEditDetectedExpense && (
            <button
              type="button"
              onClick={() => onEditDetectedExpense(alert.linkedExpenseId!)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Edit / Fix Category</span>
            </button>
          )}

          {onMarkFalseDetection && (
            <button
              type="button"
              onClick={() => onMarkFalseDetection(alert.id, alert.linkedExpenseId)}
              className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 text-[11px] font-semibold text-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>False Detection (Undo)</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Alert Settings</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Bell className="w-3 h-3" />
            <span>Got It</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
