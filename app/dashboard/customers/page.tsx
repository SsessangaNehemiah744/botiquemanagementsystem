"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  X,
  Phone,
  Mail,
  MapPin,
  Loader2,
  Pencil,
  Trash2,
  CreditCard,
  Star,
  User,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface Customer {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyalty_points: number;
  outstanding_balance: number;
  created_at: string;
}

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Customer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<Customer | null>(null);

  // Forms
  const [saving, setSaving] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ full_name: "", phone: "", email: "", address: "" });
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", email: "", address: "" });
  const [paymentAmount, setPaymentAmount] = useState(0);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/customers");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch");
      setCustomers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.full_name.trim()) {
      setError("Full name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add");
      setShowAddModal(false);
      setNewCustomer({ full_name: "", phone: "", email: "", address: "" });
      fetchCustomers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add customer");
    } finally {
      setSaving(false);
    }
  };

  const handleEditCustomer = async () => {
    if (!showEditModal) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: showEditModal.id, ...editForm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update");
      setShowEditModal(null);
      fetchCustomers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase.from("customers").delete().eq("id", id);
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async () => {
    if (!showPaymentModal || paymentAmount <= 0) return;
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      // Record payment
      await supabase.from("credit_transactions").insert({
        customer_id: showPaymentModal.id,
        amount: paymentAmount,
        transaction_type: "payment",
      });
      // Update customer balance
      const newBalance = Math.max(0, showPaymentModal.outstanding_balance - paymentAmount);
      await supabase
        .from("customers")
        .update({ outstanding_balance: newBalance })
        .eq("id", showPaymentModal.id);
      setShowPaymentModal(null);
      setPaymentAmount(0);
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalOutstanding = customers.reduce((sum, c) => sum + Number(c.outstanding_balance), 0);
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyalty_points, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Ledger</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {customers.length} customer{customers.length !== 1 ? "s" : ""} · {formatUGX(totalOutstanding)} outstanding
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
          <Plus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search by name, phone, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none" />
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {/* Customer Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-slate-500">Loading customers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border rounded-lg">
          <User className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p>{search ? "No customers match your search." : "No customers yet. Add your first customer!"}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer) => (
            <div key={customer.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                    <User className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <button onClick={() => setShowDetailModal(customer)} className="font-semibold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 text-left">
                      {customer.full_name}
                    </button>
                    {customer.phone && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {customer.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setShowEditModal(customer); setEditForm({ full_name: customer.full_name, phone: customer.phone || "", email: customer.email || "", address: customer.address || "" }); }} className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDeleteCustomer(customer.id)} className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding:</span>
                  <span className={`font-bold ${Number(customer.outstanding_balance) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {formatUGX(customer.outstanding_balance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" /> Loyalty:</span>
                  <span className="font-medium">{customer.loyalty_points} pts</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => setShowDetailModal(customer)} className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">View Profile</button>
                {Number(customer.outstanding_balance) > 0 && (
                  <button onClick={() => setShowPaymentModal(customer)} className="flex-1 rounded-md bg-emerald-600 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 flex items-center justify-center gap-1">
                    <CreditCard className="h-3 w-3" /> Record Payment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Full Name *</label><input type="text" value={newCustomer.full_name} onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" placeholder="e.g., Nambi Olivia" /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><input type="text" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" placeholder="+256 7XX XXX XXX" /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" placeholder="customer@email.com" /></div>
              <div><label className="block text-sm font-medium mb-1">Address</label><input type="text" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" /></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-md border py-2 text-sm">Cancel</button>
              <button onClick={handleAddCustomer} disabled={saving} className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving..." : "Save Customer"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Edit Customer</h3>
              <button onClick={() => setShowEditModal(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Full Name *</label><input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Address</label><input type="text" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowEditModal(null)} className="flex-1 rounded-md border py-2 text-sm">Cancel</button>
              <button onClick={handleEditCustomer} disabled={saving} className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">{saving ? "Saving..." : "Update Customer"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white dark:bg-slate-900 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{showDetailModal.full_name}</h3>
              <button onClick={() => setShowDetailModal(null)} className="p-1 rounded hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              {showDetailModal.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {showDetailModal.phone}</p>}
              {showDetailModal.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {showDetailModal.email}</p>}
              {showDetailModal.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> {showDetailModal.address}</p>}
              <div className="border-t pt-3">
                <div className="flex justify-between text-sm"><span>Outstanding Balance:</span><span className="font-bold text-red-600">{formatUGX(showDetailModal.outstanding_balance)}</span></div>
                <div className="flex justify-between text-sm mt-2"><span>Loyalty Points:</span><span className="font-bold text-yellow-500">{showDetailModal.loyalty_points} pts</span></div>
                <div className="flex justify-between text-sm mt-2"><span>Customer Since:</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(showDetailModal.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(null)} className="p-1 rounded hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-2">Customer: <span className="font-medium text-slate-900">{showPaymentModal.full_name}</span></p>
            <p className="text-sm text-slate-500 mb-4">Current Debt: <span className="font-bold text-red-600">{formatUGX(showPaymentModal.outstanding_balance)}</span></p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Payment Amount (UGX)</label>
              <input type="number" value={paymentAmount || ""} onChange={(e) => setPaymentAmount(Number(e.target.value))} className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPaymentModal(null)} className="flex-1 rounded-md border py-2 text-sm">Cancel</button>
              <button onClick={handleRecordPayment} disabled={paymentAmount <= 0} className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">Confirm Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}