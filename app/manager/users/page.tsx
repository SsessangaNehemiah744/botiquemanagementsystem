"use client";

import { useState, useEffect } from "react";
import { Users, Clock, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function UserManagementPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "active">("pending");
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: pending } = await supabase.from("profiles").select("*").eq("status", "INACTIVE");
    const { data: active } = await supabase.from("profiles").select("*").eq("status", "ACTIVE");
    setPendingUsers(pending || []);
    setActiveUsers(active || []);
    setLoading(false);
    setRefreshing(false);
  };

  const handleActivate = async (id: string) => {
    await supabase.from("profiles").update({ status: "ACTIVE" }).eq("id", id);
    fetchUsers();
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Deactivate this user? They will not be able to log in.")) return;
    await supabase.from("profiles").update({ status: "INACTIVE" }).eq("id", id);
    fetchUsers();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {pendingUsers.length} pending · {activeUsers.length} active
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
        <button onClick={() => setActiveTab("pending")} className={`rounded-md px-4 py-2 text-sm font-medium ${activeTab === "pending" ? "bg-white dark:bg-slate-900 shadow text-emerald-600" : "text-slate-600"}`}>
          Pending ({pendingUsers.length})
        </button>
        <button onClick={() => setActiveTab("active")} className={`rounded-md px-4 py-2 text-sm font-medium ${activeTab === "active" ? "bg-white dark:bg-slate-900 shadow text-emerald-600" : "text-slate-600"}`}>
          Active ({activeUsers.length})
        </button>
      </div>

      {/* Pending Users */}
      {activeTab === "pending" && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          {pendingUsers.length === 0 ? (
            <p className="py-8 text-center text-slate-500">No pending users. 🎉</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {pendingUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{user.full_name}</td>
                    <td className="px-4 py-3 capitalize">{user.role}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleActivate(user.id)} className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100">
                        <CheckCircle className="h-3 w-3 inline mr-1" /> Activate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Active Users */}
      {activeTab === "active" && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          {activeUsers.length === 0 ? (
            <p className="py-8 text-center text-slate-500">No active users.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {activeUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{user.full_name}</td>
                    <td className="px-4 py-3 capitalize">{user.role}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDeactivate(user.id)} className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                        <XCircle className="h-3 w-3 inline mr-1" /> Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}