"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart, Mail, Lock, Loader2, ArrowLeft, X,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("No user returned");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, status")
        .eq("id", data.user.id)
        .single();

      if (profile?.status === "INACTIVE") {
        setError("Your account is pending activation by a Manager.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Create session record
      const tokenId = crypto.randomUUID();
      const { error: sessionError } = await supabase.from("sessions").insert({
        user_id: data.user.id,
        token_id: tokenId,
        login_time: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        status: "active",
        ip_address: "unknown",
        user_agent: navigator.userAgent,
        device: navigator.userAgent.substring(0, 100),
      });

      if (sessionError) {
        console.error("Session creation error:", sessionError.message);
        console.error("Full error:", sessionError);
      } else {
        console.log("✅ Session created successfully");
      }

      // Log login
      await supabase.from("system_logs").insert({
        user_id: data.user.id,
        user_name: profile?.full_name || data.user.email,
        user_role: profile?.role || "unknown",
        action: "LOGIN_SUCCESS",
        affected_type: "User",
        affected_id: data.user.id,
        affected_name: profile?.full_name || data.user.email,
        status: "success",
      });

      // Redirect
      if (profile?.role === "cashier") {
        window.location.href = "/cashier";
      } else {
        window.location.href = "/manager";
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <ShoppingCart className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Welcome Back</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to BoutiqueOS</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 p-3 text-sm text-red-600 flex items-start gap-2">
              <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className={labelClass}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="you@boutique.com" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-md bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/signup" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600">
            Don&apos;t have an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}