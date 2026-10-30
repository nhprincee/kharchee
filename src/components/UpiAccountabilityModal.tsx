import React, { useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Info,
  Lock,
  Play,
  RotateCcw,
  Shield,
  ShieldCheck,
  Smartphone,
  Sliders,
  Trash2,
  X,
} from "lucide-react";
import {
  SUPPORTED_UPI_APPS,
  SAMPLE_UPI_NOTIFICATION_PAYLOADS,
  getRuntimeEnvironmentStatus,
  parseUpiPaymentNotification,
  type AccountabilityAlertRecord,
  type AlertThresholdMode,
  type AlertToneMode,
  type UpiAccountabilitySettings,
} from "../utils/upiAccountabilityEngine";
import type { FanTheme } from "../types";

interface UpiAccountabilityModalProps {
  isOpen: boolean;
  theme: FanTheme;
  settings: UpiAccountabilitySettings;
  alertHistory: AccountabilityAlertRecord[];
  dailyLimit: number;
  todaySpent: number;
  monthlyBudget: number;
  monthSpent: number;
  notificationsEnabled: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  onClose: () => void;
  onUpdateSettings: (next: UpiAccountabilitySettings) => void;
  onRequestBrowserNotificationPermission: () => void;
  onTriggerParsedUpiNotification: (params: {
    title?: string;
    text: string;
    packageName: string;
    source: "android_notification_listener" | "manual_parser_test";
  }) => { status: "accepted" | "duplicate" | "rejected"; message: string };
  onEditDetectedExpense: (expenseId: string) => void;
  onMarkFalseDetection: (alertId: string, expenseId?: string) => void;
  onClearAlertHistory: () => void;
}

export const UpiAccountabilityModal: React.FC<UpiAccountabilityModalProps> = ({
  isOpen,
  theme,
  settings,
  alertHistory,
  dailyLimit,
  todaySpent,
  monthlyBudget,
  monthSpent,
  notificationsEnabled,
  notificationPermission,
  onClose,
  onUpdateSettings,
  onRequestBrowserNotificationPermission,
  onTriggerParsedUpiNotification,
  onEditDetectedExpense,
  onMarkFalseDetection,
  onClearAlertHistory,
}) => {
  const [activeTab, setActiveTab] = useState<
    "settings" | "privacy" | "history" | "verifier"
  >("settings");

  // On-Device Parser Verifier state
  const [selectedPkg, setSelectedPkg] = useState<string>(
    SUPPORTED_UPI_APPS[0].packageName
  );
  const [testTitle, setTestTitle] = useState<string>("Google Pay");
  const [testText, setTestText] = useState<string>(
    SAMPLE_UPI_NOTIFICATION_PAYLOADS[0].notificationText
  );
  const [verifierFeedback, setVerifierFeedback] = useState<{
    type: "accepted" | "duplicate" | "rejected";
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const envStatus = getRuntimeEnvironmentStatus();
  const dailyRemaining = dailyLimit - todaySpent;
  const monthlyRemaining = monthlyBudget - monthSpent;

  const livePreviewParse = parseUpiPaymentNotification({
    title: testTitle,
    text: testText,
    packageName: selectedPkg,
    dedupWindowMinutes: settings.dedupWindowMinutes,
    allowManualTestPackage: true,
  });

  const handleOpenAndroidSystemSettings = () => {
    if (window.KharcheeAndroidBridge?.openNotificationAccessSettings) {
      window.KharcheeAndroidBridge.openNotificationAccessSettings();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upi-guard-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ borderColor: `${theme.accentHex}35` }}
        className="w-full sm:max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl border bg-[#090e1a] text-slate-100 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#060a12]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-300">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="upi-guard-modal-title"
                  className="text-sm sm:text-base font-extrabold text-white tracking-tight"
                >
                  UPI Spending Accountability &amp; Android Notification Guard
                </h2>
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                    settings.monitoringEnabled && settings.userConsentGranted
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-500/15 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {settings.monitoringEnabled && settings.userConsentGranted
                    ? "Monitoring Enabled"
                    : "Consent / Setup Needed"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Post-payment budget alerts using explicit Android Notification Access · 100% on-device parsing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close UPI Accountability Settings"
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Honest Runtime & Post-Payment Disclosure Banner */}
        <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <Smartphone
              className={`w-4 h-4 shrink-0 ${
                envStatus.isNativeAndroidBridgePresent
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            />
            <span className="text-slate-300">
              Runtime:{" "}
              <strong className="text-white">{envStatus.environmentLabel}</strong>
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[10px]">
            Alerts trigger AFTER payment notifications · Never blocks payments
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-800 bg-[#080c16] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "settings", label: "1. Access & Controls", icon: Sliders },
            { id: "privacy", label: "2. Privacy & Supported Apps", icon: ShieldCheck },
            {
              id: "history",
              label: `3. Detected Alerts (${alertHistory.length})`,
              icon: Bell,
            },
            { id: "verifier", label: "4. On-Device Parser Test", icon: Play },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? "border-indigo-400 text-indigo-300 bg-indigo-500/10"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === "settings" && (
            <div className="space-y-4">
              {/* Web Sandbox vs Native Android Honest Notice */}
              {!envStatus.isNativeAndroidBridgePresent && (
                <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Web Preview Cannot Automatically Monitor Other Apps
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Standard web browsers and PWAs are sandboxed and cannot read background notifications from Google Pay or PhonePe. Automatic background detection works only when Kharchee is built as a{" "}
                    <strong className="text-white">Capacitor Android APK</strong>{" "}
                    with the native Kotlin{" "}
                    <code className="text-amber-200 font-mono">
                      NotificationListenerService
                    </code>{" "}
                    enabled by you in Android Settings.
                  </p>
                </div>
              )}

              {/* Live Budget Context Snapshot */}
              <div className="p-3.5 rounded-2xl border border-slate-800 bg-[#0d1424] grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">
                    Today Spent
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    ₹{todaySpent.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">
                    Today Remaining
                  </span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      dailyRemaining < 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {dailyRemaining < 0
                      ? `−₹${Math.abs(dailyRemaining).toLocaleString("en-IN")}`
                      : `₹${dailyRemaining.toLocaleString("en-IN")}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">
                    Monthly Budget
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    ₹{monthlyBudget.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">
                    Monthly Remaining
                  </span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      monthlyRemaining <= 0 ? "text-rose-400" : "text-indigo-300"
                    }`}
                  >
                    ₹{Math.max(0, monthlyRemaining).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Explicit User Consent & Master Toggle */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      1. Explicit User Consent &amp; Monitoring Toggle
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Authorize Kharchee to parse supported UPI payment notifications on-device and compare them against your actual remaining budget. You can pause or disable monitoring at any time.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={
                      settings.monitoringEnabled && settings.userConsentGranted
                    }
                    onClick={() => {
                      const currentlyActive =
                        settings.monitoringEnabled && settings.userConsentGranted;
                      onUpdateSettings({
                        ...settings,
                        monitoringEnabled: !currentlyActive,
                        userConsentGranted: !currentlyActive ? true : settings.userConsentGranted,
                      });
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 cursor-pointer ${
                      settings.monitoringEnabled && settings.userConsentGranted
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                    }`}
                  >
                    {settings.monitoringEnabled && settings.userConsentGranted
                      ? "Active · Click to Disable"
                      : "Enable with Consent"}
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoLogDetectedPayments}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          autoLogDetectedPayments: e.target.checked,
                        })
                      }
                      className="rounded border-slate-700 bg-slate-950 text-indigo-500"
                    />
                    <span>
                      Automatically add verified UPI debit notifications to Expenses (can be undone in 1 tap)
                    </span>
                  </label>

                  {envStatus.isNativeAndroidBridgePresent && (
                    <button
                      type="button"
                      onClick={handleOpenAndroidSystemSettings}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-semibold text-indigo-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Android Notification Access</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Alert Trigger Rule & Tone Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2.5">
                  <span className="text-xs font-bold text-white block">
                    2. When Should Kharchee Warn You?
                  </span>
                  {(
                    [
                      {
                        id: "smart_budget",
                        label: "Smart Budget Guard (Recommended)",
                        desc: `Warn only when daily spend ≥ ${settings.dailyWarnPercent}%, monthly ≥ ${settings.monthlyWarnPercent}%, or repeat daily category spend (#${settings.repeatCategoryCountTrigger}+)`,
                      },
                      {
                        id: "every_spend",
                        label: "Every Detected UPI Payment",
                        desc: "Show remaining daily & monthly budget after every detected UPI payment",
                      },
                      {
                        id: "critical_only",
                        label: "Critical Only (≥ 90% or Limit Breach)",
                        desc: "Stay quiet until you reach 90% or exceed your daily/monthly budget",
                      },
                    ] as Array<{
                      id: AlertThresholdMode;
                      label: string;
                      desc: string;
                    }>
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ ...settings, thresholdMode: opt.id })
                      }
                      className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                        settings.thresholdMode === opt.id
                          ? "bg-indigo-600/15 border-indigo-500/50 text-white"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2.5">
                  <span className="text-xs font-bold text-white block">
                    3. Notification Tone &amp; Thresholds
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: "hinglish", label: "Desi Bhai" },
                        { id: "coach", label: "Polite Coach" },
                        { id: "strict", label: "Strict CA" },
                      ] as Array<{ id: AlertToneMode; label: string }>
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({ ...settings, tone: t.id })
                        }
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          settings.tone === t.id
                            ? "bg-indigo-600 text-white border-indigo-400"
                            : "bg-slate-950 border-slate-800 text-slate-300"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">
                        Daily Budget Warning Threshold
                      </span>
                      <span className="font-mono font-bold text-indigo-300">
                        {settings.dailyWarnPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      step={5}
                      value={settings.dailyWarnPercent}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          dailyWarnPercent: Number(e.target.value),
                        })
                      }
                      className="w-full accent-indigo-500"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-300">
                        Duplicate Suppression Window
                      </span>
                      <span className="font-mono font-bold text-indigo-300">
                        {settings.dedupWindowMinutes} min
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={1}
                      value={settings.dedupWindowMinutes}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          dedupWindowMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  {/* Device / Browser Notification Permission */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      System Notification Permission:{" "}
                      <strong className="text-slate-200 uppercase">
                        {notificationPermission}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={onRequestBrowserNotificationPermission}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-indigo-300 cursor-pointer"
                    >
                      {notificationsEnabled ? "Test / Refresh" : "Enable Alerts"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-4">
              {/* Privacy & Security Commitments */}
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  <Lock className="w-4 h-4" />
                  <span>Strict On-Device Privacy &amp; Security Architecture</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc pl-5">
                  <li>
                    <strong className="text-white">100% On-Device Parsing:</strong>{" "}
                    Payment notification text is parsed locally on your phone. Raw notifications are{" "}
                    <strong className="text-emerald-300">
                      never sent to Gemini AI or any remote server
                    </strong>
                    .
                  </li>
                  <li>
                    <strong className="text-white">
                      Zero Access to PINs, Passwords, or OTPs:
                    </strong>{" "}
                    Any notification containing OTPs, verification codes, UPI PIN prompts, or password resets is immediately ignored on-device before parsing.
                  </li>
                  <li>
                    <strong className="text-white">
                      No Accessibility Service or SMS Permissions:
                    </strong>{" "}
                    Kharchee never uses Android Accessibility Service, never requests{" "}
                    <code className="font-mono text-slate-200">READ_SMS</code>, and never reads screen content.
                  </li>
                  <li>
                    <strong className="text-white">
                      Post-Payment Only — Never Blocks Payments:
                    </strong>{" "}
                    Alerts are triggered only after a supported payment app posts a completed debit notification. Kharchee cannot initiate, intercept, or block UPI payments.
                  </li>
                </ul>
              </div>

              {/* Supported Payment Apps Allowlist */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Supported Android UPI Payment Apps Allowlist
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    Not all UPI apps are supported
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  The Android{" "}
                  <code className="font-mono text-slate-200">
                    NotificationListenerService
                  </code>{" "}
                  listens only to the following package names when they post a readable transaction notification:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SUPPORTED_UPI_APPS.map((app) => (
                    <div
                      key={app.packageName}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          {app.displayName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          {app.shortCode}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 break-all">
                        {app.packageName}
                      </p>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {app.supportNotes}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to Disable Monitoring */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-400" />
                  <span>How to Disable Monitoring at Any Time</span>
                </h3>
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-5">
                  <li>
                    <strong>Inside Kharchee:</strong> Turn off the{" "}
                    <em>&ldquo;Explicit User Consent &amp; Monitoring Toggle&rdquo;</em>{" "}
                    in Tab 1 above to immediately stop all alert processing.
                  </li>
                  <li>
                    <strong>In Android System Settings:</strong> Open{" "}
                    <code className="font-mono text-slate-200">
                      Settings → Apps → Special app access → Notification access
                    </code>{" "}
                    and toggle off <strong>Kharchee</strong>. Android immediately revokes the service binding.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Detected Alerts &amp; False-Detection Correction
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Review detected payments, edit misclassified categories, or undo false detections.
                  </p>
                </div>
                {alertHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAlertHistory}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Clear Log</span>
                  </button>
                )}
              </div>

              {alertHistory.length === 0 ? (
                <div className="p-8 rounded-2xl border border-slate-800 bg-slate-950/60 text-center space-y-2">
                  <p className="text-xs font-bold text-slate-300">
                    No UPI spending alerts recorded yet
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    When a payment notification is detected (or tested in Tab 4), it will appear here with options to edit or undo false detections.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alertHistory.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border ${
                        item.markedFalseDetection
                          ? "border-slate-800 bg-slate-950/40 opacity-60"
                          : "border-slate-800 bg-slate-900/70"
                      } space-y-2`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {item.appName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(item.createdAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {item.markedFalseDetection && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                                Marked False Detection (Undone)
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-white mt-1">
                            {item.evaluation.headline}
                          </p>
                          <p className="text-[11px] text-slate-300 mt-0.5">
                            {item.evaluation.message}
                          </p>
                        </div>

                        <span className="font-mono font-extrabold text-xs text-rose-400 shrink-0">
                          −₹{item.evaluation.amount.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {!item.markedFalseDetection && (
                        <div className="flex items-center gap-2 pt-1">
                          {item.linkedExpenseId && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onEditDetectedExpense(item.linkedExpenseId!);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3 text-indigo-400" />
                              <span>Edit / Correct</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              onMarkFalseDetection(item.id, item.linkedExpenseId)
                            }
                            className="px-2.5 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-[11px] font-semibold text-rose-200 flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-400" />
                            <span>False Detection (Remove &amp; Restore Budget)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "verifier" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl border border-indigo-500/30 bg-indigo-950/15 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300">
                    On-Device Notification Parser &amp; Budget Alert Verifier (Web Test Bench)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200">
                    Manual Test Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Test how Kharchee&apos;s on-device parser handles real Google Pay, PhonePe, Paytm, and BHIM notification strings, blocks OTPs/collect requests, prevents duplicates, and calculates warnings from your actual remaining budget.
                </p>
              </div>

              {/* Sample Preset Payloads */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-300 block">
                  Load Sample Notification Payload:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {SAMPLE_UPI_NOTIFICATION_PAYLOADS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => {
                        setSelectedPkg(sample.packageName);
                        setTestTitle(sample.appTitle);
                        setTestText(sample.notificationText);
                        setVerifierFeedback(null);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 cursor-pointer transition-colors"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Source Android Package
                  </label>
                  <select
                    value={selectedPkg}
                    onChange={(e) => setSelectedPkg(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  >
                    {SUPPORTED_UPI_APPS.map((app) => (
                      <option key={app.packageName} value={app.packageName}>
                        {app.displayName} ({app.packageName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Notification Title
                  </label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Notification Text (Parsed 100% On-Device)
                </label>
                <textarea
                  rows={2}
                  value={testText}
                  onChange={(e) => {
                    setTestText(e.target.value);
                    setVerifierFeedback(null);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              {/* Live On-Device Parse Result Preview */}
              <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Live On-Device Parser Inspection:
                </span>
                {livePreviewParse.rejected ? (
                  <div className="flex items-start gap-2 text-xs text-amber-300">
                    <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">
                        Safely Ignored ({livePreviewParse.reason}):
                      </span>{" "}
                      {livePreviewParse.explanation}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{livePreviewParse.parsed.sanitizedSummary}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Merchant: {livePreviewParse.parsed.merchant} · Category:{" "}
                      {livePreviewParse.parsed.category} · Dedup Key:{" "}
                      {livePreviewParse.parsed.fingerprint}
                    </div>
                  </div>
                )}
              </div>

              {verifierFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    verifierFeedback.type === "accepted"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                      : verifierFeedback.type === "duplicate"
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                      : "bg-rose-500/15 border-rose-500/40 text-rose-200"
                  }`}
                >
                  {verifierFeedback.message}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const res = onTriggerParsedUpiNotification({
                      title: testTitle,
                      text: testText,
                      packageName: selectedPkg,
                      source: "manual_parser_test",
                    });
                    setVerifierFeedback({
                      type: res.status,
                      message: res.message,
                    });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run On-Device Parser &amp; Trigger Budget Alert</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
