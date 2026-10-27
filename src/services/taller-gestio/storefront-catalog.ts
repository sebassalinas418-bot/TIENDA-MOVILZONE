import { applyPendingHoldToProduct } from "@/lib/web-pending-stock/availability";
import { readPendingReservations } from "@/services/taller-gestio/pending-stock";
import { readDeviceStorefrontProducts } from "@/services/taller-gestio/storefront-devices";
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
  const [products, reserved, devices] = await Promise.all([
    readTallerCatalog(),
    withTimeout(readPendingReservations(), 2500).catch(() => ({}) as Record<string, number>),
    withTimeout(readDeviceStorefrontProducts(), 2500).catch(
      () => [] as Awaited<ReturnType<typeof readDeviceStorefrontProducts>>,
    ),
  ]);
  if (!products) return null;
  return [...products, ...devices].map((product) =>
    applyPendingHoldToProduct(product, reserved[product.id] ?? 0),
  );
}
