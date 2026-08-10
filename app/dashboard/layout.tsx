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
  Search,
  Sun,
  Moon,
  ArrowRight,
  LogOut,
  Settings,
  ChevronDown,
  Mail,
  Shield,
  Calendar,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useInventory } from "@/context/InventoryContext";
import { createClient } from "@/lib/supabase/client";

type UserRole = "admin" | "cashier" | "storekeeper" | "accountant";

const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/pos", label: "Point of Sale", icon: ShoppingCart },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/suppliers", label: "Suppliers", icon: Truck },
  { href: "/dashboard/finance", label: "Finance", icon: Banknote },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<UserRole>("admin");
  const { theme, toggleTheme } = useTheme();
  const { variants } = useInventory();

  // User state
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("Admin User");
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [userCreatedAt, setUserCreatedAt] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Dropdown state
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Global search modal state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Fetch user data on mount
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        setUserName(
          user.user_metadata?.full_name || user.email?.split("@")[0] || "User"
        );
        setUserCreatedAt(user.created_at || "");

        // Fetch profile for role and avatar
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, avatar_url")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserRole(profile.role as UserRole);
          setRole(profile.role as UserRole);
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        }
      }
    }
    getUser();
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Logout function
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Filter variants based on search query
  const filteredVariants =
    searchQuery.trim() === ""
      ? []
      : variants.filter(
          (v) =>
            v.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.barcode.includes(searchQuery)
        );

  // Focus input when modal opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [searchOpen]);

  const handleOpenSearch = () => {
    setSearchOpen(true);
    setSearchQuery("");
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const formatUGX = (amount: number) =>
    new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      {/* ========== GLOBAL SEARCH MODAL ========== */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
            {/* Search input */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search inventory (name, SKU, barcode)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none text-sm"
              />
              <button
                onClick={handleCloseSearch}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Results list */}
            <div className="max-h-96 overflow-y-auto p-2">
              {searchQuery.trim() === "" ? (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
                  Type to search the inventory
                </p>
              ) : filteredVariants.length === 0 ? (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
                  No items found.
                </p>
              ) : (
                <ul className="space-y-1">
                  {filteredVariants.slice(0, 20).map((v) => (
                    <li key={v.id}>
                      <Link
                        href="/dashboard/inventory"
                        onClick={handleCloseSearch}
                        className="flex items-center gap-3 rounded-md p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <img
                          src={v.image || "/placeholder.jpg"}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{v.productName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {v.sku} · {v.size}/{v.color}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatUGX(v.sellingPrice)}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            Stock: {v.stock}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 hidden sm:block" />
                      </Link>
                    </li>
                  ))}
                  {filteredVariants.length > 20 && (
                    <p className="text-xs text-center text-slate-400 py-2">
                      Showing first 20 results. Refine your search.
                    </p>
                  )}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                {filteredVariants.length} item{filteredVariants.length !== 1 ? "s" : ""}
              </span>
              <Link
                href="/dashboard/inventory"
                onClick={handleCloseSearch}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Go to Inventory →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========== MAIN DASHBOARD LAYOUT ========== */}
      <div className="flex h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 z-30 flex h-full w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400"
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="text-lg">BoutiqueOS</span>
            </Link>
            <button
              className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {sidebarItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-r-2 border-emerald-500 bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Role Switcher (mock) */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-4">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Role (mock)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="admin">Admin</option>
              <option value="cashier">Cashier</option>
              <option value="storekeeper">Storekeeper</option>
              <option value="accountant">Accountant</option>
            </select>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top header */}
          <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
            <button
              className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden sm:block">
              <h1 className="text-sm font-medium text-slate-600 dark:text-slate-300">
                BoutiqueOS — Kampala Main Branch
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Global Search Button */}
              <button
                onClick={handleOpenSearch}
                className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Search inventory"
              >
                <Search className="h-5 w-5 text-slate-400" />
              </button>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-slate-600" />
                )}
              </button>

              {/* Notifications */}
              <button className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 relative">
                <Bell className="h-5 w-5 text-slate-400" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-400" />
              </button>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-emerald-400" />
                    )}
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">
                    {userName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50">
                    {/* User Info Header */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 overflow-hidden">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt="Avatar"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-6 w-6 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{userName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                            {userEmail}
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Shield className="h-3.5 w-3.5" />
                          <span>Role:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                            {userRole}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Joined:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {formatDate(userCreatedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[180px]">{userEmail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          // Navigate to settings (you can create this page later)
                          // router.push("/dashboard/settings");
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Account Settings
                      </button>

                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors mt-1"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}