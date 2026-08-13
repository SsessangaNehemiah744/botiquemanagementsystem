"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart,
  Package,
  Users,
  Truck,
  Banknote,
  LayoutDashboard,
  Menu,
  X,
  User,
  Bell,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Shield,
  Loader2,
  UserCheck,
  Activity,
  FileText,
  Search,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useInventory } from "@/context/InventoryContext";
import { useNotifications } from "@/context/NotificationContext";
import { createClient } from "@/lib/supabase/client";

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

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      setSessionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const user = session.user;
      setUserEmail(user.email || "");
      setUserName(user.user_metadata?.full_name || "Manager");
      setSessionLoading(false);
    }
    getUser();
  }, [supabase, router]);

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
    await new Promise((resolve) => setTimeout(resolve, 500));
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const filteredVariants = searchQuery.trim() === "" ? [] : variants.filter(
    (v) => v.productName.toLowerCase().includes(searchQuery.toLowerCase()) || v.barcode.includes(searchQuery)
  );

  useEffect(() => { if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 0); }, [searchOpen]);

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

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center gap-3 p-4 border-b">
              <Search className="h-5 w-5 text-slate-400" />
              <input ref={searchInputRef} type="text" placeholder="Search inventory..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="p-1 rounded hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {filteredVariants.slice(0, 20).map((v) => (
                <Link key={v.id} href="/manager/inventory" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                  <img src={v.image || "/placeholder.jpg"} alt="" className="h-10 w-10 rounded object-cover" />
                  <div className="flex-1">
                    <p className="font-medium">{v.productName}</p>
                    <p className="text-xs text-slate-500">{v.barcode}</p>
                  </div>
                  <span className="text-xs text-slate-500">Stock: {v.stock}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
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

        {/* Main */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
            <button className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
            <div className="hidden sm:block"><h1 className="text-sm font-medium text-slate-600 dark:text-slate-300">Manager Dashboard</h1></div>
            <div className="flex items-center gap-3">
              <button onClick={() => { setSearchOpen(true); setSearchQuery(""); }} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><Search className="h-5 w-5 text-slate-400" /></button>
              <button onClick={toggleTheme} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">{theme === "dark" ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-slate-600" />}</button>

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 relative">
                  <Bell className={`h-5 w-5 ${unreadCount > 0 ? "text-emerald-500 animate-pulse" : "text-slate-400"}`} />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">{unreadCount}</span>}
                </button>
                {notifOpen && (
                  <div className="fixed right-4 top-16 w-80 rounded-lg border bg-white dark:bg-slate-900 shadow-xl z-50 sm:absolute sm:right-0 sm:top-full sm:mt-2">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold text-sm">Notifications</h3>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="p-6 text-center text-sm text-slate-500">No notifications</p>
                      ) : (
                        notifications.slice(0, 20).map((notif) => (
                          <button key={notif.id} onClick={() => markAsRead(notif.id)} className="flex items-start gap-3 w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b last:border-0">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{notif.title}</p>
                              <p className="text-xs text-slate-500">{notif.message}</p>
                            </div>
                            {!notif.read && <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1"></span>}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }} className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="text-sm hidden sm:inline">{userName}</span>
                  <ChevronDown className="h-4 w-4 hidden sm:block" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-white dark:bg-slate-900 shadow-xl z-50">
                    <div className="p-3 border-b">
                      <p className="font-medium text-sm">{userName}</p>
                      <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                    </div>
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