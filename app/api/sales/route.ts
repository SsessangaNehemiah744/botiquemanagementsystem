import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const {
      items,
      total_amount,
      discount_amount,
      payment_method,
      amount_tendered,
      change_amount,
      customer_id,
      notes,
      user_id,
    } = body;

    // Create the sale
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        total_amount,
        discount_amount: discount_amount || 0,
        payment_method,
        amount_tendered: payment_method === "cash" ? amount_tendered : null,
        change_amount: payment_method === "cash" ? change_amount : null,
        customer_id: customer_id || null,
        user_id,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (saleError) {
      console.error("Sale insert error:", saleError);
      return NextResponse.json({ error: saleError.message }, { status: 500 });
    }

    // Insert sale items and decrease stock
    for (const item of items) {
      const { error: itemError } = await supabase
        .from("sale_items")
        .insert({
          sale_id: sale.id,
          product_variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price_at_sale: item.cost_price || 0,
        });

      if (itemError) {
        console.error("Sale item error:", itemError);
      }

      // Decrease stock
      const { data: currentVariant } = await supabase
        .from("product_variants")
        .select("stock_quantity")
        .eq("id", item.variant_id)
        .single();

      if (currentVariant) {
        const newStock = Math.max(0, currentVariant.stock_quantity - item.quantity);
        await supabase
          .from("product_variants")
          .update({ stock_quantity: newStock })
          .eq("id", item.variant_id);
      }
    }

    // Record in cashbook for cash payments
    if (payment_method === "cash") {
      await supabase.from("financial_cashbook").insert({
        transaction_type: "sale",
        category: "Sales",
        amount: total_amount,
        description: `Sale #${sale.id.substring(0, 8)}`,
        payment_method: "cash",
        cash_in: true,
        user_id: user_id || null,
      });
    }

    // ✅ LOG THE SALE with user full name
    if (user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user_id)
        .single();

      await supabase.from("system_logs").insert({
        user_id: user_id,
        user_name: profile?.full_name || "Unknown",
        user_role: profile?.role || "unknown",
        action: "SALE_PROCESSED",
        affected_type: "Sale",
        affected_id: sale.id,
        affected_name: `Sale #${sale.id.substring(0, 8)}`,
        details: {
          total_amount,
          payment_method,
          items_count: items.length,
        },
        status: "success",
      });
    }

    return NextResponse.json({ success: true, sale_id: sale.id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}