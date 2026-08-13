"use client";

import { useState, useEffect } from "react";
import { Activity, Loader2, RefreshCw, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ActiveUsersPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showForceLogout, setShowForceLogout] = useState<any | null>(null);
  const [processing, setProcessing] = useState(false);
  const supabase = createClient();

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sessions/active");
      const data = await response.json();
      if (response.ok) setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
  };

  const handleForceLogout = async () => {
    if (!showForceLogout) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await fetch(`/api/sessions/logout/${showForceLogout.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "other", notes: "Force logout by Manager", forcedBy: user?.id }),
      });
      setShowForceLogout(null);
      fetchSessions();
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Active Users</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            🟢 {sessions.length} online · Auto-refreshes every 5s
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Login Time</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sessions.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-500">No active sessions.</td></tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {session.profiles?.full_name || "Unknown"}
                  </td>
                  <td className="px-4 py-3 capitalize">{session.profiles?.role || "unknown"}</td>
                  <td className="px-4 py-3 text-xs">{new Date(session.login_time).toLocaleTimeString()}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      {session.liveStatus || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setShowForceLogout(session)} className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                      <LogOut className="h-3 w-3 inline mr-1" /> Force Logout
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Force Logout Modal */}
      {showForceLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border bg-white dark:bg-slate-900 p-6">
            <h3 className="text-lg font-bold mb-2">Force Logout</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Are you sure you want to force logout <strong>{showForceLogout.profiles?.full_name || "this user"}</strong>?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowForceLogout(null)} className="flex-1 rounded-md border py-2 text-sm">Cancel</button>
              <button onClick={handleForceLogout} disabled={processing} className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500">
                {processing ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}