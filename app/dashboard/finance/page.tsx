"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  Calendar,
  RefreshCw,
  Wallet,
} from "lucide-react";

interface CashbookEntry {
  id: string;
  transaction_date: string;
  transaction_type: string;
  category: string;
  amount: number;
  description?: string;
  payment_method?: string;
  cash_in: boolean;
}

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function FinancePage() {
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [grossRevenue, setGrossRevenue] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [entryType, setEntryType] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("Sales");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  useEffect(() => {
    fetchFinance();
  }, []);

  const fetchFinance = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/finance");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch");
      setEntries(data.entries || []);
      setTotalIncome(data.totalIncome || 0);
      setTotalExpenses(data.totalExpenses || 0);
      setNetProfit(data.netProfit || 0);
      setGrossRevenue(data.grossRevenue || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load finance data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFinance();
  };

  const handleAddEntry = async () => {
    if (amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_type: entryType,
          category,
          amount,
          description,
          payment_method: paymentMethod,
          cash_in: entryType === "income",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save");
      setShowAddModal(false);
      setAmount(0);
      setDescription("");
      fetchFinance();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  // FIXED: Safe search with optional chaining
  const filtered = entries.filter((e) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      search === "" ||
      (e.description || "").toLowerCase().includes(searchLower) ||
      (e.category || "").toLowerCase().includes(searchLower);
    const matchesType =
      filterType === "all" || (filterType === "income" ? e.cash_in : !e.cash_in);
    return matchesSearch && matchesType;
  });

  const incomeCategories = ["Sales", "Credit Payment", "Other Income"];
  const expenseCategories = ["Rent", "Electricity", "Transport", "Staff Allowance", "Supplies", "Other"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Cashbook</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track income, expenses, and profit
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            <Plus className="h-4 w-4" /> Log Entry
          </button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

      {/* P&L Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Income</span>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(totalIncome)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Expenses</span>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">{formatUGX(totalExpenses)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Net Profit</span>
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <p className={`mt-2 text-2xl font-bold ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {formatUGX(netProfit)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Gross Revenue</span>
            <Wallet className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">{formatUGX(grossRevenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by description or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
          {(["all", "income", "expense"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                filterType === type
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Cashbook Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Type</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Category</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Description</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Method</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" />
                    <p className="text-sm text-slate-500 mt-2">Loading...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">No entries found.</td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(entry.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${entry.cash_in ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400"}`}>
                        {entry.cash_in ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">{entry.category || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{entry.description || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 capitalize">{entry.payment_method || "—"}</td>
                    <td className={`px-4 py-3 text-right font-bold ${entry.cash_in ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {entry.cash_in ? "+" : "−"}{formatUGX(entry.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Log Cashbook Entry</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Entry Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setEntryType("income"); setCategory("Sales"); }} className={`rounded-md border p-2 text-sm font-medium ${entryType === "income" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "border-slate-300 dark:border-slate-600 text-slate-600"}`}>💰 Income</button>
                  <button onClick={() => { setEntryType("expense"); setCategory("Rent"); }} className={`rounded-md border p-2 text-sm font-medium ${entryType === "expense" ? "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600" : "border-slate-300 dark:border-slate-600 text-slate-600"}`}>💸 Expense</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none">
                  {(entryType === "income" ? incomeCategories : expenseCategories).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount (UGX) *</label>
                <input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" placeholder="0" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" placeholder="Optional notes..." />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none">
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank">Bank</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 py-2 text-sm text-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={handleAddEntry} disabled={saving} className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}