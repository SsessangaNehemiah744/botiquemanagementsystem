"use client";

import { useState, useEffect } from "react";
import { Activity, Loader2, RefreshCw, LogOut } from "lucide-react";

export default function ActiveUsersPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sessions/active");
      const data = await response.json();
      console.log("Sessions response:", data);
      if (response.ok && Array.isArray(data)) {
        setSessions(data);
      }
    } catch (error) {
      console.error("Fetch sessions error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Active Users</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">🟢 {sessions.length} online</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="rounded-md bg-slate-100 dark:bg-slate-800 p-2">
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
              <th className="px-4 py-3 text-left">Idle</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sessions.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-500">No active sessions found. Try logging out and back in.</td></tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {session.profiles?.full_name || "Unknown"}
                  </td>
                  <td className="px-4 py-3 capitalize">{session.profiles?.role || "unknown"}</td>
                  <td className="px-4 py-3 text-xs">{new Date(session.login_time).toLocaleTimeString()}</td>
                  <td className="px-4 py-3 text-xs">{session.idleMinutes}m</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs ${
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}