"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  DollarSign,
  ShoppingCart,
  Package,
  Loader2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CashierDashboard() {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard/stats");
        const data = await response.json();
        if (response.ok) {
          setTotalRevenue(data.totalRevenue || 0);
          setTotalItems(data.totalItems || 0);
          setTotalInventory(data.totalInventory || 0);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome Back! 👋</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Ready to make some sales today?</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <DollarSign className="h-6 w-6 text-emerald-500 mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Today&apos;s Revenue</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(totalRevenue)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <ShoppingBag className="h-6 w-6 text-blue-500 mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Items Sold</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalItems}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <Package className="h-6 w-6 text-purple-500 mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Products Available</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalInventory}</p>
        </div>
      </div>

      {/* Quick Action */}
      <Link href="/cashier/pos" className="block rounded-lg border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 p-8 text-center hover:shadow-lg transition-all cursor-pointer">
        <ShoppingCart className="mx-auto h-14 w-14 text-emerald-500 mb-3" />
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Start New Sale</h3>
        <p className="text-sm text-slate-500 mt-1">Scan barcodes or search products</p>
        <span className="mt-3 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          Open Point of Sale <ArrowRight className="h-4 w-4" />
        </span>
      </Link>

      {/* Secondary Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/cashier/stock" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-lg transition-all">
          <Package className="h-6 w-6 text-blue-500 mb-2" />
          <h3 className="font-bold text-slate-900 dark:text-white">Stock Lookup</h3>
          <p className="text-xs text-slate-500 mt-1">Check product availability</p>
        </Link>
        <Link href="/cashier/customers" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-lg transition-all">
          <TrendingUp className="h-6 w-6 text-purple-500 mb-2" />
          <h3 className="font-bold text-slate-900 dark:text-white">Customers</h3>
          <p className="text-xs text-slate-500 mt-1">Search and add customers</p>
        </Link>
      </div>
    </div>
  );
}