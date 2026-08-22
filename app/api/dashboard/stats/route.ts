import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    // Get ALL variants WITH product names (for inventory)
    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("*")
      .order("created_at", { ascending: true });

    if (variantsError) {
      console.error("Error fetching variants:", variantsError);
    }

    // Get product names separately
    const productIds = [...new Set((variants || []).map((v: any) => v.product_id).filter(Boolean))];
    
    let productMap = new Map();
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, category, image_url")
        .in("id", productIds);

      if (productsError) {
        console.error("Error fetching products:", productsError);
      } else {
        productMap = new Map((products || []).map((p: any) => [p.id, p]));
      }
    }

    // Combine variants with product info
    const variantsWithProducts = (variants || []).map((v: any) => ({
      ...v,
      products: productMap.get(v.product_id) || { name: "Unknown", category: "Uncategorized", image_url: "" }
    }));

    // Overstaying stock (older than 2 months)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const twoMonthsAgoISO = twoMonthsAgo.toISOString();

    const overstayingStock = variantsWithProducts.filter(
      (v: { created_at: string }) => new Date(v.created_at) < new Date(twoMonthsAgoISO)
    );

    // Get TODAY'S sales only
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .gte("created_at", todayISO)
      .lt("created_at", tomorrowISO)
      .order("created_at", { ascending: false });

    if (salesError) {
      console.error("Error fetching sales:", salesError);
    }

    // Calculate TODAY'S revenue
    const totalRevenue = (sales || []).reduce(
      (sum: number, s: { total_amount: number }) => sum + Number(s.total_amount),
      0
    );

    // Get sale items for today's sales
    const saleIds = (sales || []).map((s: { id: string }) => s.id);
    
    let saleItems: any[] = [];
    let totalItems = 0;

    if (saleIds.length > 0) {
      const { data: saleItemsData, error: saleItemsError } = await supabase
        .from("sale_items")
        .select("*")
        .in("sale_id", saleIds);

      if (saleItemsError) {
        console.error("Error fetching sale items:", saleItemsError);
      } else {
        // Get variant IDs from sale items
        const variantIds = [...new Set((saleItemsData || []).map((si: any) => si.product_variant_id).filter(Boolean))];
        
        // Fetch variant details
        let variantMap = new Map();
        if (variantIds.length > 0) {
          const { data: saleVariants, error: saleVariantsError } = await supabase
            .from("product_variants")
            .select("*")
            .in("id", variantIds);

          if (saleVariantsError) {
            console.error("Error fetching sale variants:", saleVariantsError);
          } else {
            variantMap = new Map((saleVariants || []).map((v: any) => [v.id, v]));
          }
        }

        // Combine sale items with variant and product info
        saleItems = (saleItemsData || []).map((si: any) => {
          const variant = variantMap.get(si.product_variant_id);
          const product = variant ? productMap.get(variant.product_id) : null;
          
          return {
            id: si.id,
            sale_id: si.sale_id,
            variant_id: si.product_variant_id,
            product_variant_id: si.product_variant_id,
            quantity: si.quantity,
            unit_price: si.unit_price,
            cost_price_at_sale: si.cost_price_at_sale,
            created_at: si.created_at,
            product_variants: variant ? {
              id: variant.id,
              product_id: variant.product_id,
              size: variant.size,
              color: variant.color,
              barcode: variant.barcode,
              image_url: variant.image_url,
              products: product ? {
                id: product.id,
                name: product.name,
                category: product.category,
                image_url: product.image_url,
              } : null,
            } : null,
          };
        });

        // Calculate total items
        totalItems = saleItems.reduce(
          (sum: number, i: { quantity: number }) => sum + (i.quantity || 0),
          0
        );
      }
    }

    // Top selling TODAY
    const topMap = new Map<string, { name: string; quantity: number; price: number; image_url?: string }>();
    saleItems.forEach((item: any) => {
      const name = item.product_variants?.products?.name || "Unknown";
      const price = item.unit_price || 0;
      const image_url = item.product_variants?.image_url || item.product_variants?.products?.image_url || "";
      const qty = item.quantity || 0;
      if (topMap.has(name)) {
        topMap.get(name)!.quantity += qty;
      } else {
        topMap.set(name, { name, quantity: qty, price, image_url });
      }
    });

    const topSelling = Array.from(topMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Low stock items (from ALL products)
    const lowStockItems = variantsWithProducts.filter(
      (v: { stock_quantity: number; low_stock_threshold: number }) =>
        Number(v.stock_quantity) <= Number(v.low_stock_threshold) && Number(v.stock_quantity) > 0
    );

    // Get ALL customers (for total count)
    const { data: allCustomers, error: customersError } = await supabase
      .from("customers")
      .select("*");

    if (customersError) {
      console.error("Error fetching customers:", customersError);
    }

    // Get TODAY'S customers served
    const todayCustomerIds = [
      ...new Set(
        (sales || [])
          .filter((s: { customer_id: string | null }) => s.customer_id)
          .map((s: { customer_id: string | null }) => s.customer_id as string)
      ),
    ];

    let todayCustomers: unknown[] = [];
    if (todayCustomerIds.length > 0) {
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .in("id", todayCustomerIds);
      todayCustomers = customerData || [];
    }

    console.log("Dashboard stats:", {
      totalRevenue,
      totalSales: (sales || []).length,
      totalItems,
      saleItemsCount: saleItems.length,
      topSellingCount: topSelling.length,
    });

    return NextResponse.json({
      totalRevenue,
      totalSales: (sales || []).length,
      totalItems,
      lowStockCount: lowStockItems.length,
      customersServedCount: todayCustomers.length,
      totalCustomers: (allCustomers || []).length,
      totalInventory: variantsWithProducts.length,
      sales: sales || [],
      soldItems: saleItems,
      lowStockItems,
      customersServed: todayCustomers,
      saleItems: saleItems,
      newInventory: variantsWithProducts,
      topSelling,
      overstayingStock,
      overstayingCount: overstayingStock.length,
    });

  } catch (error: unknown) {
    console.error("Dashboard stats error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}