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
} from "lucide-react";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Basic validation
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

    // Sign up with Supabase (email confirmation enabled by default)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      // Show verification modal instead of redirecting
      setShowVerificationModal(true);
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowVerificationModal(false);
    router.push("/login");
  };

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
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm"
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
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Jane Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="jane@boutique.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Must be at least 6 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="••••••••"
                />
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-500">
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                loading ||
                (password !== confirmPassword && confirmPassword !== "")
              }
              className="w-full rounded-md bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating account..." : "Create Account"}
            </button>

            {/* Terms */}
            <p className="text-center text-xs text-slate-400">
              By signing up, you agree to our{" "}
              <a href="#" className="text-emerald-600 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-emerald-600 hover:underline">
                Privacy Policy
              </a>
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

      {/* ===== EMAIL VERIFICATION MODAL ===== */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl text-center">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
              <Mail className="h-8 w-8 text-emerald-500" />
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Check Your Email
            </h2>

            {/* Message */}
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              We've sent a verification link to
            </p>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4 break-all">
              {email}
            </p>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-6 text-left">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                To activate your account:
              </p>
              <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside">
                <li>Open your email inbox</li>
                <li>Find the email from <strong>BoutiqueOS</strong></li>
                <li>Click the <strong>"Confirm your email"</strong> button</li>
                <li>Return here and sign in</li>
              </ol>
            </div>

            <p className="text-xs text-slate-400 mb-6">
              Didn't receive the email? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  // Optionally resend verification email
                }}
                className="text-emerald-600 hover:underline"
              >
                try again
              </button>
            </p>

            {/* Go to Login Button */}
            <button
              onClick={handleCloseModal}
              className="w-full rounded-md bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              I've Verified  Go to Login
            </button>
          </div>
        </div>
      )}
    </>
  );
}