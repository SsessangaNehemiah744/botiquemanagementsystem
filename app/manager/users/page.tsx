"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
}

export default function UserManagementPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [activeUsers, setActiveUsers] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "active">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: allProfiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch profiles error:", error.message);
        return;
      }

      const pending = (allProfiles || []).filter((p) => p.status === "INACTIVE");
      const active = (allProfiles || []).filter((p) => p.status === "ACTIVE");

      setPendingUsers(pending);
      setActiveUsers(active);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleActivate = async (userId: string) => {
    setProcessingId(userId);
    setMessage("");
    try {
      const { data: updated, error } = await supabase
        .from("profiles")
        .update({ status: "ACTIVE" })
        .eq("id", userId)
        .select();

      if (error) {
        console.error("Activate error:", error.message);
        setMessage("Failed to activate: " + error.message);
        return;
      }

      console.log("Activated:", updated);

      // Log
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profileData } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
        await supabase.from("system_logs").insert({
          user_id: user?.id || null,
          action: "USER_ACTIVATED",
          affected_type: "User",
          affected_id: userId,
          affected_name: profileData?.full_name || "Unknown",
          status: "success",
        });
      } catch (logError) {
        console.error("Log error:", logError);
      }

      setMessage("✅ User activated successfully!");
      setTimeout(() => fetchUsers(), 500);
    } catch (error) {
      console.error("Activate exception:", error);
      setMessage("Failed to activate user");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm("Deactivate this user? They will not be able to log in.")) return;
    setProcessingId(userId);
    setMessage("");
    try {
      console.log("Deactivating user ID:", userId);

      const { data: updated, error } = await supabase
        .from("profiles")
        .update({ status: "INACTIVE" })
        .eq("id", userId)
        .select();

      if (error) {
        console.error("Deactivate error:", error.message);
        setMessage("Failed to deactivate: " + error.message);
        return;
      }

      console.log("Deactivated:", updated);

      // End active sessions for this user
      await supabase.from("sessions").update({
        status: "ended",
        logout_time: new Date().toISOString(),
      }).eq("user_id", userId).eq("status", "active");

      // Log
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profileData } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
        await supabase.from("system_logs").insert({
          user_id: user?.id || null,
          action: "USER_DEACTIVATED",
          affected_type: "User",
          affected_id: userId,
          affected_name: profileData?.full_name || "Unknown",
          status: "success",
        });
      } catch (logError) {
        console.error("Log error:", logError);
      }

      setMessage("✅ User deactivated successfully!");
      setTimeout(() => fetchUsers(), 500);
    } catch (error) {
      console.error("Deactivate exception:", error);
      setMessage("Failed to deactivate user");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
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
          Refresh
        </button>
      </div>

      {message && (
        <div className={`rounded-md p-3 text-sm ${message.includes("✅") ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
          {message}
        </div>
      )}

      <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
        <button onClick={() => setActiveTab("pending")} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === "pending" ? "bg-white dark:bg-slate-900 shadow text-emerald-600" : "text-slate-600 dark:text-slate-400"}`}>
          <Clock className="h-4 w-4" /> Pending ({pendingUsers.length})
        </button>
        <button onClick={() => setActiveTab("active")} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === "active" ? "bg-white dark:bg-slate-900 shadow text-emerald-600" : "text-slate-600 dark:text-slate-400"}`}>
          <UserCheck className="h-4 w-4" /> Active ({activeUsers.length})
        </button>
      </div>

      {activeTab === "pending" && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          {pendingUsers.length === 0 ? (
            <p className="py-8 text-center text-slate-500 dark:text-slate-400">No pending users. 🎉</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{user.full_name}</td>
                    <td className="px-4 py-3 capitalize">{user.role}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleActivate(user.id)} disabled={processingId === user.id} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100 disabled:opacity-50">
                        {processingId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                        {processingId === user.id ? "Activating..." : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "active" && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          {activeUsers.length === 0 ? (
            <p className="py-8 text-center text-slate-500">No active users.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {activeUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{user.full_name}</td>
                    <td className="px-4 py-3 capitalize">{user.role}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDeactivate(user.id)} disabled={processingId === user.id} className="inline-flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">
                        <XCircle className="h-3 w-3" />
                        Deactivate
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