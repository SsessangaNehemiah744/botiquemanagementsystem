import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Get today's sales
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .gte("created_at", todayISO)
      .order("created_at", { ascending: false });

    // Get sale items
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("quantity, product_variants(*, products(name))")
      .gte("created_at", todayISO);

    // Get low stock
    const { data: allVariants } = await supabase
      .from("product_variants")
      .select("*, products(name)")
      .order("stock_quantity", { ascending: true });

    const lowStockItems = (allVariants || []).filter(
      (v: any) => v.stock_quantity <= v.low_stock_threshold
    );

    // Get customers served today
    const { data: salesWithCustomers } = await supabase
      .from("sales")
      .select("customer_id")
      .gte("created_at", todayISO)
      .not("customer_id", "is", null);

    const customerIds = [...new Set((salesWithCustomers || []).map((s: any) => s.customer_id))];
    
    let customers: any[] = [];
    if (customerIds.length > 0) {
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .in("id", customerIds);
      customers = customerData || [];
    }

    const totalRevenue = (sales || []).reduce((sum: number, s: any) => sum + Number(s.total_amount), 0);
    const totalItems = (saleItems || []).reduce((sum: number, i: any) => sum + i.quantity, 0);

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
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}