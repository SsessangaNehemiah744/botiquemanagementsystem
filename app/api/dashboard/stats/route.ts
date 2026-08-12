import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get product_variants
    const { data: variants } = await supabase
      .from("product_variants")
      .select("*")
      .order("created_at", { ascending: false });

    // Get sales
    const { data: sales } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });

    const totalRevenue = (sales || []).reduce(
      (sum: number, s: { total_amount: number }) => sum + Number(s.total_amount),
      0
    );

    // Get sale items with product details
    const { data: saleItems, error: saleItemsError } = await supabase
      .from("sale_items")
      .select("quantity, product_variants(*, products(name))");

    if (saleItemsError) {
      console.error("Sale items error:", saleItemsError.message);
    }

    const totalItems = (saleItems || []).reduce(
      (sum: number, i: { quantity: number }) => sum + i.quantity,
      0
    );

    // Build top selling from sale items
    const topSellingMap = new Map<string, { name: string; quantity: number; price: number }>();

    (saleItems || []).forEach((item: unknown) => {
      const saleItem = item as {
        quantity: number;
        product_variants?: {
          products?: { name: string };
          selling_price: number;
        };
      };
      
      const name = saleItem.product_variants?.products?.name || "Unknown";
      const price = saleItem.product_variants?.selling_price || 0;
      const quantity = saleItem.quantity || 0;

      if (topSellingMap.has(name)) {
        const existing = topSellingMap.get(name)!;
        existing.quantity += quantity;
      } else {
        topSellingMap.set(name, { name, quantity, price });
      }
    });

    const topSelling = Array.from(topSellingMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Low stock
    const lowStockItems = (variants || []).filter(
      (v: { stock_quantity: number; low_stock_threshold: number }) =>
        Number(v.stock_quantity) <= Number(v.low_stock_threshold)
    );

    // Customers
    const { data: customers } = await supabase
      .from("customers")
      .select("*");

    return NextResponse.json({
      totalRevenue,
      totalSales: (sales || []).length,
      totalItems,
      lowStockCount: lowStockItems.length,
      customersServedCount: (customers || []).length,
      totalCustomers: (customers || []).length,
      totalInventory: (variants || []).length,
      sales: sales || [],
      lowStockItems,
      customersServed: customers || [],
      saleItems: saleItems || [],
      newInventory: variants || [],
      topSelling,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("API Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}