import React, { useState, useMemo } from "react";
import { Search, Download, ReceiptText, Check, FileSpreadsheet, Plus, Calendar } from "lucide-react";
import {
  INCOME_ONLY_CATEGORIES,
  type Expense,
  type ExpenseCategory,
  type FanTheme,
  type PaymentMode,
  type TransactionType,
} from "../types";
import { SwipeableExpenseRow } from "./SwipeableExpenseRow";

interface HistoryViewProps {
  expenses: Expense[];
  theme: FanTheme;
  onDeleteExpense: (id: string) => void;
  onEditExpense?: (expense: Expense) => void;
  onOpenAddModal: () => void;
  onOpenAddIncomeModal?: () => void;
  onShowToast?: (message: string) => void;
}

const CATEGORY_FILTERS: Array<"All" | ExpenseCategory> = [
  "All",
  "Food",
  "Chai & Snacks",
  "Transport",
  "Grocery",
  "Entertainment",
  "Bills",
  "Shopping",
  "Salary",
  "Freelance",
  "Cashback",
];

const MODE_FILTERS: Array<"All" | PaymentMode> = ["All", "UPI", "Cash", "Card"];

function isIncomeTx(e: Expense): boolean {
  return e.type === "income" || INCOME_ONLY_CATEGORIES.includes(e.category);
}

function formatDayGroupLabel(isoDateKey: string): string {
  const [y, m, d] = isoDateKey.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dateObj.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (dateObj.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return dateObj.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const MONTH_OPTIONS = [
  { value: "All", label: "All Months" },
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
];

export const HistoryView: React.FC<HistoryViewProps> = ({
  expenses,
  onDeleteExpense,
  onEditExpense,
  onOpenAddModal,
  onOpenAddIncomeModal,
  onShowToast,
}) => {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"All" | TransactionType>("All");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ExpenseCategory>("All");
  const [selectedMode, setSelectedMode] = useState<"All" | PaymentMode>("All");
  const [selectedMonth, setSelectedMonth] = useState<string>("All");
  const [selectedYear, setSelectedYear] = useState<string>("All");
  const [isExporting, setIsExporting] = useState(false);

  const availableYears = useMemo(() => {
    const nowYr = new Date().getFullYear();
    const set = new Set<number>([nowYr, nowYr - 1]);
    for (const e of expenses) {
      const y = new Date(e.timestamp).getFullYear();
      if (!Number.isNaN(y) && y >= 2000 && y <= 2100) {
        set.add(y);
      }
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        const expType: TransactionType = isIncomeTx(exp) ? "income" : "expense";
        if (selectedType !== "All" && expType !== selectedType) {
          return false;
        }
        if (selectedCategory !== "All" && exp.category !== selectedCategory) {
          return false;
        }
        if (selectedMode !== "All" && exp.paymentMode !== selectedMode) {
          return false;
        }
        if (selectedMonth !== "All" || selectedYear !== "All") {
          const dt = new Date(exp.timestamp);
          if (selectedMonth !== "All" && dt.getMonth() !== Number(selectedMonth)) {
            return false;
          }
          if (selectedYear !== "All" && dt.getFullYear() !== Number(selectedYear)) {
            return false;
          }
        }
        if (query.trim()) {
          const q = query.toLowerCase();
          return (
            exp.title.toLowerCase().includes(q) ||
            exp.category.toLowerCase().includes(q) ||
            (exp.note && exp.note.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [expenses, query, selectedType, selectedCategory, selectedMode, selectedMonth, selectedYear]);

  const groupedByDate = useMemo(() => {
    const groups: Array<{
      dateKey: string;
      label: string;
      expenseTotal: number;
      incomeTotal: number;
      items: Expense[];
    }> = [];
    const map = new Map<string, Expense[]>();

    for (const exp of filteredExpenses) {
      const dt = new Date(exp.timestamp);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
        dt.getDate()
      ).padStart(2, "0")}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(exp);
    }

    for (const [dateKey, items] of map.entries()) {
      const expenseTotal = items
        .filter((i) => !isIncomeTx(i))
        .reduce((acc, item) => acc + item.amount, 0);
      const incomeTotal = items
        .filter((i) => isIncomeTx(i))
        .reduce((acc, item) => acc + item.amount, 0);
      groups.push({
        dateKey,
        label: formatDayGroupLabel(dateKey),
        expenseTotal,
        incomeTotal,
        items,
      });
    }
    return groups;
  }, [filteredExpenses]);

  const filteredOutflow = useMemo(
    () =>
      filteredExpenses
        .filter((e) => !isIncomeTx(e))
        .reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const filteredInflow = useMemo(
    () =>
      filteredExpenses
        .filter((e) => isIncomeTx(e))
        .reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const isFiltered =
    selectedType !== "All" ||
    selectedCategory !== "All" ||
    selectedMode !== "All" ||
    selectedMonth !== "All" ||
    selectedYear !== "All" ||
    query.trim().length > 0;

  // Export transaction history as CSV file
  const handleExportCsv = (exportAll = false) => {
    const dataToExport = exportAll ? expenses : filteredExpenses;

    if (dataToExport.length === 0) {
      onShowToast?.("No transactions available to export.");
      return;
    }

    setIsExporting(true);

    try {
      const headers = [
        "Transaction ID",
        "Date",
        "Time",
        "Type",
        "Title",
        "Category",
        "Payment Mode",
        "Amount (INR)",
        "Notes",
      ];

      const rows = dataToExport.map((e) => {
        const dt = new Date(e.timestamp);
        const dateStr = dt.toLocaleDateString("en-IN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const timeStr = dt.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        const safeId = `"${e.id.replace(/"/g, '""')}"`;
        const safeType = e.type === "income" ? "Income" : "Expense";
        const safeTitle = `"${e.title.replace(/"/g, '""')}"`;
        const safeCategory = `"${e.category.replace(/"/g, '""')}"`;
        const safeMode = `"${e.paymentMode.replace(/"/g, '""')}"`;
        const safeAmount = e.type === "income" ? e.amount : -e.amount;
        const safeNote = `"${(e.note || "").replace(/"/g, '""')}"`;

        return [
          safeId,
          dateStr,
          timeStr,
          safeType,
          safeTitle,
          safeCategory,
          safeMode,
          safeAmount,
          safeNote,
        ].join(",");
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `kharche-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onShowToast?.(`Exported ${dataToExport.length} transactions as CSV`);
    } catch {
      onShowToast?.("Failed to generate CSV file.");
    } finally {
      setTimeout(() => setIsExporting(false), 2500);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Header Strip with Export CSV Action Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Transaction Ledger</h2>
          <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
            {filteredExpenses.length} records · Outflow −₹{filteredOutflow.toLocaleString("en-IN")} · Inflow +₹{filteredInflow.toLocaleString("en-IN")}
          </p>
        </div>

        {/* Primary CSV Export Button */}
        <button
          type="button"
          onClick={() => handleExportCsv(false)}
          disabled={filteredExpenses.length === 0}
          aria-label="Export transaction history as CSV file"
          title="Download transaction history as a CSV file to your device"
          className={`text-xs font-semibold flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isExporting
              ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
              : "bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white"
          }`}
        >
          {isExporting ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Exported!</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Export CSV</span>
            </>
          )}
        </button>
      </div>

      {/* Quick Info & Format Indicator */}
      {isFiltered && expenses.length > filteredExpenses.length && (
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-[#0c1220] text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              Showing {filteredExpenses.length} of {expenses.length} records
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleExportCsv(true)}
            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
          >
            Export All ({expenses.length})
          </button>
        </div>
      )}

      {/* Search Input, Type Filter & Month/Year Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search description, category, notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#0c1220] border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0c1220] border border-slate-800 shrink-0">
            {(["All", "expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedType === t
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t === "All" ? "All Types" : t === "expense" ? "Expenses (−)" : "Income (+)"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400 hidden sm:block" />
            <select
              aria-label="Filter by month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 px-2.5 rounded-xl bg-[#0c1220] border border-slate-800 text-[11px] font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 px-2.5 rounded-xl bg-[#0c1220] border border-slate-800 text-[11px] font-mono font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Horizontal Category Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
              selectedCategory === cat
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-[#0c1220] border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Payment Mode Segmented Control */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0c1220] border border-slate-800">
        {MODE_FILTERS.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSelectedMode(mode)}
            className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              selectedMode === mode
                ? "bg-slate-800 border border-slate-700 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Timeline Groups */}
      {groupedByDate.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-8 text-center">
          <ReceiptText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-200">No matching transactions</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Log an expense, record an income inflow, or adjust your search filters.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </button>
            {onOpenAddIncomeModal && (
              <button
                type="button"
                onClick={onOpenAddIncomeModal}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Income</span>
              </button>
            )}
            {expenses.length > 0 && (
              <button
                type="button"
                onClick={() => handleExportCsv(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-200 hover:text-white cursor-pointer"
              >
                Export All ({expenses.length})
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div key={group.dateKey} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-300">{group.label}</span>
                <div className="flex items-center gap-2 font-mono tabular-nums text-[11px] font-semibold">
                  {group.incomeTotal > 0 && (
                    <span className="text-emerald-400">
                      +₹{group.incomeTotal.toLocaleString("en-IN")}
                    </span>
                  )}
                  {group.expenseTotal > 0 && (
                    <span className="text-slate-400">
                      −₹{group.expenseTotal.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {group.items.map((expense) => (
                  <SwipeableExpenseRow
                    key={expense.id}
                    expense={expense}
                    onDelete={onDeleteExpense}
                    onEdit={onEditExpense}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
