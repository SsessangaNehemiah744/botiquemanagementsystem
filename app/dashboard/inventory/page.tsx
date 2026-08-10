"use client";

import { useState, useRef } from "react";
import {
  Search,
  Plus,
  Minus,
  X,
  Image as ImageIcon,
  Pencil,
  Camera,
} from "lucide-react";
import { useInventory, type Variant, type ProductCategory } from "@/context/InventoryContext";

// ---------- HELPERS ----------
function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

function generateSKU(category: ProductCategory): string {
  const prefix = category.substring(0, 3).toUpperCase();
  const unique = Math.random().toString(36).substring(2, 6).toUpperCase();
  const num = Date.now().toString().slice(-4);
  return `${prefix}-${unique}-${num}`;
}

function generateBarcode(): string {
  return String(Date.now()).slice(-8);
}

export default function InventoryPage() {
  const { variants, addVariant, adjustStock } = useInventory();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Camera ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [newVariant, setNewVariant] = useState({
    productName: "",
    category: "Dresses" as ProductCategory,
    image: "",
    sku: "",
    barcode: "",
    size: "",
    color: "",
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    lowStockThreshold: 5,
  });

  // Filtering
  const filtered = variants.filter(
    (v) =>
      v.productName.toLowerCase().includes(search.toLowerCase()) ||
      v.sku.toLowerCase().includes(search.toLowerCase()) ||
      v.barcode.includes(search)
  );

  // Add new variant
  const addNewVariant = () => {
    if (!newVariant.productName || !newVariant.sku) return;

    addVariant({
      id: `v-${Date.now()}`,
      productName: newVariant.productName,
      category: newVariant.category,
      image: newVariant.image || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200",
      sku: newVariant.sku,
      barcode: newVariant.barcode,
      size: newVariant.size,
      color: newVariant.color,
      costPrice: newVariant.costPrice,
      sellingPrice: newVariant.sellingPrice,
      stock: newVariant.stock,
      lowStockThreshold: newVariant.lowStockThreshold,
    });

    // Reset form & close modal
    setShowAddModal(false);
    setNewVariant({
      productName: "",
      category: "Dresses",
      image: "",
      sku: "",
      barcode: "",
      size: "",
      color: "",
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
      lowStockThreshold: 5,
    });
  };

  // Camera capture handler
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setNewVariant((prev) => ({
        ...prev,
        image: dataUrl,
        sku: prev.sku || generateSKU(prev.category),
        barcode: prev.barcode || generateBarcode(),
      }));
    };
    reader.readAsDataURL(file);

    // Clear input for reuse
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Stock status badge
  const stockStatus = (stock: number, threshold: number) => {
    if (stock === 0)
      return { label: "Out of Stock", color: "bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400" };
    if (stock <= threshold)
      return { label: "Low Stock", color: "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400" };
    return { label: "In Stock", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory & Stock</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage product variants and stock levels
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
          placeholder="Search by name, SKU, or barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Product</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">SKU / Barcode</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Size / Color</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Cost</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Price</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Stock</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">Status</th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((v) => {
              const status = stockStatus(v.stock, v.lowStockThreshold);
              return (
                <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {v.image ? (
                        <img src={v.image} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                          <ImageIcon className="h-5 w-5 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{v.productName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{v.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs">{v.sku}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{v.barcode}</p>
                  </td>
                  <td className="px-4 py-3">{v.size} / {v.color}</td>
                  <td className="px-4 py-3 text-right">{formatUGX(v.costPrice)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(v.sellingPrice)}</td>
                  <td className="px-4 py-3 text-right font-medium">{v.stock}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => adjustStock(v.id, -1)} disabled={v.stock <= 0} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"><Minus className="h-4 w-4" /></button>
                      <button onClick={() => adjustStock(v.id, 1)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"><Plus className="h-4 w-4" /></button>
                      <button className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">No variants found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== ADD VARIANT MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Add New Dress / Variant</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Image Capture */}
            <div className="mb-4">
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Product Image</label>
              <div className="flex items-start gap-3">
                <div className="h-24 w-24 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800">
                  {newVariant.image ? (
                    <img src={newVariant.image} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Take a photo or paste an image URL</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
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
                    onChange={(e) => setNewVariant({ ...newVariant, image: e.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Product Name</label>
                <input type="text" value={newVariant.productName} onChange={(e) => setNewVariant({ ...newVariant, productName: e.target.value })} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Category</label>
                <select value={newVariant.category} onChange={(e) => { const cat = e.target.value as ProductCategory; setNewVariant(prev => ({ ...prev, category: cat, sku: prev.sku || generateSKU(cat) })); }} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none">
                  <option>Dresses</option>
                  <option>Outerwear</option>
                  <option>Skirts</option>
                  <option>Accessories</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">SKU <span className="text-xs text-slate-400">(auto)</span></label>
                <input type="text" value={newVariant.sku} onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Barcode <span className="text-xs text-slate-400">(auto)</span></label>
                <input type="text" value={newVariant.barcode} onChange={(e) => setNewVariant({ ...newVariant, barcode: e.target.value })} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Size</label>
                <input type="text" value={newVariant.size} onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Color</label>
                <input type="text" value={newVariant.color} onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Cost Price (UGX)</label>
                <input type="number" value={newVariant.costPrice} onChange={(e) => setNewVariant({ ...newVariant, costPrice: Number(e.target.value) })} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Selling Price (UGX)</label>
                <input type="number" value={newVariant.sellingPrice} onChange={(e) => setNewVariant({ ...newVariant, sellingPrice: Number(e.target.value) })} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Stock Qty</label>
                <input type="number" value={newVariant.stock} onChange={(e) => setNewVariant({ ...newVariant, stock: Number(e.target.value) })} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Low Stock Alert</label>
                <input type="number" value={newVariant.lowStockThreshold} onChange={(e) => setNewVariant({ ...newVariant, lowStockThreshold: Number(e.target.value) })} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 py-2 text-sm text-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={addNewVariant} className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500">Save Variant</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}