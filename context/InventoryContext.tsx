"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { cacheProducts, getCachedProducts, isOnline } from "@/lib/offline";

export type ProductCategory = string;

export interface Variant {
  id: string;
  product_id: string;
  productName: string;
  category: ProductCategory;
  image: string;
  barcode: string;
  size: string;
  color: string;
  design?: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
  created_at: string;
}

interface InventoryContextType {
  variants: Variant[];
  loading: boolean;
  addVariant: (variant: Omit<Variant, "id" | "product_id" | "created_at">) => Promise<void>;
  updateVariant: (id: string, data: Partial<Variant>) => Promise<void>;
  adjustStock: (id: string, delta: number) => Promise<void>;
  deleteVariant: (id: string) => Promise<void>;
  refreshInventory: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

// Helper to compress image
function compressImage(blob: Blob, maxSize: number, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((compressed) => {
          if (compressed) resolve(compressed);
          else resolve(blob);
        }, "image/jpeg", quality);
      } else {
        resolve(blob);
      }
    };
    img.onerror = () => resolve(blob);
    img.src = url;
  });
}

async function uploadImageToStorage(
  supabase: ReturnType<typeof createClient>,
  base64Data: string,
  fileName: string
): Promise<string | null> {
  if (!base64Data.startsWith("data:")) return base64Data;
  const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) return null;
  const base64Content = matches[2];
  const byteCharacters = atob(base64Content);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const originalBlob = new Blob([byteArray]);
  let finalBlob = originalBlob;
  try {
    finalBlob = await compressImage(originalBlob, 1200, 0.85);
  } catch (error) {
    console.warn("Compression failed:", error);
  }
  const filePath = `${Date.now()}-${fileName}.jpg`;
  const { error } = await supabase.storage
    .from("products")
    .upload(filePath, finalBlob, { contentType: "image/jpeg", upsert: false });
  if (error) return null;
  const { data: urlData } = supabase.storage.from("products").getPublicUrl(filePath);
  return urlData.publicUrl;
}

// Helper to log an action
async function logSystemAction(
  supabase: ReturnType<typeof createClient>,
  action: string,
  affectedType: string,
  affectedId: string,
  affectedName: string,
  details?: Record<string, unknown>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    await supabase.from("system_logs").insert({
      user_id: user.id,
      user_name: profile?.full_name || user.email,
      user_role: profile?.role || "unknown",
      action,
      affected_type: affectedType,
      affected_id: affectedId,
      affected_name: affectedName,
      details: details || null,
      status: "success",
    });
  } catch (error) {
    console.error("Log error:", error);
  }
}

// Helper to record stock history via API
async function recordStockHistory(
  supabase: ReturnType<typeof createClient>,
  variantId: string,
  changeType: "addition" | "removal" | "adjustment" | "sale",
  quantityChange: number,
  previousStock: number,
  newStock: number,
  notes: string
) {
  try {
    console.log("Recording stock history via API:", {
      variantId,
      changeType,
      quantityChange,
      previousStock,
      newStock,
      notes
    });

    // Use API endpoint instead of direct Supabase
    const response = await fetch("/api/inventory/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        variant_id: variantId,
        change_type: changeType,
        quantity_change: quantityChange,
        previous_stock: previousStock,
        new_stock: newStock,
        notes: notes,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log("Stock history recorded successfully:", result);
    } else {
      console.error("Failed to record stock history:", result.error || result);
      
      // Fallback: Try direct Supabase insert
      console.log("Trying direct Supabase insert as fallback...");
      const { data, error } = await supabase
        .from("stock_history")
        .insert({
          variant_id: variantId,
          change_type: changeType,
          quantity_change: quantityChange,
          previous_stock: previousStock,
          new_stock: newStock,
          notes: notes,
        });

      if (error) {
        console.error("Direct insert also failed:", error);
      } else {
        console.log("Direct insert succeeded:", data);
      }
    }
  } catch (error) {
    console.error("Exception recording stock history:", error);
    // Don't throw - history recording shouldn't block main operation
  }
}

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_variants")
      .select("*, products(name, category, image_url)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error.message);
      
      // OFFLINE: Load from cache
      if (!isOnline()) {
        const cached = await getCachedProducts();
        if (cached && Array.isArray(cached) && cached.length > 0) {
          setVariants(cached as Variant[]);
        }
      }
      
      setLoading(false);
      return;
    }

    const mapped: Variant[] = (data || []).map((v: any) => ({
      id: v.id,
      product_id: v.product_id,
      productName: v.products?.name || "Unknown",
      category: v.products?.category || "Uncategorized",
      image: v.image_url || v.products?.image_url || "",
      barcode: v.barcode || "",
      size: v.size,
      color: v.color,
      design: v.design || "",
      costPrice: v.cost_price,
      sellingPrice: v.selling_price,
      stock: v.stock_quantity,
      lowStockThreshold: v.low_stock_threshold,
      created_at: v.created_at,
    }));

    setVariants(mapped);

    // CACHE for offline use
    await cacheProducts(mapped);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const addVariant = useCallback(
    async (newVariant: Omit<Variant, "id" | "product_id" | "created_at">) => {
      let imageUrl = newVariant.image;
      if (imageUrl?.startsWith("data:")) {
        const safeName = newVariant.productName.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 30);
        const uploaded = await uploadImageToStorage(supabase, imageUrl, safeName);
        if (uploaded) imageUrl = uploaded;
      }

      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("name", newVariant.productName)
        .maybeSingle();

      let productId: string;
      if (existing) {
        productId = existing.id;
      } else {
        const { data: newProduct, error: err } = await supabase
          .from("products")
          .insert({
            name: newVariant.productName,
            category: newVariant.category,
            image_url: imageUrl || null,
          })
          .select("id")
          .single();
        if (err) throw new Error(err.message);
        productId = newProduct.id;
      }

      const vData: any = {
        product_id: productId,
        size: newVariant.size,
        color: newVariant.color,
        design: newVariant.design || null,
        cost_price: newVariant.costPrice,
        selling_price: newVariant.sellingPrice,
        stock_quantity: newVariant.stock,
        low_stock_threshold: newVariant.lowStockThreshold,
      };
      if (newVariant.barcode) vData.barcode = newVariant.barcode;
      if (imageUrl) vData.image_url = imageUrl;

      const { data: insertedVariant, error: vErr } = await supabase
        .from("product_variants")
        .insert(vData)
        .select("id")
        .single();
      if (vErr) throw new Error(vErr.message);

      // Record initial stock in history if stock > 0
      if (newVariant.stock > 0 && insertedVariant) {
        await recordStockHistory(
          supabase,
          insertedVariant.id,
          "addition",
          newVariant.stock,
          0,
          newVariant.stock,
          "Initial stock entry"
        );
      }

      await logSystemAction(
        supabase,
        "INVENTORY_ADDED",
        "Product",
        insertedVariant?.id || productId,
        newVariant.productName,
        { size: newVariant.size, color: newVariant.color, quantity: newVariant.stock }
      );

      await fetchVariants();
    },
    [supabase, fetchVariants]
  );

  const updateVariant = useCallback(
    async (id: string, data: Partial<Variant>) => {
      // Get current variant for stock history
      const currentVariant = variants.find(v => v.id === id);
      const previousStock = currentVariant?.stock || 0;

      const updates: any = {};
      if (data.barcode !== undefined) updates.barcode = data.barcode;
      if (data.size !== undefined) updates.size = data.size;
      if (data.color !== undefined) updates.color = data.color;
      if (data.design !== undefined) updates.design = data.design;
      if (data.costPrice !== undefined) updates.cost_price = data.costPrice;
      if (data.sellingPrice !== undefined) updates.selling_price = data.sellingPrice;
      if (data.stock !== undefined) updates.stock_quantity = data.stock;
      if (data.lowStockThreshold !== undefined) updates.low_stock_threshold = data.lowStockThreshold;
      if (data.image?.startsWith("data:")) {
        const safeName = (data.productName || "variant").toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 30);
        const uploaded = await uploadImageToStorage(supabase, data.image, safeName);
        if (uploaded) updates.image_url = uploaded;
      } else if (data.image !== undefined) {
        updates.image_url = data.image;
      }

      const { error } = await supabase.from("product_variants").update(updates).eq("id", id);
      if (error) throw new Error(error.message);

      // Record stock change in history if stock was updated
      if (data.stock !== undefined && data.stock !== previousStock) {
        const stockChange = data.stock - previousStock;
        await recordStockHistory(
          supabase,
          id,
          stockChange > 0 ? "addition" : "removal",
          stockChange,
          previousStock,
          data.stock,
          stockChange > 0 ? "Stock adjusted (increase via edit)" : "Stock adjusted (decrease via edit)"
        );
      }

      await logSystemAction(
        supabase,
        "INVENTORY_UPDATED",
        "Product",
        id,
        data.productName || "Variant",
        { previousStock, newStock: data.stock }
      );

      await fetchVariants();
    },
    [variants, supabase, fetchVariants]
  );

  const adjustStock = useCallback(
    async (id: string, delta: number) => {
      const v = variants.find((x) => x.id === id);
      if (!v) return;

      const previousStock = v.stock;
      const newStock = Math.max(0, previousStock + delta);

      console.log(`Adjusting stock for variant ${id}: ${previousStock} -> ${newStock} (delta: ${delta})`);

      const { error } = await supabase
        .from("product_variants")
        .update({ stock_quantity: newStock })
        .eq("id", id);
      if (error) throw new Error(error.message);

      // Record stock adjustment in history
      await recordStockHistory(
        supabase,
        id,
        delta > 0 ? "addition" : "removal",
        delta,
        previousStock,
        newStock,
        delta > 0 ? "Manual stock addition (+ button)" : "Manual stock removal (- button)"
      );

      await logSystemAction(
        supabase,
        "STOCK_ADJUSTED",
        "Product",
        id,
        v.productName,
        { oldStock: previousStock, newStock, delta }
      );

      await fetchVariants();
    },
    [variants, supabase, fetchVariants]
  );

  const deleteVariant = useCallback(
    async (id: string) => {
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("id")
        .eq("product_variant_id", id);

      if (saleItems && saleItems.length > 0) {
        throw new Error("Cannot delete: This item has sales history.");
      }

      const variant = variants.find((v) => v.id === id);

      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw new Error(error.message);

      await logSystemAction(
        supabase,
        "INVENTORY_DELETED",
        "Product",
        id,
        variant?.productName || "Variant"
      );

      await fetchVariants();
    },
    [supabase, fetchVariants, variants]
  );

  return (
    <InventoryContext.Provider
      value={{
        variants,
        loading,
        addVariant,
        updateVariant,
        adjustStock,
        deleteVariant,
        refreshInventory: fetchVariants,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within an InventoryProvider");
  return context;
}