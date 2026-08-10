"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ProductCategory = "Dresses" | "Outerwear" | "Skirts" | "Accessories";

export interface Variant {
  id: string;
  productName: string;
  category: ProductCategory;
  image: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
}

interface InventoryContextType {
  variants: Variant[];
  addVariant: (variant: Variant) => void;
  updateVariant: (id: string, data: Partial<Variant>) => void;
  adjustStock: (id: string, delta: number) => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

const initialVariants: Variant[] = [
  // your mock data array (keep the same as before)
];

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);

  const addVariant = useCallback((variant: Variant) => {
    setVariants((prev) => [...prev, variant]);
  }, []);

  const updateVariant = useCallback((id: string, data: Partial<Variant>) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...data } : v))
    );
  }, []);

  const adjustStock = useCallback((id: string, delta: number) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, stock: Math.max(0, v.stock + delta) } : v
      )
    );
  }, []);

  return (
    <InventoryContext.Provider
      value={{ variants, addVariant, updateVariant, adjustStock }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}