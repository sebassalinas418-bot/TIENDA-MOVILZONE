import { applyPendingHoldToProduct } from "@/lib/web-pending-stock/availability";
import { readPendingReservations } from "@/services/taller-gestio/pending-stock";
import { readTallerCatalog } from "@/services/taller-gestio/server";

export async function readStorefrontCatalog() {
  const products = await readTallerCatalog();
  if (!products) return null;
  let reserved: Record<string, number> = {};
  try {
    reserved = await readPendingReservations();
  } catch {
    reserved = {};
  }
  return products.map((product) => applyPendingHoldToProduct(product, reserved[product.id] ?? 0));
}
