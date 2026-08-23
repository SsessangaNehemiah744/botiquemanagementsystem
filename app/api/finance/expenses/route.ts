import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    console.log("Recording expense:", body);

    const { category, amount, description, payment_method, date } = body;

    // Validate
    if (!category || !amount || amount <= 0 || !description) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    // Insert into financial_cashbook
    const { data, error } = await supabase
      .from("financial_cashbook")
      .insert({
        transaction_type: "expense",
        category: category,
        amount: amount,
        description: description,
        payment_method: payment_method || "cash",
        cash_in: false,
        created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error recording expense:", error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    console.log("Expense recorded:", data);
    return NextResponse.json({ success: true, expense: data });

  } catch (error: unknown) {
    console.error("Error in expenses API:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}