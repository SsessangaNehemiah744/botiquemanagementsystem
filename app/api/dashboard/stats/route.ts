import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get variants WITH product names (join)
    const { data: variants } = await supabase
      .from("product_variants")
      .select("*, products(name, category)")
      .order("created_at", { ascending: true });

    console.log("Variants with products:", variants?.length, variants?.[0]?.products?.name);

    // Overstaying stock (older than 2 months)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const twoMonthsAgoISO = twoMonthsAgo.toISOString();

    const overstayingStock = (variants || []).filter(
      (v: { created_at: string }) => new Date(v.created_at) < new Date(twoMonthsAgoISO)
    );

    // Get sales
    const { data: sales } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });

    const totalRevenue = (sales || []).reduce(
      (sum: number, s: { total_amount: number }) => sum + Number(s.total_amount),
      0
    );

    // Get sale items
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("quantity, product_variants(*, products(name))");

    const totalItems = (saleItems || []).reduce(
      (sum: number, i: { quantity: number }) => sum + i.quantity,
      0
    );

    // Top selling
    const topMap = new Map<string, { name: string; quantity: number; price: number }>();
    (saleItems || []).forEach((item: unknown) => {
      const si = item as {
        quantity: number;
        product_variants?: { products?: { name: string }; selling_price: number };
      };
      const name = si.product_variants?.products?.name || "Unknown";
      const price = si.product_variants?.selling_price || 0;
      const qty = si.quantity || 0;
      if (topMap.has(name)) {
        topMap.get(name)!.quantity += qty;
      } else {
        topMap.set(name, { name, quantity: qty, price });
      }
    });

    const topSelling = Array.from(topMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Low stock
    const lowStockItems = (variants || []).filter(
      (v: { stock_quantity: number; low_stock_threshold: number }) =>
        Number(v.stock_quantity) <= Number(v.low_stock_threshold) && Number(v.stock_quantity) > 0
    );

    // Customers
    const { data: customers } = await supabase.from("customers").select("*");

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
      overstayingStock,
      overstayingCount: overstayingStock.length,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}