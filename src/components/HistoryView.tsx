import React, { useState, useMemo } from "react";
import { Search, Download, ReceiptText, Check, FileSpreadsheet } from "lucide-react";
import type { Expense, ExpenseCategory, FanTheme, PaymentMode } from "../types";
import { SwipeableExpenseRow } from "./SwipeableExpenseRow";

interface HistoryViewProps {
  expenses: Expense[];
  theme: FanTheme;
  onDeleteExpense: (id: string) => void;
  onOpenAddModal: () => void;
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
];

const MODE_FILTERS: Array<"All" | PaymentMode> = ["All", "UPI", "Cash", "Card"];

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

export const HistoryView: React.FC<HistoryViewProps> = ({
  expenses,
  theme,
  onDeleteExpense,
  onOpenAddModal,
  onShowToast,
}) => {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ExpenseCategory>("All");
  const [selectedMode, setSelectedMode] = useState<"All" | PaymentMode>("All");
  const [isExporting, setIsExporting] = useState(false);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        if (selectedCategory !== "All" && exp.category !== selectedCategory) {
          return false;
        }
        if (selectedMode !== "All" && exp.paymentMode !== selectedMode) {
          return false;
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
  }, [expenses, query, selectedCategory, selectedMode]);

  const groupedByDate = useMemo(() => {
    const groups: Array<{ dateKey: string; label: string; total: number; items: Expense[] }> = [];
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
      const total = items.reduce((acc, item) => acc + item.amount, 0);
      groups.push({
        dateKey,
        label: formatDayGroupLabel(dateKey),
        total,
        items,
      });
    }
    return groups;
  }, [filteredExpenses]);

  const totalFilteredAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const isFiltered =
    selectedCategory !== "All" || selectedMode !== "All" || query.trim().length > 0;

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
        "Expense Title",
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
        const safeTitle = `"${e.title.replace(/"/g, '""')}"`;
        const safeCategory = `"${e.category.replace(/"/g, '""')}"`;
        const safeMode = `"${e.paymentMode.replace(/"/g, '""')}"`;
        const safeAmount = e.amount;
        const safeNote = `"${(e.note || "").replace(/"/g, '""')}"`;

        return [
          safeId,
          dateStr,
          timeStr,
          safeTitle,
          safeCategory,
          safeMode,
          safeAmount,
          safeNote,
        ].join(",");
      });

      // UTF-8 BOM prefix ensures correct display in Excel, Numbers & Google Sheets
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
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-100">History</h2>
          <p className="text-[11px] text-slate-400">
            {filteredExpenses.length} transactions · Total ₹{totalFilteredAmount.toLocaleString("en-IN")}
          </p>
        </div>

        {/* Primary CSV Export Button */}
        <button
          type="button"
          onClick={() => handleExportCsv(false)}
          disabled={filteredExpenses.length === 0}
          aria-label="Export transaction history as CSV file"
          title="Download transaction history as a CSV file to your device"
          style={{
            borderColor: `${theme.accentHex}40`,
            boxShadow: `0 0 16px ${theme.ringGlow}`,
          }}
          className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isExporting
              ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
              : `${theme.buttonBg} ${theme.buttonText}`
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
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-[#0a0e17] text-[11px] text-slate-300 shadow-[0_4px_14px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              Showing {filteredExpenses.length} of {expenses.length} records
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleExportCsv(true)}
            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
          >
            Export All ({expenses.length})
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          placeholder="Search chai, petrol, biryani..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            borderColor: query ? theme.accentHex : undefined,
          }}
          className="w-full h-10 pl-9 pr-3 rounded-2xl bg-[#0a0e17] border border-white/10 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.5)]"
        />
      </div>

      {/* Horizontal Category Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            style={
              selectedCategory === cat
                ? {
                    boxShadow: `0 0 12px ${theme.ringGlow}`,
                  }
                : undefined
            }
            className={`px-3 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              selectedCategory === cat
                ? `${theme.buttonBg} ${theme.buttonText}`
                : "bg-[#0a0e17] border border-white/10 text-slate-400 hover:text-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Payment Mode Segmented Control */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0a0e17] border border-white/10 shadow-[0_4px_14px_rgba(0,0,0,0.5)]">
        {MODE_FILTERS.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSelectedMode(mode)}
            className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              selectedMode === mode
                ? "bg-[#05070c] border border-white/10 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Timeline Groups */}
      {groupedByDate.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0e17] p-8 text-center backdrop-blur-sm shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_16px_rgba(6,182,212,0.06)]">
          <ReceiptText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-300">No matching expenses</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              type="button"
              onClick={onOpenAddModal}
              style={{
                boxShadow: `0 0 16px ${theme.ringGlow}`,
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold ${theme.buttonBg} ${theme.buttonText} cursor-pointer`}
            >
              + Add Expense
            </button>
            {expenses.length > 0 && (
              <button
                type="button"
                onClick={() => handleExportCsv(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#05070c] border border-white/10 text-slate-200 hover:text-white cursor-pointer"
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
                <span className="font-mono tabular-nums text-[11px] text-slate-400 font-semibold">
                  ₹{group.total.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="space-y-2">
                {group.items.map((expense) => (
                  <SwipeableExpenseRow
                    key={expense.id}
                    expense={expense}
                    onDelete={onDeleteExpense}
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
