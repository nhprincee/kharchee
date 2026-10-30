import React, { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import {
  X,
  Share2,
  Download,
  ShieldAlert,
  QrCode,
  Check,
  Sparkles,
  FileText,
  Crosshair,
} from "lucide-react";
import type { FanTheme, KhataFriend } from "../types";
import { playQuickAddChirp, playProVaultChime } from "../utils/celebration";

interface EpicDebtCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: KhataFriend;
  amountDue: number;
  myUpiId: string;
  theme: FanTheme;
  initialMode?: "bounty" | "invoice";
  onShowToast?: (msg: string) => void;
}

export const EpicDebtCardModal: React.FC<EpicDebtCardModalProps> = ({
  isOpen,
  onClose,
  friend,
  amountDue,
  myUpiId,
  theme,
  initialMode = "bounty",
  onShowToast,
}) => {
  const [posterMode, setPosterMode] = useState<"bounty" | "invoice">(initialMode);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const hiddenQrWrapRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const positiveAmount = Math.max(1, Math.round(Math.abs(amountDue)));
  const invoiceId = `SI-${friend.id.slice(-3).toUpperCase()}-${positiveAmount}`;
  const issueDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dueDateObj = new Date(Date.now() + 24 * 3600 * 1000);
  const dueDate = dueDateObj.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const unsettledItems = friend.entries
    .filter((e) => !e.settled && e.amount > 0)
    .map((e) => `${e.description} (₹${e.amount})`)
    .join(", ");

  const cleanUpi = (myUpiId || "").trim();
  const hasConfiguredUpi = Boolean(
    cleanUpi && cleanUpi.includes("@") && cleanUpi.toLowerCase() !== "mrigander@upi"
  );

  const upiDeepLink = hasConfiguredUpi
    ? `upi://pay?pa=${encodeURIComponent(
        cleanUpi
      )}&pn=KharcheeUser&am=${positiveAmount}&tn=${encodeURIComponent(
        `Bounty-${friend.name.replace(/\s+/g, "")}`
      )}&cu=INR`
    : "";

  const whatsappNoticeText =
    posterMode === "bounty"
      ? `🎯 *KHARCHE CYBER BOUNTY POSTER* 🎯\n` +
        `====================================\n` +
        `🚨 *WANTED: ${friend.name.toUpperCase()} - ₹${positiveAmount.toLocaleString("en-IN")}*\n` +
        `====================================\n` +
        `💀 *Crime:* Ghosting after ${unsettledItems || "peer-to-peer Khata split"}\n` +
        `💰 *Bounty Reward:* Instant Friendship Restoration\n` +
        (hasConfiguredUpi
          ? `⚡ *Clear Your Bounty via 1-Tap UPI (${cleanUpi}):*\n${upiDeepLink}\n\n_Scan the embedded UPI QR in the Bounty Poster or tap above before J.A.R.V.I.S. escalates to the group chat!_`
          : `⚠️ _(Save your personal UPI ID in Settings/Profile to attach a 1-tap UPI payment link)_`)
      : `⚡ *STARK INDUSTRIES · OFFICIAL KHATA NOTICE* ⚡\n` +
        `----------------------------------------\n` +
        `📄 *Invoice Ref:* #${invoiceId}\n` +
        `👤 *Debtor:* ${friend.name}\n` +
        `💰 *Total Amount Due:* ₹${positiveAmount.toLocaleString("en-IN")}\n` +
        `📅 *Due Date:* ${dueDate} (Immediate Settlement)\n` +
        (unsettledItems ? `🧾 *Billed Items:* ${unsettledItems}\n` : "") +
        `----------------------------------------\n` +
        `🤖 *J.A.R.V.I.S. Advisory:* _"Sir ${friend.name.split(" ")[0]}, your ledger balance requires immediate perimeter clearance."_\n\n` +
        (hasConfiguredUpi
          ? `📲 *1-Tap Direct UPI Settlement (${cleanUpi}):*\n${upiDeepLink}`
          : `⚠️ _(Configure your personal UPI ID in Settings/Profile to include a direct UPI payment link)_`);

  const digits = friend.phone.replace(/\D/g, "");
  const cleanPhone = digits.length === 10 ? `91${digits}` : digits;
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    whatsappNoticeText
  )}`;

  const renderPosterCanvas = (): HTMLCanvasElement | null => {
    const canvas = document.createElement("canvas");
    canvas.width = 760;
    canvas.height = 980;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (posterMode === "bounty") {
      // RETRO-FUTURISTIC CYBER BOUNTY POSTER ("WANTED: [Friend Name] - ₹[Amount]")
      const bgGrad = ctx.createLinearGradient(0, 0, 760, 980);
      bgGrad.addColorStop(0, "#140904");
      bgGrad.addColorStop(0.5, "#0b0711");
      bgGrad.addColorStop(1, "#120604");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 760, 980);

      // Retro-Futuristic Grid Overlay
      ctx.strokeStyle = "rgba(245, 158, 11, 0.08)";
      ctx.lineWidth = 1.5;
      for (let x = 0; x < 760; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 980);
        ctx.stroke();
      }
      for (let y = 0; y < 980; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(760, y);
        ctx.stroke();
      }

      // Outer Heavy Amber/Crimson Wanted Frame
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 6;
      ctx.strokeRect(26, 26, 708, 928);

      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2;
      ctx.strokeRect(38, 38, 684, 904);

      // Top Retro Wanted Header Block
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(58, 58, 644, 78);

      ctx.fillStyle = "#090502";
      ctx.font = "900 48px monospace";
      ctx.textAlign = "center";
      ctx.fillText("★ WANTED: DEAD OR UPI ★", 380, 114);

      // Main Headline: "WANTED: [Friend Name] - ₹[Amount]"
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 38px sans-serif";
      ctx.fillText(
        `WANTED: ${friend.name.toUpperCase()} - ₹${positiveAmount.toLocaleString("en-IN")}`,
        380,
        192
      );

      ctx.fillStyle = "#fb7185";
      ctx.font = "bold 18px monospace";
      ctx.fillText(
        `BOUNTY DOSSIER #${invoiceId}  ·  STATUS: AT LARGE IN WHATSAPP GROUPS`,
        380,
        228
      );

      // Center Embedded Pre-Rendered Receiving UPI QR Code
      const qrCanvas = hiddenQrWrapRef.current?.querySelector("canvas");
      ctx.fillStyle = "#1c1208";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      ctx.fillRect(190, 260, 380, 390);
      ctx.strokeRect(190, 260, 380, 390);

      ctx.fillStyle = "#fde68a";
      ctx.font = "bold 16px monospace";
      ctx.fillText("⚡ SCAN CENTER QR TO CLEAR BOUNTY ⚡", 380, 295);

      if (hasConfiguredUpi && qrCanvas) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(250, 315, 260, 260);
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 4;
        ctx.strokeRect(250, 315, 260, 260);
        ctx.drawImage(qrCanvas, 265, 330, 230, 230);
      } else {
        ctx.fillStyle = "#fde68a";
        ctx.font = "bold 16px monospace";
        ctx.fillText("ADD YOUR UPI ID IN SETTINGS/PROFILE", 380, 435);
        ctx.fillText("TO GENERATE PAYMENT QR", 380, 465);
      }

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 18px monospace";
      ctx.fillText(
        hasConfiguredUpi ? `UPI ID: ${cleanUpi}` : "UPI ID NOT CONFIGURED",
        380,
        618
      );

      // Giant Reward / Unsettled Amount Banner
      ctx.fillStyle = "#240810";
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 3;
      ctx.fillRect(68, 680, 624, 130);
      ctx.strokeRect(68, 680, 624, 130);

      ctx.fillStyle = "#fda4af";
      ctx.font = "bold 16px monospace";
      ctx.fillText("OUTSTANDING KHATA BOUNTY AMOUNT", 380, 715);

      ctx.fillStyle = "#fbbf24";
      ctx.font = "900 52px monospace";
      ctx.fillText(`₹${positiveAmount.toLocaleString("en-IN")} ONLY`, 380, 778);

      // Crime description & Footer
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 16px monospace";
      const crimeText = unsettledItems
        ? `KNOWN OFFENSE: ${unsettledItems.slice(0, 52)}`
        : "KNOWN OFFENSE: Saying 'Bro kal पक्का GPay kar dunga'";
      ctx.fillText(crimeText, 380, 855);

      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 14px monospace";
      ctx.fillText(
        "ISSUED BY KHARCHE BOUNTYSYNDICATE · DROP IN WHATSAPP GROUP",
        380,
        915
      );

      return canvas;
    }

    // STARK INVOICE MODE
    const bgGrad = ctx.createLinearGradient(0, 0, 760, 980);
    bgGrad.addColorStop(0, "#020617");
    bgGrad.addColorStop(0.5, "#090d16");
    bgGrad.addColorStop(1, "#020617");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 760, 980);

    ctx.strokeStyle = theme.accentHex || "#22d3ee";
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, 712, 932);

    ctx.fillStyle = "#22d3ee";
    ctx.font = "bold 16px monospace";
    ctx.fillText("⚡ STARK INDUSTRIES · FINANCIAL RECOVERY DIVISION", 60, 80);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px monospace";
    ctx.fillText(`INVOICE REF: #${invoiceId}   |   ISSUED: ${issueDate.toUpperCase()}`, 60, 108);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(friend.name.toUpperCase(), 60, 200);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 54px monospace";
    ctx.fillText(`INR ₹${positiveAmount.toLocaleString("en-IN")}`, 60, 320);

    const qrCanvas = hiddenQrWrapRef.current?.querySelector("canvas");
    if (hasConfiguredUpi && qrCanvas) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(260, 410, 240, 240);
      ctx.drawImage(qrCanvas, 275, 425, 210, 210);
    }

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      hasConfiguredUpi
        ? `SCAN TO PAY UPI: ${cleanUpi}`
        : "ADD UPI ID IN SETTINGS/PROFILE TO GENERATE QR",
      380,
      700
    );

    return canvas;
  };

  const handleDownloadPngCard = () => {
    playProVaultChime();
    setIsGeneratingPng(true);
    try {
      const canvas = renderPosterCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download =
        posterMode === "bounty"
          ? `WANTED_Bounty_${friend.name.replace(/\s+/g, "_")}_Rs${positiveAmount}.png`
          : `Stark_Debt_Card_${friend.name.replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast?.(
        posterMode === "bounty"
          ? `🎯 Downloaded WANTED Bounty Poster for ${friend.name}!`
          : `Downloaded Stark Debt Card PNG for ${friend.name}!`
      );
    } finally {
      setIsGeneratingPng(false);
    }
  };

  const handleShareWhatsAppCard = async () => {
    playQuickAddChirp();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(whatsappNoticeText);
        setCopiedNotice(true);
        setTimeout(() => setCopiedNotice(false), 2500);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 backdrop-blur-md p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="epic-debt-card-title"
    >
      {/* Hidden high-res canvas QR for PNG export */}
      {hasConfiguredUpi && (
        <div ref={hiddenQrWrapRef} className="hidden" aria-hidden="true">
          <QRCodeCanvas
            value={upiDeepLink}
            size={240}
            level="H"
            bgColor="#ffffff"
            fgColor="#090d16"
          />
        </div>
      )}

      <div
        className="w-full max-w-[400px] rounded-3xl border bg-slate-950 p-4 shadow-2xl relative overflow-hidden text-slate-100 space-y-3 max-h-[92vh] overflow-y-auto no-scrollbar"
        style={{
          borderColor: posterMode === "bounty" ? "rgba(245, 158, 11, 0.7)" : `${theme.accentHex}60`,
          boxShadow:
            posterMode === "bounty"
              ? "0 0 40px rgba(245, 158, 11, 0.3), 0 20px 50px rgba(0,0,0,0.95)"
              : `0 0 40px ${theme.ringGlow}, 0 20px 50px rgba(0,0,0,0.95)`,
        }}
      >
        {/* Top Modal Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {posterMode === "bounty" ? (
              <Crosshair className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-400" />
            )}
            <h3
              id="epic-debt-card-title"
              className="text-xs font-black uppercase tracking-wider text-amber-300 font-mono"
            >
              {posterMode === "bounty"
                ? "Khata Wanted Bounty Poster"
                : "Stark Debt Notice Generator"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Bounty Poster"
            className="w-7 h-7 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher: Retro-Futuristic Bounty Poster vs Stark Invoice */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-900 border border-white/10">
          <button
            type="button"
            onClick={() => {
              playQuickAddChirp();
              setPosterMode("bounty");
            }}
            className={`py-1.5 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              posterMode === "bounty"
                ? "bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Crosshair className="w-3 h-3" />
            <span>🎯 Bounty Poster</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playQuickAddChirp();
              setPosterMode("invoice");
            }}
            className={`py-1.5 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              posterMode === "invoice"
                ? "bg-cyan-500/25 border border-cyan-400/50 text-cyan-200"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>⚡ Stark Invoice</span>
          </button>
        </div>

        {/* POSTER VISUAL PREVIEW */}
        {posterMode === "bounty" ? (
          <div
            className="rounded-2xl border-2 border-amber-400/90 bg-gradient-to-b from-[#170b04] via-[#0c0712] to-[#140605] p-4 space-y-3 relative overflow-hidden shadow-[inset_0_0_30px_rgba(245,158,11,0.18)]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(245, 158, 11, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(245, 158, 11, 0.06) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            {/* Retro-Futuristic Wanted Ribbon */}
            <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 py-1.5 px-3 rounded-xl text-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <span className="font-mono text-sm font-black uppercase tracking-[0.2em] block">
                ★ WANTED: DEAD OR UPI ★
              </span>
            </div>

            {/* Required Headline: "WANTED: [Friend Name] - ₹[Amount]" */}
            <div className="text-center space-y-1 pt-0.5">
              <h4 className="text-base font-black uppercase tracking-wide text-white drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
                WANTED: {friend.name.toUpperCase()} - ₹{positiveAmount.toLocaleString("en-IN")}
              </h4>
              <p className="text-[10px] font-mono text-rose-300 font-bold uppercase">
                {unsettledItems
                  ? `Crime: Unpaid ${unsettledItems}`
                  : "Crime: Dodging Khata Split in WhatsApp Group"}
              </p>
            </div>

            {/* Center Embedded Pre-Rendered Receiving UPI QR Code */}
            <div className="py-2 flex flex-col items-center justify-center">
              {hasConfiguredUpi ? (
                <div className="p-3 rounded-2xl bg-[#1f1207]/90 border-2 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.3)] flex flex-col items-center">
                  <span className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-300 mb-2">
                    ⚡ SCAN CENTER QR TO CLEAR BOUNTY ⚡
                  </span>
                  <div className="p-2.5 rounded-xl bg-white border-2 border-rose-500">
                    <QRCodeSVG
                      value={upiDeepLink}
                      size={144}
                      level="H"
                      bgColor="#ffffff"
                      fgColor="#090d16"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-cyan-300 font-bold">
                    <QrCode className="w-3 h-3 text-amber-400" />
                    <span>Receiving UPI: {cleanUpi}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-400/50 text-center space-y-1">
                  <p className="text-xs font-bold text-amber-300">
                    Personal UPI ID Required
                  </p>
                  <p className="text-[11px] text-amber-100/85 leading-relaxed">
                    Add and save your personal UPI ID in Settings / Profile first to generate a dynamic Bounty QR code and UPI payment link.
                  </p>
                </div>
              )}
            </div>

            {/* Bounty Reward Box */}
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-center space-y-0.5">
              <span className="text-[9px] font-mono uppercase tracking-widest text-rose-300 block">
                BOUNTY SETTLEMENT AMOUNT
              </span>
              <p className="font-mono text-xl font-black text-amber-300">
                ₹{positiveAmount.toLocaleString("en-IN")} ONLY
              </p>
              <span className="text-[9px] font-mono text-slate-300 block">
                Drop in WhatsApp group for instant peer-pressure recovery
              </span>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl border-2 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-4 space-y-3 relative overflow-hidden shadow-inner"
            style={{
              borderColor: theme.accentHex,
            }}
          >
            {/* Corner HUD accents */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div>
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-cyan-400 block">
                  ⚡ STARK RECOVERY DIVISION
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  INVOICE #{invoiceId}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-[9px] font-mono font-extrabold text-amber-300 uppercase">
                Due: {dueDate}
              </span>
            </div>

            {/* Friend & Amount Due */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 block">
                  Debtor Name
                </span>
                <h4 className="text-lg font-black text-white tracking-tight">
                  {friend.name}
                </h4>
                {unsettledItems && (
                  <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                    {unsettledItems}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono uppercase text-emerald-400 block">
                  Amount Due
                </span>
                <span className="font-mono tabular-nums text-2xl font-black text-emerald-400">
                  ₹{positiveAmount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Pre-Rendered Receiving UPI QR Code */}
            <div className="py-2 flex flex-col items-center justify-center">
              {hasConfiguredUpi ? (
                <>
                  <div
                    className="p-2.5 rounded-2xl bg-white border-2 shadow-lg"
                    style={{ borderColor: theme.accentHex }}
                  >
                    <QRCodeSVG
                      value={upiDeepLink}
                      size={136}
                      level="H"
                      bgColor="#ffffff"
                      fgColor="#090d16"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-cyan-300 font-bold">
                    <QrCode className="w-3 h-3" />
                    <span>Pay to UPI: {cleanUpi}</span>
                  </div>
                </>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-400/50 text-center space-y-1">
                  <p className="text-xs font-bold text-amber-300">
                    Personal UPI ID Required
                  </p>
                  <p className="text-[11px] text-amber-100/85 leading-relaxed">
                    Add and save your personal UPI ID in Settings / Profile first to generate a dynamic Invoice QR code and UPI link.
                  </p>
                </div>
              )}
            </div>

            {/* Witty JARVIS Invoice Footer */}
            <div className="p-2 rounded-xl bg-slate-900/90 border border-cyan-500/25 flex items-start gap-1.5 text-[10px] text-slate-300">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                &ldquo;Sir <strong className="text-white">{friend.name.split(" ")[0]}</strong>,
                scan the Stark QR above to settle{" "}
                <strong className="text-emerald-400">₹{positiveAmount}</strong> immediately.&rdquo;
              </span>
            </div>
          </div>
        )}

        {/* 1-Tap Action Buttons: Drop in WhatsApp Group & Download PNG */}
        <div className="space-y-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleShareWhatsAppCard}
            className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>
              {posterMode === "bounty"
                ? "🎯 Drop Bounty Poster on WhatsApp"
                : "Share Debt Card on WhatsApp"}
            </span>
          </a>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isGeneratingPng}
              onClick={handleDownloadPngCard}
              className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-400/40 text-[11px] font-bold text-amber-200 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isGeneratingPng
                  ? "Rendering..."
                  : posterMode === "bounty"
                  ? "Download Bounty PNG"
                  : "Download PNG"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                void handleShareWhatsAppCard();
                onShowToast?.(
                  posterMode === "bounty"
                    ? "🎯 Copied Wanted Bounty Notice + UPI Link!"
                    : "Copied Stark Debt Notice to clipboard!"
                );
              }}
              className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-[11px] font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              {copiedNotice ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy WhatsApp Text</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

