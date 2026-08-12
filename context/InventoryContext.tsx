"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { createClient } from "@/lib/supabase/client";

export type ProductCategory =
  | "Wideleg"
  | "Straight"
  | "Short"
  | "Patras"
  | "Boyfriend Shorts"
  | "Jorts"
  | "Short Dresses"
  | "Long Dresses"
  | "Short Skirts"
  | "Medium Skirts"
  | "Long Skirt"
  | "Jean Jacket"
  | "Leather Jacket Sleeveless"
  | "Low waist";

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

async function uploadImageToStorage(
  supabase: ReturnType<typeof createClient>,
  base64Data: string,
  fileName: string
): Promise<string | null> {
  if (!base64Data.startsWith("data:")) return base64Data;
  const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) return null;
  const mimeType = matches[1];
  const base64Content = matches[2];
  const extension = mimeType.split("/")[1];
  const byteCharacters = atob(base64Content);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const filePath = `${Date.now()}-${fileName}.${extension}`;
  const { error } = await supabase.storage
    .from("products")
    .upload(filePath, blob, { contentType: mimeType, upsert: false });
  if (error) {
    console.error("Upload error:", error.message);
    return null;
  }
  const { data: urlData } = supabase.storage.from("products").getPublicUrl(filePath);
  return urlData.publicUrl;
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
      setLoading(false);
      return;
    }

    const mapped: Variant[] = (data || []).map((v: any) => ({
      id: v.id,
      product_id: v.product_id,
      productName: v.products?.name || "Unknown",
      category: (v.products?.category || "Wideleg") as ProductCategory,
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
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const addVariant = useCallback(
    async (newVariant: Omit<Variant, "id" | "product_id" | "created_at">) => {
      let imageUrl = newVariant.image;
      if (imageUrl?.startsWith("data:")) {
        const safeName = newVariant.productName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .substring(0, 30);
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

      const { error: vErr } = await supabase.from("product_variants").insert(vData);
      if (vErr) throw new Error(vErr.message);
      await fetchVariants();
    },
    [supabase, fetchVariants]
  );

  const updateVariant = useCallback(
    async (id: string, data: Partial<Variant>) => {
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
        const safeName = (data.productName || "variant")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .substring(0, 30);
        const uploaded = await uploadImageToStorage(supabase, data.image, safeName);
        if (uploaded) updates.image_url = uploaded;
      } else if (data.image !== undefined) {
        updates.image_url = data.image;
      }
      const { error } = await supabase.from("product_variants").update(updates).eq("id", id);
      if (error) throw new Error(error.message);
      await fetchVariants();
    },
    [supabase, fetchVariants]
  );

  const adjustStock = useCallback(
    async (id: string, delta: number) => {
      const v = variants.find((x) => x.id === id);
      if (!v) return;
      const { error } = await supabase
        .from("product_variants")
        .update({ stock_quantity: Math.max(0, v.stock + delta) })
        .eq("id", id);
      if (error) throw new Error(error.message);
      await fetchVariants();
    },
    [variants, supabase, fetchVariants]
  );

  const deleteVariant = useCallback(
    async (id: string) => {
      // First check if there are sale_items referencing this variant
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("id")
        .eq("product_variant_id", id);

      if (saleItems && saleItems.length > 0) {
        throw new Error("Cannot delete: This item has sales history. Consider marking it as out of stock instead.");
      }

      const { error } = await supabase
        .from("product_variants")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      await fetchVariants();
    },
    [supabase, fetchVariants]
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