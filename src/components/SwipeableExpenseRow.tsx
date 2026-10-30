import React, { useState, useRef } from "react";
import {
  Utensils,
  Coffee,
  Fuel,
  ShoppingCart,
  Film,
  Receipt,
  ShoppingBag,
  Trash2,
  Split,
  Send,
  Copy,
  Check,
  Flame,
  RefreshCw,
  QrCode,
  Pencil,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Expense, ExpenseCategory } from "../types";
import { playQuickAddChirp, playStarkPowerSurgeSwoosh } from "../utils/celebration";

interface SwipeableExpenseRowProps {
  expense: Expense;
  onDelete: (id: string) => void;
  onEdit?: (expense: Expense) => void;
  showDate?: boolean;
  myUpiId?: string;
}

export function getCategoryIcon(category: ExpenseCategory) {
  switch (category) {
    case "Food":
      return Utensils;
    case "Chai & Snacks":
      return Coffee;
    case "Transport":
      return Fuel;
    case "Grocery":
      return ShoppingCart;
    case "Entertainment":
      return Film;
    case "Bills":
      return Receipt;
    case "Shopping":
      return ShoppingBag;
    case "Salary":
      return Wallet;
    case "Freelance":
      return Briefcase;
    case "Cashback":
      return Sparkles;
    default:
      return Receipt;
  }
}

export function formatTimeShort(iso: string, includeDate = false): string {
  const d = new Date(iso);
  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (!includeDate) return timeStr;
  const dateStr = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  return `${dateStr}, ${timeStr}`;
}

export const SwipeableExpenseRow: React.FC<SwipeableExpenseRowProps> = ({
  expense,
  onDelete,
  onEdit,
  showDate = false,
  myUpiId,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [splitCount, setSplitCount] = useState<2 | 3 | 4>(2);
  const [copiedLink, setCopiedLink] = useState(false);
  const [roastMode, setRoastMode] = useState(true);
  const [roastIndex, setRoastIndex] = useState(0);
  const [showReceiptQr, setShowReceiptQr] = useState(true);

  const startXRef = useRef<number | null>(null);
  const currentOffsetRef = useRef<number>(0);

  const Icon = getCategoryIcon(expense.category);

  const rawUpi = (
    myUpiId ||
    (typeof window !== "undefined"
      ? localStorage.getItem("kharche_my_upi_id_v1") || ""
      : "")
  ).trim();
  const hasConfiguredUpi = Boolean(
    rawUpi && rawUpi.includes("@") && rawUpi.toLowerCase() !== "mrigander@upi"
  );
  const activeUpiId = hasConfiguredUpi ? rawUpi : "";

  const perPersonShare = Math.ceil(expense.amount / splitCount);
  const upiDeepLink = hasConfiguredUpi
    ? `upi://pay?pa=${encodeURIComponent(
        activeUpiId
      )}&pn=KharcheeUser&am=${perPersonShare}&cu=INR&tn=${encodeURIComponent(
        `Split: ${expense.title}`
      )}`
    : "";

  const splitRoastTemplates = [
    `Bhai tere ₹${perPersonShare.toLocaleString("en-IN")} k chakkar me mera daily budget Thanos ban gaya hai, jaldi settle kar! 💀⚡ (${expense.title} Split)`,
    `Ambani ke chote bete, *${expense.title}* ka ₹${perPersonShare.toLocaleString("en-IN")} bhej de warna agle janam me GST + interest ke sath wasoolunga 😭🔥`,
    `J.A.R.V.I.S. Alert: Tera ₹${perPersonShare.toLocaleString("en-IN")} (*${expense.title}*) abhi tak pending hai! Dosti apni jagah, UPI turant kar bhai 🫡💸`,
    `Bro khate waqt toh sabse aage tha, ab *${expense.title}* ka ₹${perPersonShare.toLocaleString("en-IN")} bhejne me fingers freeze ho gaye kya? 😂⚡`,
  ];

  const activeRoastLine = splitRoastTemplates[roastIndex % splitRoastTemplates.length];

  const whatsappText = roastMode
    ? `🔥 *KHARCHE SAVAGE SPLIT ALERT*\n\n"${activeRoastLine}"\n\n💰 Tera Share: *₹${perPersonShare.toLocaleString(
        "en-IN"
      )}* (Total ₹${expense.amount.toLocaleString("en-IN")} ÷ ${splitCount})` +
      (hasConfiguredUpi
        ? `\n⚡ 1-Tap UPI Pay (${activeUpiId}):\n${upiDeepLink}`
        : `\n⚠️ _(Configure your personal UPI ID in Settings/Profile to attach a direct UPI link)_`)
    : `Hey! Splitting *${expense.title}* (Total ₹${expense.amount.toLocaleString(
        "en-IN"
      )} ÷ ${splitCount} = *₹${perPersonShare.toLocaleString(
        "en-IN"
      )}* each).` +
      (hasConfiguredUpi
        ? `\n\nPay straight to my UPI (${activeUpiId}):\n${upiDeepLink}`
        : "");

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  const handleCopySplit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(whatsappText).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX - currentOffsetRef.current;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const delta = e.touches[0].clientX - startXRef.current;
    const clamped = Math.max(-100, Math.min(0, delta));
    currentOffsetRef.current = clamped;
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    startXRef.current = null;
    if (currentOffsetRef.current <= -80) {
      onDelete(expense.id);
      currentOffsetRef.current = 0;
      setOffsetX(0);
    } else if (currentOffsetRef.current <= -35) {
      currentOffsetRef.current = -70;
      setOffsetX(-70);
    } else {
      currentOffsetRef.current = 0;
      setOffsetX(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startXRef.current = e.clientX - currentOffsetRef.current;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || startXRef.current === null) return;
    const delta = e.clientX - startXRef.current;
    const clamped = Math.max(-100, Math.min(0, delta));
    currentOffsetRef.current = clamped;
    setOffsetX(clamped);
  };

  const handleMouseUpOrLeave = () => {
    if (!isDragging) return;
    setIsDragging(false);
    startXRef.current = null;
    if (currentOffsetRef.current <= -80) {
      onDelete(expense.id);
      currentOffsetRef.current = 0;
      setOffsetX(0);
    } else if (currentOffsetRef.current <= -35) {
      currentOffsetRef.current = -70;
      setOffsetX(-70);
    } else {
      currentOffsetRef.current = 0;
      setOffsetX(0);
    }
  };

  const isIncome = expense.type === "income";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 hover:border-indigo-500/35 bg-[#0c1220] select-none group transition-colors">
      {/* Revealed Delete Action Behind Row */}
      <div className="absolute inset-y-0 right-0 w-24 bg-rose-600/90 flex items-center justify-end pr-4">
        <button
          type="button"
          onClick={() => onDelete(expense.id)}
          className="min-h-[44px] min-w-[44px] flex items-center gap-1 text-xs font-bold text-white whitespace-nowrap shrink-0 cursor-pointer"
          aria-label={`Delete transaction ${expense.title}`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>

      {/* Foreground Sliding Row */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{ transform: `translateX(${offsetX}px)` }}
        className={`relative z-10 flex items-center justify-between gap-2.5 px-3.5 py-3 bg-[#0c1220] hover:bg-[#11192c] ${
          isDragging ? "" : "transition-transform duration-150 ease-out"
        } cursor-grab active:cursor-grabbing`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
              isIncome
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-indigo-500/10 border-indigo-500/25 text-indigo-300"
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                {expense.title}
              </p>
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 border ${
                  isIncome
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-slate-800/90 border-slate-700/80 text-slate-300"
                }`}
              >
                {isIncome ? (
                  <>
                    <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Income</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-2.5 h-2.5 text-slate-400" />
                    <span>Expense</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
              <span>{expense.category}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono tabular-nums">
                {formatTimeShort(expense.timestamp, showDate)}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>{expense.paymentMode}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* 1-Tap Split Bill Trigger (for Expense rows) */}
          {!isIncome && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                playQuickAddChirp();
                setIsSplitOpen((prev) => !prev);
              }}
              className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isSplitOpen
                  ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-200"
                  : "bg-[#11192c] border-slate-700/80 text-slate-300 hover:border-indigo-400/40 hover:text-indigo-200"
              }`}
              title="Split this expense with friends"
            >
              <Split className="w-3 h-3 text-indigo-400" />
              <span className="hidden xs:inline">Split</span>
            </button>
          )}

          <span
            className={`font-mono tabular-nums text-sm font-bold whitespace-nowrap ml-0.5 ${
              isIncome ? "text-emerald-400" : "text-slate-100"
            }`}
          >
            {isIncome ? "+" : "−"}₹{expense.amount.toLocaleString("en-IN")}
          </span>

          {onEdit && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(expense);
              }}
              aria-label={`Edit ${expense.title}`}
              title="Edit transaction"
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(expense.id);
            }}
            aria-label={`Remove ${expense.title}`}
            title="Delete transaction"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable 1-Tap Split Bill Drawer */}
      {isSplitOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-20 border-t border-white/10 bg-slate-950/95 px-3.5 py-2.5 space-y-2.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {([2, 3, 4] as const).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    playQuickAddChirp();
                    setSplitCount(num);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                    splitCount === num
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-xs"
                      : "bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  ÷ {num} Friends
                </button>
              ))}
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Per Person</span>
              <span className="font-mono tabular-nums text-sm font-black text-emerald-400">
                ₹{perPersonShare.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Savage WhatsApp Recovery Generator - Roast Mode Toggle */}
          <div className="p-2.5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-rose-950/30 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  playQuickAddChirp();
                  setRoastMode((prev) => !prev);
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
                  roastMode
                    ? "bg-gradient-to-r from-amber-500/25 to-rose-500/25 border-amber-400/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                    : "bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Flame className={`w-3 h-3 ${roastMode ? "text-amber-400 fill-amber-400 animate-pulse" : "text-slate-500"}`} />
                <span>Roast Mode: {roastMode ? "ON 🔥" : "OFF"}</span>
              </button>

              {roastMode && (
                <button
                  type="button"
                  onClick={() => {
                    playQuickAddChirp();
                    setRoastIndex((prev) => prev + 1);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-amber-400/30 text-[10px] font-bold text-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Generate another savage Hinglish roast"
                >
                  <RefreshCw className="w-2.5 h-2.5 text-amber-400" />
                  <span>Shuffle Roast</span>
                </button>
              )}
            </div>

            {roastMode && (
              <p className="text-[11px] text-amber-100/95 font-medium italic leading-snug bg-black/40 px-2.5 py-1.5 rounded-xl border border-amber-500/20">
                &ldquo;{activeRoastLine}&rdquo;
              </p>
            )}
          </div>

          {/* Cyberpunk Group Split Bill Receipt Card with Embedded UPI QR */}
          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={() => {
                playQuickAddChirp();
                setShowReceiptQr((prev) => !prev);
              }}
              className="text-[10px] font-mono font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
            >
              <QrCode className="w-3 h-3 text-cyan-400" />
              <span>
                {showReceiptQr ? "Hide Group Split Receipt QR" : "Generate Group Split Bill"}
              </span>
            </button>
            <span className="text-[10px] font-mono text-slate-400">
              UPI:{" "}
              <strong className={hasConfiguredUpi ? "text-cyan-300" : "text-amber-300"}>
                {hasConfiguredUpi ? activeUpiId : "Not Set (Add in Profile)"}
              </strong>
            </span>
          </div>

          {showReceiptQr && (
            <div className="p-3 rounded-2xl bg-[#05070c] border border-cyan-500/35 flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(6,182,212,0.12)]">
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-cyan-400 block">
                  ⚡ CYBERPUNK SPLIT RECEIPT
                </span>
                <p className="text-xs font-black text-white truncate">{expense.title}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-[#0a0e17] border border-white/10 text-slate-300">
                    Total: ₹{expense.amount.toLocaleString("en-IN")}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-bold">
                    ₹{perPersonShare.toLocaleString("en-IN")} / person
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  Attendees: You + {splitCount - 1} Friends ({splitCount} total)
                </p>
              </div>
              {hasConfiguredUpi ? (
                <div className="p-1.5 rounded-xl bg-white shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.35)]">
                  <QRCodeSVG value={upiDeepLink} size={64} level="M" includeMargin={false} />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-400/40 text-[10px] font-mono text-amber-300 text-right max-w-[130px]">
                  Save your UPI ID in Settings/Profile to generate QR
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playStarkPowerSurgeSwoosh()}
              className={`flex-1 h-8 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                roastMode
                  ? "bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:brightness-110 text-slate-950"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
              }`}
            >
              <Send className="w-3 h-3" />
              <span>Share Bill to WhatsApp Group</span>
            </a>

            <button
              type="button"
              onClick={handleCopySplit}
              className="px-2.5 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-bold text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
              title="Copy UPI Split message"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

