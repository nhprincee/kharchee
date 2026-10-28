import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Loader2,
  Zap,
  Mic,
  MicOff,
} from "lucide-react";
import type { Expense, FanTheme, JarvisMessage, KhataFriend } from "../types";
import { formatTimeShort } from "./SwipeableExpenseRow";
import { playArmorBootSound } from "../utils/celebration";

interface JarvisDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  dailySpent?: number;
  dailyLimit: number;
  todaySpent?: number;
  lockdownActive?: boolean;
  streakDays?: number;
  disciplineScore?: number;
  expenses?: Expense[];
  friends?: KhataFriend[];
  theme?: FanTheme;
  onAddExpense?: (title: string, amount: number, category: string) => void;
  onToggleLockdown?: (active: boolean) => void;
  onUpdateDailyLimit?: (limit: number) => void;
  onAddKhataEntry?: (friendName: string, amount: number, description: string) => void;
}

const QUICK_QUESTION_CHIPS = [
  { label: "A friend owes me ₹500 for dinner", icon: "🤝" },
  { label: "I paid a friend ₹300", icon: "💸" },
  { label: "Add ₹150 for food", icon: "🍗" },
  { label: "I spent ₹40 on chai", icon: "☕" },
  { label: "Explain my spending", icon: "🛡️" },
  { label: "Set my daily budget", icon: "🎯" },
];

export const HolographicAudioSpectrum: React.FC<{
  active: boolean;
  bars?: number;
  color?: string;
}> = ({ active, bars = 14, color = "#22d3ee" }) => {
  return (
    <div
      className={`flex items-center justify-center gap-0.5 px-2 py-1 rounded-full transition-all duration-300 ${
        active
          ? "bg-slate-950/80 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
          : "bg-transparent"
      }`}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const heightPattern = active
          ? [14, 22, 10, 18, 24, 12, 16, 20, 14, 24, 11, 19, 15, 21][i % 14]
          : 4;
        const animDelay = `${((i % 5) * 0.1).toFixed(2)}s`;
        const animDuration = `${(0.4 + (i % 4) * 0.12).toFixed(2)}s`;
        return (
          <span
            key={i}
            className={`w-1 rounded-full transition-all duration-150 ${
              active
                ? "bg-gradient-to-t from-cyan-500 to-cyan-300 animate-pulse"
                : "bg-slate-700/60"
            }`}
            style={{
              height: `${heightPattern}px`,
              animationDelay: active ? animDelay : undefined,
              animationDuration: active ? animDuration : undefined,
              boxShadow: active ? `0 0 6px ${color}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};

export const JarvisDrawer: React.FC<JarvisDrawerProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  dailySpent,
  dailyLimit,
  todaySpent: todaySpentProp,
  lockdownActive = false,
  streakDays = 1,
  disciplineScore = 750,
  expenses = [],
  friends = [],
  theme,
  onAddExpense,
  onToggleLockdown,
  onUpdateDailyLimit,
  onAddKhataEntry,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const todaySpent =
    dailySpent !== undefined ? dailySpent : todaySpentProp ?? 0;

  const [mode] = useState<"roast" | "advice">("roast");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null
  );
  const [isBrowserSpeaking, setIsBrowserSpeaking] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  const remaining = dailyLimit - todaySpent;
  const percentUsed =
    dailyLimit > 0 ? Math.round((todaySpent / dailyLimit) * 100) : 0;
  const isSpeaking = speakingMessageId !== null || isBrowserSpeaking;

  const [messages, setMessages] = useState<JarvisMessage[]>(() => [
    {
      id: "jarvis-welcome",
      role: "jarvis",
      text: "Hi, I’m Jarvis. Ask me about your spending, add a transaction, update your budget, or manage your Khata.",
      timestamp: new Date().toISOString(),
      mode: "roast",
    },
  ]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const prevIsOpenRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      setIsBrowserSpeaking(false);
      return;
    }

    if (!prevIsOpenRef.current) {
      prevIsOpenRef.current = true;
      if (
        autoSpeak &&
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        !window.speechSynthesis.speaking
      ) {
        speakWithBrowserFallback(
          "Hi, I’m Jarvis. What would you like help with today?",
          "jarvis-boot-greeting"
        );
      } else {
        setIsBrowserSpeaking(true);
      }
    }

    const timer = setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        setIsBrowserSpeaking(window.speechSynthesis.speaking);
      }
    }, 120);

    return () => clearInterval(timer);
  }, [isOpen, autoSpeak]);

  const stopAllSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  };

  useEffect(() => {
    return () => {
      stopAllSpeech();
    };
  }, []);

  const handleClose = () => {
    stopAllSpeech();
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const speakWithBrowserFallback = (text: string, msgId: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeakingMessageId(null);
      return;
    }
    window.speechSynthesis.cancel();

    const clean = text
      .replace(/[*#_`~₹]/g, " ")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) {
      setSpeakingMessageId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice =
      voices.find(
        (v) =>
          v.lang.startsWith("en-GB") ||
          v.name.includes("UK") ||
          v.name.includes("British") ||
          v.name.includes("Daniel") ||
          v.name.includes("Oliver") ||
          v.name.includes("George")
      ) || voices.find((v) => v.lang.startsWith("en"));

    if (jarvisVoice) {
      utterance.voice = jarvisVoice;
    }

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const speakMessage = (text: string, msgId: string) => {
    stopAllSpeech();
    speakWithBrowserFallback(text, msgId);
  };

  const buildSnapshot = () => {
    let khataToReceive = 0;
    let khataToPay = 0;
    const khataDetails: string[] = [];

    friends.forEach((f) => {
      const net = f.entries
        .filter((e) => !e.settled)
        .reduce((acc, e) => acc + e.amount, 0);
      if (net > 0) {
        khataToReceive += net;
        khataDetails.push(`${f.name} owes you ₹${net}`);
      } else if (net < 0) {
        khataToPay += Math.abs(net);
        khataDetails.push(`You owe ${f.name} ₹${Math.abs(net)}`);
      }
    });

    const catMap: Record<string, number> = {};
    expenses
      .filter((e) => e.type !== "income")
      .slice(0, 12)
      .forEach((e) => {
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
      });
    const topCategories = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => `${cat} (₹${amt})`);

    const recentTransactions = expenses.slice(0, 6).map(
      (e) =>
        `${e.title} - ${e.type === "income" ? "+" : "−"}₹${e.amount} (${e.category}, ${formatTimeShort(
          e.timestamp
        )})`
    );

    return {
      dailyLimit,
      todaySpent,
      remaining,
      percentUsed,
      lockdownActive,
      streakDays,
      disciplineScore,
      topCategories,
      recentTransactions,
      // The backend prompt expects these canonical fields; keep them in sync
      // so Jarvis can reason over actual transactions and Khata balances.
      recentExpenses: expenses
        .filter((e) => e.type !== "income")
        .slice(0, 12)
        .map((e) => ({
          title: e.title,
          category: e.category,
          amount: e.amount,
          timeLabel: formatTimeShort(e.timestamp),
        })),
      khataToReceive,
      khataToPay,
      khataSummary: {
        toReceive: khataToReceive,
        toPay: khataToPay,
        details: khataDetails,
      },
    };
  };

  const extractClientIntentAction = (
    text: string
  ):
    | {
        type: "ADD_EXPENSE" | "SET_LOCKDOWN" | "SET_DAILY_LIMIT" | "ADD_KHATA";
        payload: any;
      }
    | undefined => {
    const clean = text.trim();

    // 1. Voice-to-Khata Natural Language Parser
    const owesMeMatch = clean.match(
      /^([a-zA-Z]+)\s+(?:owes\s+me|ne\s+mere\s+dene\s+hai|se\s+lene\s+hai)\s*(?:rs\.?|inr|₹)?\s*(\d{1,6})(?:\s+(?:for|ke\s+liye|on)\s+(.+))?$/i
    );
    if (owesMeMatch) {
      const friendName =
        owesMeMatch[1].charAt(0).toUpperCase() +
        owesMeMatch[1].slice(1).toLowerCase();
      const amount = Number(owesMeMatch[2]);
      const description = (owesMeMatch[3] || "Shared Expense")
        .trim()
        .replace(/[.!?]+$/, "");
      if (amount > 0) {
        return {
          type: "ADD_KHATA",
          payload: { friendName, amount, description },
        };
      }
    }

    const maineDiyeMatch = clean.match(
      /^(?:maine|i\s+gave|gave|paid)\s+([a-zA-Z]+)\s+(?:ko\s+)?(?:rs\.?|inr|₹)?\s*(\d{1,6})(?:\s*(?:rs\.?|inr|₹|rupees|rupaye))?(?:\s*(?:diye|for|ke\s+liye))?(?:\s+(?:for\s+)?(.+))?$/i
    );
    if (maineDiyeMatch) {
      const friendName =
        maineDiyeMatch[1].charAt(0).toUpperCase() +
        maineDiyeMatch[1].slice(1).toLowerCase();
      const amount = Number(maineDiyeMatch[2]);
      const rawDesc = (maineDiyeMatch[3] || "")
        .replace(/\b(diye|diya|hai|for)\b/gi, "")
        .trim();
      const description = rawDesc || "Lent Cash / UPI";
      if (amount > 0) {
        return {
          type: "ADD_KHATA",
          payload: { friendName, amount, description },
        };
      }
    }

    const iOweMatch = clean.match(
      /^(?:i\s+owe|mujhe)\s+([a-zA-Z]+)\s+(?:ko\s+)?(?:rs\.?|inr|₹)?\s*(\d{1,6})(?:\s+(?:for|dene\s+hai)\s*(.*))?$/i
    );
    if (iOweMatch) {
      const friendName =
        iOweMatch[1].charAt(0).toUpperCase() +
        iOweMatch[1].slice(1).toLowerCase();
      const amount = -Math.abs(Number(iOweMatch[2]));
      const description = (iOweMatch[3] || "Borrowed")
        .trim()
        .replace(/[.!?]+$/, "");
      if (amount !== 0) {
        return {
          type: "ADD_KHATA",
          payload: { friendName, amount, description },
        };
      }
    }

    if (
      /\b(lockdown|freeze|lock\s+wallet)\b/i.test(clean) &&
      /\b(activate|on|start|kar\s*do|laga\s*do|enable)\b/i.test(clean)
    ) {
      return { type: "SET_LOCKDOWN", payload: { active: true } };
    }
    if (
      /\b(lockdown|freeze|unlock)\b/i.test(clean) &&
      /\b(off|disable|hata\s*do|stop|lift|band\s*kar)\b/i.test(clean)
    ) {
      return { type: "SET_LOCKDOWN", payload: { active: false } };
    }

    const limitMatch = clean.match(
      /(?:set|change|update|make)\s+(?:my\s+)?(?:daily\s+)?(?:limit|budget|quota)\s+(?:to\s+)?(?:₹|rs\.?\s*)?(\d{2,6})/i
    );
    if (limitMatch) {
      return {
        type: "SET_DAILY_LIMIT",
        payload: { limit: Number(limitMatch[1]) },
      };
    }

    const addPatternA = clean.match(
      /(?:add|log|spent|spend|paid)\s+(?:₹|rs\.?\s*)?(\d{1,6})\s+(?:for|on|in|ka|ki|ke)\s+([a-zA-Z0-9\s&'-]+)/i
    );
    const addPatternB = clean.match(
      /(?:maine|humne|aaj)?\s*(?:₹|rs\.?\s*)?(\d{1,6})\s*(?:rs|rupees|rupaye|₹)?\s+(?:ka|ki|ke|for|on)\s+([a-zA-Z0-9\s&'-]+?)\s*(?:peeya|piya|pee|khaya|liya|liye|kharida|added|spent|kiya)?$/i
    );

    const match = addPatternA || addPatternB;
    if (match) {
      const amount = Number(match[1]);
      const rawItem = match[2]
        .replace(
          /\b(peeya|piya|pee|khaya|liya|liye|kharida|spent|kiya|hai|tha)\b/gi,
          ""
        )
        .trim();
      if (amount > 0 && rawItem.length > 0 && rawItem.length <= 32) {
        const title =
          rawItem.charAt(0).toUpperCase() + rawItem.slice(1).toLowerCase();
        const lower = title.toLowerCase();
        let category = "Food";
        if (/(chai|coffee|tea|samosa|snack|maggi|biscuit)/i.test(lower)) {
          category = "Chai & Snacks";
        } else if (
          /(auto|uber|ola|cab|metro|bus|petrol|fuel|train)/i.test(lower)
        ) {
          category = "Transport";
        } else if (/(milk|bread|egg|sabzi|grocery|veggies|fruits)/i.test(lower)) {
          category = "Grocery";
        } else if (/(movie|netflix|game|party|club)/i.test(lower)) {
          category = "Entertainment";
        } else if (/(recharge|wifi|bill|electricity|rent)/i.test(lower)) {
          category = "Bills";
        } else if (
          /(shirt|shoes|amazon|myntra|shopping|clothes)/i.test(lower)
        ) {
          category = "Shopping";
        }
        return {
          type: "ADD_EXPENSE",
          payload: { title, amount, category },
        };
      }
    }

    return undefined;
  };

  const buildClientDynamicFallback = (
    prompt: string,
    snapshot: ReturnType<typeof buildSnapshot>,
    action?: {
      type: "ADD_EXPENSE" | "SET_LOCKDOWN" | "SET_DAILY_LIMIT" | "ADD_KHATA";
      payload: any;
    }
  ): string => {
    if (action?.type === "ADD_KHATA") {
      const { friendName, amount, description } = action.payload;
      return amount >= 0
        ? `Done Sir! Updated Dosto Ka Khata: ${friendName} owes you ₹${amount} for ${description}. Shall I prepare a WhatsApp reminder?`
        : `Logged in Khata, Sir: You owe ${friendName} ₹${Math.abs(amount)} for ${description}.`;
    }
    if (action?.type === "ADD_EXPENSE") {
      return `Logged ₹${action.payload.amount} for ${action.payload.title}, Sir. Quota updated. Anything else for your ledger?`;
    }
    if (action?.type === "SET_LOCKDOWN") {
      return action.payload.active
        ? `Emergency Lockdown activated, Sir. Spending freeze engaged across your perimeter.`
        : `Emergency Lockdown deactivated, Sir. Normal operational parameters restored.`;
    }
    if (action?.type === "SET_DAILY_LIMIT") {
      return `Daily limit updated to ₹${action.payload.limit}, Sir. Perimeter recalibrated.`;
    }

    const q = prompt.toLowerCase();
    const { dailyLimit: lim, todaySpent: spent, percentUsed: pct } = snapshot;

    if (q.includes("score")) {
      return `Your current in-app discipline estimate is ${snapshot.disciplineScore}/900. It is based on the app's budget activity, not an official credit score. ${pct > 100 ? "Today’s spending is above your set budget." : "Add accurate transactions over time to make the insights more useful."}`;
    }

    return `I’m here to help with your money, not guess. Your logged spending today is ₹${spent} against a ₹${lim} daily budget. Ask me a specific question or tell me what transaction to add.`;
  };

  const executeJarvisAction = (action: {
    type: "ADD_EXPENSE" | "SET_LOCKDOWN" | "SET_DAILY_LIMIT" | "ADD_KHATA";
    payload: any;
  }) => {
    if (action.type === "ADD_EXPENSE") {
      const amt = Number(action.payload?.amount);
      const title = String(action.payload?.title || "").trim();
      if (title && Number.isFinite(amt) && amt > 0 && amt <= 1000000) {
        onAddExpense?.(title, amt, action.payload.category || "Food");
      }
    } else if (action.type === "ADD_KHATA") {
      const amt = Number(action.payload?.amount);
      if (Number.isFinite(amt) && amt !== 0 && Math.abs(amt) <= 1000000) {
        onAddKhataEntry?.(
          String(action.payload?.friendName || "Friend").trim(),
          amt,
          String(action.payload?.description || "Shared Expense").trim()
        );
      }
    } else if (action.type === "SET_LOCKDOWN") {
      onToggleLockdown?.(Boolean(action.payload?.active));
    } else if (action.type === "SET_DAILY_LIMIT") {
      const lim = Number(action.payload?.limit);
      if (Number.isFinite(lim) && lim >= 50 && lim <= 1000000) {
        onUpdateDailyLimit?.(lim);
      }
    }
  };

  const toggleVoiceMic = () => {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setApiNotice(
        "Voice recognition is not supported in this browser. Type your command below (e.g. 'Kabir owes me 500 for dinner')."
      );
      return;
    }

    if (isListeningMic) {
      setIsListeningMic(false);
      return;
    }

    try {
      stopAllSpeech();
      const recognition = new SpeechRec();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListeningMic(true);
      setApiNotice(null);

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        setIsListeningMic(false);
        if (transcript.trim()) {
          setInput(transcript.trim());
          void sendQuery(transcript.trim());
        }
      };

      recognition.onerror = () => {
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
      };

      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  const speakFirstSentenceImmediately = (text: string, msgId: string) => {
    const firstSentenceMatch = text.match(/^([^.!?\n]+[.!?]?)/);
    const toSpeak = firstSentenceMatch
      ? firstSentenceMatch[1].trim()
      : text.trim();
    if (toSpeak) {
      speakMessage(text, msgId);
    }
  };

  const sendQuery = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    setApiNotice(null);
    stopAllSpeech();

    const userMsg: JarvisMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    // 1. INSTANT LOCAL INTERCEPT FOR GREETINGS (0ms LATENCY)
    const isSimpleGreeting =
      /^(hi+|hello+|hey+|yo+|namaste|hola|greetings|sup|jarvis|hey\s+jarvis|hello\s+jarvis|hi\s+jarvis)[\s!?.]*$/i.test(
        trimmed
      );

    if (isSimpleGreeting) {
      const greetingReply =
        "Good evening, Sir. Systems synchronized, Stark financial protocols standing by. How may I direct your assets?";
      const jarvisMsgId = `j-${Date.now()}`;
      const jarvisMsg: JarvisMessage = {
        id: jarvisMsgId,
        role: "jarvis",
        text: greetingReply,
        timestamp: new Date().toISOString(),
        mode,
        isStreaming: false,
      };
      setMessages((prev) => [...prev, userMsg, jarvisMsg]);
      setInput("");
      setIsLoading(false);
      if (autoSpeak) {
        speakFirstSentenceImmediately(greetingReply, jarvisMsgId);
      }
      return;
    }

    const jarvisMsgId = `j-${Date.now()}`;
    const initialJarvisMsg: JarvisMessage = {
      id: jarvisMsgId,
      role: "jarvis",
      text: "",
      timestamp: new Date().toISOString(),
      mode,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, initialJarvisMsg]);
    setInput("");
    setIsLoading(true);

    const snapshot = buildSnapshot();
    const chatHistory = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    let accumulatedText = "";
    let spokenFirstSentence = false;
    let actionDetected: any = extractClientIntentAction(trimmed);

    // 2. Give Gemini enough time to generate a real answer before falling back
    const controller = new AbortController();
    let firstTokenReceived = false;
    const firstTokenTimer = setTimeout(() => {
      if (!firstTokenReceived) {
        controller.abort();
      }
    }, 20000);

    try {
      const streamResponse = await fetch("/api/jarvis/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          prompt: trimmed,
          mode,
          snapshot,
          history: chatHistory,
        }),
        signal: controller.signal,
      });

      if (!streamResponse.ok || !streamResponse.body) {
        throw new Error("Stream endpoint unavailable");
      }

      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder("utf-8");
      // SSE events may be split across network chunks. Keep the unfinished line
      // until the next chunk arrives instead of silently dropping partial JSON.
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        sseBuffer += chunk;
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const rawJson = line.slice(6).trim();
            if (!rawJson) continue;
            try {
              const parsed = JSON.parse(rawJson);
              if (parsed.type === "chunk" && parsed.text) {
                if (!firstTokenReceived) {
                  firstTokenReceived = true;
                  clearTimeout(firstTokenTimer);
                }
                accumulatedText += parsed.text;
                const currentText = accumulatedText;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === jarvisMsgId ? { ...m, text: currentText } : m
                  )
                );

                if (!spokenFirstSentence && autoSpeak) {
                  const sentenceMatch =
                    accumulatedText.match(/^([^.!?\n]+[.!?\n])/);
                  if (sentenceMatch || accumulatedText.length >= 28) {
                    spokenFirstSentence = true;
                    speakFirstSentenceImmediately(accumulatedText, jarvisMsgId);
                  }
                }
              } else if (parsed.type === "action" && parsed.action) {
                actionDetected = parsed.action;
              } else if (
                parsed.type === "done" &&
                parsed.fullText &&
                !accumulatedText
              ) {
                firstTokenReceived = true;
                clearTimeout(firstTokenTimer);
                accumulatedText = parsed.fullText;
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      }

      clearTimeout(firstTokenTimer);

      if (actionDetected) {
        executeJarvisAction(actionDetected);
      }

      const finalText =
        accumulatedText.trim() ||
        buildClientDynamicFallback(trimmed, snapshot, actionDetected);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === jarvisMsgId
            ? {
                ...m,
                text: finalText,
                isStreaming: false,
                actionExecuted: actionDetected || m.actionExecuted,
              }
            : m
        )
      );

      if (autoSpeak && !spokenFirstSentence) {
        speakFirstSentenceImmediately(finalText, jarvisMsgId);
      }
    } catch {
      clearTimeout(firstTokenTimer);
      if (actionDetected) {
        executeJarvisAction(actionDetected);
      }
      const fallback = buildClientDynamicFallback(
        trimmed,
        snapshot,
        actionDetected
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === jarvisMsgId
            ? {
                ...m,
                text: fallback,
                isStreaming: false,
                actionExecuted: actionDetected || m.actionExecuted,
              }
            : m
        )
      );
      if (autoSpeak && !spokenFirstSentence) {
        speakFirstSentenceImmediately(fallback, jarvisMsgId);
      }
    } finally {
      clearTimeout(firstTokenTimer);
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    void sendQuery(input);
  };

  return (
    <>
      {/* Floating 3D Iron Man Arc Reactor HUD Orb (64x64px) when uncontrolled */}
      {controlledIsOpen === undefined && (
        <button
          id="tour-jarvis-btn"
          type="button"
          onClick={() => {
            playArmorBootSound();
            setInternalIsOpen(true);
          }}
          aria-label="J.A.R.V.I.S. Online - Open Tactical Financial Butler"
          className="fixed bottom-20 right-4 z-40 w-16 h-16 rounded-full bg-[#020408] flex items-center justify-center active:scale-95 transition-transform cursor-pointer group"
        >
          {/* Idle Circular Cyber Ripples Expanding Outward into the Screen */}
          <span
            className="pointer-events-none absolute -inset-1.5 rounded-full border border-cyan-400/40 animate-ping"
            style={{ animationDuration: "2.8s" }}
          />
          <span
            className="pointer-events-none absolute -inset-3 rounded-full border border-cyan-300/25 animate-ping"
            style={{ animationDuration: "3.6s", animationDelay: "0.9s" }}
          />

          {/* Micro Holographic Badge on Hover / Press */}
          <span className="pointer-events-none absolute right-[74px] whitespace-nowrap px-2.5 py-1 rounded-md bg-[#020408] border border-cyan-400/70 text-cyan-300 font-mono text-[10px] font-black tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(6,182,212,0.6)] opacity-0 scale-90 translate-x-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 group-active:opacity-100 group-active:scale-100 group-active:translate-x-0 transition-all duration-200">
            J.A.R.V.I.S. ONLINE
          </span>

          {/* Outer Layer: Rotating Dashed Cyan Tech Ring */}
          <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/85 animate-[spin_8s_linear_infinite]" />

          {/* Middle Layer: Holographic Blue Pulse Halo */}
          <span className="pointer-events-none absolute inset-1 rounded-full border border-cyan-300/80 shadow-[0_0_30px_rgba(6,182,212,0.8),inset_0_0_15px_rgba(6,182,212,0.5)]" />

          {/* Center: High-Res JARVIS Cyan Arc Core Graphic with Ambient Heartbeat Pulse */}
          <div className="relative z-10 w-11 h-11 rounded-full overflow-hidden bg-[#020408] border border-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.95)] flex items-center justify-center animate-pulse">
            <img
              src="/assets/aistudio/image_34394344.png"
              alt="JARVIS Arc Reactor Core"
              className="w-full h-full object-cover object-[center_50.5%] scale-125 transition-transform duration-300 group-hover:scale-135"
            />
          </div>
        </button>
      )}

      {/* Stealth Obsidian Black Modal Sheet */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="J.A.R.V.I.S. Tactical Financial Butler"
        >
          <div className="w-full max-w-md h-[80vh] sm:h-[650px] bg-[#03060a]/98 backdrop-blur-2xl border-t-2 border-cyan-400/60 shadow-[0_-15px_40px_rgba(0,0,0,0.95)] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
            {/* Drawer Header with 5-Bar Live Cyan Equalizer */}
            <div className="px-4 py-3.5 bg-[#070b12] border-b border-cyan-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cyan-950 border border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)] flex items-center justify-center overflow-hidden">
                  <img
                    src="/assets/aistudio/image_34394344.png"
                    alt="J.A.R.V.I.S. Core"
                    className="w-full h-full object-cover scale-125 animate-pulse"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-black text-sm tracking-widest text-cyan-300">
                      J.A.R.V.I.S.
                    </span>
                    {/* 5-Bar Live Cyan Equalizer replacing static text badge */}
                    <div
                      aria-label={isSpeaking ? "Voice TTS Active" : "Voice TTS Standby"}
                      className="flex items-end gap-0.5 h-4 px-2 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]"
                    >
                      {[0, 1, 2, 3, 4].map((barIdx) => {
                        const activeHeights = ["12px", "6px", "14px", "8px", "11px"];
                        const delays = ["0s", "0.12s", "0.05s", "0.18s", "0.09s"];
                        return (
                          <span
                            key={barIdx}
                            className={`w-1 rounded-full transition-all duration-150 ${
                              isSpeaking
                                ? "bg-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.9)] animate-pulse"
                                : "bg-cyan-500/40"
                            }`}
                            style={{
                              height: isSpeaking ? activeHeights[barIdx] : "4px",
                              animationDelay: isSpeaking ? delays[barIdx] : undefined,
                              animationDuration: isSpeaking ? "0.35s" : undefined,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    Tactical Financial Butler
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (autoSpeak) stopAllSpeech();
                    setAutoSpeak(!autoSpeak);
                  }}
                  className={`p-1.5 rounded-full border transition-colors cursor-pointer ${
                    autoSpeak
                      ? "bg-[#0d131f] border-cyan-400/50 text-cyan-300"
                      : "bg-[#0d131f] border-white/10 text-slate-500"
                  }`}
                  title={autoSpeak ? "Voice Output Active" : "Voice Output Muted"}
                >
                  {autoSpeak ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-full bg-[#0d131f] border border-white/10 hover:border-cyan-400 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Feed with Laser-Etched Stark Industries Message Borders */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id || i}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed border-l-2 border-cyan-400 bg-gradient-to-r from-cyan-950/40 to-transparent ${
                        isUser
                          ? "bg-[#131926] border border-white/10 border-l-2 border-l-cyan-400 text-slate-100 rounded-br-xs"
                          : "bg-[#070c14] border border-cyan-500/30 border-l-2 border-l-cyan-400 text-cyan-50 shadow-[0_0_12px_rgba(6,182,212,0.1)] rounded-bl-xs"
                      }`}
                    >
                      {msg.isStreaming && !msg.text ? (
                        <div className="flex items-center gap-2 text-cyan-300 font-mono text-xs">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          <span>Synchronizing telemetry...</span>
                        </div>
                      ) : (
                        <span>{msg.text}</span>
                      )}

                      {msg.actionExecuted && (
                        <div className="mt-2 p-2 rounded-xl bg-cyan-950/70 border border-cyan-400/50 flex items-center gap-1.5 text-[11px] text-cyan-200">
                          <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="font-semibold">
                            {msg.actionExecuted.type === "ADD_EXPENSE" &&
                              `Logged ₹${msg.actionExecuted.payload.amount} for ${msg.actionExecuted.payload.title}`}
                            {msg.actionExecuted.type === "ADD_KHATA" &&
                              `Khata Updated: ${msg.actionExecuted.payload.friendName} (${
                                msg.actionExecuted.payload.amount >= 0
                                  ? "+"
                                  : "−"
                              }₹${Math.abs(msg.actionExecuted.payload.amount)})`}
                            {msg.actionExecuted.type === "SET_LOCKDOWN" &&
                              (msg.actionExecuted.payload.active
                                ? "Emergency Lockdown Activated"
                                : "Emergency Lockdown Lifted")}
                            {msg.actionExecuted.type === "SET_DAILY_LIMIT" &&
                              `Daily Limit Set to ₹${msg.actionExecuted.payload.limit}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {apiNotice && (
                <p className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5">
                  {apiNotice}
                </p>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Tactical Prompts Strip */}
            <div className="px-3 py-2 bg-[#070b12] border-t border-cyan-500/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {QUICK_QUESTION_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  disabled={isLoading}
                  onClick={() => void sendQuery(chip.label)}
                  className="px-2.5 py-1 rounded-lg bg-[#0d131f] border border-cyan-500/25 text-[11px] font-medium text-cyan-100 whitespace-nowrap shrink-0 hover:border-cyan-400 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Input Dock */}
            <div className="p-3 bg-[#070b12] border-t border-cyan-500/20 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleVoiceMic}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isListeningMic
                    ? "bg-rose-500/25 border-rose-400 text-rose-300 animate-pulse"
                    : "bg-[#0d131f] border-cyan-500/30 text-cyan-300 hover:border-cyan-400"
                }`}
                title="Voice Command"
              >
                {isListeningMic ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Order J.A.R.V.I.S. (e.g. 'Add 150 for diet')..."
                className="flex-1 bg-[#0d131f] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleSend}
                className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-transform active:scale-95 shadow-[0_0_12px_rgba(6,182,212,0.5)] cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
