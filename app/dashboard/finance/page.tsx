"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  DollarSign,
  RefreshCw,
  Wallet,
  FileText,
  Users,
  Truck,
  AlertTriangle,
  PieChart,
  ArrowRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Smartphone,
  Banknote,
  ChevronDown,
} from "lucide-react";

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface FinanceData {
  paymentBreakdown: { cash: number; mobile_money: number; card: number; credit: number };
  mobileMoneyRefs: Array<{ reference: string; amount: number; time: string }>;
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalIncome: number;
  customerDebts: Array<{ id: string; name: string; amountOwed: number; phone?: string }>;
  supplierBalances: Array<{ id: string; name: string; amountOwed: number; phone?: string }>;
  expenseBreakdown: Array<{ category: string; amount: number }>;
  systemDeposits: number;
  actualDeposits: number;
  reconciliationDifference: number;
  salesCount: number;
  itemsSold: number;
}

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<FinanceData | null>(null);
  const [dailyData, setDailyData] = useState<FinanceData | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadOverallData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/finance?type=overall");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load");
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load finance data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDailyData = async (date?: string) => {
    setError("");
    try {
      const targetDate = date || selectedDate;
      const response = await fetch(`/api/finance?type=daily&date=${targetDate}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load daily data");
      setDailyData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load daily data");
    }
  };

  useEffect(() => {
    loadOverallData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOverallData();
    if (activeReport === "daily") {
      await loadDailyData();
    }
  };

  const handleOpenReport = (report: string) => {
    setActiveReport(report);
    if (report === "daily") {
      loadDailyData();
    } else {
      loadOverallData();
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (activeReport === "daily") {
      loadDailyData(date);
    }
  };

  const closeReport = () => setActiveReport(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Loading financial reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Dashboard</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track your boutique's financial health
          </p>
        </div>
        <button 
          onClick={handleRefresh} 
          disabled={refreshing} 
          className="flex items-center gap-2 rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Quick Stats Cards */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</p>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{formatUGX(data.totalRevenue)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">Net Profit</p>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </div>
            <p className={`mt-2 text-2xl font-bold ${data.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatUGX(data.netProfit)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Expenses</p>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-red-600">{formatUGX(data.totalExpenses)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">Items Sold</p>
              <FileText className="h-4 w-4 text-purple-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{data.itemsSold}</p>
          </div>
        </div>
      )}

      {/* Main Report Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Daily Sales Report */}
        <button
          onClick={() => handleOpenReport("daily")}
          className="group rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 p-6 text-left hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-lg transition-all"
        >
          <div className="flex items-start justify-between">
            <FileText className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mb-3" />
            <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Daily Sales Report</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            View sales, payments, and cash drawer for any day
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
            Open Report <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>

        {/* P&L Report */}
        <button
          onClick={() => handleOpenReport("pnl")}
          className="group rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 p-6 text-left hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all"
        >
          <div className="flex items-start justify-between">
            <DollarSign className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-3" />
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Profit & Loss</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Understand your profitability and margins
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-medium">
            Open Report <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>

        {/* Debts Report */}
        <button
          onClick={() => handleOpenReport("debts")}
          className="group rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 p-6 text-left hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg transition-all"
        >
          <div className="flex items-start justify-between">
            <Users className="h-10 w-10 text-purple-600 dark:text-purple-400 mb-3" />
            <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Debts & Credits</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track customer debts and supplier balances
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 text-sm font-medium">
            Open Report <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </div>

      {/* Advanced Reports */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Advanced Reports
            <span className="text-xs text-slate-400">(Expenses, Bank Reconciliation)</span>
            <ChevronDown className="h-4 w-4 ml-auto group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => handleOpenReport("expenses")}
              className="rounded-md border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-emerald-300 hover:shadow transition-all"
            >
              <Wallet className="h-6 w-6 text-orange-500 mb-2" />
              <p className="font-medium text-slate-900 dark:text-white">Expense Breakdown</p>
              <p className="text-xs text-slate-500 mt-1">Where is cash leaking?</p>
            </button>
            <button
              onClick={() => handleOpenReport("reconciliation")}
              className="rounded-md border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-emerald-300 hover:shadow transition-all"
            >
              <AlertTriangle className="h-6 w-6 text-red-500 mb-2" />
              <p className="font-medium text-slate-900 dark:text-white">Bank Reconciliation</p>
              <p className="text-xs text-slate-500 mt-1">Catch missing deposits</p>
            </button>
          </div>
        </details>
      </div>

      {/* ===== DAILY SALES REPORT MODAL ===== */}
      {activeReport === "daily" && dailyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">📋 Daily Sales Report</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(selectedDate).toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button onClick={closeReport} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Date Picker */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Payment Breakdown */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Cash Sales</p>
                </div>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{formatUGX(dailyData.paymentBreakdown.cash)}</p>
              </div>
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-500/10 p-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Mobile Money</p>
                </div>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{formatUGX(dailyData.paymentBreakdown.mobile_money)}</p>
              </div>
              <div className="rounded-md bg-blue-50 dark:bg-blue-500/10 p-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Card Sales</p>
                </div>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-2">{formatUGX(dailyData.paymentBreakdown.card)}</p>
              </div>
              <div className="rounded-md bg-purple-50 dark:bg-purple-500/10 p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Credit Sales</p>
                </div>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-2">{formatUGX(dailyData.paymentBreakdown.credit)}</p>
              </div>
            </div>

            {/* Expected Cash */}
            <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-4 mb-6">
              <div className="flex justify-between">
                <span className="font-medium text-slate-900 dark:text-white">Expected Cash in Drawer:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(dailyData.paymentBreakdown.cash)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Count the drawer and compare. If different, investigate immediately.</p>
            </div>

            {/* Mobile Money References */}
            <div className="mb-6">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Mobile Money References</h4>
              {dailyData.mobileMoneyRefs.length === 0 ? (
                <p className="text-sm text-slate-500">No mobile money transactions for this date.</p>
              ) : (
                <div className="space-y-2">
                  {dailyData.mobileMoneyRefs.map((ref, i) => (
                    <div key={i} className="flex justify-between text-sm border-b pb-1">
                      <span className="font-mono text-xs">{ref.reference}</span>
                      <span className="font-bold">{formatUGX(ref.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="border-t pt-3 flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Total Sales ({dailyData.salesCount} transactions, {dailyData.itemsSold} items)
              </span>
              <span className="font-bold text-slate-900 dark:text-white">{formatUGX(dailyData.totalRevenue)}</span>
            </div>

            <button 
              onClick={() => window.print()} 
              className="mt-6 w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Print Report
            </button>
          </div>
        </div>
      )}

      {/* ===== P&L REPORT MODAL ===== */}
      {activeReport === "pnl" && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">💰 Profit & Loss Statement</h3>
              <button onClick={closeReport} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Total Revenue</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatUGX(data.totalRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">(−) Cost of Goods Sold</span>
                <span className="font-bold text-red-600 dark:text-red-400">−{formatUGX(data.totalCOGS)}</span>
              </div>
              <div className="border-t flex justify-between text-sm pt-2">
                <span className="font-medium text-slate-900 dark:text-white">Gross Profit</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(data.grossProfit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">(−) Total Expenses</span>
                <span className="font-bold text-red-600 dark:text-red-400">−{formatUGX(data.totalExpenses)}</span>
              </div>
              <div className="border-t flex justify-between text-base pt-2">
                <span className="font-bold text-slate-900 dark:text-white">Net Profit</span>
                <span className={`font-bold text-lg ${data.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {formatUGX(data.netProfit)}
                </span>
              </div>
            </div>

            <button 
              onClick={() => window.print()} 
              className="mt-6 w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Print Report
            </button>
          </div>
        </div>
      )}

      {/* ===== DEBTS REPORT MODAL ===== */}
      {activeReport === "debts" && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">👥 Debts Report</h3>
              <button onClick={closeReport} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Customer Debts */}
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" /> Who Owes Us (Customers)
            </h4>
            {data.customerDebts.length === 0 ? (
              <p className="text-sm text-slate-500 mb-4">No customer debts. 🎉</p>
            ) : (
              <div className="space-y-2 mb-6">
                {data.customerDebts.map((c) => (
                  <div key={c.id} className="flex justify-between border border-slate-200 dark:border-slate-700 rounded-md p-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{c.name}</p>
                      {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                    </div>
                    <span className="font-bold text-red-600 dark:text-red-400">{formatUGX(c.amountOwed)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Supplier Balances */}
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-500" /> Who We Owe (Suppliers)
            </h4>
            {data.supplierBalances.length === 0 ? (
              <p className="text-sm text-slate-500">No supplier debts. 🎉</p>
            ) : (
              <div className="space-y-2">
                {data.supplierBalances.map((s) => (
                  <div key={s.id} className="flex justify-between border border-slate-200 dark:border-slate-700 rounded-md p-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{s.name}</p>
                      {s.phone && <p className="text-xs text-slate-500">{s.phone}</p>}
                    </div>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{formatUGX(s.amountOwed)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== EXPENSES REPORT MODAL ===== */}
      {activeReport === "expenses" && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">💸 Expense Breakdown</h3>
              <button onClick={closeReport} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            {data.expenseBreakdown.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No expenses recorded.</p>
            ) : (
              <div className="space-y-2">
                {data.expenseBreakdown.map((e, i) => (
                  <div key={i} className="flex justify-between border-b pb-2">
                    <span className="text-slate-900 dark:text-white">{e.category}</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{formatUGX(e.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold">
                  <span className="text-slate-900 dark:text-white">Total</span>
                  <span className="text-red-600 dark:text-red-400">{formatUGX(data.totalExpenses)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== RECONCILIATION REPORT MODAL ===== */}
      {activeReport === "reconciliation" && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">🏦 Bank Reconciliation</h3>
              <button onClick={closeReport} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">System Deposits (Mobile Money + Card)</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatUGX(data.systemDeposits)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Actual Bank Deposits</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatUGX(data.actualDeposits)}</span>
              </div>
              <div className="border-t flex justify-between text-sm pt-2">
                <span className="font-medium text-slate-900 dark:text-white">Difference</span>
                <span className={`font-bold ${data.reconciliationDifference === 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {data.reconciliationDifference === 0 ? "✓ Matched" : formatUGX(data.reconciliationDifference) + " missing"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}