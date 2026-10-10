import { describeStock, type Product } from "@/data/products";

export const PENDING_HOLD_LABEL = "Producto reservado / pendiente de pago";

export type PendingLine = {
  productId: string;
  quantity: number;
};

export function parsePendingOrderItems(value: unknown): PendingLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const productId = String(item.productId ?? item.product_id ?? "").trim();
    const quantity = Math.floor(Number(item.quantity || 0));
    if (!productId || quantity <= 0) return [];
    return [{ productId, quantity }];
  });
}

export function sumReservedByProduct(orders: { items?: unknown }[]): Record<string, number> {
  const reserved: Record<string, number> = {};
  for (const order of orders) {
    for (const line of parsePendingOrderItems(order.items)) {
      reserved[line.productId] = (reserved[line.productId] ?? 0) + line.quantity;
    }
  }
  return reserved;
}

export function storeSellableStock(physical: number, reservedQty = 0) {
  return Math.max(0, Math.floor(physical) - Math.max(0, Math.floor(reservedQty)));
}

export function applyPendingHoldToProduct<T extends Product>(product: T, reservedQty = 0): T & {
  reservedQty: number;
  sellableStock: number;
  pendingHold: boolean;
} {
  const reserved = Math.max(0, Math.floor(reservedQty));
  const sellable = storeSellableStock(product.stock, reserved);
  const pendingHold = product.stock > 0 && sellable <= 0;
  const described = pendingHold
    ? { stockLabel: PENDING_HOLD_LABEL, inStock: false as const }
    : describeStock(sellable);
  return {
    ...product,
    reservedQty: reserved,
    sellableStock: sellable,
    pendingHold,
    stockLabel: described.stockLabel,
    inStock: described.inStock,
  };
}

export function overlayCatalogStock<T extends Product>(product: T, physical: number) {
  return applyPendingHoldToProduct({ ...product, stock: physical }, product.reservedQty ?? 0);
}
