"use client";

import { useEffect } from "react";
import { formatPrice } from "@/data/products";
import type { CatalogProduct } from "@/lib/offers";
import { isStoreSoldOut, SOLD_OUT_LABEL, soldOutStrikeClass } from "@/lib/store-sold-out/presentation";

type ProductPreviewModalProps = {
  product: CatalogProduct;
  onClose: () => void;
  onAddToCart: () => void;
};

export function ProductPreviewModal({ product, onClose, onAddToCart }: ProductPreviewModalProps) {
  const soldOut = isStoreSoldOut(product);
  const blocked = !product.inStock || Boolean(product.pendingHold);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"
      role="presentation"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-preview-title"
        className="flex max-h-[min(92dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="relative bg-gray-50">
          <img src={product.image} alt="" className="max-h-[min(52dvh,22rem)] w-full object-contain" />
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg text-neutral-700 shadow-sm"
          >
            ×
          </button>
          {soldOut ? (
            <span className="absolute top-3 left-3 rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-black tracking-tight text-white uppercase">
              {SOLD_OUT_LABEL}
            </span>
          ) : product.pendingHold ? (
            <span className="absolute top-3 left-3 rounded-lg bg-amber-600 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase">
              Producto reservado / pendiente de pago
            </span>
          ) : product.badge ? (
            <span className="absolute top-3 left-3 rounded-lg bg-fuchsia-600 px-2.5 py-1 text-sm font-black text-white">
              {product.badge}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
          <p className="text-sm font-semibold text-neutral-700">{product.stockLabel}</p>
          <h2 id="product-preview-title" className={soldOutStrikeClass(soldOut, "text-xl font-bold leading-snug text-neutral-950")}>
            {product.title}
          </h2>
          <p className={soldOutStrikeClass(soldOut, "text-2xl font-extrabold tracking-tight text-neutral-950")}>
            {formatPrice(product.salePrice)}
          </p>
          {product.onSale ? (
            <p className="text-sm font-semibold text-rose-800 line-through">{formatPrice(product.price)}</p>
          ) : null}
          <p className="text-sm font-semibold text-neutral-700">Precio pagando por transferencia</p>
          <button
            type="button"
            disabled={blocked}
            onClick={() => {
              if (blocked) return;
              onAddToCart();
              onClose();
            }}
            className="mt-2 w-full rounded-full bg-sky-500 px-5 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {product.pendingHold
              ? "Producto reservado"
              : soldOut
                ? SOLD_OUT_LABEL
                : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}
