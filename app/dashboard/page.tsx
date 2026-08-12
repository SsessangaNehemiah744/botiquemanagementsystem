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
  Clock,
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dashboard data
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [customersServedCount, setCustomersServedCount] = useState(0);
  const [sales, setSales] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [customersServed, setCustomersServed] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [newInventory, setNewInventory] = useState<any[]>([]);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [inventorySearch, setInventorySearch] = useState("");

  // Popup state
  const [activePopup, setActivePopup] = useState<
    "revenue" | "items" | "lowStock" | "customers" | "inventory" | null
  >(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/today-stats");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
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
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
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

  const closePopup = () => {
    setActivePopup(null);
    setInventorySearch("");
  };

  // Sorting logic
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getSortedInventory = (items: any[]) => {
    let filtered = items;

    // Search filter
    if (inventorySearch.trim()) {
      const q = inventorySearch.toLowerCase();
      filtered = items.filter(
        (item) =>
          item.products?.name?.toLowerCase().includes(q) ||
          item.products?.category?.toLowerCase().includes(q) ||
          item.size?.toLowerCase().includes(q) ||
          item.color?.toLowerCase().includes(q) ||
          item.barcode?.includes(q) ||
          item.design?.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let valA: any, valB: any;

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
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 text-slate-400" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-emerald-500" />
    ) : (
      <ArrowDown className="h-3 w-3 text-emerald-500" />
    );
  };

  const getAggregatedItems = () => {
    const map = new Map();
    saleItems.forEach((item: any) => {
      const key = item.product_variants?.id;
      if (!key) return;
      if (map.has(key)) {
        map.get(key).sold += item.quantity;
      } else {
        map.set(key, {
          id: key,
          name: item.product_variants?.products?.name || "Unknown",
          size: item.product_variants?.size,
          color: item.product_variants?.color,
          sold: item.quantity,
          stock: item.product_variants?.stock_quantity || 0,
          threshold: item.product_variants?.low_stock_threshold || 0,
        });
      }
    });
    return Array.from(map.values());
  };

  const sortedInventory = getSortedInventory(newInventory);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          Loading dashboard data...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Real-time overview of today&apos;s operations
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 text-sm text-red-600 dark:text-red-400">
          <p className="font-medium">Error loading data:</p>
          <p>{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-2 underline font-medium"
          >
            Retry
          </button>
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
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {card.label}
                </p>
                <p className={`mt-1 text-2xl font-bold ${card.accent}`}>
                  {card.value}
                </p>
              </div>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.accent}`} />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Click to view details →
            </p>
          </button>
        ))}
      </div>

      {/* ===== NEW INVENTORY SECTION ===== */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-500" />
            New Inventory
            <span className="text-sm font-normal text-slate-400">
              ({newInventory.length} items)
            </span>
          </h3>
          <button
            onClick={() => setActivePopup("inventory")}
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            View All →
          </button>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">Sort by:</span>
          {[
            { field: "date" as SortField, label: "Date Added" },
            { field: "name" as SortField, label: "Name" },
            { field: "category" as SortField, label: "Category" },
            { field: "price" as SortField, label: "Price" },
          ].map(({ field, label }) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                sortField === field
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {label}
              <SortIcon field={field} />
            </button>
          ))}
        </div>

        {sortedInventory.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Package className="mx-auto h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No inventory items found</p>
            <p className="text-xs mt-1">
              Recently added products will appear here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                    Category
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                    Size/Color
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                    Design
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                    Price
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                    Stock
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedInventory.slice(0, 5).map((item: any) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Package className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                        <span className="font-medium">
                          {item.products?.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs">
                        {item.products?.category || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {item.size} / {item.color}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {item.design || "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {formatUGX(item.selling_price)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {item.stock_quantity}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedInventory.length > 5 && (
              <p className="text-xs text-center text-slate-400 py-2">
                Showing 5 of {sortedInventory.length} items. Click &quot;View
                All&quot; for full list.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ===== INVENTORY POPUP (FULL LIST - STAYS ON DASHBOARD) ===== */}
      {activePopup === "inventory" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold">
                📦 All Inventory ({sortedInventory.length} items)
              </h3>
              <button
                onClick={closePopup}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search & Sort */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, category, size, color, design, or barcode..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Sort by:</span>
                {[
                  { field: "date" as SortField, label: "Date Added" },
                  { field: "name" as SortField, label: "Name" },
                  { field: "category" as SortField, label: "Category" },
                  { field: "price" as SortField, label: "Price" },
                ].map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => toggleSort(field)}
                    className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      sortField === field
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {label}
                    <SortIcon field={field} />
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
              {sortedInventory.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Package className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>No inventory items match your search</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                        Barcode
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                        Size
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                        Color
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                        Design
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                        Cost
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                        Price
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                        Stock
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                        Date Added
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {sortedInventory.map((item: any) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt=""
                                className="h-8 w-8 rounded object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Package className="h-4 w-4 text-slate-400" />
                              </div>
                            )}
                            <span className="font-medium">
                              {item.products?.name || "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {item.barcode || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs">
                            {item.products?.category || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {item.size || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {item.color || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {item.design || "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-xs">
                          {formatUGX(item.cost_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {formatUGX(item.selling_price)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.stock_quantity}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-3 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                {sortedInventory.length} item
                {sortedInventory.length !== 1 ? "s" : ""}
                {inventorySearch && ` matching "${inventorySearch}"`}
              </span>
              <span className="text-xs text-slate-400">
                Sorted by {sortField} (
                {sortOrder === "asc" ? "ascending" : "descending"})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===== REVENUE POPUP ===== */}
      {activePopup === "revenue" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold">
                Today&apos;s Sales ({sales.length})
              </h3>
              <button
                onClick={closePopup}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {sales.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  No sales recorded today.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-medium px-3">
                    <span>Total: {formatUGX(totalRevenue)}</span>
                  </div>
                  {sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="rounded-md border border-slate-200 dark:border-slate-700 p-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">
                            Sale #{sale.id.substring(0, 8)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(sale.created_at).toLocaleTimeString()} ·{" "}
                            {sale.payment_method}
                          </p>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatUGX(sale.total_amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== ITEMS SOLD POPUP ===== */}
      {activePopup === "items" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold">
                Items Sold Today & Stock Levels
              </h3>
              <button
                onClick={closePopup}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {totalItems === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  No items sold today.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">
                          Product
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Size/Color
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Sold
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Stock
                        </th>
                        <th className="px-4 py-2 text-center font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {getAggregatedItems().map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 font-medium">
                            {item.name}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500">
                            {item.size} / {item.color}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {item.sold}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {item.stock}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                item.stock === 0
                                  ? "bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                                  : item.stock <= item.threshold
                                  ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400"
                                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                              }`}
                            >
                              {item.stock === 0
                                ? "Out"
                                : item.stock <= item.threshold
                                ? "Low"
                                : "OK"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== LOW STOCK POPUP ===== */}
      {activePopup === "lowStock" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold">⚠️ Low Stock Alerts</h3>
              <button
                onClick={closePopup}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {lowStockItems.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  All items are well stocked! 🎉
                </p>
              ) : (
                <div className="space-y-2">
                  {lowStockItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-500/5 p-3"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {item.products?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.size} / {item.color}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold text-sm ${
                            item.stock_quantity === 0
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {item.stock_quantity} left
                        </p>
                        <p className="text-xs text-slate-400">
                          Threshold: {item.low_stock_threshold}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== CUSTOMERS POPUP ===== */}
      {activePopup === "customers" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold">
                👥 Customers Served Today
              </h3>
              <button
                onClick={closePopup}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {customersServed.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  No customers recorded today.
                </p>
              ) : (
                <div className="space-y-2">
                  {customersServed.map((customer: any) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-500/10">
                          <Users className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {customer.full_name}
                          </p>
                          {customer.phone && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {customer.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      {customer.email && (
                        <p className="text-xs text-slate-400">
                          {customer.email}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}