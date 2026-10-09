"use client";

import { useState, type DragEvent } from "react";
import { formatPrice } from "@/data/products";
import type { CatalogProduct } from "@/lib/offers";

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
  const [favorite, setFavorite] = useState(false);
  const hidden = Boolean(product.storeHidden);

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      className={`relative flex h-full flex-col rounded-2xl border bg-white p-3 shadow-sm transition-shadow duration-300 hover:shadow-md ${
        hidden ? "border-dashed border-neutral-300" : "border-gray-100"
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {onToggleHidden ? (
        <button
          type="button"
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
        aria-pressed={favorite}
        aria-label={favorite ? "Quitar de favoritos" : "Marcar como favorito"}
        onClick={() => setFavorite((current) => !current)}
        className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-400 transition-colors hover:text-sky-500"
      >
        <HeartIcon filled={favorite} />
      </button>

      <div className={`relative ${hidden ? "opacity-45" : ""}`}>
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gray-50">
          <img
            src={product.image}
            alt=""
            className={`h-full w-full object-cover ${hidden ? "grayscale" : ""}`}
          />
        </div>
        {hidden ? (
          <span className="absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-neutral-900/80 px-2 py-1 text-center text-xs font-bold tracking-wide text-white uppercase">
            Oculto
          </span>
        ) : null}
        {product.badge ? (
          <span className="absolute top-2.5 left-2.5 z-10 rounded-lg bg-fuchsia-600 px-2.5 py-1 text-sm font-black tracking-tight text-white shadow-lg shadow-fuchsia-600/35">
            {product.badge}
          </span>
        ) : null}
        {onEditImage ? (
          <button
            type="button"
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

      <p className="mt-3 pr-12 text-sm font-semibold text-neutral-800">{product.stockLabel}</p>
      <h3 className={`mt-1 line-clamp-2 pr-2 text-base font-semibold text-neutral-950 ${hidden ? "line-through decoration-neutral-400" : ""}`}>
        {product.title}
      </h3>
      <div className="mt-2 max-w-[calc(100%-3rem)]">
        <div className="flex items-center gap-2">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className={`text-left font-extrabold tracking-tight text-neutral-950 underline-offset-2 hover:text-sky-700 hover:underline ${product.onSale ? "text-xl" : "text-lg"}`}
            >
              {formatPrice(product.salePrice)}
            </button>
          ) : (
            <p className={`font-extrabold tracking-tight text-neutral-950 ${product.onSale ? "text-xl" : "text-lg"}`}>
              {formatPrice(product.salePrice)}
            </p>
          )}
          {onEdit ? (
            <button
              type="button"
              aria-label={`Editar ${product.title}`}
              onClick={onEdit}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-600 transition-colors hover:bg-sky-500 hover:text-white"
            >
              <PencilIcon />
            </button>
          ) : null}
        </div>
        {product.onSale ? (
          <p className="mt-0.5 text-sm font-semibold text-rose-800 line-through decoration-rose-800">
            {formatPrice(product.price)}
          </p>
        ) : null}
        <p className="mt-1 text-sm font-semibold leading-snug text-neutral-800">Precio pagando por transferencia</p>
      </div>

      <button
        type="button"
        aria-label={product.inStock ? `Agregar ${product.title} al carrito` : `${product.title} agotado`}
        disabled={!product.inStock}
        onClick={onAddToCart}
        className="absolute right-4 bottom-4 flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm transition-colors duration-200 hover:bg-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        <CartIcon />
      </button>
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
