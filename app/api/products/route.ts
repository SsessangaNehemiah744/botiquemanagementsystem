import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("product_variants")
    .select("*, products(name, category, image_url)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const body = await request.json();

  // First create or find the product
  const { data: product, error: productError } = await supabase
    .from("products")
    .upsert({
      name: body.productName,
      category: body.category,
      image_url: body.image_url,
    }, { onConflict: 'name' })
    .select()
    .single();

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }

  // Create the variant
  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .insert({
      product_id: product.id,
      sku: body.sku,
      barcode: body.barcode,
      size: body.size,
      color: body.color,
      cost_price: body.costPrice,
      selling_price: body.sellingPrice,
      stock_quantity: body.stock,
      low_stock_threshold: body.lowStockThreshold,
      image_url: body.image_url,
    })
    .select()
    .single();

  if (variantError) {
    return NextResponse.json({ error: variantError.message }, { status: 500 });
  }

  return NextResponse.json(variant, { status: 201 });
}