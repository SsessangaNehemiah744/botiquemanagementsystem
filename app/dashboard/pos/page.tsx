"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  Smartphone,
  Banknote,
  X,
  ShoppingBag,
  Barcode,
  Camera,
  Loader2,
  RefreshCw,
  CheckCircle,
  Percent,
  Tag,
} from "lucide-react";
import { useInventory, type Variant, type ProductCategory } from "@/context/InventoryContext";
import { useNotifications } from "@/context/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import { queueSale, isOnline } from "@/lib/offline";

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

function generateBarcode(): string {
  return String(Date.now()).slice(-8);
}

const CATEGORIES: ProductCategory[] = [
  "Wideleg", "Straight", "Short", "Patras",
  "Boyfriend Shorts", "Jorts", "Short Dresses", "Long Dresses",
  "Short Skirts", "Medium Skirts", "Long Skirt",
  "Jean Jacket", "Leather Jacket Sleeveless", "Low waist",
];

// Color mapping for categories
const CATEGORY_COLORS: Record<string, { active: string; inactive: string; hover: string }> = {
  "All": {
    active: "bg-emerald-500 text-white border-emerald-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
  },
  "Wideleg": {
    active: "bg-blue-500 text-white border-blue-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
  },
  "Straight": {
    active: "bg-purple-500 text-white border-purple-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400"
  },
  "Short": {
    active: "bg-orange-500 text-white border-orange-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400"
  },
  "Patras": {
    active: "bg-pink-500 text-white border-pink-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:text-pink-600 dark:hover:text-pink-400"
  },
  "Boyfriend Shorts": {
    active: "bg-teal-500 text-white border-teal-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-teal-50 dark:hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400"
  },
  "Jorts": {
    active: "bg-indigo-500 text-white border-indigo-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
  },
  "Short Dresses": {
    active: "bg-rose-500 text-white border-rose-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
  },
  "Long Dresses": {
    active: "bg-fuchsia-500 text-white border-fuchsia-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 hover:text-fuchsia-600 dark:hover:text-fuchsia-400"
  },
  "Short Skirts": {
    active: "bg-cyan-500 text-white border-cyan-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-cyan-50 dark:hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400"
  },
  "Medium Skirts": {
    active: "bg-lime-500 text-white border-lime-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-lime-50 dark:hover:bg-lime-500/10 hover:text-lime-600 dark:hover:text-lime-400"
  },
  "Long Skirt": {
    active: "bg-amber-500 text-white border-amber-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400"
  },
  "Jean Jacket": {
    active: "bg-sky-500 text-white border-sky-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400"
  },
  "Leather Jacket Sleeveless": {
    active: "bg-red-500 text-white border-red-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
  },
  "Low waist": {
    active: "bg-violet-500 text-white border-violet-500",
    inactive: "text-slate-600 dark:text-slate-400 border-transparent",
    hover: "hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400"
  },
};

interface ProductGroup {
  name: string;
  category: ProductCategory;
  image: string;
  variants: Variant[];
}

export default function POSPage() {
  const router = useRouter();
  const { variants, loading, addVariant, refreshInventory } = useInventory();
  const { addNotification } = useNotifications();
  const supabase = createClient();

  const products = useMemo(() => {
    const map = new Map<string, ProductGroup>();
    variants.forEach((v) => {
      const key = v.productName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: v.productName, category: v.category, image: v.image, variants: [] });
      }
      map.get(key)!.variants.push(v);
    });
    return Array.from(map.values());
  }, [variants]);

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<{ variant: Variant; quantity: number }[]>([]);
  const [scannedVariant, setScannedVariant] = useState<Variant | null>(null);
  const [scannerInput, setScannerInput] = useState("");
  const scannerRef = useRef<HTMLInputElement>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mobile_money" | "card">("cash");
  const [amountTendered, setAmountTendered] = useState<number>(0);
  const [cashChange, setCashChange] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [mobileMoneyRef, setMobileMoneyRef] = useState("");
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState<"mtn" | "airtel">("mtn");
  const [refreshing, setRefreshing] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    productName: "",
    category: CATEGORIES[0],
    size: "",
    color: "",
    design: "",
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    lowStockThreshold: 5,
    barcode: "",
  });

  useEffect(() => {
    refreshInventory();
    scannerRef.current?.focus();
  }, []);

  const refocusScanner = () => setTimeout(() => scannerRef.current?.focus(), 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshInventory();
    setRefreshing(false);
  };

  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = scannerInput.trim();
      if (!code) return;
      const found = variants.find((v) => v.barcode === code);
      if (found) {
        setScannedVariant(found);
        addToCart(found);
        addNotification({
          type: "sale",
          title: "Item Scanned",
          message: `${found.productName} (${found.color}/${found.size}) added to cart`,
        });
      } else {
        setScannedVariant(null);
        alert(`No product found with barcode: ${code}`);
      }
      setScannerInput("");
      refocusScanner();
    }
  };

  const addToCart = (variant: Variant) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.variant.id === variant.id);
      if (existing) {
        if (existing.quantity >= variant.stock) {
          alert("Not enough stock!");
          return prev;
        }
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (variant.stock <= 0) {
        alert("Out of stock!");
        return prev;
      }
      return [...prev, { variant, quantity: 1 }];
    });
    refocusScanner();
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variant.id !== variantId));
    refocusScanner();
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variant.id !== variantId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.variant.stock) {
            alert(`Only ${item.variant.stock} in stock!`);
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as { variant: Variant; quantity: number }[]
    );
    refocusScanner();
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.category === activeCategory;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === "" ||
        product.name.toLowerCase().includes(query) ||
        product.variants.some((v) => v.barcode?.includes(query) || v.color.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const subtotal = cart.reduce((sum, item) => sum + item.variant.sellingPrice * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate discount amount
  const discountAmount = useMemo(() => {
    if (discountType === "percentage") {
      return (subtotal * discountValue) / 100;
    } else {
      return discountValue;
    }
  }, [subtotal, discountType, discountValue]);
  
  const totalAfterDiscount = subtotal - discountAmount;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
    setAmountTendered(0);
    setCashChange(null);
    setMobileMoneyRef("");
    setMobileMoneyProvider("mtn");
  };

  const completePayment = async () => {
    if (paymentMethod === "cash" && amountTendered < totalAfterDiscount) {
      alert("Amount tendered is less than total!");
      return;
    }
    if (paymentMethod === "mobile_money" && !mobileMoneyRef.trim()) {
      alert("Please enter the mobile money transaction reference");
      return;
    }

    setProcessing(true);

    const saleData: {
      items: {
        variant_id: string;
        quantity: number;
        unit_price: number;
        cost_price: number;
      }[];
      total_amount: number;
      discount_amount: number;
      payment_method: "cash" | "mobile_money" | "card";
      amount_tendered: number | null;
      change_amount: number | null;
      user_id: string | null;
      notes: string | null;
    } = {
      items: cart.map((item) => ({
        variant_id: item.variant.id,
        quantity: item.quantity,
        unit_price: item.variant.sellingPrice,
        cost_price: item.variant.costPrice,
      })),
      total_amount: totalAfterDiscount,
      discount_amount: discountAmount,
      payment_method: paymentMethod,
      amount_tendered: paymentMethod === "cash" ? amountTendered : null,
      change_amount: paymentMethod === "cash" ? amountTendered - totalAfterDiscount : null,
      user_id: null,
      notes:
        paymentMethod === "mobile_money"
          ? `Mobile Money (${mobileMoneyProvider.toUpperCase()}): ${mobileMoneyRef}`
          : paymentMethod === "card"
          ? "Card Payment"
          : null,
    };

    try {
      // OFFLINE: Queue the sale locally
      if (!isOnline()) {
        await queueSale(saleData);
        if (paymentMethod === "cash") setCashChange(amountTendered - totalAfterDiscount);
        setShowPaymentModal(false);
        setShowReceiptModal(true);
        addNotification({
          type: "sale",
          title: "Sale Saved Offline",
          message: "Will sync when internet returns",
        });
        setProcessing(false);
        return;
      }

      // ONLINE: Get user and process
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      saleData.user_id = user.id;

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      });

      const result = await response.json();

      if (!response.ok) {
        // API failed - queue for later
        await queueSale(saleData);
        addNotification({
          type: "sale",
          title: "Sale Queued",
          message: "Will retry when online",
        });
      }

      if (paymentMethod === "cash") setCashChange(amountTendered - totalAfterDiscount);
      setShowPaymentModal(false);
      setShowReceiptModal(true);

      addNotification({
        type: "sale",
        title: "Sale Completed ✅",
        message: `${formatUGX(totalAfterDiscount)} via ${paymentMethod === "cash" ? "Cash" : paymentMethod === "mobile_money" ? "Mobile Money" : "Card"}`,
      });
    } catch (error: unknown) {
      // Any error - queue for later
      await queueSale(saleData);
      if (paymentMethod === "cash") setCashChange(amountTendered - totalAfterDiscount);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      addNotification({
        type: "sale",
        title: "Sale Saved Offline",
        message: "Will sync when internet returns",
      });
    } finally {
      setProcessing(false);
    }
  };

  const receiptData = {
    date: new Date().toLocaleString(),
    items: cart,
    subtotal,
    discountAmount,
    total: totalAfterDiscount,
    paymentMethod,
    amountTendered: paymentMethod === "cash" ? amountTendered : undefined,
    change: paymentMethod === "cash" ? cashChange : undefined,
    mobileMoneyRef: paymentMethod === "mobile_money" ? mobileMoneyRef : undefined,
    mobileMoneyProvider: paymentMethod === "mobile_money" ? mobileMoneyProvider : undefined,
  };

  const printReceipt = () => {
    window.print();
    setCart([]);
    setShowReceiptModal(false);
    setScannedVariant(null);
    setDiscountValue(0);
    refocusScanner();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result as string);
      setNewProductForm((prev) => ({ ...prev, barcode: generateBarcode() }));
      setShowCaptureModal(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveNewProduct = async () => {
    if (!newProductForm.productName || !newProductForm.size || !newProductForm.color || !capturedImage) {
      alert("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      await addVariant({
        productName: newProductForm.productName,
        category: newProductForm.category,
        image: capturedImage,
        barcode: newProductForm.barcode || generateBarcode(),
        size: newProductForm.size,
        color: newProductForm.color,
        design: newProductForm.design || "",
        costPrice: newProductForm.costPrice,
        sellingPrice: newProductForm.sellingPrice,
        stock: newProductForm.stock,
        lowStockThreshold: newProductForm.lowStockThreshold,
      });
      setShowCaptureModal(false);
      setCapturedImage(null);
      setNewProductForm({
        productName: "", category: CATEGORIES[0], size: "", color: "", design: "",
        costPrice: 0, sellingPrice: 0, stock: 0, lowStockThreshold: 5, barcode: "",
      });
      refocusScanner();
      addNotification({ type: "product", title: "New Product Added", message: `${newProductForm.productName} added to inventory` });
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const categoryTabs = ["All", ...CATEGORIES];

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-3">
      {/* LEFT */}
      <div className="col-span-1 flex flex-col space-y-6 lg:col-span-2">
        {/* Scanner + Camera + Refresh */}
        <div className="flex items-stretch gap-3">
          <div className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col">
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              <Barcode className="h-4 w-4" /> Barcode Scanner
            </label>
            <input
              ref={scannerRef}
              type="text"
              value={scannerInput}
              onChange={(e) => setScannerInput(e.target.value)}
              onKeyDown={handleScannerKeyDown}
              placeholder="Scan or type barcode..."
              className="w-full flex-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              autoComplete="off"
            />
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="flex flex-col items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 h-full w-16">
            <RefreshCw className={`h-5 w-5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span className="text-xs mt-1">Refresh</span>
          </button>
          <div className="flex-shrink-0">
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 h-full w-24">
              <Camera className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs mt-1">Scan Item</span>
            </button>
          </div>
        </div>

        {/* Last Scanned */}
        {scannedVariant && (
          <div className="overflow-hidden rounded-lg border border-emerald-500/30 bg-white dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row">
              <img src={scannedVariant.image || "/placeholder.jpg"} alt="" className="h-48 w-full object-cover sm:w-48" />
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">✅ Last Scanned</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{scannedVariant.productName}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{scannedVariant.color} / {scannedVariant.size}</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(scannedVariant.sellingPrice)}</p>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <span className="text-sm text-slate-500">Barcode: {scannedVariant.barcode}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    scannedVariant.stock > 5 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" :
                    scannedVariant.stock > 0 ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400" :
                    "bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                  }`}>
                    {scannedVariant.stock > 0 ? `${scannedVariant.stock} in stock` : "Out of stock"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Tabs & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
            {categoryTabs.map((cat) => {
              const colorScheme = CATEGORY_COLORS[cat] || CATEGORY_COLORS["All"];
              return (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(cat)} 
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium border transition-all ${
                    activeCategory === cat 
                      ? colorScheme.active 
                      : `${colorScheme.inactive} ${colorScheme.hover}`
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid flex-1 gap-4 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-2" /><p className="text-sm">Loading...</p></div>
          ) : filteredProducts.length === 0 ? (
            <p className="col-span-full py-8 text-center text-slate-500">{variants.length === 0 ? "No products yet." : "No products match."}</p>
          ) : (
            filteredProducts.map((product) => (
              <div key={product.name} className="flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow">
                <img src={product.image || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400"} alt={product.name} className="h-40 w-full object-cover" />
                <div className="flex flex-1 flex-col p-3">
                  <h4 className="font-medium text-slate-900 dark:text-white">{product.name}</h4>
                  <p className="text-xs text-slate-500">{product.category}</p>
                  <div className="mt-2 space-y-1">
                    {product.variants.map((v) => (
                      <button key={v.id} onClick={() => addToCart(v)} disabled={v.stock <= 0} className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors ${
                        v.stock > 0 ? "hover:bg-emerald-50 dark:hover:bg-emerald-500/10" : "opacity-50"
                      }`}>
                        <span className="text-slate-700 dark:text-slate-300">{v.color} / {v.size}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(v.sellingPrice)}</span>
                        <span className="text-slate-400">({v.stock})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="flex flex-col rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="border-b border-slate-200 dark:border-slate-800 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <ShoppingBag className="h-5 w-5 text-emerald-400" />
            Current Sale ({totalItems})
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-slate-400">
              <ShoppingBag className="h-12 w-12" />
              <p className="mt-2">Cart is empty</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {cart.map(({ variant, quantity }) => (
                <li key={variant.id} className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <img src={variant.image || "/placeholder.jpg"} alt="" className="h-12 w-12 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-slate-900 dark:text-white">{variant.productName}</p>
                    <p className="text-xs text-slate-500">{variant.color} / {variant.size}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button onClick={() => updateQuantity(variant.id, -1)} className="rounded p-0.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><Minus className="h-3 w-3" /></button>
                      <span className="text-sm font-bold">{quantity}</span>
                      <button onClick={() => updateQuantity(variant.id, 1)} className="rounded p-0.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(variant.sellingPrice * quantity)}</p>
                    <button onClick={() => removeFromCart(variant.id)} className="mt-1 text-red-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-3">
          {/* Discount Section */}
          <div className="space-y-2">
            {discountAmount > 0 ? (
              <div className="flex items-center justify-between rounded-md bg-emerald-50 dark:bg-emerald-500/10 p-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {discountType === "percentage" ? `${discountValue}%` : formatUGX(discountValue)} Discount Applied
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    -{formatUGX(discountAmount)}
                  </span>
                  <button 
                    onClick={() => setShowDiscountModal(true)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 underline"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => {
                      setDiscountValue(0);
                      setDiscountType("percentage");
                    }}
                    className="text-xs text-red-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowDiscountModal(true)} 
                disabled={cart.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Tag className="h-4 w-4" />
                Apply a Discount
              </button>
            )}
          </div>

          {/* Price Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
              <span className="font-medium text-slate-900 dark:text-white">{formatUGX(subtotal)}</span>
            </div>
            
            {discountAmount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Discount</span>
                  <span className="font-medium text-red-600 dark:text-red-400">-{formatUGX(discountAmount)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(totalAfterDiscount)}</span>
                </div>
              </>
            )}
          </div>

          {/* Checkout Button */}
          <button 
            onClick={handleCheckout} 
            disabled={cart.length === 0} 
            className="w-full rounded-md bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            Process Payment ({formatUGX(totalAfterDiscount)})
          </button>
        </div>
      </div>

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Apply Discount</h3>
              <button onClick={() => setShowDiscountModal(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-400">Discount Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setDiscountType("percentage")} 
                  className={`flex items-center justify-center gap-2 rounded-md border p-2 text-sm font-medium transition-colors ${
                    discountType === "percentage" 
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                      : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Percent className="h-4 w-4" /> Percentage
                </button>
                <button 
                  onClick={() => setDiscountType("fixed")} 
                  className={`flex items-center justify-center gap-2 rounded-md border p-2 text-sm font-medium transition-colors ${
                    discountType === "fixed" 
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                      : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Banknote className="h-4 w-4" /> Fixed Amount
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">
                {discountType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (UGX)"}
              </label>
              <input 
                type="number" 
                value={discountValue || ""} 
                onChange={(e) => setDiscountValue(Number(e.target.value))} 
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" 
                placeholder={discountType === "percentage" ? "e.g., 10" : "e.g., 5000"}
              />
              {discountType === "percentage" && discountValue > 100 && (
                <p className="mt-1 text-xs text-red-500">Percentage cannot exceed 100%</p>
              )}
            </div>

            <div className="mb-4 p-3 rounded-md bg-slate-50 dark:bg-slate-800">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatUGX(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-600 dark:text-slate-400">Discount</span>
                <span className="font-bold text-red-600 dark:text-red-400">-{formatUGX(discountAmount)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1 pt-1 border-t">
                <span className="font-medium text-slate-900 dark:text-white">Total</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(totalAfterDiscount)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setDiscountValue(0);
                  setShowDiscountModal(false);
                }} 
                className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Remove
              </button>
              <button 
                onClick={() => setShowDiscountModal(false)} 
                className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-4 flex justify-between text-lg">
              <span className="text-slate-600 dark:text-slate-400">Total:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(totalAfterDiscount)}</span>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                { id: "cash", label: "Cash", icon: Banknote },
                { id: "mobile_money", label: "Mobile", icon: Smartphone },
                { id: "card", label: "Card", icon: CreditCard },
              ].map((m) => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id as typeof paymentMethod)} className={`flex flex-col items-center rounded-md border p-3 transition-colors ${
                  paymentMethod === m.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
                }`}>
                  <m.icon className="mb-1 h-5 w-5" />
                  <span className="text-xs">{m.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === "cash" && (
              <div className="mb-4">
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Amount Tendered</label>
                <input type="number" value={amountTendered || ""} onChange={(e) => setAmountTendered(Number(e.target.value))} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
                {amountTendered > 0 && amountTendered >= totalAfterDiscount && (
                  <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">Change: {formatUGX(amountTendered - totalAfterDiscount)}</p>
                )}
              </div>
            )}

            {paymentMethod === "mobile_money" && (
              <div className="mb-4 space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setMobileMoneyProvider("mtn")} className={`rounded-md border p-2 text-sm font-medium ${mobileMoneyProvider === "mtn" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" : "border-slate-300 dark:border-slate-600 text-slate-600"}`}>MTN</button>
                    <button onClick={() => setMobileMoneyProvider("airtel")} className={`rounded-md border p-2 text-sm font-medium ${mobileMoneyProvider === "airtel" ? "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400" : "border-slate-300 dark:border-slate-600 text-slate-600"}`}>Airtel</button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">Transaction Reference</label>
                  <input type="text" value={mobileMoneyRef} onChange={(e) => setMobileMoneyRef(e.target.value)} placeholder="e.g., TXN123456789" className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none" />
                </div>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="mb-4 p-3 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-sm">
                Swipe or insert card on the terminal.
              </div>
            )}

            <button onClick={completePayment} disabled={processing || (paymentMethod === "cash" && amountTendered < totalAfterDiscount) || (paymentMethod === "mobile_money" && !mobileMoneyRef.trim())} className="w-full rounded-md bg-emerald-600 py-2 font-bold text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              {processing ? "Processing..." : "Complete Sale"}
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white text-slate-900">
            <div id="receipt" className="p-6 text-xs">
              <div className="text-center">
                <CheckCircle className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                <h2 className="text-lg font-bold">BoutiqueOS</h2>
                <p>Denim House</p>
                <p>{new Date().toLocaleDateString()}</p>
                <p>{new Date().toLocaleTimeString()}</p>
              </div>
              <hr className="my-2 border-dashed" />
              <table className="w-full">
                <thead><tr className="border-b"><th className="text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Price</th></tr></thead>
                <tbody>
                  {receiptData.items.map(({ variant, quantity }) => (
                    <tr key={variant.id}>
                      <td className="py-1">{variant.productName} ({variant.color}/{variant.size})</td>
                      <td className="text-right">{quantity}</td>
                      <td className="text-right">{formatUGX(variant.sellingPrice * quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <hr className="my-2 border-dashed" />
              <div className="flex justify-between"><span>Subtotal:</span><span>{formatUGX(receiptData.subtotal)}</span></div>
              {receiptData.discountAmount > 0 && (
                <div className="flex justify-between text-red-600"><span>Discount:</span><span>-{formatUGX(receiptData.discountAmount)}</span></div>
              )}
              <div className="flex justify-between font-bold mt-1"><span>TOTAL:</span><span>{formatUGX(receiptData.total)}</span></div>
              <div className="mt-1 text-center">
                Payment: {receiptData.paymentMethod === "cash" ? "Cash" : receiptData.paymentMethod === "mobile_money" ? `Mobile Money (${receiptData.mobileMoneyProvider?.toUpperCase()})` : "Card"}
                {receiptData.mobileMoneyRef && <p>Ref: {receiptData.mobileMoneyRef}</p>}
                {receiptData.amountTendered != null && <p>Tendered: {formatUGX(receiptData.amountTendered)}</p>}
                {receiptData.change != null && <p>Change: {formatUGX(receiptData.change)}</p>}
              </div>
              <hr className="my-2 border-dashed" />
              <p className="text-center">Thank you for shopping!</p>
            </div>
            <div className="flex gap-2 border-t border-slate-200 p-4">
              <button onClick={() => { setShowReceiptModal(false); setCart([]); setScannedVariant(null); setDiscountValue(0); refocusScanner(); }} className="flex-1 rounded-md border border-slate-300 py-2 text-sm">Close & New Sale</button>
              <button onClick={printReceipt} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-slate-900 py-2 text-sm text-white"><Printer className="h-4 w-4" /> Print</button>
            </div>
          </div>
        </div>
      )}

      {/* Capture Modal */}
      {showCaptureModal && capturedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Captured Item</h3>
              <button onClick={() => setShowCaptureModal(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-4">
              <img src={capturedImage} alt="Captured" className="w-full h-48 object-cover rounded-lg border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input type="text" value={newProductForm.productName} onChange={(e) => setNewProductForm({ ...newProductForm, productName: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={newProductForm.category} onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value as ProductCategory })} className="w-full rounded-md border px-3 py-2 text-sm">
                  {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Design</label>
                <input type="text" value={newProductForm.design} onChange={(e) => setNewProductForm({ ...newProductForm, design: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Barcode (auto)</label>
                <input type="text" value={newProductForm.barcode} onChange={(e) => setNewProductForm({ ...newProductForm, barcode: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Size *</label>
                <input type="text" value={newProductForm.size} onChange={(e) => setNewProductForm({ ...newProductForm, size: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Colour *</label>
                <input type="text" value={newProductForm.color} onChange={(e) => setNewProductForm({ ...newProductForm, color: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Selling Price *</label>
                <input type="number" value={newProductForm.sellingPrice || ""} onChange={(e) => setNewProductForm({ ...newProductForm, sellingPrice: Number(e.target.value) })} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock Qty</label>
                <input type="number" value={newProductForm.stock || ""} onChange={(e) => setNewProductForm({ ...newProductForm, stock: Number(e.target.value) })} className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setShowCaptureModal(false)} className="flex-1 rounded-md border py-2 text-sm">Cancel</button>
              <button onClick={handleSaveNewProduct} disabled={saving} className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Add to Inventory"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}