import localforage from "localforage";

export const offlineStore = localforage.createInstance({
  name: "boutiqueos-offline",
  storeName: "data",
});

// Cache products
export async function cacheProducts(products: any[]) {
  await offlineStore.setItem("products", products);
  await offlineStore.setItem("lastSync", Date.now());
}

export async function getCachedProducts() {
  return await offlineStore.getItem("products");
}

// Cache customers
export async function cacheCustomers(customers: any[]) {
  await offlineStore.setItem("customers", customers);
}

export async function getCachedCustomers() {
  return await offlineStore.getItem("customers");
}

// Queue sales
export async function queueSale(sale: any) {
  const queue = (await offlineStore.getItem("saleQueue")) || [];
  queue.push({ ...sale, timestamp: Date.now() });
  await offlineStore.setItem("saleQueue", queue);
}

export async function getQueuedSales() {
  return (await offlineStore.getItem("saleQueue")) || [];
}

export async function clearSaleQueue() {
  await offlineStore.setItem("saleQueue", []);
}

// Get last sync time
export async function getLastSync() {
  return await offlineStore.getItem("lastSync");
}

// Check online status
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

// Sync queued sales
export async function syncQueuedSales() {
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
export function setupSyncListeners(callback?: () => void) {
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