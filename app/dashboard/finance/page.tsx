"use client";

import { useState } from "react";
import { Plus, X, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const cashbookEntries = [
  { id: 1, date: "2025-05-20", type: "Cash In", category: "Sales", amount: 450000, notes: "POS #1023" },
  { id: 2, date: "2025-05-20", type: "Cash Out", category: "Rent", amount: 200000, notes: "May rent" },
  { id: 3, date: "2025-05-19", type: "Cash In", category: "Credit Payment", amount: 150000, notes: "Nambi Olivia" },
  { id: 4, date: "2025-05-19", type: "Cash Out", category: "Electricity", amount: 80000, notes: "UMEME bill" },
  { id: 5, date: "2025-05-18", type: "Cash In", category: "Sales", amount: 620000, notes: "POS #1022" },
  { id: 6, date: "2025-05-18", type: "Cash Out", category: "Transport", amount: 30000, notes: "Delivery" },
];

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

const grossRevenue = 2450000;
const cogs = 1200000;
const expenses = 310000;
const netProfit = grossRevenue - cogs - expenses;

export default function FinancePage() {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Rent",
    amount: 0,
    notes: "",
  });

  const logExpense = () => {
    setShowExpenseModal(false);
    setExpenseForm({ category: "Rent", amount: 0, notes: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Cashbook</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Daily cash flow and P&L reporting
          </p>
        </div>
        <button
          onClick={() => setShowExpenseModal(true)}
          className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          <Plus className="h-4 w-4" /> Log Store Expense
        </button>
      </div>

      {/* P&L Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Gross Revenue</span>
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatUGX(grossRevenue)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">COGS</span>
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            {formatUGX(cogs)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Net Profit</span>
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatUGX(netProfit)}
          </p>
        </div>
      </div>

      {/* Cashbook Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h3 className="mb-4 text-lg font-semibold">Daily Cashbook</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Type</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Category</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Amount</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {cashbookEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2">{entry.date}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.type === "Cash In"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                      }`}
                    >
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{entry.category}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatUGX(entry.amount)}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{entry.notes}</td>
                </tr>
              ))}
              {cashbookEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500 dark:text-slate-500">
                    No entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Log Store Expense</h3>
              <button onClick={() => setShowExpenseModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option>Rent</option>
                  <option>Electricity</option>
                  <option>Transport</option>
                  <option>Staff Allowance</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Amount (UGX)</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowExpenseModal(false)}
                className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 py-2 text-sm text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={logExpense}
                className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}