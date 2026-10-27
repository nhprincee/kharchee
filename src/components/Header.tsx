import React, { useRef, useState } from "react";
import { Flame, Gift, Eye, EyeOff, Download, Upload, Database } from "lucide-react";
import { THEMES } from "./ThemeSelector";

interface HeaderProps {
  currentThemeId: string;
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
        backgroundColor: "#000000",
        backgroundImage: "none",
        borderBottom: "1px solid #1a2234",
        boxShadow: "none",
      }}
      className="sticky top-0 z-50 w-full px-4 py-3 !bg-black !bg-none !shadow-none !backdrop-blur-none flex items-center justify-between"
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

      {/* Brand & Active Authentic Logo — 100% Flat Stealth Matte Black (Zero Glow) */}
      <div
        style={{ backgroundColor: "#000000", backgroundImage: "none", boxShadow: "none", filter: "none" }}
        className="flex items-center gap-2 shrink-0 flex-nowrap !bg-black !bg-none !shadow-none"
      >
        <button
          type="button"
          onClick={onOpenThemes}
          title="Change Theme"
          style={{ backgroundColor: "#0a0e17", backgroundImage: "none", boxShadow: "none", filter: "none" }}
          className="relative p-1 rounded-xl !bg-[#0a0e17] !bg-none !shadow-none border border-[#1a2234] hover:border-slate-700 transition-colors cursor-pointer shrink-0"
        >
          <div
            style={{ boxShadow: "none", filter: "none" }}
            className="w-8 h-8 flex items-center justify-center !shadow-none"
          >
            {activeTheme.badgeSvg}
          </div>
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-slate-400 ring-2 ring-black" />
        </button>

        <div
          style={{ backgroundColor: "#000000", backgroundImage: "none", boxShadow: "none", filter: "none" }}
          className="shrink-0 !bg-black !bg-none !shadow-none"
        >
          <div className="flex items-center flex-nowrap whitespace-nowrap">
            <span
              style={{ textShadow: "none", filter: "none" }}
              className="font-black text-xs sm:text-sm whitespace-nowrap shrink-0 flex-nowrap tracking-[0.2em] text-white !shadow-none"
            >
              K H A R C H E
            </span>
          </div>
          <span className="text-[10px] tracking-wider text-slate-400 font-semibold block uppercase whitespace-nowrap">
            {stealthMode ? "₹0.00 / Empty Vault" : "Late Night Watch"}
          </span>
        </div>
      </div>

      {/* Minimalist Monochrome & Subtle Champagne Controls */}
      <div className="flex items-center gap-1.5 relative">
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
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              stealthMode
                ? "bg-white/[0.1] border-white/20 text-white"
                : "bg-white/[0.04] border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {stealthMode ? (
              <EyeOff className="w-3.5 h-3.5 text-white" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-white/80" />
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
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                showBackupMenu
                  ? "bg-white/[0.12] border-white/25 text-[#e6c875]"
                  : "bg-white/[0.04] border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
            </button>

            {showBackupMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#080d16] border border-white/15 p-2 shadow-[0_12px_35px_rgba(0,0,0,0.95)] z-50 space-y-1.5">
                <div className="px-2 py-1 border-b border-white/10">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-[#e6c875] block">
                    DATA SAFEGUARD VAULT
                  </span>
                </div>
                {onExportBackup && (
                  <button
                    type="button"
                    onClick={() => {
                      onExportBackup();
                      setShowBackupMenu(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-left text-[11px] font-bold text-white flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Export Backup (JSON)</span>
                  </button>
                )}
                {onImportBackup && (
                  <button
                    type="button"
                    onClick={() => backupFileInputRef.current?.click()}
                    className="w-full px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-left text-[11px] font-bold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
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
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors active:scale-95 cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 text-white/80" />
            <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-white/80 hidden xs:inline">
              Vault
            </span>
            {vaultReady && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#e6c875]" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenStreakCelebration}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/80 hover:bg-white/[0.08] transition-colors active:scale-95 cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5 text-[#e6c875]" />
          <span className="text-[11px] font-mono font-semibold tracking-tight text-white leading-none">
            {streakCount}d
          </span>
        </button>

        {/* Profile Avatar Chip */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] flex items-center justify-center text-[11px] font-semibold tracking-wider text-white cursor-pointer transition-colors"
        >
          {userInitials || "MS"}
        </button>
      </div>
    </header>
  );
};


