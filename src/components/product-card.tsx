"use client";

import { useState, type DragEvent, type MouseEvent } from "react";
import { formatPrice } from "@/data/products";
import type { CatalogProduct } from "@/lib/offers";
import { ProductPreviewModal } from "@/components/product-preview-modal";
import { useFavorite } from "@/lib/store-favorites/use-favorite";
import { isStoreSoldOut, SOLD_OUT_LABEL, soldOutStrikeClass } from "@/lib/store-sold-out/presentation";

type ProductCardProps = {
  product: CatalogProduct;
  onAddToCart: () => void;
  onEdit?: () => void;
  onEditImage?: () => void;
  onToggleHidden?: () => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
};

export function ProductCard({
  product,
  onAddToCart,
  onEdit,
  onEditImage,
  onToggleHidden,
  draggable,
  onDragStart,
}: ProductCardProps) {
  const { on: favorite, toggle: toggleFavorite } = useFavorite(product.id);
  const [preview, setPreview] = useState(false);
  const hidden = Boolean(product.storeHidden);
  const soldOut = isStoreSoldOut(product);

  function openPreview(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("[data-card-control]")) return;
    setPreview(true);
  }

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={openPreview}
      className={`relative flex h-full min-w-0 cursor-pointer flex-col rounded-lg border bg-white p-1.5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:rounded-2xl sm:p-3 ${
        hidden ? "border-dashed border-neutral-300" : "border-gray-100"
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {onToggleHidden ? (
        <button
          type="button"
          data-card-control
          aria-pressed={hidden}
          aria-label={hidden ? `Mostrar ${product.title} en la tienda` : `Ocultar ${product.title} de la tienda`}
          title={hidden ? "Oculto para clientes. Clic para mostrar." : "Visible para clientes. Clic para ocultar."}
          onClick={onToggleHidden}
          onDragStart={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={`absolute top-3 left-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm ${
            hidden
              ? "border-neutral-300 bg-neutral-800 text-white"
              : "border-gray-200 bg-white/90 text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          <EyeIcon off={hidden} />
        </button>
      ) : null}
      <button
        type="button"
        data-card-control
        aria-pressed={favorite}
        aria-label={favorite ? "Quitar de favoritos" : "Marcar como favorito"}
        onClick={() => toggleFavorite()}
        className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-gray-400 transition-colors hover:text-sky-500 sm:top-3 sm:right-3 sm:h-8 sm:w-8"
      >
        <HeartIcon filled={favorite} />
      </button>

      <div className={`relative ${hidden ? "opacity-45" : ""}`}>
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-gray-50 sm:aspect-square sm:rounded-xl">
          <img
            src={product.image}
            alt=""
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover ${hidden ? "grayscale" : ""}`}
          />
        </div>
        {hidden ? (
          <span className="absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-neutral-900/80 px-2 py-1 text-center text-xs font-bold tracking-wide text-white uppercase">
            Oculto
          </span>
        ) : soldOut ? (
          <span className="absolute top-2.5 left-2.5 z-10 rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-black tracking-tight text-white uppercase sm:text-sm">
            {SOLD_OUT_LABEL}
          </span>
        ) : product.pendingHold ? (
          <span className="absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-amber-600/90 px-2 py-1 text-center text-[10px] font-bold tracking-wide text-white uppercase sm:text-xs">
            Producto reservado / pendiente de pago
          </span>
        ) : product.badge ? (
          <span className="absolute top-2.5 left-2.5 z-10 rounded-lg bg-fuchsia-600 px-2.5 py-1 text-sm font-black tracking-tight text-white shadow-lg shadow-fuchsia-600/35">
            {product.badge}
          </span>
        ) : null}
        {onEditImage ? (
          <button
            type="button"
            data-card-control
            onClick={onEditImage}
            onDragStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            className="absolute right-2 bottom-2 z-10 rounded-full bg-sky-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sky-400"
          >
            Editar imagen
          </button>
        ) : null}
      </div>

      <p className="mt-1 pr-7 text-[10px] font-semibold text-neutral-800 sm:mt-3 sm:pr-12 sm:text-sm">{product.stockLabel}</p>
      <h3
        className={soldOutStrikeClass(
          soldOut || hidden,
          "mt-0.5 line-clamp-2 pr-1 text-[12px] leading-snug font-semibold text-neutral-950 sm:mt-1 sm:pr-2 sm:text-base",
        )}
      >
        {product.title}
      </h3>
      <div className="mt-1 max-w-[calc(100%-2rem)] sm:mt-2 sm:max-w-[calc(100%-3rem)]">
        <div className="flex items-center gap-2">
          {onEdit ? (
            <button
              type="button"
              data-card-control
              onClick={onEdit}
              className={soldOutStrikeClass(
                soldOut,
                `text-left font-extrabold tracking-tight text-neutral-950 underline-offset-2 hover:text-sky-700 hover:underline ${product.onSale ? "text-sm sm:text-xl" : "text-xs sm:text-lg"}`,
              )}
            >
              {formatPrice(product.salePrice)}
            </button>
          ) : (
            <p
              className={soldOutStrikeClass(
                soldOut,
                `font-extrabold tracking-tight text-neutral-950 ${product.onSale ? "text-sm sm:text-xl" : "text-xs sm:text-lg"}`,
              )}
            >
              {formatPrice(product.salePrice)}
            </p>
          )}
          {onEdit ? (
            <button
              type="button"
              data-card-control
              aria-label={`Editar ${product.title}`}
              onClick={onEdit}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-600 transition-colors hover:bg-sky-500 hover:text-white"
            >
              <PencilIcon />
            </button>
          ) : null}
        </div>
        {product.onSale ? (
          <p className="mt-0.5 text-xs font-semibold text-rose-800 line-through decoration-rose-800 sm:text-sm">
            {formatPrice(product.price)}
          </p>
        ) : null}
        <p className="mt-1 hidden text-sm font-semibold leading-snug text-neutral-800 sm:block">Precio pagando por transferencia</p>
      </div>

      <button
        type="button"
        data-card-control
        aria-label={
          product.pendingHold
            ? `${product.title} reservado / pendiente de pago`
            : product.inStock
              ? `Agregar ${product.title} al carrito`
              : `${product.title} agotado`
        }
        disabled={!product.inStock || Boolean(product.pendingHold)}
        onClick={onAddToCart}
        className="absolute right-1.5 bottom-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm transition-colors duration-200 hover:bg-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:bg-gray-300 sm:right-4 sm:bottom-4 sm:h-10 sm:w-10"
      >
        <CartIcon />
      </button>
      {preview ? (
        <ProductPreviewModal
          product={product}
          onClose={() => setPreview(false)}
          onAddToCart={onAddToCart}
        />
      ) : null}
    </article>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5Z" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.2" />
      {off ? <path d="M4 16 16 4" strokeLinecap="round" /> : null}
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12.2 3.8 16.2 7.8 7.4 16.6 3.4 16.6 3.4 12.6 12.2 3.8Z" strokeLinejoin="round" />
      <path d="m10.8 5.2 4 4" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 ${filled ? "fill-sky-500 text-sky-500" : "fill-none"}`} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M10 16.2 4.4 10.8a3.4 3.4 0 0 1 4.8-4.8L10 7.1l.8-1.1a3.4 3.4 0 0 1 4.8 4.8L10 16.2Z" strokeLinejoin="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M4 5h1.4l1.2 8.2a1 1 0 0 0 1 .8h6.7a1 1 0 0 0 1-.8L16.6 7H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.2" cy="16.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="13.8" cy="16.2" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
