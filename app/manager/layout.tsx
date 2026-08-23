"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart, Package, Users, Truck, Banknote, LayoutDashboard,
  Menu, X, User, Bell, Sun, Moon, LogOut, ChevronDown, Shield,
  Loader2, UserCheck, Activity, FileText, Search, LogIn, ShoppingBag, ChevronRight,
  Wifi, WifiOff,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useInventory } from "@/context/InventoryContext";
import { useNotifications } from "@/context/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import { setupSyncListeners, isOnline, getQueuedSalesCount, getCachedSession } from "@/lib/offline";

const managerNavItems = [
  { href: "/manager", label: "Dashboard", icon: LayoutDashboard },
  { href: "/manager/pos", label: "Point of Sale", icon: ShoppingCart },
  { href: "/manager/inventory", label: "Inventory", icon: Package },
  { href: "/manager/customers", label: "Customers", icon: Users },
  { href: "/manager/suppliers", label: "Suppliers", icon: Truck },
  { href: "/manager/finance", label: "Finance", icon: Banknote },
  { href: "/manager/users", label: "User Management", icon: UserCheck },
  { href: "/manager/activity", label: "Active Users", icon: Activity },
  { href: "/manager/logs", label: "System Logs", icon: FileText },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { variants } = useInventory();
  const { notifications, unreadCount, markAllRead, markAsRead } = useNotifications();

  const [userName, setUserName] = useState("Manager");
  const [userEmail, setUserEmail] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const supabase = createClient();

  // Online/Offline state
  const [online, setOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    async function getUser() {
      setSessionLoading(true);

      // FIRST: Try cached session (works both online and offline)
      const cached = await getCachedSession();

      // SECOND: Try Supabase session (online only)
      let supabaseSession = null;
      try {
        const { data } = await supabase.auth.getSession();
        supabaseSession = data.session;
      } catch (error) {
        console.log("Supabase unreachable, using cached session");
      }

      // If we have either session, allow access
      if (cached?.user || supabaseSession?.user) {
        const user = supabaseSession?.user || cached?.user;
        const profile = cached?.profile || null;
        setUserEmail(user.email || "");
        setUserName(
          user.user_metadata?.full_name ||
          profile?.full_name ||
          "Manager"
        );
        setSessionLoading(false);
        return;
      }

      // No session at all - redirect to login
      router.push("/login");
    }
    getUser();
    loadExtraData();
  }, [supabase, router]);

  // Online/Offline detection
  useEffect(() => {
    setOnline(isOnline());
    setupSyncListeners(async () => {
      setOnline(true);
      setPendingSync(0);
      window.location.reload();
    });

    const handleOffline = () => setOnline(false);
    const handleOnline = async () => {
      setOnline(true);
      const count = await getQueuedSalesCount();
      setPendingSync(count);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const loadExtraData = async () => {
    if (!isOnline()) return;
    try {
      const response = await fetch("/api/manager/overview");
      const data = await response.json();
      if (response.ok) {
        setPendingUsers(data.pendingUsers || []);
        setRecentLogs(data.recentLogs || []);
        setAllCustomers(data.customers || []);
        setAllProducts(data.products || []);
        setAllProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error("Extra data error:", error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setSigningOut(true);
    setUserMenuOpen(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: session.user.id }),
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => { if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 0); }, [searchOpen]);

  const searchResults = searchQuery.trim() === "" ? [] : [
    ...allProducts
      .filter((p) =>
        (p.products?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode || "").includes(searchQuery) ||
        (p.color || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.size || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((p) => ({ type: "Product", id: p.id, name: p.products?.name || "Product", subtitle: `${p.size} / ${p.color} · ${p.barcode || "No barcode"}`, link: "/manager/inventory" })),
    ...allCustomers
      .filter((c) =>
        (c.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone || "").includes(searchQuery) ||
        (c.email || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((c) => ({ type: "Customer", id: c.id, name: c.full_name, subtitle: c.phone || c.email || "Customer", link: "/manager/customers" })),
    ...allProfiles
      .filter((p) =>
        (p.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.role || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((p) => ({ type: "User", id: p.id, name: p.full_name, subtitle: p.role, link: "/manager/users" })),
  ].slice(0, 15);

  const getLogIcon = (action: string) => {
    if (action === "LOGIN_SUCCESS") return <LogIn className="h-4 w-4 text-emerald-500" />;
    if (action === "LOGOUT") return <LogOut className="h-4 w-4 text-slate-400" />;
    if (action === "SALE_PROCESSED") return <ShoppingBag className="h-4 w-4 text-blue-500" />;
    if (action === "INVENTORY_ADDED" || action === "INVENTORY_UPDATED") return <Package className="h-4 w-4 text-purple-500" />;
    return <Bell className="h-4 w-4 text-yellow-500" />;
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

      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products, customers, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none text-sm"
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {searchQuery.trim() === "" ? (
                <p className="text-center text-sm text-slate-500 py-8">Type to search across all data...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">No results found.</p>
              ) : (
                searchResults.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                      router.push(result.link);
                    }}
                    className="flex items-center gap-3 w-full text-left p-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${
                      result.type === "Product" ? "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" :
                      result.type === "Customer" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                      "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    }`}>
                      {result.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{result.name}</p>
                      <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <aside className={`fixed top-0 left-0 z-30 flex h-full w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6">
            <Link href="/manager" className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
              <ShoppingCart className="h-6 w-6" />
              <span className="text-lg">BoutiqueOS</span>
              <span className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Manager</span>
            </Link>
            <button className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            {managerNavItems.map(({ href, label, icon: Icon }) => {
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
            <div className="hidden sm:block"><h1 className="text-sm font-medium text-slate-600 dark:text-slate-300">Manager Dashboard</h1></div>
            <div className="flex items-center gap-3">
              {/* Online/Offline Indicator */}
              {online ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Wifi className="h-3.5 w-3.5" />
                  Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400">
                  <WifiOff className="h-3.5 w-3.5" />
                  Offline
                  {pendingSync > 0 && ` · ${pendingSync} pending`}
                </span>
              )}

              <button onClick={() => { setSearchOpen(true); setSearchQuery(""); }} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Search className="h-5 w-5 text-slate-400" />
              </button>

              <button onClick={toggleTheme} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                {theme === "dark" ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-slate-600" />}
              </button>

              <div className="relative" ref={notifRef}>
                <button onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 relative">
                  <Bell className={`h-5 w-5 ${pendingUsers.length > 0 || recentLogs.length > 0 ? "text-emerald-500 animate-pulse" : "text-slate-400"}`} />
                  {pendingUsers.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-bold text-white">
                      {pendingUsers.length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="fixed right-4 top-16 w-96 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50 sm:absolute sm:right-0 sm:top-full sm:mt-2 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</h3>
                    </div>

                    {pendingUsers.length > 0 && (
                      <Link href="/manager/users" onClick={() => setNotifOpen(false)} className="block p-3 border-b border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100 dark:hover:bg-yellow-500/20">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-yellow-600" />
                          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                            {pendingUsers.length} user(s) awaiting activation
                          </p>
                        </div>
                      </Link>
                    )}

                    {recentLogs.length === 0 ? (
                      <p className="p-6 text-center text-sm text-slate-500">No recent activity</p>
                    ) : (
                      recentLogs.slice(0, 10).map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div className="mt-0.5 flex-shrink-0">{getLogIcon(log.action)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{log.user_name || "System"}</p>
                            <p className="text-xs text-slate-500">{log.action}</p>
                            <p className="text-xs text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="relative" ref={userMenuRef}>
                <button onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }} className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20"><Shield className="h-5 w-5 text-emerald-400" /></div>
                  <span className="text-sm hidden sm:inline">{userName}</span>
                  <ChevronDown className="h-4 w-4 hidden sm:block" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-white dark:bg-slate-900 shadow-xl z-50">
                    <div className="p-3 border-b"><p className="font-medium text-sm">{userName}</p><p className="text-xs text-slate-500 truncate">{userEmail}</p></div>
                    <button onClick={handleLogout} disabled={signingOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50">
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