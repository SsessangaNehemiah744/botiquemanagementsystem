import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const url = new URL(request.url);
    const reportType = url.searchParams.get("type") || "daily";

    // Get all sales
    const { data: sales } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });

    // Get sale items with cost
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("quantity, unit_price, cost_price_at_sale, product_variants(*, products(name))");

    // Get cashbook entries
    const { data: cashbook } = await supabase
      .from("financial_cashbook")
      .select("*")
      .order("created_at", { ascending: false });

    // Get customers with outstanding balances
    const { data: customers } = await supabase
      .from("customers")
      .select("*")
      .order("outstanding_balance", { ascending: false });

    // Get suppliers
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("*")
      .order("current_balance", { ascending: false });

    // Calculate COGS
    const totalCOGS = (saleItems || []).reduce(
      (sum: number, item: { quantity: number; cost_price_at_sale: number }) =>
        sum + item.quantity * Number(item.cost_price_at_sale || 0),
      0
    );

    // Calculate revenue by payment method
    const paymentBreakdown = {
      cash: 0,
      mobile_money: 0,
      card: 0,
      credit: 0,
    };

    (sales || []).forEach((sale: { payment_method: string; total_amount: number; is_credit?: boolean }) => {
      const amount = Number(sale.total_amount);
      if (sale.is_credit) {
        paymentBreakdown.credit += amount;
      } else if (sale.payment_method === "cash") {
        paymentBreakdown.cash += amount;
      } else if (sale.payment_method === "mobile_money") {
        paymentBreakdown.mobile_money += amount;
      } else if (sale.payment_method === "card") {
        paymentBreakdown.card += amount;
      }
    });

    // Mobile money references
    const mobileMoneyRefs = (sales || [])
      .filter((s: { payment_method: string }) => s.payment_method === "mobile_money")
      .map((s: { notes?: string; total_amount: number; created_at: string }) => ({
        reference: s.notes || "N/A",
        amount: s.total_amount,
        time: s.created_at,
      }));

    // Total expenses
    const totalExpenses = (cashbook || [])
      .filter((e: { cash_in: boolean }) => !e.cash_in)
      .reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0);

    // Total income
    const totalIncome = (cashbook || [])
      .filter((e: { cash_in: boolean }) => e.cash_in)
      .reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0);

    // Gross profit
    const totalRevenue = (sales || []).reduce(
      (sum: number, s: { total_amount: number }) => sum + Number(s.total_amount),
      0
    );
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    // Outstanding customer debts
    const customerDebts = (customers || [])
      .filter((c: { outstanding_balance: number }) => Number(c.outstanding_balance) > 0)
      .map((c: { id: string; full_name: string; outstanding_balance: number; phone?: string }) => ({
        id: c.id,
        name: c.full_name,
        phone: c.phone,
        amountOwed: Number(c.outstanding_balance),
      }));

    // Supplier balances
    const supplierBalances = (suppliers || [])
      .filter((s: { current_balance: number }) => Number(s.current_balance) > 0)
      .map((s: { id: string; name: string; current_balance: number; phone?: string }) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        amountOwed: Number(s.current_balance),
      }));

    // Expense breakdown by category
    const expenseCategories = new Map<string, number>();
    (cashbook || [])
      .filter((e: { cash_in: boolean }) => !e.cash_in)
      .forEach((e: { category: string; amount: number }) => {
        const cat = e.category || "Other";
        expenseCategories.set(cat, (expenseCategories.get(cat) || 0) + Number(e.amount));
      });

    const expenseBreakdown = Array.from(expenseCategories.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Bank reconciliation (mobile money + card vs actual)
    const systemDeposits = paymentBreakdown.mobile_money + paymentBreakdown.card;
    const actualDeposits = systemDeposits; // This would be manually entered from bank statement
    const reconciliationDifference = systemDeposits - actualDeposits;

    return NextResponse.json({
      paymentBreakdown,
      mobileMoneyRefs,
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
      totalIncome,
      customerDebts,
      supplierBalances,
      expenseBreakdown,
      systemDeposits,
      actualDeposits,
      reconciliationDifference,
      salesCount: (sales || []).length,
      itemsSold: (saleItems || []).reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0),
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}