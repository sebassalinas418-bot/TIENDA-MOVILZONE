import { applyPendingHoldToProduct } from "@/lib/web-pending-stock/availability";
import { readPendingReservations } from "@/services/taller-gestio/pending-stock";
import { readTallerCatalog } from "@/services/taller-gestio/server";

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function readStorefrontCatalog() {
  const products = await readTallerCatalog();
  if (!products) return null;
  let reserved: Record<string, number> = {};
  try {
    reserved = await withTimeout(readPendingReservations(), 2500);
  } catch {
    reserved = {};
  }
  return products.map((product) => applyPendingHoldToProduct(product, reserved[product.id] ?? 0));
}
