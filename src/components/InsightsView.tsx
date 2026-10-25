import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  Gauge,
  ShieldAlert,
  Sparkles,
  Download,
  Share2,
  X,
} from "lucide-react";
import type { Expense, ExpenseCategory, FanTheme } from "../types";
import { getCategoryIcon } from "./SwipeableExpenseRow";
import { playProVaultChime, fireConfettiBurst } from "../utils/celebration";

interface InsightsViewProps {
  expenses: Expense[];
  dailyLimit: number;
  streakDays: number;
  theme: FanTheme;
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: "#f97316",
  "Chai & Snacks": "#eab308",
  Transport: "#38bdf8",
  Grocery: "#10b981",
  Entertainment: "#a855f7",
  Bills: "#f43f5e",
  Shopping: "#ec4899",
};

export const InsightsView: React.FC<InsightsViewProps> = ({
  expenses,
  dailyLimit,
  streakDays,
  theme,
}) => {
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);
  const [isWrapModalOpen, setIsWrapModalOpen] = useState(false);
  const [isRoastStoryMode, setIsRoastStoryMode] = useState(true);
  const [wrapNotice, setWrapNotice] = useState<string | null>(null);

  const filteredByRange = useMemo(() => {
    const cutoff = Date.now() - rangeDays * 86400000;
    return expenses.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
  }, [expenses, rangeDays]);

  const totalSpent = useMemo(
    () => filteredByRange.reduce((sum, e) => sum + e.amount, 0),
    [filteredByRange]
  );

  // Category Breakdown ("Paisa Kahan Gaya?")
  const categoryStats = useMemo(() => {
    const totals = new Map<ExpenseCategory, { amount: number; count: number }>();
    for (const e of filteredByRange) {
      const prev = totals.get(e.category) || { amount: 0, count: 0 };
      totals.set(e.category, { amount: prev.amount + e.amount, count: prev.count + 1 });
    }
    return Array.from(totals.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percent: totalSpent > 0 ? Math.round((data.amount / totalSpent) * 100) : 0,
        color: CATEGORY_COLORS[category],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredByRange, totalSpent]);

  // Last 7 Days Daily Bar Comparison
  const last7Days = useMemo(() => {
    const days: Array<{
      label: string;
      dateStr: string;
      spent: number;
      withinLimit: boolean;
    }> = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const daySpent = expenses
        .filter((e) => new Date(e.timestamp).toDateString() === d.toDateString())
        .reduce((sum, e) => sum + e.amount, 0);

      days.push({
        label: i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "narrow" }),
        dateStr: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        spent: daySpent,
        withinLimit: daySpent <= dailyLimit,
      });
    }
    return days;
  }, [expenses, dailyLimit]);

  const maxDaySpend = useMemo(() => {
    const highest = Math.max(dailyLimit, ...last7Days.map((d) => d.spent));
    return highest > 0 ? highest : 500;
  }, [last7Days, dailyLimit]);

  // "Garibi Index" & Wallet Runway Calculator
  const runwayTelemetry = useMemo(() => {
    const monthlyBudget = Math.max(1500, dailyLimit * 30);
    const cutoff30 = Date.now() - 30 * 86400000;
    const monthlySpent = expenses
      .filter((e) => new Date(e.timestamp).getTime() >= cutoff30)
      .reduce((sum, e) => sum + e.amount, 0);

    const remainingMonthlyBudget = Math.max(0, monthlyBudget - monthlySpent);

    // Average Daily Spend across active days in last 7 days (or today's spend)
    const active7Days = last7Days.filter((d) => d.spent > 0);
    const sevenDaySum = last7Days.reduce((s, d) => s + d.spent, 0);
    const avgDailySpend = Math.max(
      1,
      active7Days.length > 0
        ? Math.round(sevenDaySum / active7Days.length)
        : Math.round(monthlySpent / 7) || dailyLimit
    );

    const rawDaysLeft = Math.floor(remainingMonthlyBudget / avgDailySpend);
    const daysOfSurvivalLeft = Math.min(30, Math.max(0, rawDaysLeft));

    // Garibi Index (0% = billionaire liquidity, 100% = eating Maggi on credit)
    const garibiIndex = Math.min(
      100,
      Math.max(5, Math.round(100 - (daysOfSurvivalLeft / 30) * 100))
    );

    const projectedMaggiDay = Math.min(30, new Date().getDate() + daysOfSurvivalLeft);

    let statusTag = "Status: Thriving";
    let statusBadgeClass =
      "bg-emerald-500/20 border-emerald-400/50 text-emerald-300";
    let jarvisQuip = `Sir, at ₹${avgDailySpend.toLocaleString(
      "en-IN"
    )}/day, your treasury will outlast the month with Stark-level liquidity.`;

    if (daysOfSurvivalLeft <= 5) {
      statusTag = "Status: Critical Emergency";
      statusBadgeClass =
        "bg-rose-500/25 border-rose-400/60 text-rose-200 animate-pulse";
      jarvisQuip = `Red alert, Boss! At ₹${avgDailySpend.toLocaleString(
        "en-IN"
      )}/day, your monthly runway collapses in ${daysOfSurvivalLeft} days. Cancel Zomato Gold immediately.`;
    } else if (daysOfSurvivalLeft <= 22) {
      statusTag = `Status: Eating Maggi by Day ${projectedMaggiDay}`;
      statusBadgeClass =
        "bg-amber-500/20 border-amber-400/50 text-amber-200";
      jarvisQuip = `Sir, burning ₹${avgDailySpend.toLocaleString(
        "en-IN"
      )}/day leaves ${daysOfSurvivalLeft} days of runway. Recommend stockpiling ₹14 Masala Maggi before Day ${projectedMaggiDay}.`;
    }

    return {
      monthlyBudget,
      monthlySpent,
      remainingMonthlyBudget,
      avgDailySpend,
      daysOfSurvivalLeft,
      garibiIndex,
      statusTag,
      statusBadgeClass,
      jarvisQuip,
    };
  }, [dailyLimit, expenses, last7Days]);

  // Time-of-Day Spending Rhythm
  const timeSlots = useMemo(() => {
    const slots = [
      { id: "morning", label: "Morning (6a–12p)", amount: 0 },
      { id: "afternoon", label: "Afternoon (12p–5p)", amount: 0 },
      { id: "evening", label: "Evening (5p–9p)", amount: 0 },
      { id: "night", label: "Late Night (9p–6a)", amount: 0 },
    ];
    for (const e of filteredByRange) {
      const hr = new Date(e.timestamp).getHours();
      if (hr >= 6 && hr < 12) slots[0].amount += e.amount;
      else if (hr >= 12 && hr < 17) slots[1].amount += e.amount;
      else if (hr >= 17 && hr < 21) slots[2].amount += e.amount;
      else slots[3].amount += e.amount;
    }
    return slots;
  }, [filteredByRange]);

  // "FINANCIAL WRAPPED" 9:16 Story Telemetry
  const wrapData = useMemo(() => {
    const rawUserName =
      typeof window !== "undefined"
        ? localStorage.getItem("kharche_user_name_v1") || "MRIGANDER SINGH"
        : "MRIGANDER SINGH";
    const firstName = rawUserName.trim().split(/\s+/)[0].toUpperCase() || "MRIGANDER";
    const wrapHeadline = `${firstName}'S WRAP`;

    const periodQuota = dailyLimit * rangeDays;
    const totalSaved = Math.max(0, periodQuota - totalSpent);

    // Find top leak category / item
    const topCat = categoryStats[0]?.category;
    let topLeakDisplay = "☕ Cutting Chai";
    let topLeakAmount = categoryStats[0]?.amount || 140;

    if (topCat === "Chai & Snacks") {
      topLeakDisplay = "☕ Cutting Chai";
    } else if (topCat === "Food") {
      topLeakDisplay = "🍗 Late Night Cravings";
    } else if (topCat === "Shopping") {
      topLeakDisplay = "🛍️ Impulse Drops";
    } else if (topCat === "Transport") {
      topLeakDisplay = "🛺 Surge Cab Rides";
    } else if (topCat === "Entertainment") {
      topLeakDisplay = "🎬 Weekend Binge";
    } else if (topCat) {
      topLeakDisplay = `⚡ ${topCat}`;
    }

    const executiveReview =
      runwayTelemetry.daysOfSurvivalLeft <= 5
        ? "Wallet survival status: Critical Emergency. Even Mark 42 armor had better structural integrity than this week's budget."
        : runwayTelemetry.daysOfSurvivalLeft <= 20
        ? `Wallet survival status: Eating Maggi by Day ${Math.min(
            30,
            new Date().getDate() + runwayTelemetry.daysOfSurvivalLeft
          )}. Recommend immediate perimeter lockdown on ${topLeakDisplay}.`
        : "Wallet survival status: Stark Sovereign Liquidity. Financial perimeter operating at peak discipline.";

    return {
      wrapHeadline,
      periodQuota,
      totalSpent,
      totalSaved,
      topLeakDisplay,
      topLeakAmount,
      executiveReview,
      survivalStatus:
        runwayTelemetry.daysOfSurvivalLeft <= 5
          ? "Wallet survival status: Critical Emergency"
          : runwayTelemetry.statusTag,
    };
  }, [dailyLimit, rangeDays, totalSpent, categoryStats, runwayTelemetry]);

  // Feature 3: "HABIT LEAK ANNUAL PROJECTOR" (Micro-transactions <= ₹50)
  const habitLeakTelemetry = useMemo(() => {
    const microTxns = expenses.filter((e) => e.amount <= 50);
    const microTotal = microTxns.reduce((sum, e) => sum + e.amount, 0);
    const uniqueDays = Math.max(
      1,
      new Set(microTxns.map((e) => new Date(e.timestamp).toDateString())).size
    );
    const dailyMicroBurn = microTxns.length > 0 ? Math.round(microTotal / uniqueDays) : 50;
    const projectedAnnual = microTxns.length > 0 ? dailyMicroBurn * 365 : 18250;

    return {
      count: microTxns.length,
      microTotal,
      dailyMicroBurn,
      projectedAnnual,
      recentItems: microTxns.slice(0, 3),
    };
  }, [expenses]);

  // Render high-res 1080x1920 (9:16) Instagram Story PNG via HTML5 Canvas
  const generateStoryCanvasBlob = async (): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (isRoastStoryMode) {
      // SAVAGE DARK CYBERPUNK 9:16 ROAST STORY CARD
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGrad.addColorStop(0, "#05020a");
      bgGrad.addColorStop(0.45, "#12041c");
      bgGrad.addColorStop(1, "#040208");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Cyberpunk Magenta / Crimson Grid Lines
      ctx.strokeStyle = "rgba(244, 63, 94, 0.08)";
      ctx.lineWidth = 2;
      for (let x = 0; x < 1080; x += 54) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1920);
        ctx.stroke();
      }
      for (let y = 0; y < 1920; y += 54) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1080, y);
        ctx.stroke();
      }

      // Outer Savage Neon Crimson/Cyan Frame
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 8;
      ctx.strokeRect(52, 52, 976, 1816);

      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(68, 68, 944, 1784);

      // Top Cyberpunk Header Badge
      ctx.fillStyle = "#f43f5e";
      ctx.font = "900 32px monospace";
      ctx.fillText("🔥 KHARCHE · SAVAGE ROAST TELEMETRY", 108, 150);

      // User Name Headline
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 76px sans-serif";
      ctx.fillText(wrapData.wrapHeadline, 108, 255);

      // Savage Deficit Banner
      ctx.fillStyle = "#2b0718";
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 4;
      ctx.fillRect(108, 310, 864, 190);
      ctx.strokeRect(108, 310, 864, 190);

      ctx.fillStyle = "#fda4af";
      ctx.font = "800 28px monospace";
      ctx.fillText("🚨 CRITICAL WALLET BREACH DETECTED", 148, 372);

      ctx.fillStyle = "#ff2a5f";
      ctx.font = "900 52px monospace";
      ctx.fillText("OVERSPEND REPORT: 509% DEFICIT", 148, 452);

      // Top Culprit Block: "Top Culprit: Chai & Chicken"
      ctx.fillStyle = "#0d0718";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 4;
      ctx.fillRect(108, 550, 864, 300);
      ctx.strokeRect(108, 550, 864, 300);

      ctx.fillStyle = "#fbbf24";
      ctx.font = "900 30px monospace";
      ctx.fillText("🎯 PRIMARY BUDGET ASSASSIN", 150, 620);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 60px sans-serif";
      ctx.fillText("Top Culprit: Chai & Chicken", 150, 715);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "800 34px monospace";
      ctx.fillText(
        `Total Burned: ₹${wrapData.totalSpent.toLocaleString("en-IN")}  |  Garibi Risk: 99.9%`,
        150,
        795
      );

      // Stark Verdict Block: "Thanos wiped your wallet clean."
      ctx.fillStyle = "#080312";
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 5;
      ctx.fillRect(108, 905, 864, 480);
      ctx.strokeRect(108, 905, 864, 480);

      ctx.fillStyle = "#00f0ff";
      ctx.font = "900 32px monospace";
      ctx.fillText("🤖 STARK VERDICT // UNFILTERED ROAST:", 150, 985);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 64px sans-serif";
      ctx.fillText('"Thanos wiped your', 150, 1100);
      ctx.fillText('wallet clean."', 150, 1180);

      ctx.fillStyle = "#f43f5e";
      ctx.font = "700 32px monospace";
      ctx.fillText("SNAP IMPACT: ₹0 SURVIVAL RUNWAY LEFT", 150, 1280);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 28px sans-serif";
      ctx.fillText(
        "Even Tony Stark's Mark 85 nanotech can't rebuild this balance.",
        150,
        1340
      );

      // Bottom Telemetry Strip
      ctx.fillStyle = "#160a24";
      ctx.strokeStyle = "rgba(244, 63, 94, 0.5)";
      ctx.lineWidth = 3;
      ctx.fillRect(108, 1440, 864, 210);
      ctx.strokeRect(108, 1440, 864, 210);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "800 34px monospace";
      ctx.fillText(
        `SPENT: ₹${wrapData.totalSpent.toLocaleString("en-IN")}   |   STREAK: ${streakDays} DAYS`,
        150,
        1525
      );
      ctx.fillStyle = "#fbbf24";
      ctx.font = "700 28px monospace";
      ctx.fillText("STATUS: SURVIVING ON ₹14 MASALA MAGGI PACKETS", 150, 1595);

      // Footer Signature
      ctx.fillStyle = "#f43f5e";
      ctx.font = "900 28px monospace";
      ctx.fillText("KHARCHE PRO · SAVAGE CYBERPUNK ROAST EDITION", 160, 1785);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
      });
    }

    // 1. Deep Obsidian Cyber Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, "#020409");
    bgGrad.addColorStop(0.5, "#070d19");
    bgGrad.addColorStop(1, "#020408");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle HUD Grid Lines
    ctx.strokeStyle = "rgba(0, 240, 255, 0.06)";
    ctx.lineWidth = 2;
    for (let x = 0; x < 1080; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1920);
      ctx.stroke();
    }
    for (let y = 0; y < 1920; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1080, y);
      ctx.stroke();
    }

    // Outer Neon Frame
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 6;
    ctx.strokeRect(56, 56, 968, 1808);

    // Top Tagline
    ctx.fillStyle = "#00f0ff";
    ctx.font = "900 32px monospace";
    ctx.fillText("⚡ KHARCHE · STARK TELEMETRY DISPATCH", 110, 150);

    // Headline: MRIGANDER'S WRAP
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 86px sans-serif";
    ctx.fillText(wrapData.wrapHeadline, 110, 270);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "700 34px monospace";
    ctx.fillText(`SUNDAY FINANCIAL WRAPPED · ${rangeDays}-DAY DOSSIER`, 110, 330);

    // Spent vs Saved Box
    ctx.fillStyle = "#0b1324";
    ctx.strokeStyle = "rgba(0, 240, 255, 0.45)";
    ctx.lineWidth = 3;
    ctx.fillRect(110, 400, 860, 320);
    ctx.strokeRect(110, 400, 860, 320);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 28px monospace";
    ctx.fillText("TOTAL DEPLOYED (SPENT)", 155, 475);
    ctx.fillText("VAULT RETAINED (SAVED)", 575, 475);

    ctx.fillStyle = "#fb7185";
    ctx.font = "900 72px monospace";
    ctx.fillText(`₹${wrapData.totalSpent.toLocaleString("en-IN")}`, 155, 575);

    ctx.fillStyle = "#34d399";
    ctx.font = "900 72px monospace";
    ctx.fillText(`₹${wrapData.totalSaved.toLocaleString("en-IN")}`, 575, 575);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "600 26px monospace";
    ctx.fillText(
      `Daily Quota: ₹${dailyLimit}/day · Garibi Index: ${runwayTelemetry.garibiIndex}%`,
      155,
      665
    );

    // Top Leak Category & Streak Box
    ctx.fillStyle = "#0b1324";
    ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
    ctx.fillRect(110, 770, 860, 320);
    ctx.strokeRect(110, 770, 860, 320);

    ctx.fillStyle = "#fde68a";
    ctx.font = "700 28px monospace";
    ctx.fillText("TOP WALLET LEAK SECTOR", 155, 845);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 58px sans-serif";
    ctx.fillText(wrapData.topLeakDisplay, 155, 935);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "800 36px monospace";
    ctx.fillText(
      `Leak Outflow: ₹${wrapData.topLeakAmount.toLocaleString("en-IN")}  |  🔥 ${streakDays}-Day Discipline Streak`,
      155,
      1025
    );

    // Sarcastic JARVIS Executive Review Box
    ctx.fillStyle = "#060b14";
    ctx.strokeStyle = "#00f0ff";
    ctx.fillRect(110, 1140, 860, 460);
    ctx.strokeRect(110, 1140, 860, 460);

    ctx.fillStyle = "#00f0ff";
    ctx.font = "900 30px monospace";
    ctx.fillText("🤖 J.A.R.V.I.S. EXECUTIVE AUDIT VERDICT:", 155, 1215);

    ctx.fillStyle = "#f43f5e";
    ctx.font = "900 36px monospace";
    ctx.fillText(wrapData.survivalStatus.toUpperCase(), 155, 1285);

    // Wrap text for quote
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 34px sans-serif";
    const words = `"${wrapData.executiveReview}"`.split(" ");
    let line = "";
    let yPos = 1365;
    for (const word of words) {
      const testLine = line + word + " ";
      if (ctx.measureText(testLine).width > 760) {
        ctx.fillText(line, 155, yPos);
        line = word + " ";
        yPos += 52;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line, 155, yPos);

    // Footer Signature
    ctx.fillStyle = "#64748b";
    ctx.font = "700 28px monospace";
    ctx.fillText("TRACKED ON KHARCHE · BLACK TITANIUM EDITION", 180, 1780);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
    });
  };

  const handleDownloadStoryImage = async () => {
    playProVaultChime();
    const blob = await generateStoryCanvasBlob();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = isRoastStoryMode
      ? `${wrapData.wrapHeadline.replace(/[^A-Z0-9]/gi, "_")}_SAVAGE_ROAST_9x16.png`
      : `${wrapData.wrapHeadline.replace(/[^A-Z0-9]/gi, "_")}_STORY_9x16.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    fireConfettiBurst(isRoastStoryMode ? "#f43f5e" : "#00f0ff");
    setWrapNotice(
      isRoastStoryMode
        ? "🔥 High-Res 9:16 Savage Roast Story PNG downloaded!"
        : "✅ 9:16 Story Card saved to your device!"
    );
    setTimeout(() => setWrapNotice(null), 3500);
  };

  const handleShareStorySocial = async () => {
    playProVaultChime();
    const blob = await generateStoryCanvasBlob();
    const shareCaption = isRoastStoryMode
      ? `🔥 *${wrapData.wrapHeadline} · SAVAGE ROAST REPORT* 🔥\n🚨 *OVERSPEND REPORT: 509% DEFICIT*\n🍗 *Top Culprit: Chai & Chicken*\n💀 *Stark Verdict:* "Thanos wiped your wallet clean."\n💸 Total Burned: ₹${wrapData.totalSpent.toLocaleString(
          "en-IN"
        )}`
      : `⚡ *${wrapData.wrapHeadline}* ⚡\n💸 Spent: ₹${wrapData.totalSpent.toLocaleString(
          "en-IN"
        )} | 🛡️ Saved: ₹${wrapData.totalSaved.toLocaleString("en-IN")}\n🔥 Top Leak: ${
          wrapData.topLeakDisplay
        } (₹${wrapData.topLeakAmount})\n🏆 Streak: ${streakDays} Days\n🤖 JARVIS: "${
          wrapData.executiveReview
        }"`;

    if (blob && typeof navigator !== "undefined" && navigator.share) {
      try {
        const file = new File(
          [blob],
          isRoastStoryMode ? "Kharche_Savage_Roast_Story.png" : "Kharche_Sunday_Wrap_Story.png",
          {
            type: "image/png",
          }
        );
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: wrapData.wrapHeadline,
            text: shareCaption,
            files: [file],
          });
          setWrapNotice("🚀 Shared 9:16 Story Card!");
          setTimeout(() => setWrapNotice(null), 3500);
          return;
        }
      } catch {
        // Fallback to download + WhatsApp share
      }
    }

    // Download the 9:16 Story PNG for Instagram Story + copy/trigger WhatsApp share cleanly
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = isRoastStoryMode
        ? "Kharche_Savage_Roast_Story.png"
        : "Kharche_Sunday_Wrap_Story.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareCaption);
      }
    } catch {
      // ignore clipboard errors
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareCaption)}`;
    const anchor = document.createElement("a");
    anchor.href = waUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setWrapNotice("📸 High-Res 9:16 Story PNG downloaded & caption copied for Instagram/WhatsApp!");
    setTimeout(() => setWrapNotice(null), 4000);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Range Switch */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Insights</h2>
          <p className="text-[11px] text-slate-400">Paisa Kahan Gaya?</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              playProVaultChime();
              setIsWrapModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-amber-300 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-[0_0_18px_rgba(6,182,212,0.45)] cursor-pointer active:scale-95 transition-transform"
          >
            <Sparkles className="w-3 h-3 fill-current" />
            <span>Share Story</span>
          </button>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setRangeDays(7)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                rangeDays === 7 ? `${theme.buttonBg} ${theme.buttonText}` : "text-slate-400"
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setRangeDays(30)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                rangeDays === 30 ? `${theme.buttonBg} ${theme.buttonText}` : "text-slate-400"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* PROMINENT "GENERATE SUNDAY WRAP" / SAVAGE ROAST STORY CARD BANNER */}
      <section className="p-3.5 rounded-3xl bg-gradient-to-r from-[#07101e] via-[#130b24] to-[#1f0916] border border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.2)] space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-black uppercase tracking-[0.22em] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-400/40">
                9:16 INSTA ROAST
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold">
                {wrapData.wrapHeadline}
              </span>
            </div>
            <h3 className="text-xs font-black text-white mt-1">
              Sunday Wrap &amp; Savage Roast Story Generator
            </h3>
            <p className="text-[11px] text-slate-400 leading-snug">
              {isRoastStoryMode
                ? '🔥 Roast Mode ON: "OVERSPEND REPORT: 509% DEFICIT" · "Thanos wiped your wallet clean."'
                : "Cyber 9:16 card with Spent vs Saved, Top Leak & JARVIS review."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              playProVaultChime();
              setIsWrapModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 text-slate-950 font-black text-[11px] uppercase tracking-wider shrink-0 shadow-[0_0_20px_rgba(244,63,94,0.4)] cursor-pointer active:scale-95 transition-all"
          >
            Generate Wrap
          </button>
        </div>

        {/* Inline Roast Mode Switch */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
            <Flame className={`w-3.5 h-3.5 ${isRoastStoryMode ? "text-rose-400 fill-rose-400 animate-pulse" : "text-slate-500"}`} />
            <span>Story Generator Roast Mode:</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isRoastStoryMode}
            onClick={() => {
              playProVaultChime();
              setIsRoastStoryMode((prev) => !prev);
            }}
            className={`px-3 py-1 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider border transition-all cursor-pointer ${
              isRoastStoryMode
                ? "bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.5)]"
                : "bg-slate-900 text-slate-400 border-white/15 hover:text-white"
            }`}
          >
            {isRoastStoryMode ? "🔥 Roast Mode: ON" : "Roast Mode: OFF"}
          </button>
        </div>

        {wrapNotice && (
          <div
            role="status"
            className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-400/50 text-emerald-200 text-[11px] font-mono font-bold text-center"
          >
            {wrapNotice}
          </div>
        )}
      </section>

      {/* FEATURE 3: "HABIT LEAK ANNUAL PROJECTOR" (MICRO-TRANSACTIONS UNDER ₹50) */}
      <section
        aria-label="Habit Leak Annual Projector"
        className="p-4 rounded-3xl border border-amber-400/45 bg-[#0b0f17] shadow-[0_0_24px_rgba(251,191,36,0.16)] space-y-2.5 relative overflow-hidden"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">☕</span>
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-amber-300">
                HABIT LEAK ANNUAL PROJECTOR
              </span>
            </div>
            <h3 className="text-xs font-black text-white mt-0.5">
              Micro-Transactions Under ₹50 (Cutting Chai &amp; Diet Snacks)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[9px] font-mono font-black text-amber-200 shrink-0">
            {habitLeakTelemetry.count} Micro-Logs
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#060911] border border-rose-500/40 space-y-1">
          <p className="text-xs font-black text-rose-300 leading-snug">
            &ldquo;At this rate, you bleed ₹18,250 every year on micro-cravings.&rdquo;
          </p>
          <p className="text-[10px] font-mono text-slate-400">
            Live Micro-Spend: ₹{habitLeakTelemetry.microTotal.toLocaleString("en-IN")} across{" "}
            {habitLeakTelemetry.count} items (≤₹50) · Projected 365d Burn:{" "}
            <span className="text-amber-300 font-bold">
              ₹{habitLeakTelemetry.projectedAnnual.toLocaleString("en-IN")}/yr
            </span>
          </p>
        </div>

        {habitLeakTelemetry.recentItems.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {habitLeakTelemetry.recentItems.map((item) => (
              <span
                key={item.id}
                className="px-2 py-0.5 rounded-lg bg-slate-900 border border-white/10 text-[10px] font-mono text-slate-300"
              >
                {item.title}: <strong className="text-amber-300">₹{item.amount}</strong>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* "GARIBI INDEX" & FINANCIAL RUNWAY CALCULATOR CARD */}
      <section
        aria-label="Financial Runway and Garibi Index"
        style={{
          borderColor:
            runwayTelemetry.daysOfSurvivalLeft <= 5
              ? "rgba(244, 63, 94, 0.6)"
              : `${theme.accentHex}45`,
          boxShadow: `0 0 24px ${theme.ringGlow}`,
        }}
        className="p-4 rounded-3xl border bg-gradient-to-br from-slate-900/95 via-slate-950 to-slate-900/90 backdrop-blur-xl space-y-3 relative overflow-hidden"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4" style={{ color: theme.accentHex }} />
              <span
                className="text-xs font-extrabold uppercase tracking-wider"
                style={{ color: theme.accentHex }}
              >
                Financial Runway &amp; Garibi Index
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Remaining Monthly ÷ Avg Daily Spend
            </p>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full border text-[10px] font-black tracking-tight shrink-0 ${runwayTelemetry.statusBadgeClass}`}
          >
            {runwayTelemetry.statusTag}
          </span>
        </div>

        {/* Main Survival Counter & Telemetry Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2.5 rounded-2xl bg-slate-950/90 border border-white/10">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              Survival Left
            </span>
            <p
              className={`font-mono tabular-nums text-xl font-black mt-0.5 ${
                runwayTelemetry.daysOfSurvivalLeft <= 5
                  ? "text-rose-400"
                  : runwayTelemetry.daysOfSurvivalLeft <= 18
                  ? "text-amber-300"
                  : "text-emerald-400"
              }`}
            >
              {runwayTelemetry.daysOfSurvivalLeft} Days
            </p>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/90 border border-white/10">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              Monthly Left
            </span>
            <p className="font-mono tabular-nums text-sm font-extrabold text-slate-100 mt-1">
              ₹{runwayTelemetry.remainingMonthlyBudget.toLocaleString("en-IN")}
            </p>
            <span className="text-[9px] text-slate-500 font-mono">
              of ₹{runwayTelemetry.monthlyBudget.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/90 border border-white/10">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              Avg Daily Burn
            </span>
            <p className="font-mono tabular-nums text-sm font-extrabold text-rose-300 mt-1">
              ₹{runwayTelemetry.avgDailySpend.toLocaleString("en-IN")}/d
            </p>
            <span className="text-[9px] text-slate-500 font-mono">
              Garibi: {runwayTelemetry.garibiIndex}%
            </span>
          </div>
        </div>

        {/* Garibi Index Meter Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Garibi Index Meter</span>
            </span>
            <span className="font-bold text-slate-200">
              {runwayTelemetry.garibiIndex}% Risk
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-950 border border-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${runwayTelemetry.garibiIndex}%`,
                background:
                  runwayTelemetry.garibiIndex >= 75
                    ? "linear-gradient(90deg, #f59e0b, #f43f5e)"
                    : runwayTelemetry.garibiIndex >= 40
                    ? "linear-gradient(90deg, #10b981, #f59e0b)"
                    : "linear-gradient(90deg, #22d3ee, #10b981)",
              }}
            />
          </div>
        </div>

        {/* Sarcastic JARVIS Verdict Note */}
        <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-cyan-500/25 flex items-start gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-cyan-100/90 leading-relaxed font-medium">
            <span className="font-bold text-cyan-300">J.A.R.V.I.S.: </span>
            &ldquo;{runwayTelemetry.jarvisQuip}&rdquo;
          </p>
        </div>
      </section>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-md shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outflow</span>
          <p className="font-mono tabular-nums text-xl font-extrabold text-white mt-0.5">
            ₹{totalSpent.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-md shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Discipline Streak</span>
          <p
            className="font-mono tabular-nums text-xl font-extrabold mt-0.5"
            style={{ color: theme.accentHex }}
          >
            {streakDays}d active
          </p>
        </div>
      </div>


      {/* Category Spending Map Card */}
      <section
        style={{ borderColor: `${theme.accentHex}30` }}
        className="p-4 rounded-3xl border bg-slate-900/80 backdrop-blur-md space-y-3 shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">Spending Map</span>
          <TrendingUp className="w-4 h-4" style={{ color: theme.accentHex }} />
        </div>

        {categoryStats.length > 0 ? (
          <>
            {/* Visual Mosaic Bar */}
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-950 border border-white/10">
              {categoryStats.map((stat) => (
                <div
                  key={stat.category}
                  style={{
                    width: `${Math.max(stat.percent, 4)}%`,
                    backgroundColor: stat.color,
                  }}
                  className="h-full border-r border-slate-950 last:border-r-0"
                />
              ))}
            </div>

            {/* Compact Category Rows */}
            <div className="space-y-2 pt-1">
              {categoryStats.map((stat) => {
                const Icon = getCategoryIcon(stat.category);
                return (
                  <div key={stat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-slate-800 border border-white/5"
                          style={{ color: stat.color }}
                        >
                          <Icon className="w-3 h-3" />
                        </span>
                        <span className="font-semibold text-slate-200 truncate">
                          {stat.category}
                        </span>
                      </div>
                      <div className="font-mono tabular-nums text-right shrink-0">
                        <span className="font-bold text-white">
                          ₹{stat.amount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-semibold">
                          {stat.percent}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(stat.percent, 3)}%`,
                          backgroundColor: stat.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">No transactions recorded</p>
        )}
      </section>

      {/* 7-Day Discipline Bar Chart */}
      <section
        style={{ borderColor: `${theme.accentHex}30` }}
        className="p-4 rounded-3xl border bg-slate-900/80 backdrop-blur-md space-y-3 shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">7-Day Discipline</span>
          <span className="text-[10px] text-slate-400 font-mono">Limit: ₹{dailyLimit}</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 items-end h-28 pt-2">
          {last7Days.map((day) => {
            const heightPct = Math.max(10, Math.round((day.spent / maxDaySpend) * 100));
            return (
              <div key={day.dateStr} className="flex flex-col items-center justify-end h-full gap-1">
                <span className="font-mono tabular-nums text-[9px] text-slate-400">
                  ₹{day.spent}
                </span>
                <div className="w-full bg-slate-950 rounded-md h-16 flex items-end overflow-hidden border border-white/10 p-0.5">
                  <div
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: day.withinLimit ? theme.ringStroke : "#f43f5e",
                      boxShadow: day.withinLimit ? `0 0 8px ${theme.ringGlow}` : undefined,
                    }}
                    className="w-full rounded-sm transition-all duration-300"
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-300">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Under limit</span>
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>Over limit</span>
          </span>
        </div>
      </section>

      {/* Spending Clock */}
      <section
        style={{ borderColor: `${theme.accentHex}30` }}
        className="p-4 rounded-3xl border bg-slate-900/80 backdrop-blur-md space-y-2.5 shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">Spending Clock</span>
          <Clock className="w-3.5 h-3.5 text-slate-400" />
        </div>

        <div className="space-y-2">
          {timeSlots.map((slot) => {
            const pct = totalSpent > 0 ? Math.round((slot.amount / totalSpent) * 100) : 0;
            return (
              <div key={slot.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-300 text-[11px] w-28 shrink-0">{slot.label}</span>
                <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(pct, slot.amount > 0 ? 5 : 0)}%`,
                      backgroundColor: theme.ringStroke,
                    }}
                  />
                </div>
                <span className="font-mono tabular-nums text-slate-200 text-[11px] w-14 text-right shrink-0">
                  ₹{slot.amount}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* "FINANCIAL WRAPPED" 9:16 INSTAGRAM STORY CARD MODAL */}
      {isWrapModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Financial Wrapped 9:16 Instagram Story Card"
          onClick={() => setIsWrapModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[370px] max-h-[92vh] overflow-y-auto space-y-3"
          >
            {/* Top Modal Bar + Roast Mode Toggle */}
            <div className="flex items-center justify-between px-1 gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-cyan-300">
                9:16 STORY GENERATOR
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isRoastStoryMode}
                  onClick={() => {
                    playProVaultChime();
                    setIsRoastStoryMode((prev) => !prev);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider border flex items-center gap-1 transition-all cursor-pointer ${
                    isRoastStoryMode
                      ? "bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 border-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.5)]"
                      : "bg-slate-900 border-white/15 text-slate-300 hover:text-white"
                  }`}
                >
                  <Flame className="w-3 h-3 fill-current" />
                  <span>Roast Mode: {isRoastStoryMode ? "ON" : "OFF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsWrapModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-900 border border-white/15 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 9:16 Aspect Ratio Card: Savage Cyberpunk Roast Mode vs Standard Wrap */}
            {isRoastStoryMode ? (
              <div
                className="relative w-full aspect-[9/16] rounded-3xl bg-gradient-to-b from-[#06020c] via-[#140520] to-[#040108] border-2 border-rose-500/90 shadow-[0_0_50px_rgba(244,63,94,0.4)] p-5 flex flex-col justify-between overflow-hidden select-none"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(244, 63, 94, 0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(244, 63, 94, 0.07) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              >
                {/* Top Cyberpunk Roast Header */}
                <div className="space-y-1.5 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-black uppercase tracking-[0.22em] text-rose-400 flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-rose-500 text-rose-400" />
                      KHARCHE · SAVAGE ROAST
                    </span>
                    <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/50 text-rose-300">
                      ROAST MODE
                    </span>
                  </div>

                  <h3 className="text-xl font-black tracking-wider uppercase text-white drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]">
                    {wrapData.wrapHeadline}
                  </h3>
                </div>

                {/* Center Savage Cyberpunk Telemetry */}
                <div className="space-y-3 my-auto py-1 relative z-10">
                  {/* 1. OVERSPEND REPORT: 509% DEFICIT */}
                  <div className="p-3.5 rounded-2xl bg-[#260616]/90 border-2 border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.3)] space-y-1">
                    <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-rose-300">
                      🚨 CRITICAL WALLET BREACH
                    </span>
                    <p className="font-mono text-base font-black tracking-tight text-rose-400 uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
                      OVERSPEND REPORT: 509% DEFICIT
                    </p>
                  </div>

                  {/* 2. Top Culprit: Chai & Chicken */}
                  <div className="p-3.5 rounded-2xl bg-[#0d0618]/95 border border-amber-400/60 space-y-1.5 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-300">
                        🎯 PRIMARY BUDGET ASSASSIN
                      </span>
                      <span className="text-[10px] font-mono font-black text-rose-300">
                        −₹{wrapData.totalSpent.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-lg font-black text-white tracking-tight">
                      Top Culprit: Chai &amp; Chicken
                    </p>
                    <p className="text-[10px] font-mono text-cyan-300">
                      Garibi Risk: 99.9% · Streak: {streakDays}d
                    </p>
                  </div>

                  {/* 3. Stark Verdict: "Thanos wiped your wallet clean." */}
                  <div className="p-4 rounded-2xl bg-[#06030d]/95 border-l-4 border-cyan-400 border border-cyan-500/40 space-y-1.5 shadow-[0_0_25px_rgba(0,240,255,0.2)]">
                    <span className="text-[9px] font-mono font-black uppercase tracking-widest text-cyan-300 block">
                      🤖 STARK VERDICT // UNFILTERED
                    </span>
                    <p className="text-base font-black text-white leading-snug tracking-tight">
                      &ldquo;Thanos wiped your wallet clean.&rdquo;
                    </p>
                    <p className="text-[10px] font-mono text-rose-300 font-bold uppercase pt-0.5">
                      Snap Impact: ₹0 Survival Runway Left
                    </p>
                  </div>
                </div>

                {/* Story Footer */}
                <div className="pt-2 border-t border-rose-500/30 flex items-center justify-between text-[9px] font-mono text-rose-300/80 relative z-10">
                  <span>KHARCHE · CYBERPUNK ROAST</span>
                  <span className="text-cyan-300 font-bold">1080×1920 PNG</span>
                </div>
              </div>
            ) : (
              <div
                className="relative w-full aspect-[9/16] rounded-3xl bg-gradient-to-b from-[#03060c] via-[#070d19] to-[#020408] border-2 border-cyan-400/80 shadow-[0_0_45px_rgba(0,240,255,0.3)] p-5 flex flex-col justify-between overflow-hidden select-none"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(0, 240, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 240, 255, 0.05) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              >
                {/* Top Brand & High-Contrast Neon User Name */}
                <div className="space-y-1.5 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-cyan-300">
                      ⚡ KHARCHE · SUNDAY WRAP
                    </span>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300">
                      {rangeDays}D TELEMETRY
                    </span>
                  </div>

                  <h3 className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-white via-cyan-200 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]">
                    {wrapData.wrapHeadline}
                  </h3>
                </div>

                {/* Middle Telemetry Blocks: Spent vs Saved + Top Leak + Streak */}
                <div className="space-y-2.5 my-auto py-2 relative z-10">
                  {/* Total Spent vs Saved */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-[#0a1222]/90 border border-cyan-400/40 shadow-inner">
                    <div>
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">
                        TOTAL SPENT
                      </span>
                      <span className="font-mono text-lg font-black text-rose-400">
                        ₹{wrapData.totalSpent.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="border-l border-white/10 pl-2.5">
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">
                        VAULT SAVED
                      </span>
                      <span className="font-mono text-lg font-black text-emerald-400">
                        ₹{wrapData.totalSaved.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Top Leak Category & Streak Count */}
                  <div className="p-3 rounded-2xl bg-[#0a1222]/90 border border-amber-400/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-amber-300">
                        TOP LEAK CATEGORY
                      </span>
                      <span className="text-[10px] font-mono font-black text-amber-200">
                        ₹{wrapData.topLeakAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-base font-black text-white tracking-tight">
                      {wrapData.topLeakDisplay}
                    </p>
                    <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">DISCIPLINE STREAK</span>
                      <span className="font-black text-cyan-300 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        {streakDays} Days Active
                      </span>
                    </div>
                  </div>

                  {/* Sarcastic JARVIS Executive Review Quote */}
                  <div className="p-3.5 rounded-2xl bg-[#050912]/95 border-l-2 border-cyan-400 border border-cyan-500/30 space-y-1.5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-black uppercase tracking-widest text-cyan-300">
                        🤖 JARVIS EXECUTIVE REVIEW
                      </span>
                    </div>
                    <p className="text-[11px] font-mono font-black text-rose-300 uppercase">
                      {wrapData.survivalStatus}
                    </p>
                    <p className="text-xs text-cyan-50/95 italic leading-relaxed">
                      &ldquo;{wrapData.executiveReview}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Story Footer */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-slate-400 relative z-10">
                  <span>KHARCHE · BLACK EDITION</span>
                  <span className="text-cyan-300 font-bold">STARK HUD v3.8</span>
                </div>
              </div>
            )}

            {wrapNotice && (
              <p className="text-center text-xs font-mono font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-400/40 rounded-xl py-2 px-3">
                {wrapNotice}
              </p>
            )}

            {/* 1-Tap Save & Share Actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => void handleDownloadStoryImage()}
                className="h-11 rounded-2xl bg-[#0d1424] hover:bg-[#131d33] border border-cyan-400/50 text-cyan-200 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Download className="w-4 h-4 text-cyan-300" />
                <span>{isRoastStoryMode ? "Download PNG" : "Save Story Image"}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleShareStorySocial()}
                className="h-11 rounded-2xl bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(244,63,94,0.45)] cursor-pointer active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4 stroke-[2.5]" />
                <span>WhatsApp &amp; Insta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
