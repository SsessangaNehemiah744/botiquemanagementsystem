"use client";

import { useState, useEffect } from "react";
import { History, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(amount);
}

export default function MySalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSales() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("sales").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
        setSales(data || []);
      }
      setLoading(false);
    }
    fetchSales();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Sales History</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Your past transactions</p>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left">Sale ID</th>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Payment</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sales.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-slate-500">No sales yet.</td></tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-4 py-3 font-mono text-xs">#{sale.id.substring(0, 8)}</td>
                  <td className="px-4 py-3 text-xs">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs capitalize">{sale.payment_method}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatUGX(sale.total_amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}