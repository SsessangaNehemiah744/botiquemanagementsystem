"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  AlertTriangle,
  Users,
  DollarSign,
  X,
  Phone,
  Loader2,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  TrendingUp,
  Clock,
  RefreshCw,
  ChevronRight,
  CalendarClock,
  UserCheck,
  Activity,
  FileText,
} from "lucide-react";
import { getCachedProducts, getCachedCustomers, isOnline, getLastSync } from "@/lib/offline";

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

type SortField = "date" | "price" | "category" | "name";
type SortOrder = "asc" | "desc";

interface InventoryItem {
  id: string;
  products?: { name: string; category: string };
  image_url?: string;
  barcode?: string;
  size: string;
  color: string;
  design?: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at: string;
}

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / 86400000);
}

export default function ManagerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [customersServedCount, setCustomersServedCount] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);
  const [sales, setSales] = useState<unknown[]>([]);
  const [lowStockItems, setLowStockItems] = useState<unknown[]>([]);
  const [customersServed, setCustomersServed] = useState<unknown[]>([]);
  const [newInventory, setNewInventory] = useState<InventoryItem[]>([]);
  const [topSelling, setTopSelling] = useState<unknown[]>([]);
  const [overstayingStock, setOverstayingStock] = useState<InventoryItem[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [overstayingSearch, setOverstayingSearch] = useState("");

  const [activePopup, setActivePopup] = useState<
    "revenue" | "items" | "lowStock" | "customers" | "overstaying" | null
  >(null);

  const loadData = async () => {
    setLoading(true);
    setError("");

    // OFFLINE: Load from cache
    if (!isOnline()) {
      const cachedProducts = await getCachedProducts();
      const cachedCustomers = await getCachedCustomers();
      const lastSync = await getLastSync();

      if (cachedProducts && Array.isArray(cachedProducts)) {
        setNewInventory(cachedProducts);
        setTotalInventory(cachedProducts.length);
        
        // Calculate low stock from cached
        const lowStock = cachedProducts.filter(
          (v: InventoryItem) =>
            Number(v.stock_quantity) <= Number(v.low_stock_threshold) && Number(v.stock_quantity) > 0
        );
        setLowStockItems(lowStock);
        setLowStockCount(lowStock.length);

        // Calculate overstaying stock (older than 2 months)
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const overstaying = cachedProducts.filter(
          (v: InventoryItem) => new Date(v.created_at) < twoMonthsAgo
        );
        setOverstayingStock(overstaying);
      }

      if (cachedCustomers && Array.isArray(cachedCustomers)) {
        setTotalCustomers(cachedCustomers.length);
      }

      setLastSyncTime(lastSync);
      setLoading(false);
      return;
    }

    // ONLINE: Fetch normally
    try {
      const response = await fetch("/api/dashboard/stats");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "HTTP error");
      setTotalRevenue(data.totalRevenue || 0);
      setTotalItems(data.totalItems || 0);
      setLowStockCount(data.lowStockCount || 0);
      setCustomersServedCount(data.customersServedCount || 0);
      setTotalCustomers(data.totalCustomers || 0);
      setTotalInventory(data.totalInventory || 0);
      setSales(data.sales || []);
      setLowStockItems(data.lowStockItems || []);
      setCustomersServed(data.customersServed || []);
      setNewInventory(data.newInventory || []);
      setTopSelling(data.topSelling || []);
      setOverstayingStock(data.overstayingStock || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const kpiCards = [
    {
      label: "Today's Revenue",
      value: formatUGX(totalRevenue),
      icon: DollarSign,
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      popup: "revenue" as const,
    },
    {
      label: "Items Sold",
      value: `${totalItems} items`,
      icon: ShoppingBag,
      accent: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      popup: "items" as const,
    },
    {
      label: "Low Stock Alerts",
      value: `${lowStockCount} items`,
      icon: AlertTriangle,
      accent: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-50 dark:bg-yellow-500/10",
      popup: "lowStock" as const,
    },
    {
      label: "Customers Served",
      value: `${customersServedCount} today`,
      icon: Users,
      accent: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-500/10",
      popup: "customers" as const,
    },
  ];

  const openPopup = (popup: typeof activePopup) => {
    if (popup === "overstaying") setOverstayingSearch("");
    setActivePopup(popup);
  };

  const closePopup = () => {
    setActivePopup(null);
    setOverstayingSearch("");
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortedInventory = (items: InventoryItem[]) => {
    return [...items].sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;
      switch (sortField) {
        case "date": valA = new Date(a.created_at).getTime(); valB = new Date(b.created_at).getTime(); break;
        case "price": valA = a.selling_price; valB = b.selling_price; break;
        case "category": valA = a.products?.category || ""; valB = b.products?.category || ""; break;
        case "name": valA = a.products?.name || ""; valB = b.products?.name || ""; break;
      }
      if (sortOrder === "asc") return valA > valB ? 1 : valA < valB ? -1 : 0;
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-slate-400" />;
    return sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-emerald-500" /> : <ArrowDown className="h-3 w-3 text-emerald-500" />;
  };

  const sortedInventory = getSortedInventory(newInventory);
  const sortedOverstaying = getSortedInventory(overstayingStock);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Manager Dashboard</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {totalInventory} products · {totalCustomers} customers
            {lastSyncTime && !isOnline() && (
              <span className="text-yellow-600 dark:text-yellow-400">
                {" "}· Last synced: {new Date(lastSyncTime).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {!isOnline() && (
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 p-3 text-sm text-yellow-700 dark:text-yellow-400">
          ⚠️ You are offline. Showing cached data from last sync.
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 p-4 text-sm text-red-600">
          <p>{error}</p>
          <button onClick={loadData} className="mt-2 underline">Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card, i) => (
          <button key={i} onClick={() => setActivePopup(card.popup)} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left hover:border-emerald-300 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{card.label}</p>
                <p className={`mt-1 text-2xl font-bold ${card.accent}`}>{card.value}</p>
              </div>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.accent}`} />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400 flex items-center gap-1">View details <ChevronRight className="h-3 w-3" /></p>
          </button>
        ))}
      </div>

      {/* Overstaying Stock Banner */}
      <button onClick={() => openPopup("overstaying")} className="w-full rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-500/10 p-5 text-left hover:border-orange-400 hover:shadow-lg transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-orange-500" />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Overstaying Stock</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {overstayingStock.length} item{overstayingStock.length !== 1 ? "s" : ""} older than 2 months
              </p>
            </div>
          </div>
          <span className="text-orange-600 dark:text-orange-400 text-sm font-medium flex items-center gap-1">
            View All <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </button>

      {/* Two Column Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Selling */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Top Selling Today
          </h3>
          {topSelling.length === 0 ? (
            <p className="text-center py-8 text-slate-400">
              {isOnline() ? "No sales yet today." : "Not available offline"}
            </p>
          ) : (
            <div className="space-y-2">
              {(topSelling as Array<{ name: string; quantity: number; price: number }>).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-md bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 text-sm font-bold">{i + 1}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{item.quantity} sold</p>
                    <p className="text-xs text-slate-500">{formatUGX(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Inventory */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <Package className="h-5 w-5 text-emerald-500" />
              New Inventory
              <span className="text-sm font-normal text-slate-400">({newInventory.length})</span>
            </h3>
            <button onClick={() => router.push("/manager/inventory")} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
              View All →
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-slate-500">Sort by:</span>
            {(["date", "name", "category", "price"] as SortField[]).map((field) => (
              <button key={field} onClick={() => toggleSort(field)} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${sortField === field ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600"}`}>
                {field === "date" ? "Date Added" : field.charAt(0).toUpperCase() + field.slice(1)}
                <SortIcon field={field} />
              </button>
            ))}
          </div>

          {sortedInventory.length === 0 ? (
            <p className="text-center py-8 text-slate-400">
              {isOnline() ? "No inventory items." : "No cached inventory available."}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sortedInventory.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Package className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.products?.name || "Unknown"}</p>
                    <p className="text-xs text-slate-500">{item.size} / {item.color} · {formatUGX(item.selling_price)}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LOW STOCK POPUP */}
      {activePopup === "lowStock" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">⚠️ Low Stock Alerts ({lowStockItems.length})</h3>
              <button onClick={closePopup} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                <p className="text-slate-500 dark:text-slate-400">All items are well stocked! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(lowStockItems as Array<{ id: string; products?: { name: string }; image_url?: string; size: string; color: string; stock_quantity: number; low_stock_threshold: number }>).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-500/5 p-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="h-16 w-16 rounded-lg object-cover flex-shrink-0 border border-red-100" />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-red-100 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <Package className="h-7 w-7 text-red-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{item.products?.name || "Unknown"}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.size} / {item.color}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-lg ${item.stock_quantity === 0 ? "text-red-600" : "text-yellow-600"}`}>{item.stock_quantity}</p>
                      <p className="text-xs text-slate-400">/ {item.low_stock_threshold} min</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={closePopup} className="mt-4 w-full rounded-md border border-slate-300 dark:border-slate-600 py-2 text-sm">Close</button>
          </div>
        </div>
      )}

      {/* REVENUE POPUP */}
      {activePopup === "revenue" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-white dark:bg-slate-900 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold">Today&apos;s Sales ({sales.length})</h3>
              <button onClick={closePopup} className="p-1 rounded hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {sales.length === 0 ? (
                <p className="text-center py-8 text-slate-500">
                  {isOnline() ? "No sales recorded today." : "Sales history not available offline."}
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium px-3">Total: {formatUGX(totalRevenue)}</p>
                  {(sales as Array<{ id: string; total_amount: number; created_at: string; payment_method: string }>).map((s) => (
                    <div key={s.id} className="rounded-md border p-3">
                      <div className="flex justify-between">
                        <span className="text-sm">#{s.id.substring(0, 8)}</span>
                        <span className="font-bold text-emerald-600">{formatUGX(s.total_amount)}</span>
                      </div>
                      <p className="text-xs text-slate-500">{new Date(s.created_at).toLocaleTimeString()} · {s.payment_method}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OVERSTAYING POPUP */}
      {activePopup === "overstaying" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-orange-500" />
                Overstaying Stock ({sortedOverstaying.length} items)
              </h3>
              <button onClick={closePopup} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search overstaying stock..." value={overstayingSearch} onChange={(e) => setOverstayingSearch(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {sortedOverstaying.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarClock className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                  <p className="text-slate-500">No overstaying stock! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedOverstaying
                    .filter((item) => {
                      if (!overstayingSearch.trim()) return true;
                      const q = overstayingSearch.toLowerCase();
                      return (item.products?.name || "").toLowerCase().includes(q) ||
                        (item.products?.category || "").toLowerCase().includes(q) ||
                        (item.size || "").toLowerCase().includes(q) ||
                        (item.color || "").toLowerCase().includes(q) ||
                        (item.barcode || "").includes(q);
                    })
                    .map((item) => {
                      const days = daysSince(item.created_at);
                      return (
                        <div key={item.id} className="flex items-center gap-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-500/5 p-4">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="h-16 w-16 rounded-lg object-cover flex-shrink-0 border border-orange-100" />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                              <Package className="h-7 w-7 text-orange-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{item.products?.name || "Unknown"}</p>
                            <p className="text-xs text-slate-500">{item.size} / {item.color} · {item.products?.category || "—"}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-orange-600 dark:text-orange-400 text-lg">{days} days</p>
                            <p className="text-xs text-slate-500 mt-1">Stock: {item.stock_quantity}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}