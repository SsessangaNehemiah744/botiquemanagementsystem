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
  created_at: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [customersServedCount, setCustomersServedCount] = useState(0);
  const [sales, setSales] = useState<unknown[]>([]);
  const [lowStockItems, setLowStockItems] = useState<unknown[]>([]);
  const [customersServed, setCustomersServed] = useState<unknown[]>([]);
  const [saleItems, setSaleItems] = useState<unknown[]>([]);
  const [newInventory, setNewInventory] = useState<InventoryItem[]>([]);

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
      const response = await fetch("/api/dashboard/today-stats");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "HTTP error " + response.status);
      }

      setTotalRevenue(data.totalRevenue || 0);
      setTotalItems(data.totalItems || 0);
      setLowStockCount(data.lowStockCount || 0);
      setCustomersServedCount(data.customersServedCount || 0);
      setSales(data.sales || []);
      setLowStockItems(data.lowStockItems || []);
      setCustomersServed(data.customersServed || []);
      setSaleItems(data.saleItems || []);
      setNewInventory(data.newInventory || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard data";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const openPopup = (popup: "revenue" | "items" | "lowStock" | "customers" | "inventory") => {
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
      setSortOrder("desc");
    }
  };

  const getSortedInventory = (items: InventoryItem[]) => {
    let filtered = items;
    if (inventorySearch.trim()) {
      const q = inventorySearch.toLowerCase();
      filtered = items.filter(
        (item) =>
          item.products?.name?.toLowerCase().includes(q) ||
          item.products?.category?.toLowerCase().includes(q) ||
          item.size?.toLowerCase().includes(q) ||
          item.color?.toLowerCase().includes(q) ||
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
          valA = a.selling_price;
          valB = b.selling_price;
          break;
        case "category":
          valA = a.products?.category || "";
          valB = b.products?.category || "";
          break;
        case "name":
          valA = a.products?.name || "";
          valB = b.products?.name || "";
          break;
      }
      if (sortOrder === "asc") return valA > valB ? 1 : valA < valB ? -1 : 0;
      return valA < valB ? 1 : valA > valB ? -1 : 0;
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
        <p className="text-slate-500 dark:text-slate-400">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Real-time overview of today&apos;s operations
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 text-sm text-red-600 dark:text-red-400">
          <p className="font-medium">Error loading data:</p>
          <p>{error}</p>
          <button onClick={loadData} className="mt-2 underline font-medium">Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card, i) => (
          <button
            key={i}
            onClick={() => setActivePopup(card.popup)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{card.label}</p>
                <p className={`mt-1 text-2xl font-bold ${card.accent}`}>{card.value}</p>
              </div>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.accent}`} />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">Click to view details →</p>
          </button>
        ))}
      </div>

      {/* New Inventory */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-500" />
            New Inventory
            <span className="text-sm font-normal text-slate-400">({newInventory.length} items)</span>
          </h3>
          <button onClick={() => openPopup("inventory")} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
            View All →
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">Sort by:</span>
          {(["date", "name", "category", "price"] as SortField[]).map((field) => (
            <button key={field} onClick={() => toggleSort(field)} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${sortField === field ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
              {field === "date" ? "Date Added" : field.charAt(0).toUpperCase() + field.slice(1)}
              <SortIcon field={field} />
            </button>
          ))}
        </div>
        {sortedInventory.length === 0 ? (
          <div className="text-center py-8 text-slate-400"><Package className="mx-auto h-10 w-10 mb-2 opacity-50" /><p className="text-sm">No inventory items found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr><th className="px-4 py-2 text-left font-medium">Product</th><th className="px-4 py-2 text-left font-medium">Category</th><th className="px-4 py-2 text-left font-medium">Size/Color</th><th className="px-4 py-2 text-right font-medium">Price</th><th className="px-4 py-2 text-right font-medium">Stock</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedInventory.slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2"><div className="flex items-center gap-2">{item.image_url ? <img src={item.image_url} alt="" className="h-8 w-8 rounded object-cover" /> : <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Package className="h-4 w-4 text-slate-400" /></div>}<span className="font-medium">{item.products?.name || "Unknown"}</span></div></td>
                    <td className="px-4 py-2"><span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs">{item.products?.category || "—"}</span></td>
                    <td className="px-4 py-2 text-xs text-slate-500">{item.size} / {item.color}</td>
                    <td className="px-4 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatUGX(item.selling_price)}</td>
                    <td className="px-4 py-2 text-right">{item.stock_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inventory Popup */}
      {activePopup === "inventory" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="text-lg font-bold">📦 All Inventory ({sortedInventory.length} items)</h3><button onClick={closePopup} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
            <div className="p-4 border-b space-y-3">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search inventory..." value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm" /></div>
              <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500">Sort by:</span>{(["date", "name", "category", "price"] as SortField[]).map((field) => (<button key={field} onClick={() => toggleSort(field)} className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${sortField === field ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>{field === "date" ? "Date Added" : field.charAt(0).toUpperCase() + field.slice(1)}<SortIcon field={field} /></button>))}</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sortedInventory.length === 0 ? <div className="text-center py-12 text-slate-400"><Package className="mx-auto h-12 w-12 mb-3 opacity-50" /><p>No inventory items found</p></div> : (
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0"><tr><th className="px-4 py-3 text-left font-medium">Product</th><th className="px-4 py-3 text-left font-medium">Barcode</th><th className="px-4 py-3 text-left font-medium">Category</th><th className="px-4 py-3 text-left font-medium">Size</th><th className="px-4 py-3 text-left font-medium">Color</th><th className="px-4 py-3 text-left font-medium">Design</th><th className="px-4 py-3 text-right font-medium">Cost</th><th className="px-4 py-3 text-right font-medium">Price</th><th className="px-4 py-3 text-right font-medium">Stock</th><th className="px-4 py-3 text-left font-medium">Date Added</th></tr></thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {sortedInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3"><div className="flex items-center gap-2">{item.image_url ? <img src={item.image_url} alt="" className="h-8 w-8 rounded object-cover" /> : <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Package className="h-4 w-4 text-slate-400" /></div>}<span className="font-medium">{item.products?.name || "Unknown"}</span></div></td>
                        <td className="px-4 py-3 font-mono text-xs">{item.barcode || "—"}</td>
                        <td className="px-4 py-3"><span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs">{item.products?.category || "—"}</span></td>
                        <td className="px-4 py-3 text-xs">{item.size || "—"}</td>
                        <td className="px-4 py-3 text-xs">{item.color || "—"}</td>
                        <td className="px-4 py-3 text-xs">{item.design || "—"}</td>
                        <td className="px-4 py-3 text-right text-xs">{formatUGX(item.cost_price)}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatUGX(item.selling_price)}</td>
                        <td className="px-4 py-3 text-right">{item.stock_quantity}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border-t p-3 flex justify-between items-center"><span className="text-xs text-slate-400">{sortedInventory.length} item{sortedInventory.length !== 1 ? "s" : ""}</span><span className="text-xs text-slate-400">Sorted by {sortField} ({sortOrder === "asc" ? "ascending" : "descending"})</span></div>
          </div>
        </div>
      )}

      {/* Revenue Popup */}
      {activePopup === "revenue" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="text-lg font-bold">Today&apos;s Sales ({sales.length})</h3><button onClick={closePopup} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
            <div className="flex-1 overflow-y-auto p-4">
              {sales.length === 0 ? <p className="text-center text-slate-500 py-8">No sales today.</p> : (
                <div className="space-y-3">
                  <p className="text-sm font-medium px-3">Total: {formatUGX(totalRevenue)}</p>
                  {(sales as Array<{ id: string; total_amount: number; created_at: string; payment_method: string }>).map((s) => (
                    <div key={s.id} className="rounded-md border p-3"><div className="flex justify-between"><span>#{s.id.substring(0, 8)}</span><span className="font-bold text-emerald-600">{formatUGX(s.total_amount)}</span></div><p className="text-xs text-slate-500">{new Date(s.created_at).toLocaleTimeString()} · {s.payment_method}</p></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items Sold */}
      {activePopup === "items" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg border p-6"><h3 className="text-lg font-bold mb-2">Items Sold Today</h3><p>{totalItems} items sold today.</p><button onClick={closePopup} className="mt-4 rounded-md border px-4 py-2 text-sm">Close</button></div>
        </div>
      )}

      {/* Low Stock */}
      {activePopup === "lowStock" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg border p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">⚠️ Low Stock Alerts</h3>
            {lowStockItems.length === 0 ? <p className="text-center py-8">All stocked! 🎉</p> : (
              <div className="space-y-2">
                {(lowStockItems as Array<{ id: string; products?: { name: string }; size: string; color: string; stock_quantity: number; low_stock_threshold: number }>).map((item) => (
                  <div key={item.id} className="flex justify-between border border-red-200 bg-red-50 p-3 rounded">
                    <div><p className="font-medium">{item.products?.name}</p><p className="text-xs">{item.size}/{item.color}</p></div>
                    <p className="font-bold text-red-600">{item.stock_quantity} left</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={closePopup} className="mt-4 w-full rounded-md border py-2 text-sm">Close</button>
          </div>
        </div>
      )}

      {/* Customers */}
      {activePopup === "customers" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg border p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">👥 Customers Served Today</h3>
            {customersServed.length === 0 ? <p className="text-center py-8">No customers today.</p> : (
              <div className="space-y-2">
                {(customersServed as Array<{ id: string; full_name: string; phone?: string; email?: string }>).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 border p-3 rounded">
                    <Users className="h-8 w-8 text-purple-500" />
                    <div><p className="font-medium">{c.full_name}</p>{c.phone && <p className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>}</div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={closePopup} className="mt-4 w-full rounded-md border py-2 text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}