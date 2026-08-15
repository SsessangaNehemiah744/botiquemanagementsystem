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
    const { data: variants } = await supabase
      .from("product_variants")
      .select("*, products(name, category)")
      .order("created_at", { ascending: true });

    // Overstaying stock (older than 2 months)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const twoMonthsAgoISO = twoMonthsAgo.toISOString();

    const overstayingStock = (variants || []).filter(
      (v: { created_at: string }) => new Date(v.created_at) < new Date(twoMonthsAgoISO)
    );

    // Get TODAY'S sales only
    const { data: sales } = await supabase
      .from("sales")
      .select("*")
      .gte("created_at", todayISO)
      .lt("created_at", tomorrowISO)
      .order("created_at", { ascending: false });

    // Calculate TODAY'S revenue
    const totalRevenue = (sales || []).reduce(
      (sum: number, s: { total_amount: number }) => sum + Number(s.total_amount),
      0
    );

    // Get TODAY'S sale items
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("quantity, product_variants(*, products(name))")
      .gte("created_at", todayISO)
      .lt("created_at", tomorrowISO);

    // Calculate TODAY'S items sold
    const totalItems = (saleItems || []).reduce(
      (sum: number, i: { quantity: number }) => sum + i.quantity,
      0
    );

    // Top selling TODAY
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

    // Low stock items (from ALL products)
    const lowStockItems = (variants || []).filter(
      (v: { stock_quantity: number; low_stock_threshold: number }) =>
        Number(v.stock_quantity) <= Number(v.low_stock_threshold) && Number(v.stock_quantity) > 0
    );

    // Get ALL customers (for total count)
    const { data: allCustomers } = await supabase
      .from("customers")
      .select("*");

    // Get TODAY'S customers served (unique from today's sales)
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

    return NextResponse.json({
      totalRevenue,                        // TODAY only
      totalSales: (sales || []).length,    // TODAY only
      totalItems,                          // TODAY only
      lowStockCount: lowStockItems.length, // ALL products
      customersServedCount: todayCustomers.length, // TODAY only
      totalCustomers: (allCustomers || []).length, // ALL time
      totalInventory: (variants || []).length,      // ALL time
      sales: sales || [],                  // TODAY only
      lowStockItems,                       // ALL products
      customersServed: todayCustomers,     // TODAY only
      saleItems: saleItems || [],          // TODAY only
      newInventory: variants || [],        // ALL products
      topSelling,                          // TODAY only
      overstayingStock,                    // ALL products
      overstayingCount: overstayingStock.length,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}