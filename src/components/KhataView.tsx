import React, { useState, useMemo } from "react";
import {
  UserPlus,
  MessageCircle,
  Check,
  Copy,
  Split,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Zap,
  Edit2,
  QrCode,
  Pencil,
  X,
  FileText,
  Flame,
  RefreshCw,
  Crosshair,
  ShieldCheck,
  Bot,
  Clock,
  Receipt,
  Send,
  Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { FanTheme, KhataFriend } from "../types";
import { KhataQrModal } from "./KhataQrModal";
import { EpicDebtCardModal } from "./EpicDebtCardModal";
import {
  playQuickAddChirp,
  playProVaultChime,
  playMechanicalKeyTick,
  playStarkPowerSurgeSwoosh,
} from "../utils/celebration";

interface KhataViewProps {
  friends: KhataFriend[];
  theme: FanTheme;
  myUpiId?: string;
  onUpdateMyUpiId?: (newId: string) => void;
  onAddEntry: (friendId: string, description: string, amount: number) => void;
  onAddFriendAndEntry: (
    name: string,
    phone: string,
    description: string,
    amount: number,
    upiId?: string
  ) => void;
  onSplitAmongFriends: (
    friendIds: string[],
    description: string,
    totalBill: number,
    includeSelf: boolean
  ) => void;
  onSettleFriend: (friendId: string) => void;
  onUpdateFriendUpi?: (friendId: string, upiId: string) => void;
  onShowToast?: (message: string) => void;
}

export const KhataView: React.FC<KhataViewProps> = ({
  friends,
  theme,
  myUpiId = "mrigander@upi",
  onUpdateMyUpiId,
  onAddEntry,
  onAddFriendAndEntry,
  onSplitAmongFriends,
  onSettleFriend,
  onUpdateFriendUpi,
  onShowToast,
}) => {
  const [activePanel, setActivePanel] = useState<"none" | "new" | "split">("none");
  const [roastMode, setRoastMode] = useState<boolean>(true);
  const [roastIndex, setRoastIndex] = useState<number>(0);

  // Autonomous Auto-Pilot Recovery Agent State (1-Time Initial Permission)
  const [autoPilotRecoveryEnabled, setAutoPilotRecoveryEnabled] = useState<boolean>(() => {
    return localStorage.getItem("autoPilotRecoveryEnabled") === "true";
  });
  const [showAutoPilotConsentModal, setShowAutoPilotConsentModal] = useState<boolean>(false);

  const handleToggleAutoPilotRecovery = () => {
    playProVaultChime();
    if (autoPilotRecoveryEnabled) {
      setAutoPilotRecoveryEnabled(false);
      localStorage.setItem("autoPilotRecoveryEnabled", "false");
      onShowToast?.("Auto-Pilot Recovery Agent Paused");
    } else {
      const consentGranted =
        localStorage.getItem("autoPilotRecoveryConsentGranted") === "true";
      if (!consentGranted) {
        setShowAutoPilotConsentModal(true);
      } else {
        setAutoPilotRecoveryEnabled(true);
        localStorage.setItem("autoPilotRecoveryEnabled", "true");
        onShowToast?.("⚡ Auto-Pilot Active · Next Sweep at 10:00 PM");
      }
    }
  };

  const handleAuthorizeAutoPilotConsent = () => {
    playProVaultChime();
    localStorage.setItem("autoPilotRecoveryConsentGranted", "true");
    localStorage.setItem("autoPilotRecoveryEnabled", "true");
    setAutoPilotRecoveryEnabled(true);
    setShowAutoPilotConsentModal(false);
    onShowToast?.("⚡ J.A.R.V.I.S. Auto-Recovery Authorized · Next Sweep at 10:00 PM");
  };

  // My Receiving UPI State
  const [isEditingMyUpi, setIsEditingMyUpi] = useState(false);
  const [myUpiDraft, setMyUpiDraft] = useState(myUpiId);
  const [qrModalState, setQrModalState] = useState<{
    isOpen: boolean;
    amount: number;
    friendName?: string;
  } | null>(null);
  const [epicDebtCardState, setEpicDebtCardState] = useState<{
    friend: KhataFriend;
    amount: number;
  } | null>(null);

  // New Entry / Friend State
  const [selectedFriendId, setSelectedFriendId] = useState<string>(friends[0]?.id || "new");
  const [newFriendName, setNewFriendName] = useState("");
  const [newFriendPhone, setNewFriendPhone] = useState("");
  const [newFriendUpi, setNewFriendUpi] = useState("");
  const [entryDesc, setEntryDesc] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDirection, setEntryDirection] = useState<"gave" | "took">("gave");
  const [formError, setFormError] = useState("");

  // Edit UPI Modal/Input State
  const [editingUpiFriendId, setEditingUpiFriendId] = useState<string | null>(null);
  const [upiDraft, setUpiDraft] = useState("");

  // Split Bill State
  const [splitDesc, setSplitDesc] = useState("Midnight Shawarma & Chai");
  const [splitTotal, setSplitTotal] = useState("1200");
  const [selectedSplitIds, setSelectedSplitIds] = useState<string[]>(
    friends.map((f) => f.id)
  );
  const [includeSelf, setIncludeSelf] = useState(true);
  const [showSplitReceiptCard, setShowSplitReceiptCard] = useState(true);

  const friendBalances = useMemo(() => {
    return friends.map((friend) => {
      const unsettled = friend.entries.filter((e) => !e.settled);
      const net = unsettled.reduce((sum, e) => sum + e.amount, 0);
      return { friend, net, unsettledCount: unsettled.length };
    });
  }, [friends]);

  const totalToReceive = useMemo(
    () =>
      friendBalances
        .filter((b) => b.net > 0)
        .reduce((sum, b) => sum + b.net, 0),
    [friendBalances]
  );

  const totalToPay = useMemo(
    () =>
      friendBalances
        .filter((b) => b.net < 0)
        .reduce((sum, b) => sum + Math.abs(b.net), 0),
    [friendBalances]
  );

  const getFriendUpiId = (friend: KhataFriend): string => {
    if (friend.upiId && friend.upiId.trim()) return friend.upiId.trim();
    const digits = friend.phone.replace(/\D/g, "");
    const cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits;
    return cleanPhone ? `${cleanPhone}@upi` : `${friend.name.toLowerCase().replace(/\s+/g, "")}@okaxis`;
  };

  /**
   * Generates official standard UPI deep link:
   * upi://pay?pa=[UPI_ID]&pn=[Name]&am=[Amount]&cu=INR
   */
  const buildUpiPayUrl = (upiId: string, name: string, amount: number): string => {
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${Math.abs(amount)}&cu=INR`;
  };

  const handlePayViaUpi = async (friend: KhataFriend, amount: number) => {
    const upiId = getFriendUpiId(friend);
    const positiveAmt = Math.abs(amount);
    const upiUrl = buildUpiPayUrl(upiId, friend.name, positiveAmt);

    // Auto-copy UPI ID to clipboard for fallback
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(upiId);
      }
    } catch {}

    const toastMsg = `🚀 Launching UPI app... Copied ${upiId} (₹${positiveAmt})`;
    if (onShowToast) {
      onShowToast(toastMsg);
    }

    // Trigger UPI deep link
    window.location.href = upiUrl;
  };

  const handleSaveUpi = (friendId: string) => {
    if (onUpdateFriendUpi && upiDraft.trim()) {
      onUpdateFriendUpi(friendId, upiDraft.trim());
    }
    setEditingUpiFriendId(null);
    setUpiDraft("");
  };

  const getHinglishRoastLine = (friendName: string, netAmount: number, itemsText?: string) => {
    const firstName = friendName.split(" ")[0];
    const itemSuffix = itemsText ? ` (${itemsText})` : "";
    const roasts = [
      `Bhai tere ₹${netAmount} k chakkar me mera daily budget Thanos ban gaya hai, jaldi settle kar! 💀⚡${itemSuffix}`,
      `Oye ${firstName}! Tera ₹${netAmount} udhaar ab museum me rakhwane ka plan hai kya? UPI kar de bhai warna J.A.R.V.I.S. ghar bhej dunga 🤖🔥${itemSuffix}`,
      `Bhai ${firstName}, Dosti apni jagah par ₹${netAmount} ka udhaar apni jagah! Mera wallet ICU me hai, jaldi GPay/PhonePe maar 😭💸${itemSuffix}`,
      `Ambani ke rishtedaar ${firstName}, ₹${netAmount} kab wapas aayega? Chhutte nahi hain toh kidney nahi, bas UPI bhej de 😂⚡${itemSuffix}`,
    ];
    return roasts[roastIndex % roasts.length];
  };

  const buildWhatsAppMessage = (friend: KhataFriend, netAmount: number) => {
    const latestItems = friend.entries
      .filter((e) => !e.settled && e.amount > 0)
      .map((e) => `${e.description} (₹${e.amount})`)
      .join(", ");

    const recipientUpi = myUpiId || "mrigander@upi";
    const upiPayLink = `upi://pay?pa=${encodeURIComponent(recipientUpi)}&pn=Mrigander&am=${Math.abs(
      netAmount
    )}&tn=KharcheKhata&cu=INR`;

    if (roastMode) {
      const roastLine = getHinglishRoastLine(friend.name, netAmount, latestItems);
      return `🔥 *KHARCHE SAVAGE VASOOLI ALERT* 🔥\n\n"${roastLine}"\n\n💰 Pending Udhaar: *₹${netAmount}*\n⚡ 1-Tap Direct UPI (${recipientUpi}):\n${upiPayLink}`;
    }

    return `Hey ${friend.name.split(" ")[0]}! Quick KHARCHE Khata reminder: ₹${netAmount} pending${
      latestItems ? ` for ${latestItems}` : ""
    }.\n\nPay directly to my account via UPI:\n${upiPayLink}\n\nJab free ho pay kar dena!`;
  };

  const buildWhatsAppUrl = (phone: string, message: string) => {
    const digits = phone.replace(/\D/g, "");
    const cleanPhone = digits.length === 10 ? `91${digits}` : digits;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(entryAmount);
    if (!entryDesc.trim() || Number.isNaN(amt) || amt <= 0) {
      setFormError("Enter reason and valid amount.");
      return;
    }
    const signedAmount = entryDirection === "gave" ? Math.round(amt) : -Math.round(amt);

    if (selectedFriendId === "new") {
      if (!newFriendName.trim()) {
        setFormError("Enter friend's name.");
        return;
      }
      onAddFriendAndEntry(
        newFriendName.trim(),
        newFriendPhone.trim() || "919800000000",
        entryDesc.trim(),
        signedAmount,
        newFriendUpi.trim() || undefined
      );
    } else {
      onAddEntry(selectedFriendId, entryDesc.trim(), signedAmount);
    }

    setEntryDesc("");
    setEntryAmount("");
    setNewFriendName("");
    setNewFriendPhone("");
    setNewFriendUpi("");
    setFormError("");
    setActivePanel("none");
  };

  const handleSplitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(splitTotal);
    if (!splitDesc.trim() || Number.isNaN(total) || total <= 0 || selectedSplitIds.length === 0) {
      setFormError("Enter details, total amount, and pick friends.");
      return;
    }
    onSplitAmongFriends(selectedSplitIds, splitDesc.trim(), Math.round(total), includeSelf);
    setSplitDesc("");
    setSplitTotal("");
    setFormError("");
    setActivePanel("none");
  };

  const toggleFriendInSplit = (id: string) => {
    setSelectedSplitIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Quick Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Dosto Ka Khata</h2>
          <p className="text-[11px] text-slate-400">Friend split &amp; 1-Tap UPI payments</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              playQuickAddChirp();
              setShowSplitReceiptCard(true);
              setActivePanel(activePanel === "split" ? "none" : "split");
            }}
            className="px-2.5 py-1.5 rounded-xl border border-cyan-500/40 bg-[#0a0e17] text-xs font-bold text-cyan-300 flex items-center gap-1 cursor-pointer hover:border-cyan-400 transition-all shadow-[0_0_12px_rgba(6,182,212,0.18)]"
          >
            <Split className="w-3.5 h-3.5 text-cyan-400" />
            <span>Generate Group Split Bill</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === "new" ? "none" : "new")}
            style={{
              boxShadow: `0 0 16px ${theme.ringGlow}`,
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all ${theme.buttonBg} ${theme.buttonText}`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Udhaar</span>
          </button>
        </div>
      </div>

      {/* My Receiving UPI ID Bar & Dynamic QR Generator (Direct Payment to My Account) */}
      <div className="p-3.5 rounded-2xl border border-white/10 bg-[#0a0e17] backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_16px_rgba(6,182,212,0.08)]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-slate-950 shadow-xs"
            style={{ background: theme.accentHex }}
          >
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
              My Receiving UPI Account
            </span>
            {!isEditingMyUpi ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-mono font-bold text-cyan-300">{myUpiId}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMyUpiDraft(myUpiId);
                    setIsEditingMyUpi(true);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Edit My Receiving UPI ID"
                  aria-label="Edit My Receiving UPI ID"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = myUpiDraft.trim();
                  if (clean) {
                    onUpdateMyUpiId?.(clean);
                    setIsEditingMyUpi(false);
                    onShowToast?.(`Receiving UPI ID updated to ${clean}`);
                  }
                }}
                className="flex items-center gap-1.5 mt-0.5"
              >
                <input
                  type="text"
                  value={myUpiDraft}
                  onChange={(e) => setMyUpiDraft(e.target.value)}
                  placeholder="e.g. mrigander@upi"
                  className="h-7 px-2 text-xs font-mono rounded-lg bg-slate-950 border border-cyan-400 text-cyan-200 focus:outline-none w-36"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-7 h-7 rounded-lg bg-cyan-400 text-slate-950 flex items-center justify-center cursor-pointer font-bold"
                  aria-label="Save UPI ID"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingMyUpi(false)}
                  className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer"
                  aria-label="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setQrModalState({
              isOpen: true,
              amount: totalToReceive > 0 ? totalToReceive : 500,
            })
          }
          style={{
            borderColor: `${theme.accentHex}40`,
          }}
          className="h-8 px-3 rounded-xl bg-slate-950 border text-xs font-bold text-slate-100 flex items-center gap-1.5 cursor-pointer hover:bg-slate-800 transition-all active:scale-95 shadow-2xs"
        >
          <QrCode className="w-3.5 h-3.5 text-cyan-400" />
          <span>Show My QR</span>
        </button>
      </div>

      {/* Lena Hai vs Dena Hai KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-2xl border border-white/10 bg-[#0a0e17] backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_16px_rgba(16,185,129,0.08)]">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowDownLeft className="w-3 h-3" />
            Lena Hai
          </span>
          <p className="font-mono tabular-nums text-xl font-extrabold text-emerald-400 mt-0.5">
            +₹{totalToReceive.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-slate-400">To collect from friends</span>
        </div>
        <div className="p-3.5 rounded-2xl border border-white/10 bg-[#0a0e17] backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_16px_rgba(244,63,94,0.08)]">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            Dena Hai
          </span>
          <p className="font-mono tabular-nums text-xl font-extrabold text-rose-400 mt-0.5">
            −₹{totalToPay.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-slate-400">Payable via UPI</span>
        </div>
      </div>

      {/* AUTONOMOUS AUTO-PILOT RECOVERY AGENT (1-TIME INITIAL PERMISSION) */}
      <div className="p-4 rounded-3xl border border-white/10 bg-[#0a0e17] space-y-3 shadow-[0_10px_28px_rgba(0,0,0,0.75),0_0_18px_rgba(6,182,212,0.1)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-wider text-white uppercase">
                  Auto-Pilot Recovery Agent
                </span>
                {autoPilotRecoveryEnabled && (
                  <span className="text-[10px] font-mono font-bold text-emerald-300">
                    ⚡ Auto-Pilot Active · Next Sweep at 10:00 PM
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Autonomous J.A.R.V.I.S. agent monitors overdue balances and queues background WhatsApp recovery alerts automatically.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoPilotRecoveryEnabled}
            onClick={handleToggleAutoPilotRecovery}
            className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              autoPilotRecoveryEnabled
                ? "bg-gradient-to-r from-cyan-400 to-emerald-400"
                : "bg-slate-800 border border-white/10"
            }`}
          >
            <span
              className={`block w-5.5 h-5.5 rounded-full bg-slate-950 transition-transform shadow-md ${
                autoPilotRecoveryEnabled ? "translate-x-5.5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Live Status Banner + Savage Roast Mode Toggle */}
        <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            {autoPilotRecoveryEnabled ? (
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>⚡ Auto-Pilot Active · Next Sweep at 10:00 PM</span>
              </span>
            ) : (
              <span className="text-slate-400">
                Toggle ON to authorize 1-time autonomous debt recovery
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              role="switch"
              aria-checked={roastMode}
              onClick={() => {
                playQuickAddChirp();
                const next = !roastMode;
                setRoastMode(next);
                onShowToast?.(
                  next
                    ? "🔥 Roast Mode Activated for Auto-Pilot Dispatches"
                    : "Polite WhatsApp tone set for Auto-Pilot"
                );
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
                roastMode
                  ? "bg-amber-500/20 text-amber-300 border-amber-400/50"
                  : "bg-slate-900 text-slate-400 border-white/10 hover:text-white"
              }`}
            >
              <Flame className="w-3 h-3 fill-current" />
              <span>{roastMode ? "Roast Tone: ON" : "Roast Tone: OFF"}</span>
            </button>

            {roastMode && (
              <button
                type="button"
                onClick={() => {
                  playQuickAddChirp();
                  setRoastIndex((prev) => prev + 1);
                }}
                className="px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[10px] font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
                title="Cycle Hinglish Roast Template"
              >
                <RefreshCw className="w-3 h-3 text-amber-400" />
                <span>Shuffle</span>
              </button>
            )}
          </div>
        </div>

        {roastMode && (
          <p className="text-[11px] text-amber-200/90 font-mono italic bg-black/40 border border-amber-500/20 rounded-xl px-3 py-2">
            &ldquo;{getHinglishRoastLine("Bhai", totalToReceive > 0 ? totalToReceive : 210)}&rdquo;
          </p>
        )}
      </div>

      {/* Expandable Add Udhaar Sheet */}
      {activePanel === "new" && (
        <form
          onSubmit={handleCreateEntry}
          className="p-4 rounded-3xl border border-slate-700/80 bg-slate-900 space-y-3 shadow-xl"
        >
          <span className="text-xs font-bold text-slate-200">Record Friend Udhaar</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="friend-select" className="text-[10px] font-semibold text-slate-400 block mb-1">
                Friend
              </label>
              <select
                id="friend-select"
                value={selectedFriendId}
                onChange={(e) => setSelectedFriendId(e.target.value)}
                className="w-full h-9 px-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              >
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
                <option value="new">+ Add New Friend</option>
              </select>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block mb-1">Type</span>
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setEntryDirection("gave")}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    entryDirection === "gave" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400"
                  }`}
                >
                  Lena Hai
                </button>
                <button
                  type="button"
                  onClick={() => setEntryDirection("took")}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    entryDirection === "took" ? "bg-rose-500/20 text-rose-300" : "text-slate-400"
                  }`}
                >
                  Dena Hai
                </button>
              </div>
            </div>
          </div>

          {selectedFriendId === "new" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Name (e.g. Aman)"
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp No."
                  value={newFriendPhone}
                  onChange={(e) => setNewFriendPhone(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
                />
              </div>
              <input
                type="text"
                placeholder="UPI ID (optional, e.g. aman@oksbi)"
                value={newFriendUpi}
                onChange={(e) => setNewFriendUpi(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <input
                type="text"
                placeholder="Description (e.g. Swiggy order)"
                value={entryDesc}
                onChange={(e) => setEntryDesc(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>
            <div>
              <input
                type="number"
                min="1"
                placeholder="₹ Amount"
                value={entryAmount}
                onChange={(e) => {
                  playMechanicalKeyTick();
                  setEntryAmount(e.target.value);
                }}
                className="w-full h-9 px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono tabular-nums text-slate-100"
              />
            </div>
          </div>

          {formError && <p className="text-[11px] text-rose-400">{formError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActivePanel("none")}
              className="px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all ${theme.buttonBg} ${theme.buttonText}`}
            >
              Save Entry
            </button>
          </div>
        </form>
      )}

      {/* Expandable Group Split Sheet + Cyberpunk Digital Receipt Card */}
      {activePanel === "split" && (() => {
        const parsedSplitTotal = Math.max(0, Number(splitTotal) || 0);
        const selectedFriendsList = friends.filter((f) => selectedSplitIds.includes(f.id));
        const attendeeNames = [
          ...(includeSelf ? ["You (Host)"] : []),
          ...selectedFriendsList.map((f) => f.name.split(" ")[0]),
        ];
        const totalAttendees = Math.max(1, attendeeNames.length);
        const perPersonSplitAmt = Math.ceil(parsedSplitTotal / totalAttendees);
        const activeReceivingUpi = myUpiId || "mrigander@upi";
        const splitUpiDeepLink = `upi://pay?pa=${encodeURIComponent(
          activeReceivingUpi
        )}&pn=Mrigander&am=${perPersonSplitAmt}&cu=INR&tn=${encodeURIComponent(
          `Split: ${splitDesc || "Group Bill"}`
        )}`;
        const groupWhatsappText = `⚡ *KHARCHE CYBERPUNK GROUP SPLIT BILL* ⚡\n\n🧾 Bill: *${
          splitDesc || "Squad Outing"
        }*\n💰 Total Amount: *₹${parsedSplitTotal.toLocaleString(
          "en-IN"
        )}*\n👥 Attendees (${totalAttendees}): ${attendeeNames.join(
          ", "
        )}\n🔥 Per Person Share: *₹${perPersonSplitAmt.toLocaleString(
          "en-IN"
        )}*\n\n📲 *1-Tap Direct UPI Settlement (${activeReceivingUpi}):*\n${splitUpiDeepLink}\n\n_Scan the attached Stark QR receipt or tap the UPI link above to settle instantly!_`;
        const groupWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(
          groupWhatsappText
        )}`;

        const handleDownloadOrShareReceipt = (openWhatsAppAfter = false) => {
          playStarkPowerSurgeSwoosh();
          const canvas = document.createElement("canvas");
          canvas.width = 900;
          canvas.height = 1280;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const grad = ctx.createLinearGradient(0, 0, 900, 1280);
            grad.addColorStop(0, "#05070c");
            grad.addColorStop(0.5, "#0a0e17");
            grad.addColorStop(1, "#020306");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 900, 1280);

            ctx.strokeStyle = "#06b6d4";
            ctx.lineWidth = 6;
            ctx.strokeRect(36, 36, 828, 1208);

            ctx.fillStyle = "#22d3ee";
            ctx.font = "900 28px monospace";
            ctx.fillText("⚡ STARK INDUSTRIES // GROUP SPLIT RECEIPT", 80, 110);

            ctx.fillStyle = "#ffffff";
            ctx.font = "900 54px sans-serif";
            ctx.fillText((splitDesc || "SQUAD BILL SPLIT").toUpperCase(), 80, 190);

            ctx.fillStyle = "#94a3b8";
            ctx.font = "700 26px monospace";
            ctx.fillText(
              `TOTAL BILL: ₹${parsedSplitTotal.toLocaleString("en-IN")}  |  ATTENDEES: ${totalAttendees}`,
              80,
              250
            );

            ctx.fillStyle = "rgba(16, 185, 129, 0.14)";
            ctx.fillRect(80, 295, 740, 170);
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 3;
            ctx.strokeRect(80, 295, 740, 170);

            ctx.fillStyle = "#6ee7b7";
            ctx.font = "800 24px monospace";
            ctx.fillText("PER PERSON SHARE TO PAY:", 115, 348);

            ctx.fillStyle = "#ffffff";
            ctx.font = "900 72px monospace";
            ctx.fillText(`₹${perPersonSplitAmt.toLocaleString("en-IN")}`, 115, 435);

            ctx.fillStyle = "#cbd5e1";
            ctx.font = "700 24px monospace";
            ctx.fillText(`SQUAD: ${attendeeNames.join(" • ")}`, 80, 530);

            ctx.fillStyle = "#f59e0b";
            ctx.font = "900 30px monospace";
            ctx.fillText(`RECEIVING UPI ID: ${activeReceivingUpi}`, 80, 610);

            ctx.fillStyle = "#64748b";
            ctx.font = "600 22px monospace";
            ctx.fillText(
              "Generated by K H A R C H E · Scan QR or tap UPI deep-link in WhatsApp",
              80,
              1180
            );

            const svgEl = document.getElementById("khata-group-split-qr-svg");
            if (svgEl) {
              const xml = new XMLSerializer().serializeToString(svgEl);
              const svg64 = btoa(unescape(encodeURIComponent(xml)));
              const img = new Image();
              img.onload = () => {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(270, 660, 360, 360);
                ctx.drawImage(img, 290, 680, 320, 320);
                const dataUrl = canvas.toDataURL("image/png");
                const a = document.createElement("a");
                a.href = dataUrl;
                a.download = `Kharche-Split-${(splitDesc || "Bill")
                  .replace(/\s+/g, "-")
                  .toLowerCase()}.png`;
                a.click();
              };
              img.src = `data:image/svg+xml;base64,${svg64}`;
            }
          }
          onShowToast?.(
            openWhatsAppAfter
              ? "📸 QR Receipt Snapshot saved & launching WhatsApp Group Share!"
              : "📸 Cyberpunk Split Receipt PNG downloaded!"
          );
          if (openWhatsAppAfter) {
            window.open(groupWhatsappUrl, "_blank", "noopener,noreferrer");
          }
        };

        return (
          <form
            onSubmit={handleSplitSubmit}
            className="p-4 rounded-3xl border border-cyan-500/30 bg-[#0a0e17] space-y-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.85),0_0_24px_rgba(6,182,212,0.12)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Group Split QR &amp; WhatsApp Bill Generator
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playQuickAddChirp();
                  setShowSplitReceiptCard((prev) => !prev);
                }}
                className="px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-[10px] font-mono font-bold text-cyan-300 cursor-pointer hover:bg-cyan-500/25 transition-colors"
              >
                {showSplitReceiptCard ? "Hide Receipt Card" : "Generate Group Split Bill"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Bill title (e.g. Dinner, Turf)"
                  value={splitDesc}
                  onChange={(e) => setSplitDesc(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-xl bg-[#05070c] border border-white/10 text-xs text-slate-100"
                />
              </div>
              <div>
                <input
                  type="number"
                  min="1"
                  placeholder="Total ₹"
                  value={splitTotal}
                  onChange={(e) => {
                    playMechanicalKeyTick();
                    setSplitTotal(e.target.value);
                  }}
                  className="w-full h-9 px-2.5 rounded-xl bg-[#05070c] border border-white/10 text-xs font-mono tabular-nums text-slate-100"
                />
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 block mb-1.5">
                Select Squad Attendees:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {friends.map((f) => {
                  const active = selectedSplitIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        playMechanicalKeyTick();
                        toggleFriendInSplit(f.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        active
                          ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200"
                          : "bg-[#05070c] border-white/10 text-slate-400"
                      }`}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>
              <label className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSelf}
                  onChange={(e) => setIncludeSelf(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-cyan-400"
                />
                <span>Include my share in calculation</span>
              </label>
            </div>

            {/* CYBERPUNK DIGITAL RECEIPT CARD WITH EMBEDDED RECEIVING UPI QR */}
            {showSplitReceiptCard && (
              <div className="p-4 rounded-2xl bg-[#05070c] border border-cyan-500/40 space-y-3 relative overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.15)]">
                <div className="flex items-center justify-between border-b border-dashed border-cyan-500/30 pb-2.5">
                  <div>
                    <span className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-cyan-400 block">
                      ⚡ STARK DIGITAL SPLIT RECEIPT
                    </span>
                    <h4 className="text-sm font-black text-white mt-0.5">
                      {splitDesc || "Group Bill Split"}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-[10px] font-mono font-bold text-cyan-200">
                    {totalAttendees} Attendees
                  </span>
                </div>

                {/* Total vs Per Person Share KPI */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#0a0e17] border border-white/10">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block">
                      Total Bill Amount
                    </span>
                    <span className="font-mono tabular-nums text-base font-black text-slate-100">
                      ₹{parsedSplitTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/25 border border-emerald-400/40">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-300 block">
                      Per Person Share
                    </span>
                    <span className="font-mono tabular-nums text-base font-black text-emerald-400">
                      ₹{perPersonSplitAmt.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Attendee Badges + Embedded QR Code */}
                <div className="flex items-center justify-between gap-3 bg-[#0a0e17] p-3 rounded-2xl border border-white/10">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                      Squad Breakdown
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {attendeeNames.map((name, idx) => (
                        <span
                          key={`${name}-${idx}`}
                          className="px-2 py-0.5 rounded-md bg-[#05070c] border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-200"
                        >
                          {name}: ₹{perPersonSplitAmt}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] font-mono text-amber-300 pt-1 truncate">
                      Receiving UPI: <span className="font-bold">{activeReceivingUpi}</span>
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-white shrink-0 shadow-[0_0_16px_rgba(34,211,238,0.35)]">
                    <QRCodeSVG
                      id="khata-group-split-qr-svg"
                      value={splitUpiDeepLink}
                      size={78}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </div>

                {/* 1-Tap Share Bill to WhatsApp Group + Snapshot Download */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadOrShareReceipt(true)}
                    className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95 transition-all"
                  >
                    <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Share Bill to WhatsApp Group</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadOrShareReceipt(false)}
                    className="h-10 px-3 rounded-xl bg-[#0a0e17] hover:bg-slate-800 border border-cyan-400/40 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Download Cyberpunk Split Receipt PNG"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>QR PNG</span>
                  </button>
                </div>
              </div>
            )}

            {formError && <p className="text-[11px] text-rose-400">{formError}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActivePanel("none")}
                className="px-3 py-1.5 rounded-xl border border-white/10 text-xs text-slate-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={() => playStarkPowerSurgeSwoosh()}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all ${theme.buttonBg} ${theme.buttonText}`}
              >
                Log Split to Khata Ledger
              </button>
            </div>
          </form>
        );
      })()}

      {/* Friend Cards List with Direct UPI Pay Buttons */}
      <div className="space-y-3">
        {friendBalances.map(({ friend, net, unsettledCount }) => {
          const isReceivable = net > 0;
          const isPayable = net < 0;
          const upiId = getFriendUpiId(friend);
          const isEditingUpi = editingUpiFriendId === friend.id;

          const waUrl =
            net > 0
              ? buildWhatsAppUrl(friend.phone, buildWhatsAppMessage(friend, net))
              : null;

          return (
            <div
              key={friend.id}
              className="p-4 rounded-3xl border border-white/10 bg-[#0a0e17] backdrop-blur-md space-y-3 shadow-[0_8px_24px_rgba(0,0,0,0.6),0_0_16px_rgba(6,182,212,0.06)] hover:border-cyan-400/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl bg-[#05070c] border border-white/10 flex items-center justify-center font-bold text-xs text-slate-100 shadow-xs shrink-0"
                  >
                    {friend.avatarInitials}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{friend.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#05070c] text-slate-400 border border-white/10">
                        {unsettledCount} due
                      </span>
                    </h3>

                    {/* Inline Editable UPI ID Badge */}
                    {!isEditingUpi ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-cyan-400/90 font-mono">
                          UPI: {upiId}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUpiFriendId(friend.id);
                            setUpiDraft(friend.upiId || upiId);
                          }}
                          aria-label="Edit UPI ID"
                          className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer p-0.5"
                          title="Change UPI ID"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="text"
                          value={upiDraft}
                          onChange={(e) => setUpiDraft(e.target.value)}
                          placeholder="e.g. name@oksbi"
                          className="h-6 px-1.5 text-[10px] font-mono rounded-lg bg-slate-950 border border-cyan-400/50 text-cyan-200 focus:outline-none w-36"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveUpi(friend.id)}
                          className="w-6 h-6 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center cursor-pointer"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {net !== 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setEpicDebtCardState({
                          friend,
                          amount: Math.abs(net),
                        })
                      }
                      className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/25 via-rose-500/20 to-slate-900 border border-amber-400/60 hover:border-amber-300 text-[10px] font-black text-amber-200 flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-[0_0_14px_rgba(245,158,11,0.25)]"
                      title="Generate Retro-Futuristic WANTED Bounty Poster with embedded UPI QR"
                    >
                      <Crosshair className="w-3 h-3 text-amber-400" />
                      <span>Bounty Poster</span>
                    </button>
                  )}

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">
                      {isReceivable ? "Owes You" : isPayable ? "You Owe" : "Settled"}
                    </span>
                    <span
                      className={`font-mono tabular-nums text-base font-bold ${
                        isReceivable
                          ? "text-emerald-400"
                          : isPayable
                          ? "text-rose-400"
                          : "text-slate-400"
                      }`}
                    >
                      {net === 0
                        ? "₹0"
                        : `${isReceivable ? "+" : "−"}₹${Math.abs(net).toLocaleString(
                            "en-IN"
                          )}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Unsettled Entries */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                {friend.entries.slice(0, 3).map((entry) => {
                  const entryIsDebt = entry.amount < 0 && !entry.settled;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between text-[11px] ${
                        entry.settled ? "opacity-40 line-through" : ""
                      }`}
                    >
                      <span className="text-slate-300 truncate pr-2">{entry.description}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono tabular-nums font-bold ${
                            entry.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {entry.amount >= 0 ? "+" : "−"}₹{Math.abs(entry.amount)}
                        </span>
                        {entryIsDebt && (
                          <button
                            type="button"
                            onClick={() => handlePayViaUpi(friend, entry.amount)}
                            className="px-1.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-[9px] font-bold text-rose-300 hover:bg-rose-500/30 transition-all flex items-center gap-0.5 cursor-pointer shadow-2xs"
                            title={`Pay ₹${Math.abs(entry.amount)} directly via UPI`}
                          >
                            <Zap className="w-2.5 h-2.5 text-rose-400" />
                            <span>UPI Pay</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Row: Autonomous Recovery Queue Status + QR + Settle */}
              <div className="flex items-center justify-between gap-2 pt-1">
                {/* 1. DIRECT UPI PAY BUTTON when user owes friend */}
                {isPayable && (
                  <button
                    type="button"
                    onClick={() => handlePayViaUpi(friend, net)}
                    style={{
                      boxShadow: "0 0 16px rgba(244, 63, 94, 0.4)",
                    }}
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:brightness-110 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Pay ₹{Math.abs(net)} via UPI</span>
                  </button>
                )}

                {/* Autonomous Queue Status for Overdue Receivables (No manual card-by-card clicks required) */}
                {isReceivable && (
                  <div className="flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/90 border border-cyan-500/25">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-mono font-bold text-cyan-300 truncate">
                        {autoPilotRecoveryEnabled
                          ? `⚡ Auto-Queued (₹${net}) · 10:00 PM Sweep`
                          : `Pending ₹${net} · Enable Auto-Pilot above`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setQrModalState({
                          isOpen: true,
                          amount: net,
                          friendName: friend.name,
                        })
                      }
                      className="px-2 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-400/40 text-cyan-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                      title={`Show QR for ${friend.name}`}
                    >
                      <QrCode className="w-3 h-3" />
                      <span>QR</span>
                    </button>
                  </div>
                )}

                {/* Settle Ledger Button with Desi Soundbox Voice */}
                {net !== 0 && (
                  <button
                    type="button"
                    onClick={() => onSettleFriend(friend.id)}
                    title={`Settle & Play Desi Soundbox: "KHARChe par ${Math.abs(net)} rupaye prapt hue!"`}
                    className="px-3 py-1.5 min-h-[38px] rounded-xl border border-cyan-500/35 bg-[#0b0f17] text-xs font-bold text-cyan-200 flex items-center gap-1 hover:border-cyan-400 hover:text-white cursor-pointer transition-all shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Settle 🔊</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 1-TIME INITIAL PERMISSION CONSENT MODAL FOR JARVIS AUTO-RECOVERY */}
      {showAutoPilotConsentModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Authorize JARVIS Auto-Recovery"
          onClick={() => setShowAutoPilotConsentModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[390px] rounded-3xl bg-[#0b0f17] border-2 border-cyan-400/70 shadow-[0_0_45px_rgba(6,182,212,0.35)] p-5 space-y-4 text-slate-100"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-cyan-300 block">
                    ONE-TIME PROTOCOL CONSENT
                  </span>
                  <h3 className="text-sm font-black text-white mt-0.5">
                    Authorize JARVIS Auto-Recovery
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoPilotConsentModal(false)}
                className="w-7 h-7 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#060911] border border-cyan-500/25 rounded-2xl p-3.5">
              Authorize JARVIS Auto-Recovery: Allow J.A.R.V.I.S. to monitor overdue balances and auto-draft WhatsApp debt alerts when payments exceed due dates.
            </p>

            <div className="space-y-1.5 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Autonomous background queue · Next Sweep at 10:00 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Zero manual card-by-card clicking required</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowAutoPilotConsentModal(false)}
                className="h-10 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={handleAuthorizeAutoPilotConsent}
                className="h-10 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.45)] cursor-pointer active:scale-95 transition-transform"
              >
                Authorize Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic UPI Payment QR Modal */}
      {qrModalState?.isOpen && (
        <KhataQrModal
          isOpen={qrModalState.isOpen}
          onClose={() => setQrModalState(null)}
          myUpiId={myUpiId}
          friendName={qrModalState.friendName}
          amount={qrModalState.amount}
          theme={theme}
          onShowToast={onShowToast}
        />
      )}

      {/* Stark Industries Dynamic Epic Debt Notice Card Generator Modal */}
      {epicDebtCardState && (
        <EpicDebtCardModal
          isOpen={true}
          onClose={() => setEpicDebtCardState(null)}
          friend={epicDebtCardState.friend}
          amountDue={epicDebtCardState.amount}
          myUpiId={myUpiId}
          theme={theme}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
