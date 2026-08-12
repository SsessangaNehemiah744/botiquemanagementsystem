"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

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

interface TopSellingItem {
  name: string;
  quantity: number;
  price: number;
}

export default function DashboardPage() {
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
  const [topSelling, setTopSelling] = useState<TopSellingItem[]>([]);

  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [inventorySearch, setInventorySearch] = useState("");

  const [activePopup, setActivePopup] = useState<
    "revenue" | "items" | "lowStock" | "customers" | "inventory" | null
  >(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
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
    if (popup === "inventory") setInventorySearch("");
    setActivePopup(popup);
  };

  const closePopup = () => {
    setActivePopup(null);
    setInventorySearch("");
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // FIXED: Sort function now correctly handles all fields
  const getSortedInventory = (items: InventoryItem[]) => {
    let filtered = items;
    
    if (inventorySearch.trim()) {
      const q = inventorySearch.toLowerCase();
      filtered = items.filter(
        (item) =>
          (item.products?.name || "").toLowerCase().includes(q) ||
          (item.products?.category || "").toLowerCase().includes(q) ||
          (item.size || "").toLowerCase().includes(q) ||
          (item.color || "").toLowerCase().includes(q) ||
          (item.barcode || "").includes(q) ||
          (item.design || "").toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;
      
      switch (sortField) {
        case "date":
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
          break;
        case "price":
          valA = Number(a.selling_price) || 0;
          valB = Number(b.selling_price) || 0;
          break;
        case "category":
          valA = (a.products?.category || "zzz").toLowerCase();
          valB = (b.products?.category || "zzz").toLowerCase();
          break;
        case "name":
          valA = (a.products?.name || "zzz").toLowerCase();
          valB = (b.products?.name || "zzz").toLowerCase();
          break;
      }

      if (sortOrder === "asc") {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-slate-400" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-emerald-500" />
    ) : (
      <ArrowDown className="h-3 w-3 text-emerald-500" />
    );
  };

  const sortedInventory = getSortedInventory(newInventory);

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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {totalInventory} products · {totalCustomers} customers · Real-time overview
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 p-4 text-sm text-red-600 dark:text-red-400">
          <p>{error}</p>
          <button onClick={loadData} className="mt-2 underline">Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card, i) => (
          <button key={i} onClick={() => setActivePopup(card.popup)} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all cursor-pointer">
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

      {/* Two Column Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Selling */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Top Selling Today
          </h3>
          {topSelling.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-slate-400 dark:text-slate-500">No sales yet today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topSelling.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">{item.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900 dark:text-white">{item.quantity} sold</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatUGX(item.price * item.quantity)}</p>
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
            <button onClick={() => openPopup("inventory")} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">View All →</button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">Sort by:</span>
            {(["date", "name", "category", "price"] as SortField[]).map((field) => (
              <button key={field} onClick={() => toggleSort(field)} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                sortField === field
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}>
                {field === "date" ? "Date Added" : field.charAt(0).toUpperCase() + field.slice(1)}
                <SortIcon field={field} />
              </button>
            ))}
          </div>

          {sortedInventory.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-slate-400 dark:text-slate-500">No inventory items.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sortedInventory.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="h-10 w-10 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {item.products?.name || item.size + " / " + item.color}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.products?.category || "—"} · {item.size} / {item.color} · {formatUGX(item.selling_price)}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== INVENTORY POPUP (VIEW ALL) ===== */}
      {activePopup === "inventory" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                📦 All Inventory ({sortedInventory.length})
              </h3>
              <button onClick={closePopup} className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search inventory..." value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none" />
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Sort by:</span>
                {(["date", "name", "category", "price"] as SortField[]).map((field) => (
                  <button key={field} onClick={() => toggleSort(field)} className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    sortField === field
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}>
                    {field === "date" ? "Date Added" : field.charAt(0).toUpperCase() + field.slice(1)}
                    <SortIcon field={field} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sortedInventory.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-400 dark:text-slate-500">No inventory items found.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Product</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Barcode</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Category</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Size</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Color</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Design</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Cost</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Price</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Stock</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Date Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {sortedInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-slate-400" />
                              </div>
                            )}
                            <span className="font-medium text-slate-900 dark:text-white">
                              {item.products?.name || item.size + " / " + item.color}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{item.barcode || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300">
                            {item.products?.category || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{item.size || "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{item.color || "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{item.design || "—"}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">{formatUGX(item.cost_price)}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatUGX(item.selling_price)}</td>
                        <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{item.stock_quantity}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 p-3 flex justify-between">
              <span className="text-xs text-slate-400 dark:text-slate-500">{sortedInventory.length} items</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Sorted by {sortField} ({sortOrder})</span>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Popup */}
      {activePopup === "revenue" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Today&apos;s Sales ({sales.length})</h3>
              <button onClick={closePopup} className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {sales.length === 0 ? (
                <p className="text-center py-8 text-slate-500 dark:text-slate-400">No sales recorded today.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium px-3 text-slate-900 dark:text-white">Total: {formatUGX(totalRevenue)}</p>
                  {(sales as Array<{ id: string; total_amount: number; created_at: string; payment_method: string }>).map((s) => (
                    <div key={s.id} className="rounded-md border border-slate-200 dark:border-slate-700 p-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-900 dark:text-white">#{s.id.substring(0, 8)}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(s.total_amount)}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(s.created_at).toLocaleTimeString()} · {s.payment_method}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items Sold Popup */}
      {activePopup === "items" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Items Sold Today</h3>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{totalItems} items</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Across {sales.length} transactions</p>
            <button onClick={closePopup} className="mt-6 w-full rounded-md border border-slate-300 dark:border-slate-600 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Close</button>
          </div>
        </div>
      )}

      {/* Low Stock Popup */}
      {activePopup === "lowStock" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">⚠️ Low Stock Alerts ({lowStockItems.length})</h3>
              <button onClick={closePopup} className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
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
                      <p className={`font-bold text-lg ${item.stock_quantity === 0 ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}`}>{item.stock_quantity}</p>
                      <p className="text-xs text-slate-400">/ {item.low_stock_threshold} min</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={closePopup} className="mt-4 w-full rounded-md border border-slate-300 dark:border-slate-600 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Close</button>
          </div>
        </div>
      )}

      {/* Customers Popup */}
      {activePopup === "customers" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">👥 Customers Served Today</h3>
            {customersServed.length === 0 ? (
              <p className="text-center py-8 text-slate-500 dark:text-slate-400">No customers recorded today.</p>
            ) : (
              <div className="space-y-2">
                {(customersServed as Array<{ id: string; full_name: string; phone?: string; email?: string }>).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 border border-slate-200 dark:border-slate-700 p-3 rounded">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-500/10 flex-shrink-0">
                      <Users className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{c.full_name}</p>
                      {c.phone && <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={closePopup} className="mt-4 w-full rounded-md border border-slate-300 dark:border-slate-600 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}