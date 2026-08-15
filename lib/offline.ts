import localforage from "localforage";

export const offlineStore = localforage.createInstance({
  name: "boutiqueos-offline",
  storeName: "data",
});

// Cache products
export async function cacheProducts(products: any[]): Promise<void> {
  await offlineStore.setItem("products", products);
  await offlineStore.setItem("lastSync", Date.now());
}

export async function getCachedProducts(): Promise<any[] | null> {
  return (await offlineStore.getItem("products")) as any[] | null;
}

// Cache customers
export async function cacheCustomers(customers: any[]): Promise<void> {
  await offlineStore.setItem("customers", customers);
}

export async function getCachedCustomers(): Promise<any[] | null> {
  return (await offlineStore.getItem("customers")) as any[] | null;
}

// Cache session for offline login
export async function cacheSession(session: any): Promise<void> {
  await offlineStore.setItem("session", session);
}

export async function getCachedSession(): Promise<any | null> {
  return await offlineStore.getItem("session");
}

export async function clearCachedSession(): Promise<void> {
  await offlineStore.removeItem("session");
}

// Queue sales for later sync
export async function queueSale(sale: any): Promise<void> {
  const queue = ((await offlineStore.getItem("saleQueue")) as any[]) || [];
  queue.push({ ...sale, timestamp: Date.now() });
  await offlineStore.setItem("saleQueue", queue);
}

export async function getQueuedSales(): Promise<any[]> {
  return ((await offlineStore.getItem("saleQueue")) as any[]) || [];
}

export async function clearSaleQueue(): Promise<void> {
  await offlineStore.setItem("saleQueue", []);
}

export async function getQueuedSalesCount(): Promise<number> {
  const queue = await getQueuedSales();
  return queue.length;
}

export async function getLastSync(): Promise<number | null> {
  return (await offlineStore.getItem("lastSync")) as number | null;
}

// Check online status
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

// Sync queued sales when back online
export async function syncQueuedSales(): Promise<void> {
  if (!isOnline()) return;
  const queue = await getQueuedSales();
  for (const sale of queue) {
    try {
      await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sale),
      });
    } catch (error) {
      console.error("Sync error:", error);
    }
  }
  await clearSaleQueue();
}

// Setup online/offline listeners
export function setupSyncListeners(callback?: () => void): void {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => {
    console.log("🟢 Online - syncing...");
    syncQueuedSales().then(() => {
      if (callback) callback();
    });
  });
  window.addEventListener("offline", () => {
    console.log("🔴 Offline - using cached data");
  });
}