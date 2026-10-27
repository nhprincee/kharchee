import React, { useRef, useState } from "react";
import { Flame, Gift, Eye, EyeOff, Download, Upload, Database, Palette } from "lucide-react";
import { THEMES } from "./ThemeSelector";

interface HeaderProps {
  currentThemeId: string;
  currentPageTitle?: string;
  streakCount: number;
  userInitials: string;
  vaultReady?: boolean;
  stealthMode?: boolean;
  onToggleStealthMode?: () => void;
  onOpenProfile: () => void;
  onOpenThemes: () => void;
  onOpenStreakCelebration: () => void;
  onOpenRewardVault?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentThemeId,
  currentPageTitle = "Dashboard",
  streakCount,
  userInitials,
  vaultReady = true,
  stealthMode = false,
  onToggleStealthMode,
  onOpenProfile,
  onOpenThemes,
  onOpenStreakCelebration,
  onOpenRewardVault,
  onExportBackup,
  onImportBackup,
}) => {
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  const activeTheme =
    THEMES.find(
      (t) => t.id === currentThemeId || t.appThemeId === currentThemeId
    ) || THEMES[0];

  return (
    <header
      style={{
        backgroundColor: "#080c14",
        backgroundImage: "none",
        borderBottom: "1px solid #1e293b",
        boxShadow: "none",
      }}
      className="sticky top-0 z-40 w-full px-4 sm:px-6 py-3 bg-[#080c14] flex items-center justify-between gap-3"
    >
      {/* Hidden File Input for Import / Restore Backup */}
      <input
        ref={backupFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onImportBackup) {
            onImportBackup(file);
            setShowBackupMenu(false);
          }
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Brand, Logo & Contextual Page Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenThemes}
          title="Change Theme"
          className="relative p-1 rounded-xl bg-[#0f172a] border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer shrink-0"
        >
          <div className="w-8 h-8 flex items-center justify-center">
            {activeTheme.badgeSvg}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-[#080c14]" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-xs sm:text-sm tracking-[0.18em] text-white whitespace-nowrap">
              KHARCHEE
            </span>
            <span className="text-slate-700 hidden sm:inline">/</span>
            <span className="text-xs sm:text-sm font-semibold text-indigo-300 truncate">
              {currentPageTitle}
            </span>
          </div>
          <span className="text-[10px] tracking-wider text-slate-400 font-medium block uppercase truncate">
            {stealthMode ? "Stealth Mode · Balances Hidden" : "Personal Finance & Expense OS"}
          </span>
        </div>
      </div>

      {/* Header Controls: Theme Selector, Privacy Shield, Backup Vault, Rewards, Streak, Profile */}
      <div className="flex items-center gap-1.5 shrink-0 relative">
        <button
          type="button"
          onClick={onOpenThemes}
          title="Theme Selector"
          aria-label="Open Theme Selector"
          className="h-8 px-2.5 rounded-lg bg-[#0f172a] border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-white flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer"
        >
          <Palette className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">Theme</span>
        </button>

        {onToggleStealthMode && (
          <button
            type="button"
            onClick={onToggleStealthMode}
            title={
              stealthMode
                ? "Stealth Zero-Balance Shield ON (₹0.00 / Empty Vault)"
                : "Enable Stealth Zero-Balance Shield"
            }
            aria-label="Toggle Stealth Zero-Balance Shield"
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
              stealthMode
                ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-200"
                : "bg-[#0f172a] border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
            }`}
          >
            {stealthMode ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Header 1-Tap Backup & Restore Popover Trigger */}
        {(onExportBackup || onImportBackup) && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBackupMenu((v) => !v)}
              title="LocalStorage Backup: Export / Import JSON"
              aria-label="Backup and Restore Data"
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                showBackupMenu
                  ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-300"
                  : "bg-[#0f172a] border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
            </button>

            {showBackupMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0c1220] border border-slate-700 p-2 shadow-2xl z-50 space-y-1.5">
                <div className="px-2 py-1 border-b border-slate-800">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300 block">
                    Data Backup &amp; Restore
                  </span>
                </div>
                {onExportBackup && (
                  <button
                    type="button"
                    onClick={() => {
                      onExportBackup();
                      setShowBackupMenu(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs font-semibold text-white flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Export Backup (JSON)</span>
                  </button>
                )}
                {onImportBackup && (
                  <button
                    type="button"
                    onClick={() => backupFileInputRef.current?.click()}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Import / Restore Backup</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {onOpenRewardVault && (
          <button
            type="button"
            onClick={onOpenRewardVault}
            title="Open Stark Reward Vault"
            aria-label="Open Stark Reward Vault"
            className="relative h-8 px-2.5 rounded-lg bg-[#0f172a] border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-medium hidden sm:inline">Vault</span>
            {vaultReady && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenStreakCelebration}
          title="Budget Discipline Streak"
          className="h-8 px-2.5 rounded-lg bg-[#0f172a] border border-slate-800 hover:border-amber-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-mono tabular-nums font-bold text-white leading-none">
            {streakCount}d
          </span>
        </button>

        {/* Profile Avatar Chip */}
        <button
          type="button"
          onClick={onOpenProfile}
          title="Profile & Settings"
          aria-label="Open Profile and Settings"
          className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 flex items-center justify-center text-xs font-bold tracking-wider text-indigo-200 cursor-pointer transition-colors"
        >
          {userInitials || "MS"}
        </button>
      </div>
    </header>
  );
};


