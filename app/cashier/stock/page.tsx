"use client";

import { useState } from "react";
import { Search, Package, Image as ImageIcon, Eye } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function StockLookupPage() {
  const { variants, loading } = useInventory();
  const [search, setSearch] = useState("");

  const filtered = variants.filter(
    (v) =>
      v.productName.toLowerCase().includes(search.toLowerCase()) ||
      v.barcode.includes(search) ||
      v.color.toLowerCase().includes(search.toLowerCase()) ||
      v.size.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Stock Lookup</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Check product availability (view only)</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((v) => (
          <div key={v.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-3 mb-3">
              {v.image ? (
                <img src={v.image} alt="" className="h-14 w-14 rounded object-cover" />
              ) : (
                <div className="h-14 w-14 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-slate-400" />
                </div>
              )}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{v.productName}</p>
                <p className="text-xs text-slate-500">{v.size} / {v.color}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatUGX(v.sellingPrice)}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                v.stock > 5 ? "bg-emerald-50 text-emerald-600" : v.stock > 0 ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-600"
              }`}>
                {v.stock > 0 ? `${v.stock} in stock` : "Out of stock"}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center py-12 text-slate-500">No products found.</p>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center mt-4">
        <Eye className="h-3 w-3 inline mr-1" /> View only — Contact Manager for stock adjustments
      </p>
    </div>
  );
}