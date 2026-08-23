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

    console.log("Processing sale with items:", items);

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

    console.log("Sale created with ID:", sale.id);

    // Insert sale items and decrease stock
    for (const item of items) {
      console.log("Processing item:", item);

      // Insert sale item using product_variant_id
      const { error: itemError } = await supabase
        .from("sale_items")
        .insert({
          sale_id: sale.id,
          product_variant_id: item.variant_id, // Use product_variant_id column
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price_at_sale: item.cost_price || 0,
        });

      if (itemError) {
        console.error("Sale item error:", itemError);
        continue;
      }

      // Get current stock
      const { data: currentVariant, error: variantError } = await supabase
        .from("product_variants")
        .select("*")
        .eq("id", item.variant_id)
        .single();

      if (variantError) {
        console.error("Error fetching variant:", variantError);
        continue;
      }

      if (currentVariant) {
        const previousStock = currentVariant.stock_quantity || 0;
        const newStock = Math.max(0, previousStock - item.quantity);

        console.log(`Variant ${item.variant_id}: stock from ${previousStock} to ${newStock}`);

        // Update stock
        const { error: updateError } = await supabase
          .from("product_variants")
          .update({ stock_quantity: newStock })
          .eq("id", item.variant_id);

        if (updateError) {
          console.error("Error updating stock:", updateError);
        } else {
          console.log("Stock updated successfully");
        }

        // Record in stock history
        try {
          const historyData = {
            variant_id: item.variant_id,
            change_type: "sale",
            quantity_change: -item.quantity,
            previous_stock: previousStock,
            new_stock: newStock,
            notes: `Sold via POS (Sale #${sale.id.substring(0, 8)})`,
          };

          console.log("Recording stock history:", historyData);

          const { data: historyResult, error: historyError } = await supabase
            .from("stock_history")
            .insert(historyData)
            .select()
            .single();

          if (historyError) {
            console.error("Error recording stock history:", historyError);
            console.error("History error details:", {
              message: historyError.message,
              details: historyError.details,
              hint: historyError.hint,
              code: historyError.code
            });
          } else {
            console.log("Stock history recorded successfully:", historyResult);
          }
        } catch (historyError) {
          console.error("Exception recording stock history:", historyError);
        }
      }
    }

    // Record in cashbook for cash payments
    if (payment_method === "cash") {
      try {
        await supabase.from("financial_cashbook").insert({
          transaction_type: "sale",
          category: "Sales",
          amount: total_amount,
          description: `Sale #${sale.id.substring(0, 8)}`,
          payment_method: "cash",
          cash_in: true,
          user_id: user_id || null,
        });
      } catch (cashbookError) {
        console.error("Error recording cashbook:", cashbookError);
      }
    }

    // LOG THE SALE
    if (user_id) {
      try {
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
      } catch (logError) {
        console.error("Error logging sale:", logError);
      }
    }

    return NextResponse.json({ success: true, sale_id: sale.id }, { status: 201 });
  } catch (error: unknown) {
    console.error("Sale processing error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const { data: sales, error } = await supabase
      .from("sales")
      .select(`
        *,
        sale_items (
          *,
          product_variants (
            id,
            product_id,
            size,
            color,
            barcode
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching sales:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sales });
  } catch (error: unknown) {
    console.error("Sales fetch error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}