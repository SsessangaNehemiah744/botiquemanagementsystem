"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
} from "lucide-react";

// ========== MOCK DATA ==========
const mockProducts = [
  {
    id: "1",
    name: "Silk Evening Gown",
    category: "Dresses",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
    variants: [
      {
        id: "v1",
        sku: "DRS-001-BLK-S",
        barcode: "200001",
        size: "S",
        color: "Black",
        selling_price: 250000,
        stock_quantity: 3,
        image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
      },
      {
        id: "v2",
        sku: "DRS-001-BLK-M",
        barcode: "200002",
        size: "M",
        color: "Black",
        selling_price: 250000,
        stock_quantity: 5,
        image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
      },
    ],
  },
  {
    id: "2",
    name: "Trench Coat",
    category: "Outerwear",
    image: "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=400",
    variants: [
      {
        id: "v3",
        sku: "OUT-001-KHK-M",
        barcode: "300001",
        size: "M",
        color: "Khaki",
        selling_price: 350000,
        stock_quantity: 2,
        image: "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=400",
      },
    ],
  },
  {
    id: "3",
    name: "Pleated Skirt",
    category: "Skirts",
    image: "https://images.unsplash.com/photo-1583496661160-fb5886a0o6f0?w=400",
    variants: [
      {
        id: "v4",
        sku: "SKT-001-WHT-S",
        barcode: "400001",
        size: "S",
        color: "White",
        selling_price: 120000,
        stock_quantity: 8,
        image: "https://images.unsplash.com/photo-1583496661160-fb5886a0o6f0?w=400",
      },
    ],
  },
  {
    id: "4",
    name: "Leather Handbag",
    category: "Accessories",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400",
    variants: [
      {
        id: "v5",
        sku: "ACC-001-BRN-OS",
        barcode: "500001",
        size: "One Size",
        color: "Brown",
        selling_price: 180000,
        stock_quantity: 10,
        image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400",
      },
    ],
  },
];

type Variant = (typeof mockProducts)[0]["variants"][0];
type CartItem = { variant: Variant; quantity: number };

function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function POSPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scannedVariant, setScannedVariant] = useState<Variant | null>(null);
  const [scannerInput, setScannerInput] = useState("");
  const scannerRef = useRef<HTMLInputElement>(null); // <-- THIS IS THE FIX
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mobile_money" | "card">("cash");
  const [amountTendered, setAmountTendered] = useState<number>(0);
  const [cashChange, setCashChange] = useState<number | null>(null);

  // Auto-focus scanner input on mount
  useEffect(() => {
    scannerRef.current?.focus();
  }, []);

  // Keep focus on scanner after interactions
  const refocusScanner = () => setTimeout(() => scannerRef.current?.focus(), 0);

  // Scanner: capture barcode on Enter
  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = scannerInput.trim();
      if (!code) return;
      const found = mockProducts
        .flatMap((p) => p.variants)
        .find((v) => v.barcode === code);
      if (found) {
        setScannedVariant(found);
        addToCart(found);
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
        if (existing.quantity >= variant.stock_quantity) {
          alert("Not enough stock!");
          return prev;
        }
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (variant.stock_quantity <= 0) {
        alert("Out of stock!");
        return prev;
      }
      return [...prev, { variant, quantity: 1 }];
    });
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
          if (newQty > item.variant.stock_quantity) {
            alert(`Only ${item.variant.stock_quantity} in stock!`);
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
    refocusScanner();
  };

  const filteredProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      const matchesCategory =
        activeCategory === "All" || product.category === activeCategory;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === "" ||
        product.name.toLowerCase().includes(query) ||
        product.variants.some(
          (v) =>
            v.sku.toLowerCase().includes(query) ||
            v.barcode?.includes(query)
        );
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.variant.selling_price * item.quantity,
    0
  );
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
    setAmountTendered(0);
    setCashChange(null);
  };

  const completePayment = () => {
    if (paymentMethod === "cash") {
      if (amountTendered < subtotal) {
        alert("Amount tendered is less than total!");
        return;
      }
      setCashChange(amountTendered - subtotal);
    }
    setShowPaymentModal(false);
    setShowReceiptModal(true);
  };

  const receiptData = {
    date: new Date().toLocaleString(),
    items: cart,
    subtotal,
    paymentMethod,
    amountTendered: paymentMethod === "cash" ? amountTendered : undefined,
    change: paymentMethod === "cash" ? cashChange : undefined,
  };

  const printReceipt = () => {
    window.print();
    setCart([]);
    setShowReceiptModal(false);
    setScannedVariant(null);
    refocusScanner();
  };

  const categories = ["All", "Dresses", "Outerwear", "Skirts", "Accessories"];

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-3">
      {/* LEFT: Product browser & scanner */}
      <div className="col-span-1 flex flex-col space-y-6 lg:col-span-2">
        {/* Barcode Scanner Input */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            <Barcode className="h-4 w-4" /> Barcode Scanner
          </label>
          <input
            ref={scannerRef}
            type="text"
            value={scannerInput}
            onChange={(e) => setScannerInput(e.target.value)}
            onKeyDown={handleScannerKeyDown}
            placeholder="Scan or type barcode and press Enter..."
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            autoComplete="off"
          />
        </div>

        {/* Last Scanned Spotlight */}
        {scannedVariant && (
          <div className="overflow-hidden rounded-lg border border-emerald-500/30 bg-white dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row">
              <img
                src={scannedVariant.image || "/placeholder.jpg"}
                alt="Scanned item"
                className="h-48 w-full object-cover sm:w-48"
              />
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Last Scanned</p>
                  <h3 className="mt-1 text-lg font-bold">
                    {mockProducts.find((p) =>
                      p.variants.some((v) => v.id === scannedVariant.id)
                    )?.name ?? "Unknown"}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {scannedVariant.color} / {scannedVariant.size}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatUGX(scannedVariant.selling_price)}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    SKU: {scannedVariant.sku}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      scannedVariant.stock_quantity > 5
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : scannedVariant.stock_quantity > 0
                        ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400"
                        : "bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                    }`}
                  >
                    {scannedVariant.stock_quantity > 0
                      ? `${scannedVariant.stock_quantity} in stock`
                      : "Out of stock"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Tabs & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-emerald-500 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search dresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid flex-1 gap-4 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <img
                src={product.image}
                alt={product.name}
                className="h-40 w-full object-cover"
              />
              <div className="flex flex-1 flex-col p-3">
                <h4 className="font-medium">{product.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{product.category}</p>
                <div className="mt-2 space-y-1">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => addToCart(v)}
                      disabled={v.stock_quantity <= 0}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors ${
                        v.stock_quantity > 0
                          ? "hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                          : "opacity-50"
                      }`}
                    >
                      <span>
                        {v.color} / {v.size}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatUGX(v.selling_price)}
                      </span>
                      <span className="text-slate-400">
                        ({v.stock_quantity} left)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <p className="col-span-full py-8 text-center text-slate-500 dark:text-slate-500">
              No products found.
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="flex flex-col rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="border-b border-slate-200 dark:border-slate-800 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
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
                <li
                  key={variant.id}
                  className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <img
                    src={variant.image || "/placeholder.jpg"}
                    alt=""
                    className="h-12 w-12 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {variant.color} / {variant.size}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{variant.sku}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(variant.id, -1)}
                        className="rounded p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-bold">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(variant.id, 1)}
                        className="rounded p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatUGX(variant.selling_price * quantity)}
                    </p>
                    <button
                      onClick={() => removeFromCart(variant.id)}
                      className="mt-1 text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4">
          <div className="mb-3 flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {formatUGX(subtotal)}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full rounded-md bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            Process Payment ({formatUGX(subtotal)})
          </button>
        </div>
      </div>

      {/* ===== PAYMENT MODAL ===== */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Payment</h3>
              <button onClick={() => setShowPaymentModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex justify-between text-lg">
              <span>Total:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatUGX(subtotal)}</span>
            </div>

            {/* Payment method selector */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {([
                { id: "cash", label: "Cash", icon: Banknote },
                { id: "mobile_money", label: "Mobile", icon: Smartphone },
                { id: "card", label: "Card", icon: CreditCard },
              ] as const).map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex flex-col items-center rounded-md border p-3 transition-colors ${
                    paymentMethod === method.id
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500"
                  }`}
                >
                  <method.icon className="mb-1 h-5 w-5" />
                  <span className="text-xs">{method.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === "cash" && (
              <div className="mb-4">
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">
                  Amount Tendered
                </label>
                <input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
                {amountTendered > 0 && amountTendered >= subtotal && (
                  <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                    Change: {formatUGX(amountTendered - subtotal)}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={completePayment}
              disabled={paymentMethod === "cash" && amountTendered < subtotal}
              className="w-full rounded-md bg-emerald-600 py-2 font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Complete Sale
            </button>
          </div>
        </div>
      )}

      {/* ===== RECEIPT MODAL ===== */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white text-slate-900">
            {/* Receipt content (printable) */}
            <div id="receipt" className="p-6 text-xs">
              <div className="text-center">
                <h2 className="text-lg font-bold">BoutiqueOS</h2>
                <p>Fashion Boutique</p>
                <p>{new Date().toLocaleDateString()}</p>
                <p>{new Date().toLocaleTimeString()}</p>
              </div>
              <hr className="my-2 border-dashed" />
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left">Item</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.items.map(({ variant, quantity }) => (
                    <tr key={variant.id}>
                      <td className="py-1">
                        {variant.color}/{variant.size}
                      </td>
                      <td className="text-right">{quantity}</td>
                      <td className="text-right">
                        {formatUGX(variant.selling_price * quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <hr className="my-2 border-dashed" />
              <div className="flex justify-between font-bold">
                <span>TOTAL:</span>
                <span>{formatUGX(receiptData.subtotal)}</span>
              </div>
              <div className="mt-1 text-center">
                Payment:{" "}
                {receiptData.paymentMethod === "cash"
                  ? "Cash"
                  : receiptData.paymentMethod === "mobile_money"
                  ? "Mobile Money"
                  : "Card"}
                {receiptData.amountTendered != null && (
                  <p>Tendered: {formatUGX(receiptData.amountTendered)}</p>
                )}
                {receiptData.change != null && (
                  <p>Change: {formatUGX(receiptData.change)}</p>
                )}
              </div>
              <hr className="my-2 border-dashed" />
              <p className="text-center">Thank you for shopping!</p>
            </div>
            <div className="flex gap-2 border-t border-slate-200 p-4">
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setCart([]);
                  setScannedVariant(null);
                  refocusScanner();
                }}
                className="flex-1 rounded-md border border-slate-300 py-2 text-sm"
              >
                Close
              </button>
              <button
                onClick={printReceipt}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-slate-900 py-2 text-sm text-white"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}