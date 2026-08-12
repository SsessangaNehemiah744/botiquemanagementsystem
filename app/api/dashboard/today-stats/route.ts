import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Today's sales
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .gte("created_at", todayISO)
      .order("created_at", { ascending: false });

    if (salesError) {
      return NextResponse.json({ error: salesError.message }, { status: 500 });
    }

    const totalRevenue = (sales || []).reduce(
      (sum: number, s: { total_amount: number }) => sum + Number(s.total_amount),
      0
    );

    // Today's sale items
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("quantity, product_variants(*, products(name))")
      .gte("created_at", todayISO);

    const totalItems = (saleItems || []).reduce(
      (sum: number, i: { quantity: number }) => sum + i.quantity,
      0
    );

    // Low stock items
    const { data: allVariants } = await supabase
      .from("product_variants")
      .select("*, products(name)")
      .order("stock_quantity", { ascending: true });

    const lowStockItems = (allVariants || []).filter(
      (v: { stock_quantity: number; low_stock_threshold: number }) =>
        v.stock_quantity <= v.low_stock_threshold
    );

    // Customers served today
    const customerIds = [
      ...new Set(
        (sales || [])
          .filter((s: { customer_id: string | null }) => s.customer_id)
          .map((s: { customer_id: string | null }) => s.customer_id as string)
      ),
    ];

    let customers: unknown[] = [];
    if (customerIds.length > 0) {
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .in("id", customerIds);
      customers = customerData || [];
    }

    // New inventory
    const { data: newInventory } = await supabase
      .from("product_variants")
      .select("*, products(name, category)")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      totalRevenue,
      totalSales: (sales || []).length,
      totalItems,
      lowStockCount: lowStockItems.length,
      customersServedCount: customers.length,
      sales: sales || [],
      lowStockItems,
      customersServed: customers,
      saleItems: saleItems || [],
      newInventory: newInventory || [],
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}