"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart, Package, LayoutDashboard, Menu, X, User, Bell,
  Sun, Moon, LogOut, ChevronDown, CreditCard, Loader2, Users, Wallet, History,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useInventory } from "@/context/InventoryContext";
import { createClient } from "@/lib/supabase/client";
import { setupSyncListeners, isOnline } from "@/lib/offline";

const cashierNavItems = [
  { href: "/cashier", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cashier/pos", label: "Point of Sale", icon: ShoppingCart },
  { href: "/cashier/stock", label: "Stock Lookup", icon: Package },
  { href: "/cashier/customers", label: "Customers", icon: Users },
  { href: "/cashier/credits", label: "Credit Sales", icon: Wallet },
  { href: "/cashier/history", label: "My Sales", icon: History },
];

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { variants } = useInventory();

  const [userName, setUserName] = useState("Cashier");
  const [userEmail, setUserEmail] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [online, setOnline] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      setSessionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const user = session.user;
      setUserEmail(user.email || "");
      setUserName(user.user_metadata?.full_name || "Cashier");
      setSessionLoading(false);
    }
    getUser();
  }, [supabase, router]);

  // Offline detection
  useEffect(() => {
    setOnline(isOnline());
    setupSyncListeners(() => {
      setOnline(true);
      window.location.reload();
    });

    const handleOffline = () => setOnline(false);
    const handleOnline = () => setOnline(true);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setSigningOut(true);
    setUserMenuOpen(false);

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: session.user.id }),
        });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <>
      {signingOut && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-slate-950">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mb-4" />
          <p className="text-lg font-medium">Signing you out...</p>
        </div>
      )}

      <div className="flex h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <aside className={`fixed top-0 left-0 z-30 flex h-full w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6">
            <Link href="/cashier" className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
              <ShoppingCart className="h-6 w-6" />
              <span className="text-lg">BoutiqueOS</span>
              <span className="text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">Cashier</span>
            </Link>
            <button className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            {cashierNavItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link key={href} href={href} className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${isActive ? "border-r-2 border-emerald-500 bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
            <button className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
            <div className="hidden sm:block"><h1 className="text-sm font-medium text-slate-600 dark:text-slate-300">Cashier Dashboard</h1></div>
            <div className="flex items-center gap-3">
              {/* Offline Indicator */}
              {!online && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  Offline Mode
                </span>
              )}

              <button onClick={toggleTheme} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                {theme === "dark" ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-slate-600" />}
              </button>

              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20"><CreditCard className="h-5 w-5 text-blue-400" /></div>
                  <span className="text-sm hidden sm:inline">{userName}</span>
                  <ChevronDown className="h-4 w-4 hidden sm:block" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-white dark:bg-slate-900 shadow-xl z-50">
                    <div className="p-3 border-b"><p className="font-medium text-sm">{userName}</p><p className="text-xs text-slate-500 truncate">{userEmail}</p></div>
                    <button onClick={handleLogout} disabled={signingOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
                      {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                      {signingOut ? "Signing Out..." : "Sign Out"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </>
  );
}