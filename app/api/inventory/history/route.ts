import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const url = new URL(request.url);
    const filter = url.searchParams.get("filter") || "all";

    console.log("Fetching stock history with filter:", filter);

    // Query stock history
    const { data: historyData, error: historyError } = await supabase
      .from("stock_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (historyError) {
      console.error("Stock history query error:", {
        message: historyError.message,
        code: historyError.code,
        details: historyError.details,
        hint: historyError.hint
      });
      
      // If table doesn't exist, return empty
      if (historyError.code === "42P01") {
        return NextResponse.json({ history: [], error: "Table not found" });
      }
      
      return NextResponse.json({ 
        history: [], 
        error: historyError.message 
      });
    }

    // If we have stock history data, format and return it
    if (historyData && historyData.length > 0) {
      console.log(`Found ${historyData.length} stock history entries`);
      
      // Get variant details
      const variantIds = [...new Set(historyData.map((h: any) => h.variant_id).filter(Boolean))];
      
      let variantMap = new Map();
      
      if (variantIds.length > 0) {
        const { data: variants, error: variantsError } = await supabase
          .from("product_variants")
          .select(`
            id,
            product_id,
            size,
            color,
            products (
              id,
              name
            )
          `)
          .in("id", variantIds);

        if (variantsError) {
          console.error("Error fetching variants:", variantsError);
        } else {
          variantMap = new Map((variants || []).map((v: any) => [v.id, v]));
        }
      }

      const formattedHistory = historyData.map((entry: any) => {
        const variant = variantMap.get(entry.variant_id);
        const productName = variant?.products?.name || "Unknown Product";
        const variantDetails = variant ? `${variant.color || "N/A"} / ${variant.size || "N/A"}` : "N/A";
        
        return {
          id: entry.id,
          variant_id: entry.variant_id,
          product_name: productName,
          variant_details: variantDetails,
          change_type: entry.change_type,
          quantity_change: entry.quantity_change,
          previous_stock: entry.previous_stock,
          new_stock: entry.new_stock,
          notes: entry.notes || "",
          created_at: entry.created_at,
        };
      });

      // Apply filter
      const filteredData = filter === "all" 
        ? formattedHistory 
        : formattedHistory.filter(h => h.change_type === filter);

      console.log("Returning stock history:", filteredData.length, "entries");
      return NextResponse.json({ history: filteredData });
    }

    // If no stock history, fallback to sales
    console.log("No stock history found, falling back to sales...");
    
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select(`
        id,
        created_at,
        sale_items (
          id,
          quantity,
          product_variant_id,
          product_variants (
            id,
            product_id,
            size,
            color,
            products (
              id,
              name
            )
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (salesError) {
      console.error("Sales fallback error:", salesError);
      return NextResponse.json({ history: [] });
    }

    // Transform sales into history format
    const salesHistory = (sales || []).flatMap((sale: any) => {
      return (sale.sale_items || []).map((item: any) => ({
        id: `${sale.id}-${item.id}`,
        variant_id: item.product_variant_id,
        product_name: item.product_variants?.products?.name || "Unknown Product",
        variant_details: `${item.product_variants?.color || "N/A"} / ${item.product_variants?.size || "N/A"}`,
        change_type: "sale",
        quantity_change: -item.quantity,
        previous_stock: 0,
        new_stock: 0,
        notes: "Sold via POS",
        created_at: sale.created_at,
      }));
    });

    const filteredHistory = filter === "all" 
      ? salesHistory 
      : salesHistory.filter(h => h.change_type === filter);

    console.log("Returning sales history:", filteredHistory.length, "entries");
    return NextResponse.json({ history: filteredHistory });

  } catch (error: unknown) {
    console.error("Error in history GET API:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ history: [], error: message });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    console.log("POST /api/inventory/history - Received body:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.variant_id) {
      console.error("Missing variant_id");
      return NextResponse.json({ 
        success: false, 
        error: "variant_id is required" 
      }, { status: 400 });
    }

    if (!body.change_type) {
      console.error("Missing change_type");
      return NextResponse.json({ 
        success: false, 
        error: "change_type is required" 
      }, { status: 400 });
    }

    if (body.quantity_change === undefined || body.quantity_change === null) {
      console.error("Missing quantity_change");
      return NextResponse.json({ 
        success: false, 
        error: "quantity_change is required" 
      }, { status: 400 });
    }

    // Check if variant exists
    const { data: variantExists, error: variantCheckError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("id", body.variant_id)
      .single();

    if (variantCheckError) {
      console.error("Variant check error:", variantCheckError);
      console.log("Variant ID being checked:", body.variant_id);
      
      // Continue anyway - maybe the variant was just created
      console.log("Continuing with insert despite variant check error");
    }

    if (!variantExists) {
      console.warn("Variant not found, but attempting insert anyway");
    }

    // Prepare insert data
    const insertData = {
      variant_id: body.variant_id,
      change_type: body.change_type,
      quantity_change: body.quantity_change,
      previous_stock: body.previous_stock || 0,
      new_stock: body.new_stock || 0,
      notes: body.notes || "",
    };

    console.log("Attempting to insert:", insertData);

    // Try insert
    const { data, error } = await supabase
      .from("stock_history")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Insert error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });

      // If foreign key violation, try alternative approach
      if (error.code === "23503") {
        console.log("Foreign key violation. Attempting insert without select...");
        
        const { error: retryError } = await supabase
          .from("stock_history")
          .insert(insertData);

        if (retryError) {
          console.error("Retry failed:", retryError);
          return NextResponse.json({ 
            success: false, 
            error: retryError.message,
            details: retryError.details,
            code: retryError.code
          }, { status: 500 });
        }

        console.log("Retry succeeded without select");
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      }, { status: 500 });
    }

    console.log("Stock history recorded successfully:", data);
    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    console.error("Error in history POST API:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}