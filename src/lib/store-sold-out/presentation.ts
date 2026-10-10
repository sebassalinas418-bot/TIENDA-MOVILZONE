type SoldOutLike = {
  inStock?: boolean;
  pendingHold?: boolean;
};

/** Stock 0 de tienda: se muestra, no se vende. No oculta el producto. */
export function isStoreSoldOut(product: SoldOutLike) {
  return !product.inStock && !product.pendingHold;
}

export const SOLD_OUT_LABEL = "Agotado";

export function soldOutStrikeClass(soldOut: boolean, extra = "") {
  return [extra, soldOut ? "line-through decoration-neutral-400" : ""].filter(Boolean).join(" ");
}
