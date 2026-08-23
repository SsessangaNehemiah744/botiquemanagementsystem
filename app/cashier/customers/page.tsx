"use client";

import { useState, useEffect } from "react";
import { Search, Plus, X, Phone, User, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Customer {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
}

export default function CashierCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ full_name: "", phone: "" });
  const supabase = createClient();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.full_name.trim()) return;
    setSaving(true);
    await supabase.from("customers").insert({
      full_name: newCustomer.full_name,
      phone: newCustomer.phone || null,
    });
    setSaving(false);
    setShowAddModal(false);
    setNewCustomer({ full_name: "", phone: "" });
    fetchCustomers();
  };

  const filtered = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search)
  );

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Search and add customers (view only)</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          <Plus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{c.full_name}</p>
                {c.phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Add Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Full Name *</label><input type="text" value={newCustomer.full_name} onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><input type="text" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-md border py-2 text-sm">Cancel</button>
              <button onClick={handleAddCustomer} disabled={saving} className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}