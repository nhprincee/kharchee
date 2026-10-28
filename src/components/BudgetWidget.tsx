import React, { useState, useEffect, useMemo } from "react";
import {
  Lock,
  Unlock,
  Plus,
  Pencil,
  Check,
  X,
  Timer,
  Volume2,
  Camera,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  TrendingUp,
  PiggyBank,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import type { Expense, ExpenseCategory, FanTheme, QuickAddPreset, TabId } from "../types";
import { QUICK_ADD_PRESETS } from "../data/initialData";
import { getCategoryIcon } from "./SwipeableExpenseRow";
import {
  playMechanicalKeyTick,
  playStarkPowerSurgeSwoosh,
  playMetallicCoinChime,
} from "../utils/celebration";

interface BudgetWidgetProps {
  dailyLimit: number;
  todaySpent: number;
  lockdownActive: boolean;
  theme: FanTheme;
  expenses?: Expense[];
  streakDays?: number;
  stealthMode?: boolean;
  onUpdateLimit: (newLimit: number) => void;
  onToggleLockdown: () => void;
  onOpenAddModal: () => void;
  onOpenAddIncomeModal?: () => void;
  onOpenScanReceiptModal?: () => void;
  onNavigateTab?: (tab: TabId) => void;
  onQuickAdd: (preset: QuickAddPreset) => void;
  onTriggerCelebration?: (type: "streak" | "shield") => void;
  onTriggerFakeMomCall?: () => void;
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: "#6366f1",
  "Chai & Snacks": "#f59e0b",
  Transport: "#38bdf8",
  Grocery: "#10b981",
  Entertainment: "#a855f7",
  Bills: "#f43f5e",
  Shopping: "#ec4899",
  Salary: "#10b981",
  Freelance: "#34d399",
  Cashback: "#2dd4bf",
};

function getNextMorningCooldown(): string {
  const now = new Date();
  const nextMorning = new Date(now);
  if (now.getHours() >= 6) {
    nextMorning.setDate(now.getDate() + 1);
  }
  nextMorning.setHours(6, 0, 0, 0);

  const diffMs = Math.max(0, nextMorning.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export const BudgetWidget: React.FC<BudgetWidgetProps> = ({
  dailyLimit,
  todaySpent,
  lockdownActive,
  expenses = [],
  stealthMode = false,
  onUpdateLimit,
  onToggleLockdown,
  onOpenAddModal,
  onOpenAddIncomeModal,
  onOpenScanReceiptModal,
  onNavigateTab,
  onQuickAdd,
  onTriggerCelebration,
}) => {
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState(String(dailyLimit));
  const [cooldownStr, setCooldownStr] = useState<string>(() => getNextMorningCooldown());

  const nowDate = new Date();
  const realDayOfMonth = nowDate.getDate();
  const totalDaysInMonth = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth() + 1,
    0
  ).getDate();
  const [simulatedPhase, setSimulatedPhase] = useState<"auto" | "optimal" | "month-end">("auto");

  const isMonthEndPhase =
    simulatedPhase === "month-end"
      ? true
      : simulatedPhase === "optimal"
      ? false
      : realDayOfMonth >= 21;

  const activeDayDisplay =
    simulatedPhase === "optimal"
      ? Math.min(realDayOfMonth, 12)
      : simulatedPhase === "month-end"
      ? Math.max(realDayOfMonth, 25)
      : realDayOfMonth;

  const daysUntilFirst = Math.max(1, totalDaysInMonth - activeDayDisplay + 1);

  useEffect(() => {
    if (!lockdownActive) return;
    setCooldownStr(getNextMorningCooldown());
    const interval = setInterval(() => {
      setCooldownStr(getNextMorningCooldown());
    }, 1000);
    return () => clearInterval(interval);
  }, [lockdownActive]);

  // Financial Metrics derived strictly from real user records
  const financialTotals = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const allIncome = expenses.filter((e) => e.type === "income");
    const allExpenses = expenses.filter((e) => e.type !== "income");

    const totalIncomeAllTime = allIncome.reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesAllTime = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netBalanceAllTime = totalIncomeAllTime - totalExpensesAllTime;

    const thisMonthIncome = allIncome.filter((e) => {
      const d = new Date(e.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const thisMonthExpenses = allExpenses.filter((e) => {
      const d = new Date(e.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthIncome = thisMonthIncome.reduce((sum, e) => sum + e.amount, 0);
    const monthExpenses = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const monthNetBalance = monthIncome - monthExpenses;

    const monthlyBudget = dailyLimit * 30;
    const remainingMonthlyBudget = monthlyBudget - monthExpenses;

    return {
      totalIncomeAllTime,
      totalExpensesAllTime,
      netBalanceAllTime,
      monthIncome,
      monthExpenses,
      monthNetBalance,
      monthlyBudget,
      remainingMonthlyBudget,
      incomeCount: thisMonthIncome.length,
      expenseCount: thisMonthExpenses.length,
      allTimeIncomeCount: allIncome.length,
      allTimeExpenseCount: allExpenses.length,
    };
  }, [expenses, dailyLimit]);

  // Monthly Income vs Expense Chart Data (Last 4 Weekly Buckets in Current Month + Summary)
  const cashflowChartData = useMemo(() => {
    const buckets: Array<{
      label: string;
      dateRange: string;
      income: number;
      expense: number;
    }> = [];
    const now = new Date();

    for (let w = 3; w >= 0; w--) {
      const end = new Date(now);
      end.setDate(now.getDate() - w * 7);
      end.setHours(23, 59, 59, 999);

      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      let inc = 0;
      let exp = 0;
      for (const item of expenses) {
        const ts = new Date(item.timestamp).getTime();
        if (ts >= start.getTime() && ts <= end.getTime()) {
          if (item.type === "income") inc += item.amount;
          else exp += item.amount;
        }
      }

      const startLabel = start.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const endLabel = end.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

      buckets.push({
        label: w === 0 ? "This Week" : `W-${w}`,
        dateRange: `${startLabel} – ${endLabel}`,
        income: inc,
        expense: exp,
      });
    }
    return buckets;
  }, [expenses]);

  const maxChartVal = useMemo(() => {
    const vals = cashflowChartData.flatMap((b) => [b.income, b.expense]);
    return Math.max(1000, ...vals);
  }, [cashflowChartData]);

  const chartTotalIncome = useMemo(
    () => cashflowChartData.reduce((sum, b) => sum + b.income, 0),
    [cashflowChartData]
  );
  const chartTotalExpense = useMemo(
    () => cashflowChartData.reduce((sum, b) => sum + b.expense, 0),
    [cashflowChartData]
  );

  // Category-Wise Spending Breakdown
  const categoryBreakdown = useMemo(() => {
    const expenseItems = expenses.filter((e) => e.type !== "income");
    const totalOutflow = expenseItems.reduce((s, e) => s + e.amount, 0);
    const map = new Map<ExpenseCategory, { amount: number; count: number }>();

    for (const item of expenseItems) {
      const prev = map.get(item.category) || { amount: 0, count: 0 };
      map.set(item.category, { amount: prev.amount + item.amount, count: prev.count + 1 });
    }

    return Array.from(map.entries())
      .map(([category, stats]) => ({
        category,
        amount: stats.amount,
        count: stats.count,
        percent: totalOutflow > 0 ? Math.round((stats.amount / totalOutflow) * 100) : 0,
        color: CATEGORY_COLORS[category] || "#6366f1",
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const remaining = dailyLimit - todaySpent;
  const rawPercent = dailyLimit > 0 ? Math.round((todaySpent / dailyLimit) * 100) : 0;
  const clampedPercent = Math.min(100, Math.max(0, rawPercent));
  const isOverBudget = remaining < 0;
  const isSafeBurnBreached = isOverBudget || rawPercent >= 100;
  const isShieldActive = dailyLimit > 0 && todaySpent <= dailyLimit * 0.5;

  const monthName = nowDate.toLocaleString("en-IN", { month: "short", year: "numeric" });

  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(limitInput);
    if (!Number.isNaN(parsed) && parsed >= 50 && parsed <= 100000) {
      onUpdateLimit(Math.round(parsed));
      setIsEditingLimit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. FINANCIAL SUMMARY CARDS (4-Card SaaS KPI Grid) */}
      <section aria-label="Financial Summary Cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: All-Time Net Balance */}
        <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              All-Time Balance
            </span>
            <span className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {stealthMode
                ? "₹0"
                : `${financialTotals.netBalanceAllTime >= 0 ? "+" : "−"}₹${Math.abs(
                    financialTotals.netBalanceAllTime
                  ).toLocaleString("en-IN")}`}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  financialTotals.netBalanceAllTime >= 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {financialTotals.netBalanceAllTime >= 0 ? "Surplus" : "Deficit"}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                Month: {financialTotals.monthNetBalance >= 0 ? "+" : "−"}₹{Math.abs(financialTotals.monthNetBalance).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: This Month Inflow */}
        <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              This Month Inflow
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-extrabold text-emerald-400 tracking-tight">
              {stealthMode ? "₹0" : `+₹${financialTotals.monthIncome.toLocaleString("en-IN")}`}
            </p>
            <div className="flex items-center justify-between gap-1 mt-1">
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                {financialTotals.incomeCount} inflows
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                All-time: +₹{financialTotals.totalIncomeAllTime.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: This Month Outflow */}
        <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              This Month Outflow
            </span>
            <span className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {stealthMode ? "₹0" : `−₹${financialTotals.monthExpenses.toLocaleString("en-IN")}`}
            </p>
            <div className="flex items-center justify-between gap-1 mt-1">
              <span className="text-[11px] text-slate-400 font-mono tabular-nums truncate">
                Today: ₹{stealthMode ? "0" : todaySpent.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                All-time: −₹{financialTotals.totalExpensesAllTime.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Daily Budget Left */}
        <div
          id="tour-budget-ring"
          className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Daily Budget Left
            </span>
            <span className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
              <PiggyBank className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <p
              className={`font-mono tabular-nums text-xl sm:text-2xl font-extrabold tracking-tight ${
                isOverBudget ? "text-rose-400" : "text-white"
              }`}
            >
              {stealthMode
                ? "₹0"
                : `${isOverBudget ? "−" : ""}₹${Math.abs(remaining).toLocaleString("en-IN")}`}
            </p>
            <div className="flex items-center justify-between gap-1 mt-1">
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                {stealthMode ? "Stealth" : `${rawPercent}% of ₹${dailyLimit}`}
              </span>
              {!isEditingLimit ? (
                <button
                  type="button"
                  onClick={() => {
                    setLimitInput(String(dailyLimit));
                    setIsEditingLimit(true);
                  }}
                  className="text-[10px] font-semibold text-indigo-300 hover:text-indigo-200 flex items-center gap-0.5 cursor-pointer"
                  title="Edit daily budget limit"
                >
                  <Pencil className="w-2.5 h-2.5" />
                  <span>Edit</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Inline Daily Budget Limit Editor & Progress Bar Card */}
      <section
        aria-label="Daily Budget Runway"
        className="rounded-2xl bg-[#0c1220] border border-slate-800/90 p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isSafeBurnBreached
                  ? "bg-rose-400 animate-ping"
                  : isMonthEndPhase
                  ? "bg-amber-400"
                  : "bg-emerald-400"
              }`}
            />
            <span className="text-xs font-semibold text-slate-200">
              {monthName} Daily Budget Progress
            </span>
            {lockdownActive && (
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300">
                Locked
              </span>
            )}
            {isOverBudget && (
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-300">
                Over Limit
              </span>
            )}
          </div>

          {isEditingLimit ? (
            <form onSubmit={handleSaveLimit} className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <span className="absolute left-2 text-xs font-mono text-slate-400">₹</span>
                <input
                  type="number"
                  min={50}
                  max={100000}
                  step={10}
                  value={limitInput}
                  onChange={(e) => {
                    playMechanicalKeyTick();
                    setLimitInput(e.target.value);
                  }}
                  autoFocus
                  className="w-24 h-7 pl-5 pr-2 rounded-lg bg-slate-950 border border-indigo-500/50 text-xs font-mono tabular-nums text-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                aria-label="Save limit"
                className="px-2 h-7 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingLimit(false)}
                aria-label="Cancel editing"
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
              <span>
                Spent{" "}
                <strong className="text-slate-100">
                  ₹{stealthMode ? "0" : todaySpent.toLocaleString("en-IN")}
                </strong>{" "}
                / ₹{stealthMode ? "0" : dailyLimit.toLocaleString("en-IN")}
              </span>
              <button
                type="button"
                onClick={() => {
                  playMechanicalKeyTick();
                  setSimulatedPhase((prev) =>
                    prev === "auto"
                      ? isMonthEndPhase
                        ? "optimal"
                        : "month-end"
                      : prev === "optimal"
                      ? "month-end"
                      : "auto"
                  );
                }}
                className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer"
              >
                Day {activeDayDisplay} · {daysUntilFirst}d left
              </button>
              {isShieldActive && (
                <button
                  type="button"
                  onClick={() => onTriggerCelebration?.("shield")}
                  className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                >
                  Shield ≤50%
                </button>
              )}
            </div>
          )}
        </div>

        <div
          role="img"
          aria-label={`${rawPercent} percent of daily budget used`}
          className="w-full h-2 rounded-full bg-slate-900 overflow-hidden"
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.max(2, clampedPercent)}%`,
              backgroundColor: isOverBudget
                ? "#f43f5e"
                : rawPercent >= 80
                ? "#f59e0b"
                : "#6366f1",
            }}
          />
        </div>

        {lockdownActive && (
          <div
            role="region"
            aria-label="Emergency Lockdown HUD Overlay"
            className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 flex items-center justify-between gap-3 flex-wrap"
          >
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 block">
                Emergency Budget Lockdown Active
              </span>
              <p className="text-xs text-slate-300 mt-0.5">
                Discretionary spending paused until <span className="text-white font-semibold">06:00 AM</span>.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-amber-500/30 font-mono text-xs text-amber-300 tabular-nums">
              <Timer className="w-3.5 h-3.5" />
              <span>{cooldownStr}</span>
            </div>
          </div>
        )}
      </section>

      {/* 2. QUICK ACTIONS BAR (Add Expense, Add Income, Scan Receipt, Split Khata, Lockdown) */}
      <section aria-label="Quick Actions" className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddIncomeModal || onOpenAddModal}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/35 text-emerald-300 transition-colors cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Add Income</span>
          </button>

          <button
            type="button"
            onClick={onOpenScanReceiptModal || onOpenAddModal}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 bg-[#0c1220] hover:bg-[#131c31] border border-slate-800 text-slate-200 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scan Receipt</span>
          </button>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("khata")}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 bg-[#0c1220] hover:bg-[#131c31] border border-slate-800 text-slate-200 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-violet-400" />
              <span>Split Khata</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleLockdown}
            className={`min-h-[44px] px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border transition-colors cursor-pointer col-span-2 sm:col-span-1 ${
              lockdownActive
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                : "bg-[#0c1220] hover:bg-[#131c31] border-slate-800 text-slate-300"
            }`}
          >
            {lockdownActive ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>Lift Lockdown</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Lockdown</span>
              </>
            )}
          </button>
        </div>

        {/* 1-Tap Preset Chips */}
        <div id="tour-quick-add" className="pt-1">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              1-Tap Instant Log
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              <Volume2 className="w-3 h-3" />
              <button
                type="button"
                onClick={() => playMechanicalKeyTick()}
                className="hover:text-slate-300 cursor-pointer"
              >
                Tick
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => playStarkPowerSurgeSwoosh()}
                className="hover:text-slate-300 cursor-pointer"
              >
                Swoosh
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => playMetallicCoinChime()}
                className="hover:text-slate-300 cursor-pointer"
              >
                Chime
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {QUICK_ADD_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onQuickAdd(preset)}
                className="min-h-[52px] p-2.5 rounded-xl border border-slate-800/90 bg-[#0c1220] hover:bg-[#131c31] hover:border-indigo-500/40 active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs" aria-hidden="true">
                    {preset.emoji}
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    {preset.label}
                  </span>
                </div>
                <span className="font-mono tabular-nums text-[11px] font-semibold text-indigo-300 mt-0.5">
                  ₹{preset.amount}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SPENDING VISUALIZATION (Monthly Income vs Expense Chart + Category Breakdown) */}
      <section
        aria-label="Spending Visualization"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Monthly Income vs. Expense Chart */}
        <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Monthly Income vs. Expense
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                4-week cashflow comparison ({monthName})
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-emerald-300">
                <span className="w-2 h-2 rounded-xs bg-emerald-500" />
                Income
              </span>
              <span className="flex items-center gap-1 text-indigo-300">
                <span className="w-2 h-2 rounded-xs bg-indigo-500" />
                Expense
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 items-end h-36 pt-4 px-1">
            {cashflowChartData.map((bucket) => {
              const incHeight =
                bucket.income > 0
                  ? Math.max(12, Math.round((bucket.income / maxChartVal) * 100))
                  : 4;
              const expHeight =
                bucket.expense > 0
                  ? Math.max(12, Math.round((bucket.expense / maxChartVal) * 100))
                  : 4;

              return (
                <div
                  key={bucket.label}
                  className="flex flex-col items-center justify-end h-full gap-1.5"
                >
                  <div className="w-full flex items-end justify-center gap-1.5 h-24 px-1 border-b border-slate-800 pb-1">
                    {/* Income Bar */}
                    <div
                      title={`${bucket.dateRange} Income: ₹${bucket.income.toLocaleString("en-IN")}`}
                      style={{ height: `${incHeight}%` }}
                      className="w-3.5 sm:w-4 rounded-t-md bg-emerald-500/85 hover:bg-emerald-400 transition-all"
                    />
                    {/* Expense Bar */}
                    <div
                      title={`${bucket.dateRange} Expense: ₹${bucket.expense.toLocaleString("en-IN")}`}
                      style={{ height: `${expHeight}%` }}
                      className="w-3.5 sm:w-4 rounded-t-md bg-indigo-500/85 hover:bg-indigo-400 transition-all"
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-semibold text-slate-200 block">
                      {bucket.label}
                    </span>
                    <span className="font-mono tabular-nums text-[9px] text-slate-400 block">
                      −₹{bucket.expense.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
            <span>
              4-Wk Inflow:{" "}
              <strong className="text-emerald-400">
                +₹{stealthMode ? "0" : chartTotalIncome.toLocaleString("en-IN")}
              </strong>
            </span>
            <span>
              4-Wk Outflow:{" "}
              <strong className="text-slate-200">
                −₹{stealthMode ? "0" : chartTotalExpense.toLocaleString("en-IN")}
              </strong>
            </span>
          </div>
        </div>

        {/* Category-Wise Spending Breakdown */}
        <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Category Breakdown
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Where your money goes by category
              </p>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab("insights")}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Report</span>
                <TrendingUp className="w-3 h-3" />
              </button>
            )}
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-400">No expense categories recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Proportional Stacked Bar */}
              <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-900">
                {categoryBreakdown.map((item) => (
                  <div
                    key={item.category}
                    style={{
                      width: `${Math.max(item.percent, 4)}%`,
                      backgroundColor: item.color,
                    }}
                    className="h-full border-r border-[#0c1220] last:border-r-0"
                    title={`${item.category}: ₹${item.amount.toLocaleString("en-IN")} (${item.percent}%)`}
                  />
                ))}
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {categoryBreakdown.slice(0, 5).map((stat) => {
                  const Icon = getCategoryIcon(stat.category);
                  return (
                    <div key={stat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-slate-900 border border-slate-800"
                            style={{ color: stat.color }}
                          >
                            <Icon className="w-3 h-3" />
                          </span>
                          <span className="font-medium text-slate-200 truncate">
                            {stat.category}
                          </span>
                        </div>
                        <div className="font-mono tabular-nums text-right shrink-0">
                          <span className="font-bold text-slate-100">
                            {stealthMode ? "₹0" : `₹${stat.amount.toLocaleString("en-IN")}`}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1.5">
                            {stat.percent}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
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
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
