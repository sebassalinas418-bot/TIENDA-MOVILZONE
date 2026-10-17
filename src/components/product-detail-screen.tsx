"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LoginPrompt } from "@/components/login-prompt";
import { ProductCard } from "@/components/product-card";
import { useStoreConfig } from "@/config/store-config";
import { formatPrice } from "@/data/products";
import { useCart } from "@/lib/cart";
import { useCatalog, type CatalogProduct } from "@/lib/offers";
import { useOrders } from "@/lib/orders";
import { isSessionVerified, readSession, SESSION_EVENT, type DemoSession } from "@/lib/session";
import { storeProductGridClass } from "@/lib/store-product-grid/mobile";
import { isStoreSoldOut, SOLD_OUT_LABEL, soldOutStrikeClass } from "@/lib/store-sold-out/presentation";
import { overlayCatalogStock } from "@/lib/web-pending-stock/availability";
import { stripUnsafeProductHtml } from "@/lib/store-product-details";

export function ProductDetailScreen() {
  const params = useParams<{ id: string }>();
  const productId = decodeURIComponent(String(params.id ?? ""));
  const router = useRouter();
  const { products } = useCatalog();
  const { stock } = useOrders();
  const { addItem, setQuantity, lines } = useCart();
  const { config } = useStoreConfig();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState("");
  const [relatedIds, setRelatedIds] = useState<string[] | null>(null);
  const [giveUp, setGiveUp] = useState(false);

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    return () => window.removeEventListener(SESSION_EVENT, sync);
  }, []);

  const live = useMemo(
    () =>
      products.map((product) => overlayCatalogStock(product, stock[product.id] ?? product.stock)),
    [products, stock],
  );

  const product = live.find((item) => item.id === productId) ?? null;

  useEffect(() => {
    setGiveUp(false);
    const timer = window.setTimeout(() => setGiveUp(true), 2500);
    return () => window.clearTimeout(timer);
  }, [productId]);

  useEffect(() => {
    setQty(1);
    setActiveImage(product?.image ?? "");
  }, [product?.id, product?.image]);

  useEffect(() => {
    if (!product) return;
    const category = encodeURIComponent(product.category);
    const exclude = encodeURIComponent(product.id);
    let cancelled = false;
    fetch(`/api/store-related-products?exclude=${exclude}&category=${category}`)
      .then((res) => (res.ok ? res.json() : { ids: [] }))
      .then((body: { ids?: string[] }) => {
        if (!cancelled) setRelatedIds(Array.isArray(body.ids) ? body.ids : []);
      })
      .catch(() => {
        if (!cancelled) setRelatedIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [product?.id, product?.category]);

  const gallery = useMemo(() => {
    if (!product) return [];
    return [product.image, ...(product.extraImages ?? [])].filter(
      (src, index, all) => src && all.indexOf(src) === index,
    );
  }, [product]);

  const related = useMemo(() => {
    if (!product) return [] as CatalogProduct[];
    const byId = new Map(live.map((item) => [item.id, item]));
    const fromQuery: CatalogProduct[] = [];
    for (const id of relatedIds ?? []) {
      const item = byId.get(id);
      if (item && item.id !== product.id && !item.storeHidden) fromQuery.push(item);
    }
    if (fromQuery.length > 0) return fromQuery.slice(0, 5);
    return live
      .filter(
        (item) =>
          item.id !== product.id &&
          !item.storeHidden &&
          item.categoryId === product.categoryId,
      )
      .slice(0, 5);
  }, [live, product, relatedIds]);

  function ensureCanBuy() {
    if (!session) {
      setLoginOpen(true);
      return false;
    }
    if (!isSessionVerified(session)) {
      router.push("/mi-cuenta");
      return false;
    }
    return true;
  }

  function addProductToCart(target: CatalogProduct, amount = 1) {
    if (!ensureCanBuy()) return;
    if (!target.inStock || target.pendingHold || target.storeHidden) return;
    const max = Math.max(0, Math.floor(target.sellableStock ?? target.stock ?? 0));
    if (max < 1) return;
    const current = lines.find((line) => line.productId === target.id)?.quantity ?? 0;
    const next = Math.min(current + amount, max);
    if (next < 1) return;
    if (current < 1) {
      addItem(target.id);
      if (next > 1) setQuantity(target.id, next);
      return;
    }
    setQuantity(target.id, next);
  }

  if (!product && !giveUp) {
    return (
      <main className="mx-auto w-full max-w-6xl px-3 py-16 sm:px-6">
        <p className="text-center text-sm text-neutral-500">Cargando producto…</p>
      </main>
    );
  }

  if (!product || product.storeHidden) {
    return (
      <main className="mx-auto w-full max-w-6xl px-3 py-16 sm:px-6">
        <p className="text-center text-sm text-neutral-600">No encontramos este producto.</p>
        <p className="mt-4 text-center">
          <Link href="/tienda" className="text-sm font-semibold text-sky-600 hover:text-sky-700">
            Volver a la tienda
          </Link>
        </p>
      </main>
    );
  }

  const soldOut = isStoreSoldOut(product);
  const maxQty = Math.max(1, Math.floor(product.sellableStock ?? product.stock ?? 1));
  const shownImage = activeImage || product.image;
  const whatsappHref = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(
    `Hola, quiero consultar por este producto: ${product.title}`,
  )}`;

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-10">
      <nav className="mb-5 text-xs text-neutral-500 sm:text-sm">
        <Link href="/" className="hover:text-neutral-800">
          Inicio
        </Link>
        <span className="mx-1.5">›</span>
        <Link href="/tienda" className="hover:text-neutral-800">
          Tienda
        </Link>
        <span className="mx-1.5">›</span>
        <span className="text-neutral-800">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <section>
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-[#f4f1f6] p-6 sm:p-10">
            <img src={shownImage} alt={product.title} referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
          </div>
          {gallery.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {gallery.map((src) => {
                const selected = src === shownImage;
                return (
                  <li key={src}>
                    <button
                      type="button"
                      onClick={() => setActiveImage(src)}
                      aria-pressed={selected}
                      className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-2 bg-white p-1.5 sm:h-20 sm:w-20 ${
                        selected ? "border-sky-500" : "border-neutral-200"
                      }`}
                    >
                      <img src={src} alt="" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        <section>
          <p className="text-xs font-semibold tracking-wide text-sky-600 uppercase">{product.category}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{product.title}</h1>

          <div className="mt-4">
            <p className={soldOutStrikeClass(soldOut, "text-3xl font-bold text-neutral-900")}>
              {formatPrice(product.salePrice)}
            </p>
            {product.onSale && product.price > product.salePrice ? (
              <p className="mt-1 text-sm text-neutral-500">
                <span className="line-through">{formatPrice(product.price)}</span>
                {product.badge ? (
                  <span className="ml-2 font-semibold text-emerald-600">{product.badge}</span>
                ) : null}
              </p>
            ) : (
              <p className="mt-1 hidden text-sm font-semibold text-neutral-800 sm:block">
                Precio pagando por transferencia
              </p>
            )}
          </div>

          <p
            className={`mt-4 text-sm font-medium ${
              product.pendingHold ? "text-amber-700" : product.inStock ? "text-emerald-600" : "text-neutral-500"
            }`}
          >
            {product.pendingHold
              ? product.stockLabel
              : product.inStock
                ? `En stock — ${product.sellableStock ?? product.stock} disponibles`
                : SOLD_OUT_LABEL}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-neutral-200 bg-white">
              <button
                type="button"
                aria-label="Quitar una unidad"
                disabled={soldOut || qty <= 1}
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                className="h-11 w-11 text-lg font-semibold text-neutral-700 disabled:text-neutral-300"
              >
                −
              </button>
              <span className="min-w-8 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                aria-label="Sumar una unidad"
                disabled={soldOut || qty >= maxQty}
                onClick={() => setQty((n) => Math.min(maxQty, n + 1))}
                className="h-11 w-11 text-lg font-semibold text-neutral-700 disabled:text-neutral-300"
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={soldOut || Boolean(product.pendingHold)}
              onClick={() => addProductToCart(product, qty)}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:flex-none sm:px-8"
            >
              Agregar al carrito
            </button>
          </div>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-800 transition-colors hover:border-sky-300 hover:text-sky-700"
          >
            Consultar por WhatsApp sobre este producto
          </a>

          <section className="mt-8 border-t border-neutral-200 pt-6">
            <h2 className="text-sm font-bold tracking-wide text-neutral-900 uppercase">Detalles del producto</h2>
            <div data-product-ai-description className="mt-3 text-sm leading-6 text-neutral-600">
              {product.details?.trim() ? (
                /<[a-z][\s\S]*>/i.test(product.details) ? (
                  <div
                    className="product-ai-details space-y-2 [&_li]:ml-4 [&_li]:list-disc [&_ul]:space-y-1"
                    dangerouslySetInnerHTML={{ __html: stripUnsafeProductHtml(product.details) }}
                  />
                ) : (
                  <div className="whitespace-pre-line">{product.details}</div>
                )
              ) : (
                <>
                  {product.category ? (
                    <p>
                      {product.title} · {product.category}
                      {product.brand ? ` · ${product.brand}` : ""}
                    </p>
                  ) : null}
                  <p className="mt-2 text-neutral-500">
                    Pronto vamos a completar esta descripción de forma automática.
                  </p>
                </>
              )}
            </div>
          </section>
        </section>
      </div>

      <section className="mt-12 sm:mt-16">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">Productos relacionados</h2>
        {related.length > 0 ? (
          <ul className={storeProductGridClass}>
            {related.map((item) => (
              <li key={item.id} className="min-w-0">
                <ProductCard product={item} onAddToCart={() => addProductToCart(item)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">No hay otros productos en esta categoría por ahora.</p>
        )}
      </section>

      <LoginPrompt
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onAccept={() => router.push("/login")}
      />
    </main>
  );
}
