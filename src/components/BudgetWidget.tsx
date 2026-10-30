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
  Calendar,
  AlertTriangle,
  Target,
  Trash2,
} from "lucide-react";
import {
  EXPENSE_ONLY_CATEGORIES,
  INCOME_ONLY_CATEGORIES,
  type CategoryBudgets,
  type Expense,
  type ExpenseCategory,
  type FanTheme,
  type QuickAddPreset,
  type SavingsGoal,
  type TabId,
} from "../types";
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
  categoryBudgets?: CategoryBudgets;
  savingsGoals?: SavingsGoal[];
  onUpdateLimit: (newLimit: number) => void;
  onUpdateCategoryBudget?: (category: ExpenseCategory, limit: number) => void;
  onAddSavingsGoal?: (goal: { title: string; targetAmount: number; savedAmount: number; deadline?: string }) => void;
  onUpdateSavingsGoal?: (goalId: string, savedAmount: number) => void;
  onDeleteSavingsGoal?: (goalId: string) => void;
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

function isIncomeTx(e: Expense): boolean {
  return e.type === "income" || INCOME_ONLY_CATEGORIES.includes(e.category);
}

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
  categoryBudgets = {},
  savingsGoals = [],
  onUpdateLimit,
  onUpdateCategoryBudget,
  onAddSavingsGoal,
  onUpdateSavingsGoal,
  onDeleteSavingsGoal,
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
  const currentMonthIdx = nowDate.getMonth();
  const currentYearNum = nowDate.getFullYear();

  // Dashboard Period Filter State ("month" | "year" | "all")
  const [periodFilter, setPeriodFilter] = useState<"month" | "year" | "all">("month");
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIdx);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);

  // Category Budget Editor State
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null);
  const [catLimitInput, setCatLimitInput] = useState<string>("");

  // Savings Goal Form State
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("");
  const [goalError, setGoalError] = useState("");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalSavedInput, setEditGoalSavedInput] = useState<string>("");

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

  // Available years from transaction records + current year
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentYearNum, currentYearNum - 1]);
    for (const e of expenses) {
      const y = new Date(e.timestamp).getFullYear();
      if (!Number.isNaN(y) && y >= 2000 && y <= 2100) {
        yearsSet.add(y);
      }
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [expenses, currentYearNum]);

  // Filtered transactions matching the selected Dashboard period ("month" | "year" | "all")
  const periodFilteredRecords = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.timestamp);
      if (Number.isNaN(d.getTime())) return false;
      if (periodFilter === "month") {
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }
      if (periodFilter === "year") {
        return d.getFullYear() === selectedYear;
      }
      return true;
    });
  }, [expenses, periodFilter, selectedMonth, selectedYear]);

  // Financial Metrics derived strictly from real user records (Income and Expenses strictly separated)
  const financialTotals = useMemo(() => {
    const allIncome = expenses.filter((e) => isIncomeTx(e));
    const allExpenses = expenses.filter((e) => !isIncomeTx(e));

    const totalIncomeAllTime = allIncome.reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesAllTime = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netBalanceAllTime = totalIncomeAllTime - totalExpensesAllTime;

    const periodIncomeItems = periodFilteredRecords.filter((e) => isIncomeTx(e));
    const periodExpenseItems = periodFilteredRecords.filter((e) => !isIncomeTx(e));

    const periodIncome = periodIncomeItems.reduce((sum, e) => sum + e.amount, 0);
    const periodExpenses = periodExpenseItems.reduce((sum, e) => sum + e.amount, 0);
    const periodNetBalance = periodIncome - periodExpenses;

    // Active Month Expenses (for Remaining Monthly Budget calculation)
    const activeMonthTarget = periodFilter === "month" ? selectedMonth : currentMonthIdx;
    const activeYearTarget = periodFilter === "all" ? currentYearNum : selectedYear;

    const activeMonthExpenseItems = allExpenses.filter((e) => {
      const d = new Date(e.timestamp);
      return d.getMonth() === activeMonthTarget && d.getFullYear() === activeYearTarget;
    });
    const activeMonthIncomeItems = allIncome.filter((e) => {
      const d = new Date(e.timestamp);
      return d.getMonth() === activeMonthTarget && d.getFullYear() === activeYearTarget;
    });

    const monthExpenses = activeMonthExpenseItems.reduce((sum, e) => sum + e.amount, 0);
    const monthIncome = activeMonthIncomeItems.reduce((sum, e) => sum + e.amount, 0);

    // Monthly budget is dailyLimit * daysInMonth (or 30)
    const daysInSelectedMonth = new Date(activeYearTarget, activeMonthTarget + 1, 0).getDate() || 30;
    const monthlyBudget = dailyLimit * daysInSelectedMonth;
    const remainingMonthlyBudget = monthlyBudget - monthExpenses;
    const monthlyBudgetUsedPercent =
      monthlyBudget > 0 ? Math.round((monthExpenses / monthlyBudget) * 100) : 0;

    return {
      totalIncomeAllTime,
      totalExpensesAllTime,
      netBalanceAllTime,
      periodIncome,
      periodExpenses,
      periodNetBalance,
      periodIncomeCount: periodIncomeItems.length,
      periodExpenseCount: periodExpenseItems.length,
      monthIncome,
      monthExpenses,
      monthlyBudget,
      remainingMonthlyBudget,
      monthlyBudgetUsedPercent,
      allTimeIncomeCount: allIncome.length,
      allTimeExpenseCount: allExpenses.length,
    };
  }, [
    expenses,
    periodFilteredRecords,
    periodFilter,
    selectedMonth,
    selectedYear,
    currentMonthIdx,
    currentYearNum,
    dailyLimit,
  ]);

  // Monthly Income vs Expense Chart Data (Last 4 Weekly Buckets + Summary)
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
          if (isIncomeTx(item)) inc += item.amount;
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

  // Category-Wise Spending Breakdown (Strictly Expenses Only for selected period)
  const categoryBreakdown = useMemo(() => {
    const expenseItems = periodFilteredRecords.filter((e) => !isIncomeTx(e));
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
  }, [periodFilteredRecords]);

  // Active Month Category Spend Map (Expenses Only) for Category Monthly Budgets
  const activeMonthCategorySpend = useMemo(() => {
    const activeMonthTarget = periodFilter === "month" ? selectedMonth : currentMonthIdx;
    const activeYearTarget = periodFilter === "all" ? currentYearNum : selectedYear;
    const map: Record<string, number> = {};

    for (const e of expenses) {
      if (isIncomeTx(e)) continue;
      const d = new Date(e.timestamp);
      if (d.getMonth() === activeMonthTarget && d.getFullYear() === activeYearTarget) {
        map[e.category] = (map[e.category] || 0) + e.amount;
      }
    }
    return map;
  }, [expenses, periodFilter, selectedMonth, selectedYear, currentMonthIdx, currentYearNum]);

  const categoryBudgetStatuses = useMemo(() => {
    return EXPENSE_ONLY_CATEGORIES.map((cat) => {
      const spent = activeMonthCategorySpend[cat] || 0;
      const limit = categoryBudgets[cat] || 0;
      const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const status: "unconfigured" | "safe" | "warning" | "exceeded" =
        limit <= 0
          ? "unconfigured"
          : spent >= limit
          ? "exceeded"
          : percent >= 80
          ? "warning"
          : "safe";
      return {
        category: cat,
        spent,
        limit,
        percent,
        status,
        color: CATEGORY_COLORS[cat] || "#6366f1",
      };
    });
  }, [activeMonthCategorySpend, categoryBudgets]);

  const activeCategoryAlerts = useMemo(
    () =>
      categoryBudgetStatuses.filter(
        (c) => c.status === "exceeded" || c.status === "warning"
      ),
    [categoryBudgetStatuses]
  );

  const remaining = dailyLimit - todaySpent;
  const rawPercent = dailyLimit > 0 ? Math.round((todaySpent / dailyLimit) * 100) : 0;
  const clampedPercent = Math.min(100, Math.max(0, rawPercent));
  const isOverBudget = remaining < 0;
  const isSafeBurnBreached = isOverBudget || rawPercent >= 100;
  const isShieldActive = dailyLimit > 0 && todaySpent <= dailyLimit * 0.5;

  const monthName = new Date(
    periodFilter === "all" ? currentYearNum : selectedYear,
    periodFilter === "month" ? selectedMonth : currentMonthIdx,
    1
  ).toLocaleString("en-IN", { month: "short", year: "numeric" });

  const periodLabel =
    periodFilter === "month"
      ? monthName
      : periodFilter === "year"
      ? `Year ${selectedYear}`
      : "All-Time";

  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(limitInput);
    if (!Number.isNaN(parsed) && parsed >= 50 && parsed <= 100000) {
      onUpdateLimit(Math.round(parsed));
      setIsEditingLimit(false);
    }
  };

  const handleSaveCategoryLimit = (cat: ExpenseCategory) => {
    const parsed = Number(catLimitInput);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 10000000) {
      onUpdateCategoryBudget?.(cat, Math.round(parsed));
      setEditingCat(null);
      setCatLimitInput("");
    }
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = Number(goalTarget);
    const savedNum = goalSaved.trim() ? Number(goalSaved) : 0;
    if (!goalTitle.trim()) {
      setGoalError("Enter a savings goal name (e.g. Emergency Fund, New Laptop).");
      return;
    }
    if (Number.isNaN(targetNum) || targetNum <= 0 || targetNum > 100000000) {
      setGoalError("Enter a valid target amount greater than ₹0.");
      return;
    }
    if (Number.isNaN(savedNum) || savedNum < 0 || savedNum > targetNum * 10) {
      setGoalError("Enter a valid current saved amount.");
      return;
    }
    onAddSavingsGoal?.({
      title: goalTitle.trim(),
      targetAmount: Math.round(targetNum),
      savedAmount: Math.round(savedNum),
    });
    setGoalTitle("");
    setGoalTarget("");
    setGoalSaved("");
    setGoalError("");
    setIsAddingGoal(false);
  };

  const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div className="space-y-6">
      {/* 0. DASHBOARD PERIOD FILTER BAR (Monthly / Yearly / All-Time) */}
      <section
        aria-label="Dashboard Time Period Filter"
        className="p-3 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
          </span>
          <div>
            <span className="text-xs font-bold text-slate-100 block">
              Financial Overview · {periodLabel}
            </span>
            <span className="text-[11px] text-slate-400">
              Income and expenses are tracked separately across all metrics
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          {/* Segmented Period Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
            {(
              [
                { id: "month", label: "Monthly" },
                { id: "year", label: "Yearly" },
                { id: "all", label: "All-Time" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriodFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  periodFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Month & Year Selectors */}
          {periodFilter === "month" && (
            <select
              aria-label="Select Month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-8 px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          )}

          {(periodFilter === "month" || periodFilter === "year") && (
            <select
              aria-label="Select Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-8 px-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* 1. FINANCIAL SUMMARY CARDS (Total Balance, Total Income, Total Expenses, Remaining Monthly Budget) */}
      <section aria-label="Financial Summary Cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Balance (Available Balance = Income − Expenses) */}
        <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Balance ({periodFilter === "all" ? "All-Time" : periodLabel})
            </span>
            <span className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {stealthMode
                ? "₹0"
                : `${financialTotals.periodNetBalance >= 0 ? "+" : "−"}₹${Math.abs(
                    financialTotals.periodNetBalance
                  ).toLocaleString("en-IN")}`}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  financialTotals.periodNetBalance >= 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {financialTotals.periodNetBalance >= 0 ? "Surplus" : "Deficit"}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                All-time: {financialTotals.netBalanceAllTime >= 0 ? "+" : "−"}₹
                {Math.abs(financialTotals.netBalanceAllTime).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Income */}
        <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Income ({periodFilter === "all" ? "All-Time" : periodLabel})
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-extrabold text-emerald-400 tracking-tight">
              {stealthMode ? "₹0" : `+₹${financialTotals.periodIncome.toLocaleString("en-IN")}`}
            </p>
            <div className="flex items-center justify-between gap-1 mt-1">
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                {financialTotals.periodIncomeCount} inflows
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                All-time: +₹{financialTotals.totalIncomeAllTime.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Expenses (Strictly Excludes Income) */}
        <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Expenses ({periodFilter === "all" ? "All-Time" : periodLabel})
            </span>
            <span className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="font-mono tabular-nums text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {stealthMode ? "₹0" : `−₹${financialTotals.periodExpenses.toLocaleString("en-IN")}`}
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

        {/* Card 4: Remaining Monthly Budget */}
        <div
          id="tour-budget-ring"
          className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Remaining Monthly Budget
            </span>
            <span className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
              <PiggyBank className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <p
              className={`font-mono tabular-nums text-xl sm:text-2xl font-extrabold tracking-tight ${
                financialTotals.remainingMonthlyBudget < 0 ? "text-rose-400" : "text-white"
              }`}
            >
              {stealthMode
                ? "₹0"
                : `${financialTotals.remainingMonthlyBudget < 0 ? "−" : ""}₹${Math.abs(
                    financialTotals.remainingMonthlyBudget
                  ).toLocaleString("en-IN")}`}
            </p>
            <div className="flex items-center justify-between gap-1 mt-1">
              <span className="text-[11px] text-slate-400 font-mono tabular-nums truncate">
                {stealthMode
                  ? "Stealth"
                  : `${financialTotals.monthlyBudgetUsedPercent}% of ₹${financialTotals.monthlyBudget.toLocaleString(
                      "en-IN"
                    )}/mo`}
              </span>
              {!isEditingLimit ? (
                <button
                  type="button"
                  onClick={() => {
                    setLimitInput(String(dailyLimit));
                    setIsEditingLimit(true);
                  }}
                  className="text-[10px] font-semibold text-indigo-300 hover:text-indigo-200 flex items-center gap-0.5 cursor-pointer shrink-0"
                  title="Edit daily & monthly budget limit"
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

      {/* 4. CATEGORY MONTHLY BUDGETS & SAVINGS GOALS (Requirement 4) */}
      <section
        aria-label="Category Monthly Budgets and Savings Goals"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Left: Category Monthly Budgets */}
        <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Category Monthly Budgets ({monthName})
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Set monthly limits per expense category · Income is never counted as spending
              </p>
            </div>
            {activeCategoryAlerts.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-[10px] font-mono font-bold text-rose-300">
                <AlertTriangle className="w-3 h-3" />
                <span>{activeCategoryAlerts.length} Alert{activeCategoryAlerts.length > 1 ? "s" : ""}</span>
              </span>
            )}
          </div>

          {activeCategoryAlerts.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-950/25 border border-amber-500/35 space-y-1">
              {activeCategoryAlerts.map((alert) => (
                <p key={alert.category} className="text-[11px] text-amber-200 flex items-center justify-between gap-2">
                  <span>
                    {alert.status === "exceeded" ? "🚨 Exceeded:" : "⚠️ Approaching limit:"}{" "}
                    <strong className="text-white">{alert.category}</strong>
                  </span>
                  <span className="font-mono tabular-nums font-bold">
                    ₹{alert.spent.toLocaleString("en-IN")} / ₹{alert.limit.toLocaleString("en-IN")} ({alert.percent}%)
                  </span>
                </p>
              ))}
            </div>
          )}

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {categoryBudgetStatuses.map((item) => {
              const Icon = getCategoryIcon(item.category);
              const isEditingThis = editingCat === item.category;
              const barColor =
                item.status === "exceeded"
                  ? "#f43f5e"
                  : item.status === "warning"
                  ? "#f59e0b"
                  : item.color;

              return (
                <div
                  key={item.category}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-slate-900 border border-slate-800"
                        style={{ color: item.color }}
                      >
                        <Icon className="w-3 h-3" />
                      </span>
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {item.category}
                      </span>
                      {item.status === "exceeded" && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-[9px] font-mono font-bold text-rose-300 uppercase">
                          Over Limit
                        </span>
                      )}
                      {item.status === "warning" && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono font-bold text-amber-300 uppercase">
                          Near Limit ({item.percent}%)
                        </span>
                      )}
                    </div>

                    {isEditingThis ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400">₹</span>
                        <input
                          type="number"
                          min={0}
                          max={1000000}
                          step={100}
                          value={catLimitInput}
                          onChange={(e) => setCatLimitInput(e.target.value)}
                          placeholder="e.g. 3000"
                          className="w-20 h-6 px-1.5 rounded bg-slate-900 border border-indigo-500/60 text-[11px] font-mono text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCategoryLimit(item.category)}
                          className="px-2 h-6 rounded bg-indigo-600 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCat(null)}
                          className="px-1.5 h-6 rounded bg-slate-800 text-slate-300 text-[10px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono tabular-nums text-[11px] text-slate-300">
                          {stealthMode
                            ? "₹0"
                            : item.limit > 0
                            ? `₹${item.spent.toLocaleString("en-IN")} / ₹${item.limit.toLocaleString("en-IN")}`
                            : `Spent ₹${item.spent.toLocaleString("en-IN")}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCat(item.category);
                            setCatLimitInput(item.limit > 0 ? String(item.limit) : "");
                          }}
                          className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                          <span>{item.limit > 0 ? "Edit" : "Set Limit"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {item.limit > 0 && (
                    <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(3, item.percent))}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Savings Goals */}
        <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800/90 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Savings Goals
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Track target amounts, saved reserves, and milestone progress
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddingGoal((v) => !v);
                setGoalError("");
              }}
              className="px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingGoal ? "Close" : "New Goal"}</span>
            </button>
          </div>

          {isAddingGoal && (
            <form
              onSubmit={handleCreateGoal}
              className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Goal title (e.g. Emergency Fund)"
                  value={goalTitle}
                  onChange={(e) => {
                    setGoalTitle(e.target.value);
                    setGoalError("");
                  }}
                  className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Target ₹ (e.g. 50000)"
                  value={goalTarget}
                  onChange={(e) => {
                    setGoalTarget(e.target.value);
                    setGoalError("");
                  }}
                  className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Saved so far ₹ (0)"
                  value={goalSaved}
                  onChange={(e) => {
                    setGoalSaved(e.target.value);
                    setGoalError("");
                  }}
                  className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none"
                />
              </div>
              {goalError && <p className="text-[11px] text-rose-400">{goalError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                >
                  Create Goal
                </button>
              </div>
            </form>
          )}

          {savingsGoals.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-slate-400">
                No savings goals added yet. Create a target to track your progress!
              </p>
              {!isAddingGoal && (
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-emerald-300 hover:text-emerald-200 cursor-pointer"
                >
                  + Add First Savings Goal
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {savingsGoals.map((goal) => {
                const pct =
                  goal.targetAmount > 0
                    ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
                    : 0;
                const isEditingSaved = editingGoalId === goal.id;

                return (
                  <div
                    key={goal.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100 truncate">
                            {goal.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                              pct >= 100
                                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                                : "bg-indigo-500/15 border border-indigo-500/30 text-indigo-300"
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                        <p className="font-mono tabular-nums text-[11px] text-slate-400 mt-0.5">
                          {stealthMode
                            ? "₹0 / ₹0"
                            : `Saved ₹${goal.savedAmount.toLocaleString("en-IN")} of ₹${goal.targetAmount.toLocaleString("en-IN")}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSavingsGoal?.(goal.id, goal.savedAmount + 500)
                          }
                          title="Add ₹500 to saved amount"
                          className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 cursor-pointer"
                        >
                          +₹500
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGoalId(isEditingSaved ? null : goal.id);
                            setEditGoalSavedInput(String(goal.savedAmount));
                          }}
                          title="Edit saved amount"
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSavingsGoal?.(goal.id)}
                          title="Delete savings goal"
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {isEditingSaved && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-mono text-slate-400">Saved ₹:</span>
                        <input
                          type="number"
                          min={0}
                          value={editGoalSavedInput}
                          onChange={(e) => setEditGoalSavedInput(e.target.value)}
                          className="w-24 h-6 px-2 rounded bg-slate-900 border border-emerald-500/50 text-xs font-mono text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nextVal = Number(editGoalSavedInput);
                            if (!Number.isNaN(nextVal) && nextVal >= 0) {
                              onUpdateSavingsGoal?.(goal.id, Math.round(nextVal));
                              setEditingGoalId(null);
                            }
                          }}
                          className="px-2 h-6 rounded bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    )}

                    <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(2, pct)}%`,
                          backgroundColor: pct >= 100 ? "#10b981" : "#6366f1",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

