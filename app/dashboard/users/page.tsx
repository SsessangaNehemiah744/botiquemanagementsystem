"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
  LogOut,
  Activity,
  History,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ActiveSession {
  id: string;
  user_id: string;
  login_time: string;
  last_activity: string;
  status: string;
  idleMinutes: number;
  liveStatus: string;
  ip_address?: string;
  user_agent?: string;
  profiles?: { full_name?: string; role?: string };
}

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
}

export default function UserManagementPage() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "history">("active");
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForceLogout, setShowForceLogout] = useState<ActiveSession | null>(null);
  const [logoutReason, setLogoutReason] = useState("");
  const [logoutNotes, setLogoutNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Check if user is manager
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin" && profile?.role !== "manager") {
        router.push("/dashboard");
        return;
      }

      // Fetch active sessions
      const sessionsRes = await fetch("/api/sessions/active");
      const sessionsData = await sessionsRes.json();
      if (sessionsRes.ok) setSessions(sessionsData);

      // Fetch pending users
      const { data: pending } = await supabase.from("profiles").select("*").eq("status", "INACTIVE");
      setPendingUsers(pending || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleActivateUser = async (userId: string) => {
    await supabase.from("profiles").update({ status: "ACTIVE" }).eq("id", userId);
    fetchData();
  };

  const handleDeactivateUser = async (userId: string) => {
    await supabase.from("profiles").update({ status: "INACTIVE" }).eq("id", userId);
    fetchData();
  };

  const handleForceLogout = async () => {
    if (!showForceLogout) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await fetch(`/api/sessions/logout/${showForceLogout.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: logoutReason, notes: logoutNotes, forcedBy: user?.id }),
      });
      setShowForceLogout(null);
      setLogoutReason("");
      setLogoutNotes("");
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-slate-500">Loading user management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              {sessions.length} online
            </span>
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
        <button onClick={() => setActiveTab("active")} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${activeTab === "active" ? "bg-white dark:bg-slate-900 shadow text-emerald-600" : "text-slate-600"}`}>
          <Activity className="h-4 w-4" /> Active Users ({sessions.length})
        </button>
        <button onClick={() => setActiveTab("pending")} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${activeTab === "pending" ? "bg-white dark:bg-slate-900 shadow text-emerald-600" : "text-slate-600"}`}>
          <Clock className="h-4 w-4" /> Pending ({pendingUsers.length})
        </button>
        <button onClick={() => setActiveTab("history")} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${activeTab === "history" ? "bg-white dark:bg-slate-900 shadow text-emerald-600" : "text-slate-600"}`}>
          <History className="h-4 w-4" /> Login History
        </button>
      </div>

      {/* Active Users Tab */}
      {activeTab === "active" && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Login Time</th>
                  <th className="px-4 py-3 text-left font-medium">Last Activity</th>
                  <th className="px-4 py-3 text-left font-medium">Idle</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sessions.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">No active users.</td></tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {session.profiles?.full_name || "Unknown"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs capitalize">
                          {session.profiles?.role || "unknown"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(session.login_time).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(session.last_activity).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-xs">{session.idleMinutes}m</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          session.liveStatus === "active" ? "text-green-600" :
                          session.liveStatus === "idle" ? "text-yellow-600" : "text-red-600"
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${
                            session.liveStatus === "active" ? "bg-green-500" :
                            session.liveStatus === "idle" ? "bg-yellow-500" : "bg-red-500"
                          }`}></span>
                          {session.liveStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setShowForceLogout(session)} className="inline-flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20">
                          <LogOut className="h-3 w-3" /> Force Logout
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Users Tab */}
      {activeTab === "pending" && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Registered</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {pendingUsers.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">No pending users.</td></tr>
              ) : (
                pendingUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{user.full_name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3 capitalize">{user.role}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleActivateUser(user.id)} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-100">
                          <CheckCircle className="h-3 w-3" /> Activate
                        </button>
                        <button onClick={() => handleDeactivateUser(user.id)} className="inline-flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100">
                          <XCircle className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Force Logout Modal */}
      {showForceLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white dark:bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Force Logout</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Are you sure you want to force logout <strong>{showForceLogout.profiles?.full_name || "this user"}</strong>?
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select value={logoutReason} onChange={(e) => setLogoutReason(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm">
                  <option value="">Select reason...</option>
                  <option value="shift_ended">Staff shift ended</option>
                  <option value="suspicious">Suspicious activity</option>
                  <option value="forgot_logout">Forgot to logout</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input type="text" value={logoutNotes} onChange={(e) => setLogoutNotes(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Additional notes..." />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForceLogout(null)} className="flex-1 rounded-md border py-2 text-sm">Cancel</button>
              <button onClick={handleForceLogout} disabled={processing} className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50">
                {processing ? "Processing..." : "Confirm Force Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}