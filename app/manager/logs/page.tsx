"use client";

import { useState, useEffect } from "react";
import { FileText, Loader2, Search, RefreshCw } from "lucide-react";

export default function SystemLogsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/logs");
      const data = await response.json();
      if (response.ok) setLogs(data.logs || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) =>
    (log.action || "").toLowerCase().includes(search.toLowerCase()) ||
    (log.user_name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">System Logs</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{logs.length} entries</p>
        </div>
        <button onClick={fetchLogs} disabled={refreshing} className="rounded-md bg-slate-100 dark:bg-slate-800 p-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border pl-10 pr-4 py-2 text-sm" />
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-slate-500">No logs found.</td></tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="px-4 py-3">{log.user_name || "Unknown"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${log.status === "success" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>{log.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}