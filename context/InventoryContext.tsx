"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { createClient } from "@/lib/supabase/client";

// Changed from union type to string to allow custom categories
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

// Helper: Compress image using Canvas to JPEG with smart quality
function compressImage(blob: Blob, maxSize: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions (maintain aspect ratio)
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

      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      // Draw image on canvas (this converts HEIC/PNG/WebP to JPEG)
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG blob with quality setting
      canvas.toBlob(
        (compressed) => {
          if (compressed) {
            resolve(compressed);
          } else {
            // Fallback to original if compression fails
            resolve(blob);
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback to original if image can't be loaded
      resolve(blob);
    };

    img.src = url;
  });
}

// Updated upload function with compression
async function uploadImageToStorage(
  supabase: ReturnType<typeof createClient>,
  base64Data: string,
  fileName: string
): Promise<string | null> {
  if (!base64Data.startsWith("data:")) return base64Data;

  const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) return null;

  const base64Content = matches[2];

  // Convert base64 to blob
  const byteCharacters = atob(base64Content);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const originalBlob = new Blob([byteArray]);

  // Compress image (max 1200px, 85% quality = visually identical)
  let finalBlob = originalBlob;
  try {
    finalBlob = await compressImage(originalBlob, 1200, 0.85);
  } catch (error) {
    console.warn("Compression failed, using original:", error);
  }

  // Always save as .jpg
  const filePath = `${Date.now()}-${fileName}.jpg`;

  const { error } = await supabase.storage
    .from("products")
    .upload(filePath, finalBlob, {
      contentType: "image/jpeg",
      upsert: false,
    });

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