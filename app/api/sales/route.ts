import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const body = await request.json();
    const { items, total_amount, discount_amount, payment_method, amount_tendered, change_amount, customer_id, notes, user_id } = body;

    // Step 1: Create the sale record
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

    // Step 2: Insert sale items and update stock
    for (const item of items) {
      // Insert sale item
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
        console.error("Sale item insert error:", itemError);
        return NextResponse.json({ error: itemError.message }, { status: 500 });
      }

      // Update stock - direct update
      const { error: stockError } = await supabase.rpc("decrease_stock", {
        variant_id: item.variant_id,
        qty: item.quantity,
      });

      if (stockError) {
        console.error("Stock decrease error:", stockError);
        // Try direct update as fallback
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
    }

    // Step 3: Record in cashbook if cash payment
    if (payment_method === "cash") {
      await supabase.from("financial_cashbook").insert({
        transaction_type: "sale",
        amount: total_amount,
        description: `Sale #${sale.id.substring(0, 8)}`,
        reference_id: sale.id,
        payment_method: "cash",
        cash_in: true,
        user_id,
      });
    }

    return NextResponse.json({ success: true, sale_id: sale.id }, { status: 201 });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}