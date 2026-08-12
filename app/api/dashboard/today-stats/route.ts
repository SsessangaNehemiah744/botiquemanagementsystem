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
      console.error("Sales error:", salesError);
      return NextResponse.json({ error: salesError.message }, { status: 500 });
    }

    const totalRevenue = (sales || []).reduce(
      (sum: number, s: any) => sum + Number(s.total_amount),
      0
    );

    // Today's sale items
    const { data: saleItems, error: itemsError } = await supabase
      .from("sale_items")
      .select("quantity, product_variants(*, products(name))")
      .gte("created_at", todayISO);

    if (itemsError) {
      console.error("Items error:", itemsError);
    }

    const totalItems = (saleItems || []).reduce(
      (sum: number, i: any) => sum + i.quantity,
      0
    );

    // All variants for low stock check
    const { data: allVariants, error: variantsError } = await supabase
      .from("product_variants")
      .select("*, products(name)")
      .order("stock_quantity", { ascending: true });

    if (variantsError) {
      console.error("Variants error:", variantsError);
    }

    const lowStockItems = (allVariants || []).filter(
      (v: any) => v.stock_quantity <= v.low_stock_threshold
    );

    // Customers served today
    const customerIds = [
      ...new Set(
        (sales || [])
          .filter((s: any) => s.customer_id)
          .map((s: any) => s.customer_id)
      ),
    ];

    let customers: any[] = [];
    if (customerIds.length > 0) {
      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .in("id", customerIds);
      customers = customerData || [];
    }

    // ===== NEW INVENTORY =====
    const { data: newInventory, error: inventoryError } = await supabase
      .from("product_variants")
      .select("*, products(name, category)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (inventoryError) {
      console.error("Inventory error:", inventoryError);
    }

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

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}