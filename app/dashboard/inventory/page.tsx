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
} from "lucide-react";
import { useInventory, type ProductCategory } from "@/context/InventoryContext";

const CATEGORIES: ProductCategory[] = [
  "Wideleg",
  "Straight",
  "Short",
  "Patras",
  "Boyfriend Shorts",
  "Jorts",
  "Short Dresses",
  "Long Dresses",
  "Short Skirts",
  "Medium Skirts",
  "Long Skirt",
  "Jean Jacket",
  "Leather Jacket Sleeveless",
  "Low waist",
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

export default function InventoryPage() {
  const { variants, loading, addVariant, adjustStock, deleteVariant } = useInventory();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const filtered = variants.filter(
    (v) =>
      v.productName.toLowerCase().includes(search.toLowerCase()) ||
      v.barcode.includes(search) ||
      v.color.toLowerCase().includes(search.toLowerCase()) ||
      v.size.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddVariant = async () => {
    if (!newVariant.productName || !newVariant.size || !newVariant.color) {
      setErrorMsg("Please fill in all required fields (Name, Size, Color)");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      await addVariant({
        productName: newVariant.productName,
        category: newVariant.category,
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
      setShowAddModal(false);
      setNewVariant({
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add variant";
      setErrorMsg(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    try {
      await adjustStock(id, delta);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVariant(id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setNewVariant((prev) => ({
        ...prev,
        image: dataUrl,
        barcode: prev.barcode || generateBarcode(),
      }));
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const stockStatus = (stock: number, threshold: number) => {
    if (stock === 0)
      return {
        label: "Out of Stock",
        color: "bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400",
      };
    if (stock <= threshold)
      return {
        label: "Low Stock",
        color:
          "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400",
      };
    return {
      label: "In Stock",
      color:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Inventory & Stock
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {loading
              ? "Loading..."
              : `${variants.length} variant${variants.length !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add New Variant
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, barcode, color, size, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="min-w-[1100px]">
          <table className="w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                  Product / Style
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                  Category
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                  Barcode
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                  Size
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                  Colour
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
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Loading inventory...
                    </p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    {search
                      ? "No variants match your search."
                      : "No products yet. Click 'Add New Variant' to get started."}
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const status = stockStatus(v.stock, v.lowStockThreshold);
                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {v.image ? (
                            <img
                              src={v.image}
                              alt=""
                              className="h-10 w-10 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                              <ImageIcon className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">
                              {v.productName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {v.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          {v.barcode || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {v.size || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {v.color || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {v.design || "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                        {formatUGX(v.costPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatUGX(v.sellingPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                        {v.stock}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleAdjustStock(v.id, -1)}
                            disabled={v.stock <= 0}
                            className="rounded p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                            title="Decrease stock"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAdjustStock(v.id, 1)}
                            className="rounded p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Increase stock"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(v.id)}
                            className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Delete variant"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* ===== ADD VARIANT MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Add New Variant
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-3 text-sm text-red-600 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Product Image
              </label>
              <div className="flex items-start gap-3">
                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0">
                  {newVariant.image ? (
                    <img
                      src={newVariant.image}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-xs mt-1">No image</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Take a photo or paste an image URL
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                  >
                    <Camera className="h-4 w-4" /> Capture Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleCameraCapture}
                  />
                  <input
                    type="text"
                    placeholder="Or paste image URL"
                    value={newVariant.image}
                    onChange={(e) =>
                      setNewVariant({ ...newVariant, image: e.target.value })
                    }
                    className="mt-2 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Product Name / Style *
                </label>
                <input
                  type="text"
                  value={newVariant.productName}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, productName: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., Silk Evening Gown"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={newVariant.category}
                  onChange={(e) =>
                    setNewVariant({
                      ...newVariant,
                      category: e.target.value as ProductCategory,
                    })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Design */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Design
                </label>
                <input
                  type="text"
                  value={newVariant.design}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, design: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., Floral, Plain, Striped"
                />
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Barcode{" "}
                  <span className="text-xs text-slate-400">(auto)</span>
                </label>
                <input
                  type="text"
                  value={newVariant.barcode}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, barcode: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Size */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Size *
                </label>
                <input
                  type="text"
                  value={newVariant.size}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, size: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., S, M, L, XL"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Colour *
                </label>
                <input
                  type="text"
                  value={newVariant.color}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, color: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., Black, Red, Blue"
                />
              </div>

              {/* Cost Price */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cost Price (UGX)
                </label>
                <input
                  type="number"
                  value={newVariant.costPrice || ""}
                  onChange={(e) =>
                    setNewVariant({
                      ...newVariant,
                      costPrice: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="0"
                />
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Selling Price (UGX) *
                </label>
                <input
                  type="number"
                  value={newVariant.sellingPrice || ""}
                  onChange={(e) =>
                    setNewVariant({
                      ...newVariant,
                      sellingPrice: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="0"
                />
              </div>

              {/* Stock Qty */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Stock Qty
                </label>
                <input
                  type="number"
                  value={newVariant.stock || ""}
                  onChange={(e) =>
                    setNewVariant({
                      ...newVariant,
                      stock: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="0"
                />
              </div>

              {/* Low Stock Alert */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Low Stock Alert
                </label>
                <input
                  type="number"
                  value={newVariant.lowStockThreshold || ""}
                  onChange={(e) =>
                    setNewVariant({
                      ...newVariant,
                      lowStockThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                  placeholder="5"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddVariant}
                disabled={saving}
                className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save Variant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION ===== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Delete Variant
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}