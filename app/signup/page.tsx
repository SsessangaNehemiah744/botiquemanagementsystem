"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart,
  Mail,
  Lock,
  User,
  Loader2,
  ArrowLeft,
  CheckCircle,
  X,
  Briefcase,
  CreditCard,
} from "lucide-react";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"cashier" | "manager">("cashier");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Update profile with role and status
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName,
          role: role === "manager" ? "admin" : "cashier",
          status: role === "manager" ? "ACTIVE" : "INACTIVE",
        });
      }

      setShowVerificationModal(true);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowVerificationModal(false);
    router.push("/login");
  };

  const inputClass = "w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <ShoppingCart className="mx-auto h-12 w-12 text-emerald-500" />
            </Link>
            <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
              Create an Account
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Join BoutiqueOS to manage your boutique
            </p>
          </div>

          {/* Form Card */}
          <form
            onSubmit={handleSignUp}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm"
          >
            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className={labelClass}>Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Jane Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className={labelClass}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="jane@gmail.com"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className={labelClass}>I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Cashier Option */}
                <button
                  type="button"
                  onClick={() => setRole("cashier")}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    role === "cashier"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <CreditCard className={`h-6 w-6 mb-2 ${role === "cashier" ? "text-emerald-500" : "text-slate-400"}`} />
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">Cashier</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Handle sales & payments
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Requires Manager approval
                  </p>
                </button>

                {/* Manager Option */}
                <button
                  type="button"
                  onClick={() => setRole("manager")}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    role === "manager"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <Briefcase className={`h-6 w-6 mb-2 ${role === "manager" ? "text-emerald-500" : "text-slate-400"}`} />
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">Manager</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Full access & reports
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Immediate access
                  </p>
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelClass}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">Must be at least 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (password !== confirmPassword && confirmPassword !== "")}
              className="w-full rounded-md bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating account..." : "Create Account"}
            </button>

            <p className="text-center text-xs text-slate-400">
              By signing up, you agree to our{" "}
              <a href="#" className="text-emerald-600 hover:underline">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="text-emerald-600 hover:underline">Privacy Policy</a>
            </p>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
              <Mail className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Check Your Email
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              We&apos;ve sent a verification link to
            </p>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4 break-all">
              {email}
            </p>

            {role === "cashier" && (
              <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-lg p-4 mb-4 text-left">
                <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mb-1">
                  ⚠️ Pending Manager Approval
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500">
                  Your account will be activated by a Manager after email verification.
                  You&apos;ll be able to log in once approved.
                </p>
              </div>
            )}

            {role === "manager" && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-4 mb-4 text-left">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-1">
                  ✓ Manager Account
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                  Your account will be active immediately after email verification.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-400 mb-6">
              Didn&apos;t receive the email? Check your spam folder.
            </p>

            <button
              onClick={handleCloseModal}
              className="w-full rounded-md bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Go to Login
            </button>
          </div>
        </div>
      )}
    </>
  );
}