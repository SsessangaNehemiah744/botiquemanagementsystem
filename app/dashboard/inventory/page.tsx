"use client";

import { useState, useRef } from "react";
import {
  Search,
  Plus,
  Minus,
  X,
  Image as ImageIcon,
  Camera,
  Loader2,
  Trash2,
  Pencil,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  History,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  ShoppingBag
} from "lucide-react";
import { useInventory, type Variant, type ProductCategory } from "@/context/InventoryContext";

const CATEGORIES: ProductCategory[] = [
  "Wideleg", "Straight", "Short", "Patras",
  "Boyfriend Shorts", "Jorts", "Short Dresses", "Long Dresses",
  "Short Skirts", "Medium Skirts", "Long Skirt",
  "Jean Jacket", "Leather Jacket Sleeveless", "Low waist",
];

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

function generateBarcode(): string {
  return String(Date.now()).slice(-8);
}

type SortField = "name" | "category" | "barcode" | "size" | "color" | "design" | "price" | "stock" | "status" | "date";
type SortOrder = "asc" | "desc";

interface StockHistoryEntry {
  id: string;
  variant_id: string;
  product_name: string;
  variant_details: string;
  change_type: "addition" | "removal" | "adjustment" | "sale";
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  notes: string;
  created_at: string;
}

export default function InventoryPage() {
  const { variants, loading, addVariant, adjustStock, deleteVariant, updateVariant } = useInventory();

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "addition" | "removal" | "adjustment" | "sale">("all");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [editShowCustomCategory, setEditShowCustomCategory] = useState(false);
  const [editCustomCategory, setEditCustomCategory] = useState("");

  const [newVariant, setNewVariant] = useState({
    productName: "",
    category: CATEGORIES[0],
    image: "",
    barcode: "",
    size: "",
    color: "",
    design: "",
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    lowStockThreshold: 5,
  });

  const [editForm, setEditForm] = useState({
    productName: "",
    category: CATEGORIES[0] as ProductCategory,
    image: "",
    barcode: "",
    size: "",
    color: "",
    design: "",
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    lowStockThreshold: 5,
  });

  // Stock history state
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch history from API
  const fetchStockHistory = async (filter: string = "all") => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/inventory/history?filter=${filter}`);
      const result = await response.json();
      if (response.ok) {
        setStockHistory(result.history || []);
      } else {
        console.error("Failed to fetch history:", result.error);
        // If API fails, try to fetch from sales
        const salesResponse = await fetch(`/api/sales?limit=50`);
        const salesResult = await salesResponse.json();
        if (salesResponse.ok && salesResult.sales) {
          const salesHistory = salesResult.sales.flatMap((sale: any) => 
            (sale.sale_items || []).map((item: any) => ({
              id: `${sale.id}-${item.id}`,
              variant_id: item.variant_id,
              product_name: item.product_variants?.productName || "Unknown",
              variant_details: `${item.product_variants?.color || "N/A"} / ${item.product_variants?.size || "N/A"}`,
              change_type: "sale" as const,
              quantity_change: -item.quantity,
              previous_stock: 0,
              new_stock: 0,
              notes: "Sold via POS",
              created_at: sale.created_at,
            }))
          );
          setStockHistory(salesHistory);
        }
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Open history modal
  const openHistoryModal = () => {
    setShowHistoryModal(true);
    fetchStockHistory(historyFilter);
  };

  // Handle history filter change
  const handleHistoryFilterChange = (filter: typeof historyFilter) => {
    setHistoryFilter(filter);
    fetchStockHistory(filter);
  };

  const filtered = variants.filter(
    (v) =>
      v.productName.toLowerCase().includes(search.toLowerCase()) ||
      v.barcode.toLowerCase().includes(search.toLowerCase()) ||
      v.color.toLowerCase().includes(search.toLowerCase()) ||
      v.size.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase()) ||
      (v.design || "").toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let valA: string | number = 0;
    let valB: string | number = 0;
    switch (sortField) {
      case "name": valA = a.productName.toLowerCase(); valB = b.productName.toLowerCase(); break;
      case "category": valA = a.category.toLowerCase(); valB = b.category.toLowerCase(); break;
      case "barcode": valA = (a.barcode || "").toLowerCase(); valB = (b.barcode || "").toLowerCase(); break;
      case "size": valA = (a.size || "").toLowerCase(); valB = (b.size || "").toLowerCase(); break;
      case "color": valA = (a.color || "").toLowerCase(); valB = (b.color || "").toLowerCase(); break;
      case "design": valA = (a.design || "").toLowerCase(); valB = (b.design || "").toLowerCase(); break;
      case "price": valA = a.sellingPrice; valB = b.sellingPrice; break;
      case "stock": valA = a.stock; valB = b.stock; break;
      case "status":
        const statusOrder = { "out_of_stock": 0, "low_stock": 1, "in_stock": 2 };
        const getStatus = (v: Variant) => v.stock === 0 ? "out_of_stock" : v.stock <= v.lowStockThreshold ? "low_stock" : "in_stock";
        valA = statusOrder[getStatus(a) as keyof typeof statusOrder];
        valB = statusOrder[getStatus(b) as keyof typeof statusOrder];
        break;
      case "date": valA = new Date(a.created_at).getTime(); valB = new Date(b.created_at).getTime(); break;
    }
    if (sortOrder === "asc") return valA > valB ? 1 : valA < valB ? -1 : 0;
    return valA < valB ? 1 : valA > valB ? -1 : 0;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-slate-400 dark:text-slate-500" />;
    return sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-emerald-500" /> : <ArrowDown className="h-3 w-3 text-emerald-500" />;
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case "addition": return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400";
      case "removal": return "bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400";
      case "adjustment": return "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400";
      case "sale": return "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400";
      default: return "bg-slate-50 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case "addition": return <TrendingUp className="h-4 w-4" />;
      case "removal": return <TrendingDown className="h-4 w-4" />;
      case "adjustment": return <Package className="h-4 w-4" />;
      case "sale": return <ShoppingBag className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const handleAddVariant = async () => {
    const finalCategory = (showCustomCategory && customCategory.trim()
      ? customCategory.trim()
      : newVariant.category) as ProductCategory;

    if (!newVariant.productName || !newVariant.size || !newVariant.color) {
      setErrorMsg("Please fill in all required fields (Name, Size, Color)");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      const addedVariant = await addVariant({
        productName: newVariant.productName,
        category: finalCategory,
        image: newVariant.image || "",
        barcode: newVariant.barcode || generateBarcode(),
        size: newVariant.size,
        color: newVariant.color,
        design: newVariant.design || "",
        costPrice: newVariant.costPrice || 0,
        sellingPrice: newVariant.sellingPrice || 0,
        stock: newVariant.stock || 0,
        lowStockThreshold: newVariant.lowStockThreshold || 5,
      });

      // Record initial stock in history if stock > 0
      if (addedVariant && newVariant.stock > 0) {
        try {
          await fetch("/api/inventory/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              variant_id: addedVariant.id,
              change_type: "addition",
              quantity_change: newVariant.stock,
              previous_stock: 0,
              new_stock: newVariant.stock,
              notes: "Initial stock entry",
            }),
          });
        } catch (error) {
          console.error("Failed to record stock history:", error);
        }
      }

      setShowAddModal(false);
      setShowCustomCategory(false);
      setCustomCategory("");
      setNewVariant({
        productName: "", category: CATEGORIES[0], image: "", barcode: "",
        size: "", color: "", design: "", costPrice: 0, sellingPrice: 0,
        stock: 0, lowStockThreshold: 5,
      });
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to add variant");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (variant: Variant) => {
    setEditingVariant(variant);
    setEditForm({
      productName: variant.productName,
      category: variant.category,
      image: variant.image,
      barcode: variant.barcode,
      size: variant.size,
      color: variant.color,
      design: variant.design || "",
      costPrice: variant.costPrice,
      sellingPrice: variant.sellingPrice,
      stock: variant.stock,
      lowStockThreshold: variant.lowStockThreshold,
    });
    setEditShowCustomCategory(false);
    setEditCustomCategory("");
    setErrorMsg("");
  };

  const handleEditVariant = async () => {
    if (!editingVariant) return;
    const finalCategory = (editShowCustomCategory && editCustomCategory.trim()
      ? editCustomCategory.trim()
      : editForm.category) as ProductCategory;

    if (!editForm.productName || !editForm.size || !editForm.color) {
      setErrorMsg("Please fill in all required fields");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      await updateVariant(editingVariant.id, {
        productName: editForm.productName,
        category: finalCategory,
        image: editForm.image,
        barcode: editForm.barcode,
        size: editForm.size,
        color: editForm.color,
        design: editForm.design,
        costPrice: editForm.costPrice,
        sellingPrice: editForm.sellingPrice,
        stock: editForm.stock,
        lowStockThreshold: editForm.lowStockThreshold,
      });
      setEditingVariant(null);
      setEditShowCustomCategory(false);
      setEditCustomCategory("");
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to update variant");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVariant(id);
      setShowDeleteConfirm(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete variant";
      alert(message);
      setShowDeleteConfirm(null);
    }
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    try {
      const variant = variants.find(v => v.id === id);
      if (!variant) return;
      
      await adjustStock(id, delta);
      
      // Record stock adjustment in history
      try {
        await fetch("/api/inventory/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variant_id: id,
            change_type: delta > 0 ? "addition" : "removal",
            quantity_change: delta,
            previous_stock: variant.stock,
            new_stock: variant.stock + delta,
            notes: delta > 0 ? "Manual stock addition" : "Manual stock removal",
          }),
        });
      } catch (error) {
        console.error("Failed to record stock adjustment:", error);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (isEdit) {
        setEditForm((prev) => ({ ...prev, image: dataUrl }));
      } else {
        setNewVariant((prev) => ({
          ...prev,
          image: dataUrl,
          barcode: prev.barcode || generateBarcode(),
        }));
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const stockStatus = (stock: number, threshold: number) => {
    if (stock === 0) return { label: "Out of Stock", color: "bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400" };
    if (stock <= threshold) return { label: "Low Stock", color: "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400" };
    return { label: "In Stock", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const inputClass = "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
  const selectClass = "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory & Stock</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {loading ? "Loading..." : `${variants.length} variant${variants.length !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={openHistoryModal}
            className="flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <History className="h-4 w-4" /> Inventory History
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Add New Variant
          </button>
        </div>
      </div>

      {/* Professional Search Bar */}
      <div className="relative max-w-md group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search by name, barcode, color, size, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <div className="min-w-[1400px]">
          <table className="w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                  <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Product / Style <SortIcon field="name" /></button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                  <button onClick={() => toggleSort("category")} className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Category <SortIcon field="category" /></button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                  <button onClick={() => toggleSort("barcode")} className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Barcode <SortIcon field="barcode" /></button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                  <button onClick={() => toggleSort("size")} className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Size <SortIcon field="size" /></button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                  <button onClick={() => toggleSort("color")} className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Colour <SortIcon field="color" /></button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                  <button onClick={() => toggleSort("design")} className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Design <SortIcon field="design" /></button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                  <button onClick={() => toggleSort("price")} className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Price <SortIcon field="price" /></button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                  <button onClick={() => toggleSort("stock")} className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Stock <SortIcon field="stock" /></button>
                </th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                  <button onClick={() => toggleSort("status")} className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Status <SortIcon field="status" /></button>
                </th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={10} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" /><p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading...</p></td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">{search ? "No variants match your search." : "No products yet."}</td></tr>
              ) : (
                sorted.map((v) => {
                  const status = stockStatus(v.stock, v.lowStockThreshold);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {v.image ? <img src={v.image} alt="" className="h-10 w-10 rounded object-cover flex-shrink-0" /> : <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 dark:bg-slate-800"><ImageIcon className="h-5 w-5 text-slate-400" /></div>}
                          <p className="font-medium text-slate-900 dark:text-white truncate">{v.productName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">{v.category}</span></td>
                      <td className="px-4 py-3"><p className="font-mono text-xs text-slate-700 dark:text-slate-300">{v.barcode || "—"}</p></td>
                      <td className="px-4 py-3"><span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">{v.size || "—"}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{v.color || "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{v.design || "—"}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(v.sellingPrice)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{v.stock}</td>
                      <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleAdjustStock(v.id, -1)} disabled={v.stock <= 0} className="rounded p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50" title="Decrease stock"><Minus className="h-4 w-4" /></button>
                          <button onClick={() => handleAdjustStock(v.id, 1)} className="rounded p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" title="Increase stock"><Plus className="h-4 w-4" /></button>
                          <button onClick={() => openEditModal(v)} className="rounded p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10" title="Edit"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setShowDeleteConfirm(v.id)} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/80 p-4">
          <div className="w-full max-w-4xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-500" /> Inventory History
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Track all stock movements and purchases
                </p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {[
                { id: "all", label: "All" },
                { id: "addition", label: "Additions" },
                { id: "removal", label: "Removals" },
                { id: "adjustment", label: "Adjustments" },
                { id: "sale", label: "Sales" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleHistoryFilterChange(tab.id as typeof historyFilter)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    historyFilter === tab.id
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* History Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Product</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Type</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Change</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Before</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">After</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading history...</p>
                      </td>
                    </tr>
                  ) : stockHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No history entries found.
                      </td>
                    </tr>
                  ) : (
                    stockHistory.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(entry.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 dark:text-white">{entry.product_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{entry.variant_details}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getChangeTypeColor(entry.change_type)}`}>
                            {getChangeTypeIcon(entry.change_type)}
                            {entry.change_type.charAt(0).toUpperCase() + entry.change_type.slice(1)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${entry.quantity_change > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {entry.quantity_change > 0 ? `+${entry.quantity_change}` : entry.quantity_change}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{entry.previous_stock}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{entry.new_stock}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{entry.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Variant</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            {errorMsg && <div className="mb-4 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-3 text-sm text-red-600 dark:text-red-400">{errorMsg}</div>}
            <div className="mb-4">
              <label className={labelClass}>Product Image</label>
              <div className="flex items-start gap-3">
                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0">
                  {newVariant.image ? <img src={newVariant.image} alt="Preview" className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-slate-400" />}
                </div>
                <div className="flex-1">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"><Camera className="h-4 w-4" /> Capture Photo</button>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleCameraCapture(e, false)} />
                  <input type="text" placeholder="Or paste image URL" value={newVariant.image} onChange={(e) => setNewVariant({ ...newVariant, image: e.target.value })} className={`mt-2 ${inputClass}`} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className={labelClass}>Product Name / Style *</label><input type="text" value={newVariant.productName} onChange={(e) => setNewVariant({ ...newVariant, productName: e.target.value })} className={inputClass} /></div>
              <div>
                <label className={labelClass}>Category</label>
                {showCustomCategory ? (
                  <div className="flex gap-2">
                    <input type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Enter new category" className={inputClass} autoFocus />
                    <button onClick={() => { setShowCustomCategory(false); setCustomCategory(""); }} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-400">Back</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select value={newVariant.category} onChange={(e) => setNewVariant({ ...newVariant, category: e.target.value as ProductCategory })} className={selectClass}>
                      {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <button onClick={() => setShowCustomCategory(true)} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">+ New</button>
                  </div>
                )}
              </div>
              <div><label className={labelClass}>Design</label><input type="text" value={newVariant.design} onChange={(e) => setNewVariant({ ...newVariant, design: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Barcode (auto)</label><input type="text" value={newVariant.barcode} onChange={(e) => setNewVariant({ ...newVariant, barcode: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Size *</label><input type="text" value={newVariant.size} onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Colour *</label><input type="text" value={newVariant.color} onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Cost Price (UGX)</label><input type="number" value={newVariant.costPrice || ""} onChange={(e) => setNewVariant({ ...newVariant, costPrice: Number(e.target.value) })} className={inputClass} /></div>
              <div><label className={labelClass}>Selling Price (UGX) *</label><input type="number" value={newVariant.sellingPrice || ""} onChange={(e) => setNewVariant({ ...newVariant, sellingPrice: Number(e.target.value) })} className={inputClass} /></div>
              <div><label className={labelClass}>Stock Qty</label><input type="number" value={newVariant.stock || ""} onChange={(e) => setNewVariant({ ...newVariant, stock: Number(e.target.value) })} className={inputClass} /></div>
              <div><label className={labelClass}>Low Stock Alert</label><input type="number" value={newVariant.lowStockThreshold || ""} onChange={(e) => setNewVariant({ ...newVariant, lowStockThreshold: Number(e.target.value) })} className={inputClass} /></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleAddVariant} disabled={saving} className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving..." : "Save Variant"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Variant</h3>
              <button onClick={() => setEditingVariant(null)} className="p-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            {errorMsg && <div className="mb-4 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-3 text-sm text-red-600 dark:text-red-400">{errorMsg}</div>}
            <div className="mb-4">
              <label className={labelClass}>Product Image</label>
              <div className="flex items-start gap-3">
                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0">
                  {editForm.image ? <img src={editForm.image} alt="Preview" className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-slate-400" />}
                </div>
                <div className="flex-1">
                  <button type="button" onClick={() => editFileInputRef.current?.click()} className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"><Camera className="h-4 w-4" /> Change Photo</button>
                  <input ref={editFileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleCameraCapture(e, true)} />
                  <input type="text" placeholder="Or paste image URL" value={editForm.image} onChange={(e) => setEditForm({ ...editForm, image: e.target.value })} className={`mt-2 ${inputClass}`} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className={labelClass}>Product Name / Style *</label><input type="text" value={editForm.productName} onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })} className={inputClass} /></div>
              <div>
                <label className={labelClass}>Category</label>
                {editShowCustomCategory ? (
                  <div className="flex gap-2">
                    <input type="text" value={editCustomCategory} onChange={(e) => setEditCustomCategory(e.target.value)} placeholder="Enter new category" className={inputClass} autoFocus />
                    <button onClick={() => { setEditShowCustomCategory(false); setEditCustomCategory(""); }} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-400">Back</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value as ProductCategory })} className={selectClass}>
                      {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <button onClick={() => setEditShowCustomCategory(true)} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">+ New</button>
                  </div>
                )}
              </div>
              <div><label className={labelClass}>Design</label><input type="text" value={editForm.design} onChange={(e) => setEditForm({ ...editForm, design: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Barcode</label><input type="text" value={editForm.barcode} onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Size *</label><input type="text" value={editForm.size} onChange={(e) => setEditForm({ ...editForm, size: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Colour *</label><input type="text" value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} className={inputClass} /></div>
              <div><label className={labelClass}>Cost Price (UGX)</label><input type="number" value={editForm.costPrice || ""} onChange={(e) => setEditForm({ ...editForm, costPrice: Number(e.target.value) })} className={inputClass} /></div>
              <div><label className={labelClass}>Selling Price (UGX) *</label><input type="number" value={editForm.sellingPrice || ""} onChange={(e) => setEditForm({ ...editForm, sellingPrice: Number(e.target.value) })} className={inputClass} /></div>
              <div><label className={labelClass}>Stock Qty</label><input type="number" value={editForm.stock || ""} onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })} className={inputClass} /></div>
              <div><label className={labelClass}>Low Stock Alert</label><input type="number" value={editForm.lowStockThreshold || ""} onChange={(e) => setEditForm({ ...editForm, lowStockThreshold: Number(e.target.value) })} className={inputClass} /></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setEditingVariant(null)} className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleEditVariant} disabled={saving} className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving..." : "Update Variant"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Variant</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}