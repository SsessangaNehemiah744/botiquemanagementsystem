import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get cashbook entries
    const { data: cashbookEntries, error: cashbookError } = await supabase
      .from("financial_cashbook")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (cashbookError) {
      console.error("Cashbook fetch error:", cashbookError);
    }

    // Get sales that might not be in cashbook yet
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (salesError) {
      console.error("Sales fetch error:", salesError);
    }

    // Convert sales to cashbook-style entries if not already recorded
    const saleEntries = (sales || []).map((sale: any) => ({
      id: sale.id,
      transaction_date: sale.created_at,
      transaction_type: "sale",
      category: "Sales",
      amount: sale.total_amount,
      description: `Sale #${sale.id.substring(0, 8)}`,
      payment_method: sale.payment_method,
      cash_in: true,
    }));

    // Merge cashbook entries and sales
    const allEntries = [...(cashbookEntries || []), ...saleEntries];

    // Calculate totals
    const totalIncome = allEntries
      .filter((e: any) => e.cash_in)
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    const totalExpenses = allEntries
      .filter((e: any) => !e.cash_in)
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    return NextResponse.json({
      entries: allEntries,
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      grossRevenue: totalIncome,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const body = await request.json();
    const { transaction_type, category, amount, description, payment_method, cash_in } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const { data: entry, error } = await supabase
      .from("financial_cashbook")
      .insert({
        transaction_type: transaction_type || "income",
        category: category || "Other",
        amount,
        description: description || null,
        payment_method: payment_method || "cash",
        cash_in: cash_in !== undefined ? cash_in : true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}