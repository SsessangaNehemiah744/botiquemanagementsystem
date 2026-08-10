"use client";

import { useState } from "react";
import { Search, Plus, X, Banknote, UserPlus } from "lucide-react";

const initialCustomers = [
  { id: "c1", name: "Nambi Olivia", phone: "+256 712 345678", totalPurchased: 1250000, outstandingDebt: 300000, loyaltyPoints: 1250 },
  { id: "c2", name: "Wafula Peter", phone: "+256 701 234567", totalPurchased: 480000, outstandingDebt: 0, loyaltyPoints: 480 },
  { id: "c3", name: "Auma Grace", phone: "+256 752 123456", totalPurchased: 2100000, outstandingDebt: 500000, loyaltyPoints: 2100 },
  { id: "c4", name: "Kato Ibrahim", phone: "+256 783 987654", totalPurchased: 750000, outstandingDebt: 150000, loyaltyPoints: 750 },
];

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const addCustomer = () => {
    if (!newCustomer.name) return;
    setCustomers((prev) => [
      ...prev,
      {
        id: `c${Date.now()}`,
        name: newCustomer.name,
        phone: newCustomer.phone || "",
        totalPurchased: 0,
        outstandingDebt: 0,
        loyaltyPoints: 0,
      },
    ]);
    setNewCustomer({ name: "", phone: "" });
    setShowAddModal(false);
  };

  const recordPayment = () => {
    if (!showPaymentModal || paymentAmount <= 0) return;
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === showPaymentModal
          ? { ...c, outstandingDebt: Math.max(0, c.outstandingDebt - paymentAmount) }
          : c
      )
    );
    setShowPaymentModal(null);
    setPaymentAmount(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customer Ledger</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage customers and credit debts
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <UserPlus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Customer Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                Customer
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                Phone
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                Total Purchased
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                Outstanding Debt
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                Loyalty Pts
              </th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.phone}</td>
                <td className="px-4 py-3 text-right">{formatUGX(c.totalPurchased)}</td>
                <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                  {formatUGX(c.outstandingDebt)}
                </td>
                <td className="px-4 py-3 text-right">{c.loyaltyPoints}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setShowPaymentModal(c.id)}
                    disabled={c.outstandingDebt <= 0}
                    className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    <Banknote className="h-3 w-3" /> Record Payment
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-500">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 py-2 text-sm text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={addCustomer}
                className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Record Debt Payment</h3>
              <button onClick={() => setShowPaymentModal(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Customer:{" "}
              <span className="text-slate-900 dark:text-white">
                {customers.find((c) => c.id === showPaymentModal)?.name}
              </span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Current Debt:{" "}
              <span className="text-red-600 dark:text-red-400 font-bold">
                {formatUGX(
                  customers.find((c) => c.id === showPaymentModal)?.outstandingDebt || 0
                )}
              </span>
            </p>
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                Payment Amount (UGX)
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowPaymentModal(null)}
                className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 py-2 text-sm text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={recordPayment}
                className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}