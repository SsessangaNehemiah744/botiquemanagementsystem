"use client";

import { useState } from "react";
import { Plus, X, Truck, Calendar } from "lucide-react";

const suppliers = [
  { id: "s1", name: "Kampala Fashion Wholesalers", contact: "+256 772 111222", totalSupplied: 5200000, outstandingBalance: 1200000 },
  { id: "s2", name: "Elegance Fabric Ltd", contact: "+256 703 333444", totalSupplied: 3800000, outstandingBalance: 0 },
  { id: "s3", name: "Designer Imports Co.", contact: "info@designerimports.ug", totalSupplied: 7500000, outstandingBalance: 2500000 },
];

const purchaseOrders = [
  { id: "po1", supplier: "Kampala Fashion Wholesalers", date: "2025-05-10", items: "Silk Evening Gowns x5, Trench Coats x3", amount: 1450000, paid: 1000000, balance: 450000 },
  { id: "po2", supplier: "Elegance Fabric Ltd", date: "2025-05-12", items: "Pleated Skirts x10, Leather Bags x4", amount: 2200000, paid: 2200000, balance: 0 },
  { id: "po3", supplier: "Designer Imports Co.", date: "2025-05-15", items: "Evening Gowns x8, Accessories x12", amount: 4000000, paid: 1500000, balance: 2500000 },
];

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SuppliersPage() {
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [intakeForm, setIntakeForm] = useState({
    supplier: "",
    items: "",
    amount: 0,
    paid: 0,
  });

  const recordIntake = () => {
    setShowIntakeModal(false);
    setIntakeForm({ supplier: "", items: "", amount: 0, paid: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Supplier Ledger</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track supplier debts and purchase orders
          </p>
        </div>
        <button
          onClick={() => setShowIntakeModal(true)}
          className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" /> Record Supply Intake
        </button>
      </div>

      {/* Supplier Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((s) => (
          <div
            key={s.id}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold">{s.name}</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{s.contact}</p>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Total Supplied:</span>
              <span className="font-bold">{formatUGX(s.totalSupplied)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-600 dark:text-slate-400">Outstanding:</span>
              <span
                className={`font-bold ${
                  s.outstandingBalance > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatUGX(s.outstandingBalance)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Order History */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-500" /> Purchase Order History
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Supplier</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Items</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Amount</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Paid</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2">{po.supplier}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{po.date}</td>
                  <td className="px-4 py-2">{po.items}</td>
                  <td className="px-4 py-2 text-right">{formatUGX(po.amount)}</td>
                  <td className="px-4 py-2 text-right">{formatUGX(po.paid)}</td>
                  <td
                    className={`px-4 py-2 text-right font-bold ${
                      po.balance > 0 ? "text-red-600 dark:text-red-400" : ""
                    }`}
                  >
                    {formatUGX(po.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Supply Intake Modal */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Record Supply Intake</h3>
              <button onClick={() => setShowIntakeModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Supplier</label>
                <select
                  value={intakeForm.supplier}
                  onChange={(e) => setIntakeForm({ ...intakeForm, supplier: e.target.value })}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Items Description</label>
                <textarea
                  value={intakeForm.items}
                  onChange={(e) => setIntakeForm({ ...intakeForm, items: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Total Amount (UGX)</label>
                  <input
                    type="number"
                    value={intakeForm.amount}
                    onChange={(e) => setIntakeForm({ ...intakeForm, amount: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Amount Paid (UGX)</label>
                  <input
                    type="number"
                    value={intakeForm.paid}
                    onChange={(e) => setIntakeForm({ ...intakeForm, paid: Number(e.target.value) })}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowIntakeModal(false)}
                className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 py-2 text-sm text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={recordIntake}
                className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Confirm Intake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}