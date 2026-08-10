"use client";

import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  CreditCard,
  DollarSign,
  Package,
} from "lucide-react";

const kpiCards = [
  {
    label: "Today's Revenue",
    value: "UGX 2,450,000",
    change: "+15% vs yesterday",
    icon: DollarSign,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    label: "Items Sold",
    value: "34 items",
    change: "12 transactions",
    icon: ShoppingBag,
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    label: "Credit Owed",
    value: "UGX 1,200,000",
    change: "8 customers",
    icon: CreditCard,
    accent: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-500/10",
  },
  {
    label: "Low Stock Alerts",
    value: "5 items",
    change: "Need restock",
    icon: AlertTriangle,
    accent: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-500/10",
  },
];

const recentSales = [
  { id: 1, customer: "Nambi Olivia", total: "UGX 250,000", items: 2, time: "10:45 AM" },
  { id: 2, customer: "Wafula Peter", total: "UGX 120,000", items: 1, time: "11:10 AM" },
  { id: 3, customer: "Auma Grace", total: "UGX 480,000", items: 3, time: "11:35 AM" },
  { id: 4, customer: "Kato Ibrahim", total: "UGX 150,000", items: 1, time: "12:02 PM" },
  { id: 5, customer: "Nakamya Sarah", total: "UGX 320,000", items: 2, time: "12:25 PM" },
];

const topSellingDresses = [
  {
    id: 1,
    name: "Silk Evening Gown",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200&h=200&fit=crop",
    sold: 12,
    revenue: "UGX 3,000,000",
  },
  {
    id: 2,
    name: "Trench Coat",
    image: "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=200&h=200&fit=crop",
    sold: 8,
    revenue: "UGX 2,800,000",
  },
  {
    id: 3,
    name: "Pleated Skirt",
    image: "https://images.unsplash.com/photo-1583496661160-fb5886a0o6f0?w=200&h=200&fit=crop",
    sold: 7,
    revenue: "UGX 840,000",
  },
];

export default function ExecutiveDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Executive Dashboard</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Real-time overview of boutique operations
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {card.label}
                </p>
                <p className={`mt-1 text-2xl font-bold ${card.accent}`}>
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  {card.change}
                </p>
              </div>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.accent}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Sales */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-emerald-500" /> Recent Sales
          </h3>
          <div className="space-y-3">
            {recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{sale.customer}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {sale.items} item{sale.items > 1 ? "s" : ""} · {sale.time}
                  </p>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {sale.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Dresses */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Package className="h-5 w-5 text-emerald-500" /> Top Selling Dresses
          </h3>
          <div className="space-y-3">
            {topSellingDresses.map((dress) => (
              <div
                key={dress.id}
                className="flex items-center gap-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3"
              >
                <img
                  src={dress.image}
                  alt={dress.name}
                  className="h-12 w-12 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{dress.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {dress.sold} sold
                  </p>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {dress.revenue}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}