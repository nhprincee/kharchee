import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, QrCode, ExternalLink, ShieldCheck } from "lucide-react";
import type { FanTheme } from "../types";

interface KhataQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  myUpiId: string;
  recipientName?: string;
  friendName?: string;
  amount: number;
  theme: FanTheme;
  onShowToast?: (msg: string) => void;
}

export const KhataQrModal: React.FC<KhataQrModalProps> = ({
  isOpen,
  onClose,
  myUpiId,
  recipientName = "Mrigander",
  friendName,
  amount,
  theme,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const positiveAmount = Math.max(1, Math.round(amount));
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(myUpiId)}&pn=${encodeURIComponent(
    recipientName
  )}&am=${positiveAmount}&tn=KharcheKhata&cu=INR`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(upiDeepLink);
      }
      setCopied(true);
      onShowToast?.(`Copied direct UPI payment link (₹${positiveAmount})`);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onShowToast?.(`UPI ID: ${myUpiId}`);
    }
  };

  const handleCopyUpiId = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(myUpiId);
      }
      onShowToast?.(`Copied UPI ID: ${myUpiId}`);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div
        className="w-full max-w-[360px] rounded-3xl border bg-slate-950 p-5 shadow-2xl relative overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200"
        style={{
          borderColor: `${theme.accentHex}40`,
          boxShadow: `0 0 35px ${theme.ringGlow}, 0 20px 40px rgba(0,0,0,0.9)`,
        }}
      >
        {/* Ambient Top Glow */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30"
          style={{ background: theme.accentHex }}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-slate-950 shadow-md"
              style={{ background: theme.accentHex }}
            >
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 id="qr-modal-title" className="text-sm font-extrabold text-white tracking-tight">
                Scan to Pay My Account
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Direct bank settlement via UPI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR Modal"
            className="w-7 h-7 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount & Beneficiary Tag */}
        <div className="py-3 text-center relative z-10">
          {friendName && (
            <p className="text-[11px] text-slate-400 mb-0.5">
              Receiving from <span className="font-bold text-white">{friendName}</span>
            </p>
          )}
          <div className="flex items-baseline justify-center gap-1 font-mono">
            <span className="text-xs text-slate-400 font-bold">₹</span>
            <span
              className="text-3xl font-black tracking-tight"
              style={{ color: theme.accentHex }}
            >
              {positiveAmount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-300">
            <span className="font-mono text-cyan-300 font-semibold">{myUpiId}</span>
            <button
              type="button"
              onClick={handleCopyUpiId}
              title="Copy UPI ID"
              className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* QR Code Canvas with Glowing HUD Frame */}
        <div className="my-2 flex flex-col items-center justify-center relative z-10">
          <div
            className="p-3.5 rounded-2xl bg-white border-2 relative shadow-xl"
            style={{
              borderColor: theme.accentHex,
              boxShadow: `0 0 20px ${theme.ringGlow}`,
            }}
          >
            <QRCodeSVG
              value={upiDeepLink}
              size={180}
              level="H"
              bgColor="#ffffff"
              fgColor="#090d16"
            />
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Encodes exact ₹{positiveAmount} amount · Zero commission</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-white/10 space-y-2 relative z-10">
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Deep Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-cyan-400" />
                <span>Copy UPI Payment Deep-Link</span>
              </>
            )}
          </button>

          <a
            href={upiDeepLink}
            className={`w-full h-10 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 ${theme.buttonBg} ${theme.buttonText}`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in PhonePe / GPay</span>
          </a>
        </div>
      </div>
    </div>
  );
};
