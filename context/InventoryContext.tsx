"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { createClient } from "@/lib/supabase/client";

// ---------- UPDATED CATEGORIES ----------
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
  sku: string;
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
}

const InventoryContext = createContext<InventoryContextType | null>(null);

// Helper: Upload base64 image to Supabase Storage
async function uploadImageToStorage(
  supabase: ReturnType<typeof createClient>,
  base64Data: string,
  fileName: string
): Promise<string | null> {
  if (!base64Data.startsWith("data:")) {
    return base64Data;
  }

  const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) {
    console.error("Invalid base64 format");
    return null;
  }

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
    .upload(filePath, blob, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error("Error uploading image:", error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from("products")
    .getPublicUrl(filePath);

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
      console.error("Error fetching variants:", error);
      setLoading(false);
      return;
    }

    const mapped: Variant[] = (data || []).map((v: any) => ({
      id: v.id,
      product_id: v.product_id,
      productName: v.products?.name || "Unknown",
      category: (v.products?.category || "Wideleg") as ProductCategory,
      image: v.image_url || v.products?.image_url || "",
      sku: v.sku,
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
      if (imageUrl && imageUrl.startsWith("data:")) {
        const safeFileName = newVariant.productName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .substring(0, 30);
        const uploadedUrl = await uploadImageToStorage(
          supabase,
          imageUrl,
          safeFileName
        );
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .eq("name", newVariant.productName)
        .maybeSingle();

      let productId: string;

      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        const productData: any = {
          name: newVariant.productName,
          category: newVariant.category,
        };
        if (imageUrl) {
          productData.image_url = imageUrl;
        }

        const { data: newProduct, error: insertError } = await supabase
          .from("products")
          .insert(productData)
          .select("id")
          .single();

        if (insertError) {
          console.error("Error inserting product:", insertError);
          throw new Error(`Failed to create product: ${insertError.message}`);
        }

        productId = newProduct.id;
      }

      const variantData: any = {
        product_id: productId,
        sku: newVariant.sku,
        size: newVariant.size,
        color: newVariant.color,
        design: newVariant.design || null,
        cost_price: newVariant.costPrice,
        selling_price: newVariant.sellingPrice,
        stock_quantity: newVariant.stock,
        low_stock_threshold: newVariant.lowStockThreshold,
      };

      if (newVariant.barcode) variantData.barcode = newVariant.barcode;
      if (imageUrl) variantData.image_url = imageUrl;

      const { error: variantError } = await supabase
        .from("product_variants")
        .insert(variantData);

      if (variantError) {
        console.error("Error inserting variant:", variantError);
        throw new Error(`Failed to create variant: ${variantError.message}`);
      }

      await fetchVariants();
    },
    [supabase, fetchVariants]
  );

  const updateVariant = useCallback(
    async (id: string, data: Partial<Variant>) => {
      const updates: any = {};
      if (data.sku !== undefined) updates.sku = data.sku;
      if (data.barcode !== undefined) updates.barcode = data.barcode;
      if (data.size !== undefined) updates.size = data.size;
      if (data.color !== undefined) updates.color = data.color;
      if (data.design !== undefined) updates.design = data.design;
      if (data.costPrice !== undefined) updates.cost_price = data.costPrice;
      if (data.sellingPrice !== undefined) updates.selling_price = data.sellingPrice;
      if (data.stock !== undefined) updates.stock_quantity = data.stock;
      if (data.lowStockThreshold !== undefined)
        updates.low_stock_threshold = data.lowStockThreshold;

      if (data.image && data.image.startsWith("data:")) {
        const safeFileName = (data.productName || "variant")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .substring(0, 30);
        const uploadedUrl = await uploadImageToStorage(
          supabase,
          data.image,
          safeFileName
        );
        if (uploadedUrl) {
          updates.image_url = uploadedUrl;
        }
      } else if (data.image !== undefined) {
        updates.image_url = data.image;
      }

      const { error } = await supabase
        .from("product_variants")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.error("Error updating variant:", error);
        throw error;
      }

      await fetchVariants();
    },
    [supabase, fetchVariants]
  );

  const adjustStock = useCallback(
    async (id: string, delta: number) => {
      const variant = variants.find((v) => v.id === id);
      if (!variant) return;

      const newStock = Math.max(0, variant.stock + delta);

      const { error } = await supabase
        .from("product_variants")
        .update({ stock_quantity: newStock })
        .eq("id", id);

      if (error) {
        console.error("Error adjusting stock:", error);
        throw error;
      }

      await fetchVariants();
    },
    [variants, supabase, fetchVariants]
  );

  const deleteVariant = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("product_variants")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting variant:", error);
        throw error;
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
      }}
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