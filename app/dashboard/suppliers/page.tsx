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
  Truck,
  CreditCard,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  current_balance: number;
  created_at: string;
}

interface Transaction {
  id: string;
  supplier_id: string;
  transaction_type: string;
  amount: number;
  description?: string;
  created_at: string;
}

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Supplier | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<Supplier | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState<Supplier | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<Supplier | null>(null);

  // Forms
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", contact_person: "", phone: "", email: "", address: "" });
  const [editForm, setEditForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "" });
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [purchaseDescription, setPurchaseDescription] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/suppliers");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch");
      setSuppliers(data.suppliers || []);
      setTransactions(data.transactions || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSuppliers();
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) {
      setError("Supplier name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add");
      setShowAddModal(false);
      setNewSupplier({ name: "", contact_person: "", phone: "", email: "", address: "" });
      fetchSuppliers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSupplier = async () => {
    if (!showEditModal) return;
    setSaving(true);
    try {
      const response = await fetch("/api/suppliers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: showEditModal.id, ...editForm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update");
      setShowEditModal(null);
      fetchSuppliers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase.from("suppliers").delete().eq("id", id);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPurchase = async () => {
    if (!showPurchaseModal || purchaseAmount <= 0) return;
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase.from("supplier_transactions").insert({
        supplier_id: showPurchaseModal.id,
        transaction_type: "purchase",
        amount: purchaseAmount,
        description: purchaseDescription || "Purchase",
      });
      const newBalance = Number(showPurchaseModal.current_balance) + purchaseAmount;
      await supabase.from("suppliers").update({ current_balance: newBalance }).eq("id", showPurchaseModal.id);
      setShowPurchaseModal(null);
      setPurchaseAmount(0);
      setPurchaseDescription("");
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async () => {
    if (!showPaymentModal || paymentAmount <= 0) return;
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase.from("supplier_transactions").insert({
        supplier_id: showPaymentModal.id,
        transaction_type: "payment",
        amount: paymentAmount,
        description: "Payment to supplier",
      });
      const newBalance = Math.max(0, Number(showPaymentModal.current_balance) - paymentAmount);
      await supabase.from("suppliers").update({ current_balance: newBalance }).eq("id", showPaymentModal.id);
      setShowPaymentModal(null);
      setPaymentAmount(0);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || "").includes(search) ||
      (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.contact_person || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalOwed = suppliers.reduce((sum, s) => sum + Number(s.current_balance), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Supplier Ledger</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""} · {formatUGX(totalOwed)} total owed
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            <Plus className="h-4 w-4" /> Add Supplier
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none" />
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {/* Supplier Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-slate-500">Loading suppliers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border rounded-lg">
          <Truck className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p>{search ? "No suppliers match your search." : "No suppliers yet. Add your first supplier!"}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((supplier) => (
            <div key={supplier.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
                    <Truck className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <button onClick={() => setShowDetailModal(supplier)} className="font-semibold text-slate-900 dark:text-white hover:text-emerald-600 text-left">
                      {supplier.name}
                    </button>
                    {supplier.contact_person && (
                      <p className="text-xs text-slate-500">{supplier.contact_person}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setShowEditModal(supplier); setEditForm({ name: supplier.name, contact_person: supplier.contact_person || "", phone: supplier.phone || "", email: supplier.email || "", address: supplier.address || "" }); }} className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDeleteSupplier(supplier.id)} className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {supplier.phone && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                  <Phone className="h-3 w-3" /> {supplier.phone}
                </p>
              )}
              {supplier.email && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                  <Mail className="h-3 w-3" /> {supplier.email}
                </p>
              )}

              <div className="mt-3 flex justify-between text-sm border-t pt-3">
                <span className="text-slate-500">Owed:</span>
                <span className={`font-bold ${Number(supplier.current_balance) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatUGX(supplier.current_balance)}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => setShowDetailModal(supplier)} className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">View History</button>
                <button onClick={() => setShowPurchaseModal(supplier)} className="flex-1 rounded-md bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-500 flex items-center justify-center gap-1">
                  <Package className="h-3 w-3" /> Purchase
                </button>
                {Number(supplier.current_balance) > 0 && (
                  <button onClick={() => setShowPaymentModal(supplier)} className="flex-1 rounded-md bg-emerald-600 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 flex items-center justify-center gap-1">
                    <CreditCard className="h-3 w-3" /> Pay
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Supplier</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Supplier Name *</label><input type="text" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g., Kampala Fashion Wholesalers" /></div>
              <div><label className="block text-sm font-medium mb-1">Contact Person</label><input type="text" value={newSupplier.contact_person} onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><input type="text" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Address</label><input type="text" value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-md border py-2 text-sm">Cancel</button>
              <button onClick={handleAddSupplier} disabled={saving} className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">{saving ? "Saving..." : "Save Supplier"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Edit Supplier</h3>
              <button onClick={() => setShowEditModal(null)} className="p-1 rounded hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Supplier Name *</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Contact Person</label><input type="text" value={editForm.contact_person} onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Address</label><input type="text" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowEditModal(null)} className="flex-1 rounded-md border py-2 text-sm">Cancel</button>
              <button onClick={handleEditSupplier} disabled={saving} className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500">{saving ? "Saving..." : "Update Supplier"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white dark:bg-slate-900 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{showDetailModal.name}</h3>
              <button onClick={() => setShowDetailModal(null)} className="p-1 rounded hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2 mb-4">
              {showDetailModal.contact_person && <p className="text-sm"><strong>Contact:</strong> {showDetailModal.contact_person}</p>}
              {showDetailModal.phone && <p className="text-sm flex items-center gap-1"><Phone className="h-3 w-3" /> {showDetailModal.phone}</p>}
              {showDetailModal.email && <p className="text-sm flex items-center gap-1"><Mail className="h-3 w-3" /> {showDetailModal.email}</p>}
              <p className="text-sm"><strong>Balance Owed:</strong> <span className="text-red-600 font-bold">{formatUGX(showDetailModal.current_balance)}</span></p>
            </div>
            <h4 className="font-semibold mb-2">Transaction History</h4>
            {transactions.filter(t => t.supplier_id === showDetailModal.id).length === 0 ? (
              <p className="text-sm text-slate-500">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {transactions.filter(t => t.supplier_id === showDetailModal.id).map((t) => (
                  <div key={t.id} className="flex justify-between border-b pb-2 text-sm">
                    <div>
                      <span className={`font-medium ${t.transaction_type === "purchase" ? "text-blue-600" : "text-emerald-600"}`}>
                        {t.transaction_type === "purchase" ? "Purchase" : "Payment"}
                      </span>
                      <p className="text-xs text-slate-500">{t.description}</p>
                      <p className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-bold ${t.transaction_type === "purchase" ? "text-blue-600" : "text-emerald-600"}`}>
                      {t.transaction_type === "purchase" ? "+" : "−"}{formatUGX(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Record Purchase</h3>
              <button onClick={() => setShowPurchaseModal(null)} className="p-1 rounded hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm mb-3">Supplier: <strong>{showPurchaseModal.name}</strong></p>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Amount (UGX) *</label><input type="number" value={purchaseAmount || ""} onChange={(e) => setPurchaseAmount(Number(e.target.value))} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><input type="text" value={purchaseDescription} onChange={(e) => setPurchaseDescription(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g., 10 dresses" /></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowPurchaseModal(null)} className="flex-1 rounded-md border py-2 text-sm">Cancel</button>
              <button onClick={handleRecordPurchase} disabled={purchaseAmount <= 0} className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(null)} className="p-1 rounded hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm mb-3">Supplier: <strong>{showPaymentModal.name}</strong></p>
            <p className="text-sm mb-3">Current Owed: <strong className="text-red-600">{formatUGX(showPaymentModal.current_balance)}</strong></p>
            <div><label className="block text-sm font-medium mb-1">Payment Amount (UGX) *</label><input type="number" value={paymentAmount || ""} onChange={(e) => setPaymentAmount(Number(e.target.value))} className="w-full rounded-md border px-3 py-2 text-sm" /></div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowPaymentModal(null)} className="flex-1 rounded-md border py-2 text-sm">Cancel</button>
              <button onClick={handleRecordPayment} disabled={paymentAmount <= 0} className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500">Confirm Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}