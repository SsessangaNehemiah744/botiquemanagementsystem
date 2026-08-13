"use client";

import { useState, useEffect } from "react";
import { Wallet, Search, Phone, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CreditSalesPage() {
  const [debtors, setDebtors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchDebtors();
  }, []);

  const fetchDebtors = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .gt("outstanding_balance", 0)
        .order("outstanding_balance", { ascending: false });
      setDebtors(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = debtors.filter((d) =>
    (d.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Credit Sales</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Customers with outstanding debts
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search debtor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white"
        />
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Phone</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Amount Owed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-500 dark:text-slate-400">
                  No outstanding debts. 🎉
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{d.full_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {d.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                    {formatUGX(d.outstanding_balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        ⚠️ Only Manager can approve new credit sales
      </p>
    </div>
  );
}