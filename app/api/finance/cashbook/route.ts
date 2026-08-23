import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all cashbook entries
    const { data: cashbookEntries, error } = await supabase
      .from("financial_cashbook")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching cashbook:", error);
      return NextResponse.json({ 
        entries: [], 
        error: error.message 
      });
    }

    // Format entries
    const entries = (cashbookEntries || []).map((entry: any) => ({
      id: entry.id,
      date: entry.created_at,
      reference: entry.transaction_type === "sale" 
        ? `SALE-${entry.id?.substring(0, 8) || "UNKNOWN"}` 
        : `EXP-${entry.id?.substring(0, 8) || "UNKNOWN"}`,
      description: entry.description || entry.category || "Transaction",
      type: entry.cash_in ? "credit" : "debit",
      amount: Number(entry.amount),
    }));

    // Also get sales as credits
    const { data: sales } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: true });

    const salesEntries = (sales || []).map((sale: any) => ({
      id: `sale-${sale.id}`,
      date: sale.created_at,
      reference: `SALE-${sale.id.substring(0, 8)}`,
      description: `Sale - ${sale.payment_method}`,
      type: "credit" as const,
      amount: Number(sale.total_amount),
    }));

    // Combine and sort by date
    const allEntries = [...entries, ...salesEntries]
      .filter(entry => entry.amount > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ entries: allEntries });

  } catch (error: unknown) {
    console.error("Error in cashbook API:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ entries: [], error: message });
  }
}