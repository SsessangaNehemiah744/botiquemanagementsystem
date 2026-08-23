import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Try to get transfers from table
    const { data: transfers, error } = await supabase
      .from("cash_transfers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transfers:", error);
      
      // If table doesn't exist, return empty
      if (error.code === "42P01") {
        return NextResponse.json({ transfers: [] });
      }
      
      return NextResponse.json({ 
        transfers: [], 
        error: error.message 
      });
    }

    return NextResponse.json({ transfers: transfers || [] });

  } catch (error: unknown) {
    console.error("Error in transfers API:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ transfers: [], error: message });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    console.log("Creating transfer:", body);

    const { from_account, to_account, amount, reference, notes } = body;

    // Validate
    if (!from_account || !to_account || !amount || amount <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid transfer details" 
      }, { status: 400 });
    }

    if (from_account === to_account) {
      return NextResponse.json({ 
        success: false, 
        error: "Source and destination must be different" 
      }, { status: 400 });
    }

    // Insert transfer
    const { data, error } = await supabase
      .from("cash_transfers")
      .insert({
        from_account,
        to_account,
        amount,
        reference: reference || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating transfer:", error);
      
      // If table doesn't exist, try to create it
      if (error.code === "42P01") {
        // Table doesn't exist, return error with hint
        return NextResponse.json({ 
          success: false, 
          error: "Cash transfers table not found. Please run the SQL to create it.",
          hint: "CREATE TABLE cash_transfers (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, from_account TEXT NOT NULL, to_account TEXT NOT NULL, amount NUMERIC NOT NULL, reference TEXT, notes TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());"
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    // Also record in cashbook
    try {
      // Record as debit from source account
      await supabase.from("financial_cashbook").insert({
        transaction_type: "transfer",
        category: "Transfer",
        amount: amount,
        description: `Transfer from ${from_account} to ${to_account}`,
        payment_method: "transfer",
        cash_in: false,
      });

      // Record as credit to destination account
      await supabase.from("financial_cashbook").insert({
        transaction_type: "transfer",
        category: "Transfer",
        amount: amount,
        description: `Transfer from ${from_account} to ${to_account}`,
        payment_method: "transfer",
        cash_in: true,
      });
    } catch (cashbookError) {
      console.error("Error recording in cashbook:", cashbookError);
    }

    console.log("Transfer created:", data);
    return NextResponse.json({ success: true, transfer: data });

  } catch (error: unknown) {
    console.error("Error in transfers POST API:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}