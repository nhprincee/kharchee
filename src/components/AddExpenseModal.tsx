import React, { useState, useRef, useEffect } from "react";
import {
  X,
  ShieldAlert,
  ClipboardPaste,
  Sparkles,
  Check,
  Smartphone,
  Edit3,
  Camera,
  Upload,
  Loader2,
  ScanLine,
  Lock,
  ShieldCheck,
  Moon,
  Wifi,
  CreditCard,
} from "lucide-react";
import type { Expense, ExpenseCategory, FanTheme, PaymentMode, TransactionType } from "../types";
import { parseBankSms, SAMPLE_BANK_SMS, type ParsedTransaction } from "../utils/smsParser";
import {
  playQuickAddChirp,
  playLockdownThud,
  celebrateDisciplineShield,
  playMidnightCravingsChime,
  playProVaultChime,
  playMechanicalKeyTick,
} from "../utils/celebration";

interface AddExpenseModalProps {
  isOpen: boolean;
  lockdownActive: boolean;
  theme: FanTheme;
  initialTab?: "ocr" | "nfc" | "sms" | "manual";
  initialType?: TransactionType;
  editingExpense?: Expense | null;
  onClose: () => void;
  onAddExpense: (data: {
    title: string;
    amount: number;
    category: ExpenseCategory;
    paymentMode: PaymentMode;
    type?: TransactionType;
    note?: string;
  }) => void;
  onUpdateExpense?: (expense: Expense) => void;
}

const CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Chai & Snacks",
  "Transport",
  "Grocery",
  "Entertainment",
  "Bills",
  "Shopping",
];

const INCOME_CATEGORIES: ExpenseCategory[] = [
  "Salary",
  "Freelance",
  "Cashback",
];

const PAYMENT_MODES: PaymentMode[] = ["UPI", "Cash", "Card"];

interface OcrExtractedResult {
  vendor: string;
  amount: number;
  category: ExpenseCategory;
  paymentMode: PaymentMode;
  itemsSummary: string;
}

interface NfcTapPreset {
  id: string;
  badge: string;
  cardOrTagName: string;
  vendor: string;
  amount: number;
  category: ExpenseCategory;
  paymentMode: PaymentMode;
  tagSerial: string;
}

const NFC_TAP_PRESETS: NfcTapPreset[] = [
  {
    id: "nfc-starbucks",
    badge: "🏷️ Demo Preset",
    cardOrTagName: "Starbucks POS Simulator (Demo)",
    vendor: "Starbucks Reserve Roastery",
    amount: 360,
    category: "Chai & Snacks",
    paymentMode: "Card",
    tagSerial: "04:A3:8F:22:C1:90",
  },
  {
    id: "nfc-shell",
    badge: "🏷️ Demo Preset",
    cardOrTagName: "Fuel Station Simulator (Demo)",
    vendor: "Shell V-Power Fuel Station",
    amount: 550,
    category: "Transport",
    paymentMode: "Card",
    tagSerial: "04:B7:19:4E:88:12",
  },
  {
    id: "nfc-tapri",
    badge: "🏷️ Demo Preset",
    cardOrTagName: "Desk / Tapri NFC Sticker (Demo)",
    vendor: "Sharma Ji Cutting Chai & Bun Maska",
    amount: 45,
    category: "Chai & Snacks",
    paymentMode: "UPI",
    tagSerial: "NTAG215:7C:11:09",
  },
  {
    id: "nfc-dining",
    badge: "🏷️ Demo Preset",
    cardOrTagName: "Dining Terminal Simulator (Demo)",
    vendor: "Truffles Koramangala",
    amount: 480,
    category: "Food",
    paymentMode: "Card",
    tagSerial: "04:F1:55:D0:3A:77",
  },
];



export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  lockdownActive,
  theme,
  initialTab = "ocr",
  initialType = "expense",
  editingExpense = null,
  onClose,
  onAddExpense,
  onUpdateExpense,
}) => {
  const [activeTab, setActiveTab] = useState<"ocr" | "nfc" | "sms" | "manual">(initialTab);
  const [transactionType, setTransactionType] = useState<TransactionType>(initialType);

  // Manual Form State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("UPI");
  const [note, setNote] = useState("");
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (editingExpense) {
      setActiveTab("manual");
      const editType: TransactionType = editingExpense.type === "income" ? "income" : "expense";
      setTransactionType(editType);
      setTitle(editingExpense.title);
      setAmount(String(editingExpense.amount));
      setCategory(editingExpense.category);
      setPaymentMode(editingExpense.paymentMode);
      setNote(editingExpense.note || "");
      setError("");
    } else {
      setActiveTab(initialType === "income" ? "manual" : initialTab);
      setTransactionType(initialType);
      setCategory(initialType === "income" ? "Salary" : "Food");
      setTitle("");
      setAmount("");
      setNote("");
      setError("");
    }
  }, [isOpen, editingExpense, initialTab, initialType]);

  // NFC Reader State
  const [isScanningNfc, setIsScanningNfc] = useState(false);
  const [nfcStatusMessage, setNfcStatusMessage] = useState<string>("");
  const [lastNfcTap, setLastNfcTap] = useState<NfcTapPreset | null>(null);

  // SMS Parser State
  const [smsInput, setSmsInput] = useState("");
  const [parsedData, setParsedData] = useState<ParsedTransaction | null>(null);
  const [clipboardError, setClipboardError] = useState("");

  // Camera / Receipt OCR State
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrExtractedResult | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // "IMPULSE BUY KILLER" (5-Minute / 300-Second Cool-Off Vault) State
  const [coolOffExpense, setCoolOffExpense] = useState<{
    title: string;
    amount: number;
    category: ExpenseCategory;
    paymentMode: PaymentMode;
    type?: TransactionType;
    note?: string;
  } | null>(null);
  const [coolOffSeconds, setCoolOffSeconds] = useState<number>(300);

  // "LATE NIGHT CRAVINGS SHIELD" (10:00 PM to 4:00 AM Midnight Impulse Alert)
  const isRealLateNightHours = () => {
    const h = new Date().getHours();
    return h >= 22 || h < 4;
  };
  const [simulateLateNight, setSimulateLateNight] = useState<boolean>(isRealLateNightHours);
  const [midnightCravingExpense, setMidnightCravingExpense] = useState<{
    title: string;
    amount: number;
    category: ExpenseCategory;
    paymentMode: PaymentMode;
    type?: TransactionType;
    note?: string;
  } | null>(null);

  useEffect(() => {
    if (!coolOffExpense) return;
    setCoolOffSeconds(300);
    const timer = setInterval(() => {
      setCoolOffSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [coolOffExpense]);

  if (!isOpen) return null;

  const isMidnightWindowActive = isRealLateNightHours() || simulateLateNight;
  const activeCategoryForShield =
    activeTab === "ocr" && ocrResult
      ? ocrResult.category
      : activeTab === "sms" && parsedData
      ? parsedData.category
      : category;
  const isCravingCategorySelected =
    transactionType === "expense" &&
    (activeCategoryForShield === "Food" || activeCategoryForShield === "Chai & Snacks");

  const commitOrInterceptExpense = (
    payload: {
      title: string;
      amount: number;
      category: ExpenseCategory;
      paymentMode: PaymentMode;
      type?: TransactionType;
      note?: string;
    },
    forceProceed = false
  ) => {
    if (editingExpense && onUpdateExpense) {
      onUpdateExpense({
        ...editingExpense,
        title: payload.title,
        amount: payload.amount,
        category: payload.category,
        paymentMode: payload.paymentMode,
        type: payload.type || "expense",
        note: payload.note,
      });
      onClose();
      return;
    }

    const isIncomeEntry = payload.type === "income";

    const isLateNightCravingCandidate =
      !isIncomeEntry &&
      (isRealLateNightHours() || simulateLateNight) &&
      (payload.category === "Food" || payload.category === "Chai & Snacks");

    if (isLateNightCravingCandidate && !forceProceed) {
      playMidnightCravingsChime();
      setMidnightCravingExpense(payload);
      return;
    }

    const isImpulseCandidate =
      !isIncomeEntry &&
      payload.amount > 500 &&
      (payload.category === "Shopping" || payload.category === "Entertainment");

    if (isImpulseCandidate && !forceProceed) {
      playLockdownThud();
      setCoolOffExpense(payload);
      try {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(
            "Sir, is this a biological necessity or a fleeting impulse? Wait out the timer to confirm."
          );
          u.rate = 1.05;
          window.speechSynthesis.speak(u);
        }
      } catch {
        // ignore speech errors
      }
      return;
    }

    onAddExpense(payload);
    setMidnightCravingExpense(null);
    setCoolOffExpense(null);
    setOcrResult(null);
    setReceiptPreviewUrl(null);
    setSmsInput("");
    setParsedData(null);
    setTitle("");
    setAmount("");
    setNote("");
    setOverrideConfirmed(false);
    setError("");
    onClose();
  };

  const populateFieldsFromOcr = (res: OcrExtractedResult) => {
    setOcrResult(res);
    setTitle(res.vendor);
    setAmount(String(res.amount));
    setCategory(res.category);
    setPaymentMode(res.paymentMode);
    setNote(res.itemsSummary ? `Scanned Bill: ${res.itemsSummary}` : `Scanned Receipt: ${res.vendor}`);
    playQuickAddChirp();
  };

  const applyNfcTapToForm = (tapData: NfcTapPreset) => {
    playProVaultChime();
    setLastNfcTap(tapData);
    setTitle(tapData.vendor);
    // Explicitly do NOT pre-fill fabricated amount - require manual verification
    setAmount("");
    setCategory(tapData.category);
    setPaymentMode(tapData.paymentMode);
    setNote(`[DEMO NFC] ${tapData.cardOrTagName} · UID ${tapData.tagSerial}`);
    setError("");
    setNfcStatusMessage(
      `🏷️ Demo NFC Tag "${tapData.vendor}" selected. Please enter your actual expense amount manually.`
    );
    setActiveTab("manual");
  };

  const handleStartHardwareOrSimulatedNfc = async (presetOverride?: NfcTapPreset) => {
    setError("");
    setIsScanningNfc(true);
    setNfcStatusMessage("📡 Approaching NFC field... Tap an NDEF tag or select a demo preset");
    playQuickAddChirp();

    if (presetOverride) {
      setTimeout(() => {
        setIsScanningNfc(false);
        applyNfcTapToForm(presetOverride);
      }, 550);
      return;
    }

    // Attempt Web NFC API (NDEFReader) if available on Android Chrome
    const NDEFReaderCtor = (
      window as unknown as {
        NDEFReader?: new () => {
          scan: () => Promise<void>;
          onreading: ((event: { serialNumber?: string; message?: { records?: Array<{ recordType: string; data?: DataView }> } }) => void) | null;
          onreadingerror: (() => void) | null;
        };
      }
    ).NDEFReader;

    if (NDEFReaderCtor) {
      try {
        const ndef = new NDEFReaderCtor();
        await ndef.scan();
        setNfcStatusMessage("📡 Web NFC active! Tap any generic NDEF tag near phone (Bank cards not supported)...");
        ndef.onreading = (event) => {
          let decodedText = "";
          try {
            const firstRec = event.message?.records?.[0];
            if (firstRec?.data) {
              const decoder = new TextDecoder();
              decodedText = decoder.decode(firstRec.data);
            }
          } catch {
            // fallback
          }
          const vendorName = decodedText.trim() || "NDEF Tag Scan";
          setIsScanningNfc(false);
          playProVaultChime();
          setTitle(vendorName);
          setAmount(""); // Never inject fabricated amount
          setCategory("Food");
          setPaymentMode("Card");
          setNote(`[NDEF Tag] UID ${event.serialNumber || "Generic-NFC"} · Text: ${vendorName.slice(0, 50)}`);
          setError("");
          setNfcStatusMessage(`🏷️ NDEF Tag read: "${vendorName}". Please enter the actual amount manually.`);
          setActiveTab("manual");
        };
        ndef.onreadingerror = () => {
          setIsScanningNfc(false);
          setNfcStatusMessage("NFC read error or tag not recognized. Please use manual entry.");
        };
        return;
      } catch {
        setIsScanningNfc(false);
        setNfcStatusMessage("Web NFC permission denied or unavailable. Tap a demo preset below or enter manually.");
        return;
      }
    }

    // When Web NFC is unavailable (desktop / non-supported browser), notify clearly without auto-submitting
    setTimeout(() => {
      setIsScanningNfc(false);
      setNfcStatusMessage("Web NFC requires Android Chrome. Test with a demo preset below or use Manual entry.");
    }, 500);
  };

  const runGeminiVisionOcr = async (
    base64DataUrl: string,
    mimeType: string,
    fileName?: string
  ) => {
    setError("");
    setIsScanningOcr(true);
    setReceiptPreviewUrl(base64DataUrl);
    setOcrResult(null);

    try {
      const response = await fetch("/api/ocr/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64DataUrl,
          mimeType,
          fileName,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Receipt scan unreadable or API key missing. Please enter manually.");
      }

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(
          data.error || "Receipt scan unreadable or API key missing. Please enter manually."
        );
      }

      const cleanVendor = typeof data.vendor === "string" ? data.vendor.trim() : "";
      const parsedAmount = Number(data.amount);

      if (!cleanVendor || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Receipt scan unreadable or API key missing. Please enter manually.");
      }

      const extracted: OcrExtractedResult = {
        vendor: cleanVendor,
        amount: Math.round(parsedAmount),
        category: (CATEGORIES.includes(data.category)
          ? data.category
          : "Food") as ExpenseCategory,
        paymentMode: (PAYMENT_MODES.includes(data.paymentMode)
          ? data.paymentMode
          : "UPI") as PaymentMode,
        itemsSummary: data.itemsSummary || "Extracted via Gemini Vision OCR",
      };
      populateFieldsFromOcr(extracted);
    } catch {
      setOcrResult(null);
      setError("Receipt scan unreadable or API key missing. Please enter manually.");
      playLockdownThud();
    } finally {
      setIsScanningOcr(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = typeof reader.result === "string" ? reader.result : "";
      if (resultStr) {
        void runGeminiVisionOcr(resultStr, file.type || "image/jpeg", file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleConfirmOcrExpense = () => {
    if (!ocrResult) return;
    if (lockdownActive && !overrideConfirmed) {
      setError("Please confirm Emergency Lockdown override.");
      return;
    }

    commitOrInterceptExpense({
      title: ocrResult.vendor,
      amount: ocrResult.amount,
      category: ocrResult.category,
      paymentMode: ocrResult.paymentMode,
      note: `Receipt OCR: ${ocrResult.itemsSummary}`,
    });
  };

  const handleSmsChange = (text: string) => {
    setSmsInput(text);
    setClipboardError("");
    setError("");
    if (text.trim().length > 5) {
      const result = parseBankSms(text);
      setParsedData(result);
    } else {
      setParsedData(null);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setClipboardError("Clipboard access not supported in this browser. Please paste manually.");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length === 0) {
        setClipboardError("Clipboard is empty! Copy a bank or UPI transaction SMS first.");
        return;
      }
      handleSmsChange(text);
    } catch {
      setClipboardError("Clipboard permission denied. Please paste the SMS directly into the box.");
    }
  };

  const handleSelectSample = (sms: string) => {
    handleSmsChange(sms);
  };

  const handleLogParsedExpense = () => {
    if (!parsedData || !parsedData.amount) {
      setError("Could not extract a valid amount from SMS. Please enter manually.");
      return;
    }
    if (lockdownActive && !overrideConfirmed) {
      setError("Please confirm Emergency Lockdown override.");
      return;
    }

    commitOrInterceptExpense({
      title: parsedData.merchant || "Bank Transaction",
      amount: parsedData.amount,
      category: parsedData.category,
      paymentMode: parsedData.paymentMode,
      note: `Parsed from SMS: ${parsedData.merchant}`,
    });
  };

  const handleTransferToManual = () => {
    if (parsedData) {
      if (parsedData.amount) setAmount(String(parsedData.amount));
      if (parsedData.merchant) setTitle(parsedData.merchant);
      setCategory(parsedData.category);
      setPaymentMode(parsedData.paymentMode);
    }
    setActiveTab("manual");
  };

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!title.trim()) {
      setError(transactionType === "income" ? "Enter income source title." : "Enter expense title.");
      return;
    }
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid rupee amount.");
      return;
    }
    if (lockdownActive && transactionType === "expense" && !overrideConfirmed) {
      setError("Please confirm Emergency Lockdown override.");
      return;
    }

    commitOrInterceptExpense({
      title: title.trim(),
      amount: Math.round(numericAmount),
      category,
      paymentMode,
      type: transactionType,
      note: note.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-expense-title"
    >
      <div
        className="w-full max-w-[460px] rounded-t-[32px] sm:rounded-3xl border border-slate-800 bg-[#0b101d] p-5 pb-6 shadow-2xl animate-in slide-in-from-bottom duration-300 relative overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Hidden Camera & Upload Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
        />

        {/* Mobile Sheet Drag Handle */}
        <div className="w-10 h-1.5 bg-slate-800 rounded-full mx-auto mb-3 shrink-0 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-3 relative z-10 shrink-0">
          <div>
            <h2 id="add-expense-title" className="text-base font-extrabold text-slate-100 tracking-tight flex items-center gap-1.5">
              <span>
                {editingExpense
                  ? "Edit Transaction"
                  : transactionType === "income" && activeTab === "manual"
                  ? "Log Income"
                  : "Log Transaction"}
              </span>
              {activeTab === "ocr" && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  GEMINI VISION OCR
                </span>
              )}
              {activeTab === "nfc" && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  CONTACTLESS NFC
                </span>
              )}
              {activeTab === "sms" && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  AI SMS PARSER
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-400">
              {editingExpense
                ? "Update amount, category, type, or payment method"
                : "Scan bill · Tap NFC Card/Tag · Paste SMS · Manual"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-100 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Scan Bill vs NFC Tap vs Bank SMS vs Manual Entry */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-900 border border-white/10 mb-3 relative z-10 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("ocr")}
            className={`py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === "ocr"
                ? "bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 text-emerald-200 border border-emerald-400/40 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scan Bill</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playQuickAddChirp();
              setActiveTab("nfc");
            }}
            className={`py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === "nfc"
                ? "bg-gradient-to-r from-amber-500/25 to-cyan-500/25 text-amber-200 border border-amber-400/50 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Wifi className="w-3.5 h-3.5 text-amber-400 rotate-90" />
            <span>NFC (Demo)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sms")}
            className={`py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === "sms"
                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200 border border-cyan-400/40 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Bank SMS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === "manual"
                ? "bg-slate-800 text-white shadow-xs border border-white/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-300" />
            <span>Manual</span>
          </button>
        </div>

        {/* LATE NIGHT CRAVINGS SHIELD BAR (10:00 PM - 4:00 AM + Instant Test Toggle) */}
        <div className="mb-3 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/60 via-[#090d18] to-purple-950/50 p-2.5 relative z-10 shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.18)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center shrink-0">
                <Moon className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-indigo-200">
                    Late Night Cravings Shield
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-[8px] font-mono font-bold text-indigo-200">
                    10 PM – 4 AM
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {isMidnightWindowActive && isCravingCategorySelected
                    ? "⚠️ Midnight Impulse Alert armed for Food / Chai & Snacks!"
                    : "Guards against 10 PM–4 AM Food & Chai budget leaks"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !simulateLateNight;
                setSimulateLateNight(next);
                if (next) {
                  playMidnightCravingsChime();
                } else {
                  playQuickAddChirp();
                }
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border transition-all cursor-pointer shrink-0 ${
                isMidnightWindowActive
                  ? "bg-indigo-500/30 border-indigo-400 text-indigo-100 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                  : "bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle 10 PM - 4 AM Midnight Impulse Alert simulation"
            >
              {isRealLateNightHours()
                ? "🌙 Live 10PM-4AM"
                : simulateLateNight
                ? "🌙 Shield Armed"
                : "Test 11 PM Shield"}
            </button>
          </div>

          {isMidnightWindowActive && isCravingCategorySelected && (
            <div className="mt-2 pt-2 border-t border-indigo-500/25 flex items-start gap-2 text-[11px] text-indigo-100">
              <span className="text-sm leading-none">🍕</span>
              <p className="leading-snug font-medium">
                <strong className="text-amber-300 font-extrabold">Midnight Impulse Alert:</strong>{" "}
                Bhai raat ke {isRealLateNightHours() ? "is waqt" : "11:45 PM"} &lsquo;{activeCategoryForShield}&rsquo; order kar raha hai? Late-night cravings + surge fees kill 34% of monthly savings!
              </p>
            </div>
          )}
        </div>

        {/* Emergency Lockdown Warning */}
        {lockdownActive && (
          <div className="mb-3 rounded-2xl border border-amber-500/50 bg-amber-950/40 p-3 text-xs text-amber-200 shadow-sm relative z-10 shrink-0">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Wallet is in Emergency Lockdown</p>
                <label className="mt-1.5 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={overrideConfirmed}
                    onChange={(e) => {
                      setOverrideConfirmed(e.target.checked);
                      setError("");
                    }}
                    className="w-3.5 h-3.5 rounded accent-amber-400"
                  />
                  <span className="font-medium text-amber-100 text-[11px]">
                    Confirm emergency override
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 0: Receipt / Bill OCR Scanner via Camera or Image Upload */}
        {activeTab === "ocr" && (
          <div className="space-y-3 relative z-10 overflow-y-auto pr-0.5 no-scrollbar flex-1">
            {/* Dual Camera & Upload Triggers */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isScanningOcr}
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  borderColor: `${theme.accentHex}50`,
                  boxShadow: `0 0 20px ${theme.ringGlow}`,
                }}
                className="p-3.5 rounded-2xl border bg-slate-900/90 hover:bg-slate-800/90 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer active:scale-95 transition-all"
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-950 shadow-md"
                  style={{ background: theme.accentHex }}
                >
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-extrabold text-white">
                  Scan Receipt / Bill
                </span>
                <span className="text-[10px] text-slate-400">
                  Use Device Camera
                </span>
              </button>

              <button
                type="button"
                disabled={isScanningOcr}
                onClick={() => uploadInputRef.current?.click()}
                className="p-3.5 rounded-2xl border border-white/10 bg-slate-900/80 hover:bg-slate-800/80 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer active:scale-95 transition-all"
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-cyan-300">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-extrabold text-slate-200">
                  Upload Bill Photo
                </span>
                <span className="text-[10px] text-slate-400">
                  Gallery or Screenshot
                </span>
              </button>
            </div>

            {/* Scanning Progress & Skeleton Placeholder */}
            {isScanningOcr && (
              <div className="p-4 rounded-2xl border border-indigo-500/40 bg-slate-900/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-300 font-mono text-xs font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Gemini Vision OCR scanning receipt...</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Analyzing</span>
                </div>
                <div className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-slate-800" />
                    <div className="h-3 w-1/2 rounded bg-slate-800/80" />
                  </div>
                  <div className="h-6 w-16 rounded bg-slate-800 shrink-0" />
                </div>
              </div>
            )}

            {/* OCR Friendly Error Alert (Never injects fake transaction amounts) */}
            {error && !isScanningOcr && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl border border-rose-500/40 bg-rose-950/35 text-rose-200 space-y-2.5 animate-in fade-in duration-200"
              >
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-rose-100">{error}</p>
                    <p className="text-[11px] text-rose-200/80 leading-snug">
                      Zero fake amounts injected. Switch to manual entry or try a clearer receipt photo.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setActiveTab("manual");
                    }}
                    className="flex-1 h-9 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-xs font-bold text-rose-100 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Enter Manually</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="px-3 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer transition-colors"
                  >
                    Retry Photo
                  </button>
                </div>
              </div>
            )}

            {/* OCR Extracted Result Card with 1-Tap Confirmation */}
            {ocrResult && !isScanningOcr && (
              <div
                className="p-3.5 rounded-2xl border bg-gradient-to-b from-slate-900 to-slate-950 space-y-2.5 shadow-lg animate-in fade-in duration-200"
                style={{
                  borderColor: `${theme.accentHex}50`,
                  boxShadow: `0 0 18px ${theme.ringGlow}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <ScanLine className="w-3.5 h-3.5" />
                    Receipt OCR Extracted
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                    {ocrResult.paymentMode}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  {receiptPreviewUrl && (
                    <img
                      src={receiptPreviewUrl}
                      alt="Scanned Receipt"
                      className="w-12 h-12 rounded-xl object-cover border border-white/15 shrink-0 bg-slate-950"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-slate-100 truncate">
                      {ocrResult.vendor}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {ocrResult.itemsSummary}
                    </p>
                    <p className="text-[10px] text-cyan-300 font-semibold mt-0.5">
                      Auto-Category: {ocrResult.category}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono tabular-nums text-2xl font-black text-emerald-400">
                      ₹{ocrResult.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Category Quick Override Chips */}
                <div className="pt-1.5 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-1">
                    Adjust Category (optional):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setOcrResult({ ...ocrResult, category: cat });
                          setCategory(cat);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          ocrResult.category === cat
                            ? `${theme.buttonBg} ${theme.buttonText}`
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1-Tap Confirm or Edit in Manual Form */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("manual")}
                    className="px-3 h-10 rounded-xl border border-white/10 bg-slate-900 text-[11px] font-bold text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    Edit Fields
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmOcrExpense}
                    style={{
                      boxShadow: `0 0 20px ${theme.ringGlow}`,
                    }}
                    className={`flex-1 h-10 rounded-xl text-xs font-black shadow-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 ${theme.buttonBg} ${theme.buttonText}`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm &amp; Log ₹{ocrResult.amount}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 1.5: NFC NDEF Tag Reader & Demo Simulator */}
        {activeTab === "nfc" && (
          <div className="space-y-3 relative z-10 overflow-y-auto pr-0.5 no-scrollbar flex-1">
            {/* Clear Bank Card / EMV Limitation Disclaimer */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <span className="font-mono uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40">DEMO ONLY</span>
                <span>NFC &amp; Bank Card Notice</span>
              </div>
              <p className="text-[11px] text-amber-100/90 leading-relaxed">
                Browser Web NFC only reads generic NDEF text/URL tags. It <strong>cannot</strong> read bank EMV card transactions, account balances, or contactless POS payments. Presets below are for UI demonstration only. Fabricated amounts are never auto-submitted.
              </p>
            </div>

            {/* Interactive Contactless Radar Zone */}
            <div className="p-4 rounded-2xl border border-amber-400/40 bg-gradient-to-b from-slate-900 via-[#090d16] to-slate-950 flex flex-col items-center text-center space-y-2.5 shadow-[0_0_24px_rgba(245,158,11,0.15)]">
              <div className="relative w-16 h-16 rounded-full bg-amber-500/15 border border-amber-400/60 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.35)]">
                {isScanningNfc && (
                  <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-50" />
                )}
                <Wifi className={`w-7 h-7 text-amber-300 rotate-90 ${isScanningNfc ? "animate-pulse" : ""}`} />
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-200 font-mono">
                  {isScanningNfc
                    ? "Scanning Web NFC Field (NDEF 13.56 MHz)..."
                    : "Scan Generic NDEF Tag (DEMO)"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-[310px]">
                  Reads custom text/URL tags. Bank cards and financial EMV chips are not supported by web browsers.
                </p>
              </div>

              <button
                type="button"
                disabled={isScanningNfc}
                onClick={() => void handleStartHardwareOrSimulatedNfc()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95 transition-all"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isScanningNfc ? "Scanning NDEF Tag..." : "Scan Generic NDEF Tag"}</span>
              </button>

              {nfcStatusMessage && (
                <p className="text-[10px] font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                  {nfcStatusMessage}
                </p>
              )}
            </div>

            {/* Instant 1-Tap Simulated Demo Presets */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Simulated Demo Presets (Selects vendor &amp; payment mode · Amount entered manually):
              </span>
              <div className="grid grid-cols-1 gap-2">
                {NFC_TAP_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={isScanningNfc}
                    onClick={() => void handleStartHardwareOrSimulatedNfc(preset)}
                    className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-white/10 hover:border-amber-400/50 flex items-center justify-between gap-2 text-left transition-all cursor-pointer active:scale-98"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          {preset.badge}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          {preset.cardOrTagName}
                        </span>
                      </div>
                      <p className="text-xs font-extrabold text-white mt-1 truncate">
                        {preset.vendor}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs text-amber-300 block">
                        Sample Ref: ₹{preset.amount}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                        {preset.paymentMode} (Manual Amount)
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Smart SMS / UPI Parser */}
        {activeTab === "sms" && (
          <div className="space-y-3 relative z-10 overflow-y-auto pr-0.5 no-scrollbar flex-1">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="sms-input" className="text-[11px] font-bold text-slate-300">
                  Bank / UPI Transaction SMS
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-400/40 text-[11px] font-bold text-cyan-300 hover:bg-cyan-900/60 active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  <ClipboardPaste className="w-3 h-3 text-cyan-300" />
                  <span>Paste Clipboard</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  id="sms-input"
                  rows={3}
                  value={smsInput}
                  onChange={(e) => handleSmsChange(e.target.value)}
                  placeholder="Paste SMS here (e.g. 'debited by Rs 250.00 to SWIGGY', 'spent INR 120 at PETROL PUMP', or 'VPA xxx paid Rs 40')"
                  className="w-full p-2.5 rounded-2xl bg-slate-900 border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60 transition-colors leading-relaxed resize-none"
                />
              </div>

              {clipboardError && (
                <p className="text-[11px] font-medium text-amber-400 mt-1">{clipboardError}</p>
              )}
            </div>

            {/* Quick Demo Samples */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Try Sample Bank SMS (1-Tap):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_BANK_SMS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => handleSelectSample(sample.sms)}
                    className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-white/10 hover:border-cyan-400/40 text-[10px] font-semibold text-slate-300 hover:text-cyan-200 transition-all cursor-pointer shadow-xs"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parsed Result Preview Card */}
            {parsedData && parsedData.amount ? (
              <div
                className="p-3.5 rounded-2xl border bg-gradient-to-b from-slate-900 to-slate-950 space-y-2.5 shadow-md animate-in fade-in duration-200"
                style={{
                  borderColor: `${theme.accentHex}40`,
                  boxShadow: `0 0 16px ${theme.ringGlow}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Transaction Detected
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                    Mode: {parsedData.paymentMode}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-100">
                      {parsedData.merchant}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Category: <span className="font-semibold text-slate-200">{parsedData.category}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono tabular-nums text-2xl font-black text-emerald-400">
                      ₹{parsedData.amount}
                    </span>
                  </div>
                </div>

                {/* Category Quick Override Chips */}
                <div className="pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-1">
                    Change Category (optional):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setParsedData({
                            ...parsedData,
                            category: cat,
                          })
                        }
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          parsedData.category === cat
                            ? `${theme.buttonBg} ${theme.buttonText}`
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1-Tap Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTransferToManual}
                    className="px-3 h-10 rounded-xl border border-white/10 bg-slate-900 text-[11px] font-bold text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={handleLogParsedExpense}
                    style={{
                      boxShadow: `0 0 20px ${theme.ringGlow}`,
                    }}
                    className={`flex-1 h-10 rounded-xl text-xs font-black shadow-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 ${theme.buttonBg} ${theme.buttonText}`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Log ₹{parsedData.amount} with 1 Tap</span>
                  </button>
                </div>
              </div>
            ) : smsInput.trim().length > 5 ? (
              <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 text-center">
                Could not find debit amount. Try one of the sample SMS templates above or switch to Manual.
              </div>
            ) : null}

            {error && <p className="text-[11px] font-medium text-rose-400">{error}</p>}
          </div>
        )}

        {/* Tab 2: Manual Entry Form */}
        {activeTab === "manual" && (
          <form onSubmit={handleSubmitManual} className="space-y-3 relative z-10 overflow-y-auto pr-0.5 no-scrollbar flex-1">
            {/* Transaction Type Segmented Control: Expense vs Income */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTransactionType("expense");
                  if (INCOME_CATEGORIES.includes(category)) {
                    setCategory("Food");
                  }
                }}
                className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  transactionType === "expense"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>− Expense Outflow</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransactionType("income");
                  if (!INCOME_CATEGORIES.includes(category)) {
                    setCategory("Salary");
                  }
                }}
                className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  transactionType === "income"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>+ Income Inflow</span>
              </button>
            </div>

            {lastNfcTap && transactionType === "expense" && (
              <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-400/50 flex items-center justify-between gap-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  <Wifi className="w-4 h-4 text-emerald-400 rotate-90 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-300 block">
                      ⚡ NFC Auto-Filled ({lastNfcTap.paymentMode})
                    </span>
                    <p className="text-[11px] text-slate-200 truncate">
                      {lastNfcTap.vendor} · {lastNfcTap.cardOrTagName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("nfc")}
                  className="px-2 py-1 rounded-lg bg-slate-900 border border-emerald-400/40 text-[10px] font-mono font-bold text-emerald-300 shrink-0 cursor-pointer"
                >
                  Re-Tap
                </button>
              </div>
            )}

            <div>
              <label htmlFor="amount" className="block text-[11px] font-bold text-slate-300 mb-1">
                Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-mono text-slate-400">
                  ₹
                </span>
                <input
                  id="amount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder={transactionType === "income" ? "25000" : "150"}
                  value={amount}
                  onChange={(e) => {
                    playMechanicalKeyTick();
                    setAmount(e.target.value);
                    setError("");
                  }}
                  autoFocus
                  style={{
                    borderColor: amount ? theme.accentHex : undefined,
                  }}
                  className="w-full h-11 pl-8 pr-3 rounded-xl bg-slate-900 border border-white/10 text-lg font-mono tabular-nums font-bold text-slate-100 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="title" className="block text-[11px] font-bold text-slate-300 mb-1">
                {transactionType === "income" ? "Income Source / Description" : "Description / Merchant"}
              </label>
              <input
                id="title"
                type="text"
                placeholder={
                  transactionType === "income"
                    ? "e.g. Monthly Salary, Freelance Client, UPI Cashback"
                    : "e.g. Cold Coffee, Metro card, Shawarma"
                }
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError("");
                }}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 focus:outline-none transition-colors"
                style={{
                  borderColor: title ? `${theme.accentHex}80` : undefined,
                }}
              />
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-300 mb-1">
                Category
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(transactionType === "income" ? INCOME_CATEGORIES : CATEGORIES).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      if (
                        transactionType === "expense" &&
                        (cat === "Food" || cat === "Chai & Snacks") &&
                        (isRealLateNightHours() || simulateLateNight)
                      ) {
                        playMidnightCravingsChime();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      category === cat
                        ? transactionType === "income"
                          ? "bg-emerald-600 text-white"
                          : "bg-indigo-600 text-white"
                        : "bg-slate-900/90 border border-white/10 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="block text-[11px] font-bold text-slate-300 mb-1">
                  Payment Mode
                </span>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-white/10">
                  {PAYMENT_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        paymentMode === mode
                          ? "bg-slate-800 text-white shadow-xs"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="note" className="block text-[11px] font-bold text-slate-300 mb-1">
                  Note (optional)
                </label>
                <input
                  id="note"
                  type="text"
                  placeholder="Brief note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full h-[38px] px-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {error && <p className="text-[11px] font-medium text-rose-400">{error}</p>}

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-2xl border border-white/10 bg-slate-900 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-1 h-11 rounded-2xl text-xs font-black shadow-lg cursor-pointer active:scale-95 transition-all text-white ${
                  transactionType === "income"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {editingExpense
                  ? "Update Transaction"
                  : transactionType === "income"
                  ? "Save Income"
                  : "Save Expense"}
              </button>
            </div>
          </form>
        )}

        {/* "IMPULSE BUY KILLER" (5-MINUTE / 300-SECOND COOL-OFF VAULT OVERLAY) */}
        {coolOffExpense && (
          <div
            role="dialog"
            aria-label="Impulse Buy Cool-Off Lock"
            className="absolute inset-0 z-50 bg-slate-950/98 backdrop-blur-xl p-5 flex flex-col items-center justify-between text-center animate-in fade-in duration-200"
          >
            {/* Header Badge */}
            <div className="w-full flex items-center justify-between border-b border-rose-500/30 pb-3">
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-rose-400 animate-pulse" />
                <span className="text-xs font-mono font-black uppercase tracking-wider text-rose-300">
                  Impulse Buy Killer · Cool-Off Lock
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-[10px] font-mono font-bold text-rose-200">
                {coolOffExpense.category} &gt; ₹500
              </span>
            </div>

            {/* 300-Second Circular Countdown Ring */}
            <div className="my-auto flex flex-col items-center justify-center space-y-3 py-2">
              <div className="relative flex items-center justify-center">
                {(() => {
                  const ringSize = 148;
                  const ringStroke = 10;
                  const r = (ringSize - ringStroke) / 2;
                  const circ = 2 * Math.PI * r;
                  const progressOffset = circ - (coolOffSeconds / 300) * circ;
                  const mins = Math.floor(coolOffSeconds / 60);
                  const secs = String(coolOffSeconds % 60).padStart(2, "0");

                  return (
                    <>
                      <svg
                        width={ringSize}
                        height={ringSize}
                        viewBox={`0 0 ${ringSize} ${ringSize}`}
                        className="-rotate-90 transform"
                      >
                        <circle
                          cx={ringSize / 2}
                          cy={ringSize / 2}
                          r={r}
                          stroke="#f43f5e"
                          strokeOpacity="0.18"
                          strokeWidth={ringStroke}
                          fill="transparent"
                        />
                        <circle
                          cx={ringSize / 2}
                          cy={ringSize / 2}
                          r={r}
                          stroke="#f43f5e"
                          strokeWidth={ringStroke}
                          strokeDasharray={circ}
                          strokeDashoffset={progressOffset}
                          strokeLinecap="round"
                          fill="transparent"
                          style={{
                            filter: "drop-shadow(0 0 12px rgba(244,63,94,0.8))",
                            transition: "stroke-dashoffset 1s linear",
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-mono tabular-nums text-2xl font-black text-white">
                          {coolOffSeconds}s
                        </span>
                        <span className="font-mono text-[10px] font-bold text-rose-300">
                          ({mins}:{secs} left)
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Flagged Purchase Details */}
              <div>
                <p className="text-xs font-bold text-slate-300">
                  Flagged Spend:{" "}
                  <span className="text-white font-black">{coolOffExpense.title}</span>
                </p>
                <p className="font-mono text-xl font-black text-rose-400 mt-0.5">
                  ₹{coolOffExpense.amount.toLocaleString("en-IN")}
                </p>
              </div>

              {/* Witty JARVIS Interrogation Box */}
              <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-cyan-400/40 text-left max-w-[360px] shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-cyan-300 block mb-1">
                  🤖 J.A.R.V.I.S. IMPULSE INTERCEPT
                </span>
                <p className="text-xs text-cyan-50 leading-relaxed font-medium">
                  &ldquo;Sir, is this a biological necessity or a fleeting impulse? Wait out the timer to confirm.&rdquo;
                </p>
              </div>
            </div>

            {/* Action Buttons: Save My Money & Cancel vs Proceed Anyway */}
            <div className="w-full space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  celebrateDisciplineShield(theme.accentHex);
                  setCoolOffExpense(null);
                  onClose();
                }}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.5)] cursor-pointer active:scale-95 transition-all"
              >
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span>
                  Save My Money &amp; Cancel (+₹{coolOffExpense.amount.toLocaleString("en-IN")} Saved!)
                </span>
              </button>

              <button
                type="button"
                onClick={() => commitOrInterceptExpense(coolOffExpense, true)}
                className="w-full h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/30 text-[11px] font-bold text-rose-300 hover:text-rose-200 cursor-pointer transition-colors"
              >
                Proceed Anyway {coolOffSeconds > 0 ? `(Override ${coolOffSeconds}s Lock)` : ""}
              </button>
            </div>
          </div>
        )}

        {/* "LATE NIGHT CRAVINGS SHIELD" (10:00 PM - 4:00 AM MIDNIGHT IMPULSE ALERT OVERLAY) */}
        {midnightCravingExpense && (
          <div
            role="dialog"
            aria-label="Midnight Impulse Alert"
            className="absolute inset-0 z-50 bg-[#050711]/98 backdrop-blur-xl p-5 flex flex-col items-center justify-between text-center animate-in fade-in duration-200"
          >
            {/* Top Header */}
            <div className="w-full flex items-center justify-between border-b border-indigo-500/30 pb-3">
              <div className="flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-xs font-mono font-black uppercase tracking-wider text-indigo-300">
                  Midnight Impulse Alert
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-[10px] font-mono font-bold text-indigo-200">
                10:00 PM – 4:00 AM SHIELD
              </span>
            </div>

            {/* Center Craving Alert Visual */}
            <div className="my-auto flex flex-col items-center justify-center space-y-3.5 py-2">
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border-2 border-indigo-400/60 flex flex-col items-center justify-center shadow-[0_0_35px_rgba(99,102,241,0.5)]">
                <span className="text-3xl">🌙🍔</span>
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-indigo-300 mt-1">
                  CRAVING LEAK
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 block">
                  Late-Night {midnightCravingExpense.category} Detected
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  {midnightCravingExpense.title}
                </h3>
                <p className="font-mono text-2xl font-black text-rose-400 mt-0.5">
                  −₹{midnightCravingExpense.amount.toLocaleString("en-IN")}
                </p>
              </div>

              {/* Witty Hinglish Midnight Warning Box */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-400/40 text-left max-w-[360px] space-y-1.5 shadow-[0_0_24px_rgba(99,102,241,0.2)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-300">
                    ⚡ J.A.R.V.I.S. MIDNIGHT REALITY CHECK
                  </span>
                  <button
                    type="button"
                    onClick={() => playMidnightCravingsChime()}
                    className="text-[9px] font-mono text-indigo-300 hover:text-white underline cursor-pointer"
                  >
                    🔊 Replay Chime
                  </button>
                </div>
                <p className="text-xs text-indigo-50 leading-relaxed font-medium">
                  &ldquo;Sir, raat ke 10 PM se 4 AM ke beech <strong>{midnightCravingExpense.title}</strong> bhookh nahi, boredom hai! Paani pi ke so ja bhai—ye ₹{midnightCravingExpense.amount} kal subah tere daily budget ko bacha lega.&rdquo;
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  celebrateDisciplineShield(theme.accentHex);
                  setMidnightCravingExpense(null);
                  onClose();
                }}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.5)] cursor-pointer active:scale-95 transition-all"
              >
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span>
                  Ditch Craving &amp; Sleep (+₹{midnightCravingExpense.amount.toLocaleString("en-IN")} Saved!)
                </span>
              </button>

              <button
                type="button"
                onClick={() => commitOrInterceptExpense(midnightCravingExpense, true)}
                className="w-full h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-indigo-500/40 text-[11px] font-bold text-indigo-200 hover:text-white cursor-pointer transition-colors"
              >
                I&apos;m Really Hungry · Log ₹{midnightCravingExpense.amount} Anyway
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
