"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/data/products";
import { overlayCatalogStock } from "@/lib/web-pending-stock/availability";
import { formatPublicHours, useStoreConfig } from "@/config/store-config";
import { useCatalog, type CatalogProduct } from "@/lib/offers";
import { useOrders } from "@/lib/orders";
import { ProductCard } from "@/components/product-card";
import { homeBannerMobile } from "@/lib/store-home-banner/mobile";
import { storeFeaturedGridClass } from "@/lib/store-product-grid/mobile";

const categoryRank: Record<string, number> = {
  cargadores: 0,
  accesorios: 1,
  auriculares: 2,
  soportes: 3,
  protectores: 4,
  fundas: 5,
};

function pickFeatured(products: CatalogProduct[]) {
  return [...products]
    .sort((a, b) => {
      const stockA = a.inStock ? 0 : 1;
      const stockB = b.inStock ? 0 : 1;
      if (stockA !== stockB) return stockA - stockB;
      const rankA = categoryRank[a.categoryId] ?? 9;
      const rankB = categoryRank[b.categoryId] ?? 9;
      if (rankA !== rankB) return rankA - rankB;
      if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
      return a.title.localeCompare(b.title, "es");
    })
    .slice(0, 4);
}

function rankedOffers(products: CatalogProduct[]) {
  return [...products]
    .filter((product) => product.onSale)
    .sort((a, b) => {
      if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
      const discountA = Number(a.badge?.replace(/\D/g, "") ?? 0);
      const discountB = Number(b.badge?.replace(/\D/g, "") ?? 0);
      return discountB - discountA;
    });
}

const SLIDES = ["ofertas", "taller", "ubicacion", "promos"] as const;
const AUTO_PLAY_MS = 5000;

export function HomeSlider() {
  const { products } = useCatalog();
  const { stock } = useOrders();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const live = products
    .filter((product) => !product.storeHidden)
    .map((product) => overlayCatalogStock(product, stock[product.id] ?? product.stock));
  const offers = rankedOffers(live);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, AUTO_PLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, index]);

  function step(direction: -1 | 1) {
    setIndex((current) => (current + direction + SLIDES.length) % SLIDES.length);
  }

  const slides = [
    <OffersPlate key="ofertas" product={offers[0] ?? null} />,
    <RepairPlate key="taller" />,
    <LocationPlate key="ubicacion" />,
    <PromoPlate key="promos" product={offers[1] ?? null} />,
  ];

  return (
    <section
      className="relative"
      aria-roledescription="carrusel"
      aria-label="Portada de la tienda"
    >
      <div
        className="relative mx-auto w-full max-w-6xl px-3 pt-2 sm:px-6 sm:pt-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) return;
          setPaused(false);
        }}
      >
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
            style={{
              width: `${SLIDES.length * 100}%`,
              transform: `translateX(-${(index * 100) / SLIDES.length}%)`,
            }}
          >
            {slides.map((slide) => (
              <div
                key={slide.key}
                className={`shrink-0 ${homeBannerMobile.slide}`}
                style={{ width: `${100 / SLIDES.length}%` }}
              >
                {slide}
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Banner anterior"
          className={`${homeBannerMobile.arrow} left-1.5 sm:left-3`}
        >
          <ArrowIcon direction="left" />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Banner siguiente"
          className={`${homeBannerMobile.arrow} right-1.5 sm:right-3`}
        >
          <ArrowIcon direction="right" />
        </button>
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:bottom-3">
          {SLIDES.map((id, slideIndex) => (
            <button
              key={id}
              type="button"
              aria-label={`Ver placa ${slideIndex + 1}`}
              aria-current={slideIndex === index ? "true" : undefined}
              onClick={() => setIndex(slideIndex)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                slideIndex === index ? "w-5 bg-sky-500" : "w-1.5 bg-white ring-1 ring-neutral-950/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function OffersPlate({ product }: { product: CatalogProduct | null }) {
  return (
    <div className="grid h-full min-h-0 text-gray-900 sm:min-h-[300px] lg:grid-cols-[1.15fr_0.85fr]">
      <div className="px-4 py-4 sm:px-10 sm:py-12">
        <p className="text-[10px] font-bold tracking-[0.18em] text-sky-600 uppercase sm:text-xs">Esta semana</p>
        <h1 className="mt-1.5 max-w-md text-xl font-bold tracking-tight text-neutral-950 sm:mt-3 sm:text-5xl">Ofertas de la semana</h1>
        <p className="mt-2 max-w-md text-xs font-medium leading-5 text-neutral-800 sm:mt-4 sm:text-base sm:leading-7">
          Un precio especial en accesorios del local. El valor tachado es el anterior y el destacado es pagando por transferencia.
        </p>
        <Link
          href="/tienda?vista=ofertas"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-sky-400 sm:mt-6 sm:px-5 sm:py-2.5 sm:text-sm"
        >
          Ver todas
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="hidden items-center justify-center px-5 py-8 pb-12 sm:flex sm:px-8">
        {product ? <OfferSpotlight product={product} /> : (
          <p className="max-w-xs text-center text-base font-medium text-neutral-800">Esta semana no hay ofertas cargadas. Mirá el catálogo completo.</p>
        )}
      </div>
    </div>
  );
}

function RepairPlate() {
  const { config } = useStoreConfig();
  const href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Hola, quiero consultar por una reparación en Movil zone. ¿Me pueden pasar un presupuesto?")}`;

  return (
    <div className="h-full px-1 pt-1 sm:px-2 sm:pb-12">
      <div className="relative h-full overflow-hidden rounded-2xl sm:min-h-[320px] sm:rounded-3xl">
        <img
          src="/banners/taller-reparacion.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/75 to-black/45" />
        <div className="relative z-10 flex h-full min-h-0 flex-col justify-center px-4 py-4 sm:min-h-[320px] sm:px-10 sm:py-10 lg:max-w-2xl">
          <p className="text-[10px] font-bold tracking-[0.16em] text-sky-300 uppercase sm:text-sm">Taller del local</p>
          <h2 className="mt-1.5 max-w-xl text-xl font-bold tracking-tight text-white sm:mt-3 sm:text-5xl">
            Servicio técnico especializado
          </h2>
          <p className="mt-2 max-w-lg text-sm font-medium leading-5 text-white sm:mt-4 sm:text-lg sm:leading-8">
            Reparaciones en el acto: cambio de pantalla, pines de carga y diagnóstico de placa.
          </p>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white shadow-lg transition-colors hover:bg-[#1ebe5d] sm:mt-6 sm:px-6 sm:py-3.5 sm:text-lg"
          >
            Consultar reparación
          </a>
        </div>
      </div>
    </div>
  );
}

function LocationPlate() {
  const { config } = useStoreConfig();
  const hours = formatPublicHours(config.openingHours);

  return (
    <div className="h-full px-1 pt-1 sm:px-2 sm:pb-12">
      <div className="relative h-full overflow-hidden rounded-2xl sm:min-h-[300px] sm:rounded-3xl">
        <video
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          src="/banners/local-frente.mp4?v=3"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-black/25" />
        <div className="relative z-10 flex h-full min-h-0 flex-col justify-center gap-2 overflow-hidden px-4 py-3 sm:min-h-[300px] sm:gap-4 sm:px-8 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-sm">
            <p className="text-[10px] font-bold tracking-[0.16em] text-sky-300 uppercase sm:text-xs">Horarios y ubicación</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-white sm:mt-1.5 sm:text-3xl">Pasá por el local</h2>
            <p className="mt-1.5 text-base font-bold leading-snug text-white">{config.location.title}</p>
            <p className="text-sm font-semibold text-sky-200">{config.location.detail}</p>
            <Link
              href="/informacion/contacto"
              className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-sky-700 px-3.5 py-1.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-sky-600"
            >
              Ver contacto
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="max-h-[7.5rem] w-full max-w-[15rem] self-center overflow-hidden rounded-2xl border border-white/15 bg-black/50 p-2 backdrop-blur-sm sm:max-h-none sm:p-3">
            <p className="text-[11px] font-bold tracking-[0.14em] text-sky-300 uppercase">Horarios de atención</p>
            <ul className="mt-1.5 space-y-1">
              {hours.map((line) => {
                const split = line.indexOf(": ");
                const day = split === -1 ? line : line.slice(0, split);
                const range = split === -1 ? "" : line.slice(split + 2);
                return (
                  <li key={line} className="text-xs leading-4">
                    <span className="font-bold text-sky-300">{day}</span>
                    {range ? <span className="mt-0.5 block font-medium text-white">{range}</span> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromoPlate({ product }: { product: CatalogProduct | null }) {
  return (
    <div className="grid h-full min-h-0 text-gray-900 sm:min-h-[300px] lg:grid-cols-[1.15fr_0.85fr]">
      <div className="px-4 py-4 sm:px-10 sm:py-12">
        <p className="text-[10px] font-bold tracking-[0.18em] text-sky-600 uppercase sm:text-xs">Promociones</p>
        <h2 className="mt-1.5 max-w-md text-xl font-bold tracking-tight text-neutral-950 sm:mt-3 sm:text-5xl">Promociones especiales</h2>
        <p className="mt-2 max-w-md text-xs font-medium leading-5 text-neutral-800 sm:mt-4 sm:text-base sm:leading-7">
          Cargadores, cables y accesorios con precio destacado por transferencia. Mirá lo que está en promo ahora.
        </p>
        <Link
          href="/tienda?vista=ofertas"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-sky-400 sm:mt-6 sm:px-5 sm:py-2.5 sm:text-sm"
        >
          Ver promociones
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="hidden items-center justify-center px-5 py-8 pb-12 sm:flex sm:px-8">
        {product ? <OfferSpotlight product={product} /> : (
          <img src="/banners/accesorios-cargadores.jpg" alt="Accesorios y cargadores en promoción" className="h-44 w-full max-w-sm rounded-3xl object-cover shadow-xl sm:h-52" />
        )}
      </div>
    </div>
  );
}

function OfferSpotlight({ product }: { product: CatalogProduct }) {
  return (
    <Link
      href="/tienda?vista=ofertas"
      className="flex w-full max-w-sm items-center gap-4 rounded-3xl bg-white p-3 text-gray-900 shadow-xl transition-transform duration-200 hover:-translate-y-0.5"
    >
      <span className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-gray-50 sm:h-36 sm:w-36">
        <img src={product.image} alt="" className="h-full w-full object-cover" />
        {product.badge ? (
          <span className="absolute top-2 left-2 rounded-lg bg-fuchsia-600 px-2 py-1 text-xs font-black text-white">{product.badge}</span>
        ) : null}
      </span>
      <span className="min-w-0 py-1 pr-2">
        <span className="block text-sm font-semibold text-neutral-800">{product.category}</span>
        <span className="mt-1 block text-lg font-semibold text-neutral-950">{product.title}</span>
        <span className="mt-2 block text-2xl font-extrabold tracking-tight text-neutral-950">{formatPrice(product.salePrice)}</span>
        <span className="mt-0.5 block text-sm font-semibold text-rose-800 line-through">{formatPrice(product.price)}</span>
      </span>
    </Link>
  );
}

export function FeaturedProducts({ onAddToCart }: { onAddToCart: (product: CatalogProduct) => void }) {
  const { products } = useCatalog();
  const { stock } = useOrders();
  const live = products
    .filter((product) => !product.storeHidden)
    .map((product) => overlayCatalogStock(product, stock[product.id] ?? product.stock));
  const featured = pickFeatured(live);

  return (
    <section id="recien-llegados" className="mx-auto w-full max-w-6xl px-3 pt-6 sm:px-6 sm:pt-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-sky-600 uppercase">Destacados</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Recién llegados</h2>
        </div>
        <Link href="/tienda" className="text-sm font-medium text-sky-500 hover:text-sky-600">
          Ver todo
        </Link>
      </div>
      <ul className={storeFeaturedGridClass}>
        {featured.map((product) => (
          <li key={product.id} className="min-w-0">
            <ProductCard product={product} onAddToCart={() => onAddToCart(product)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RepairInvite() {
  const { config } = useStoreConfig();
  const href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Hola, quiero consultar por una reparación en Movil zone. ¿Me pueden pasar un presupuesto?")}`;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl">
        <img
          src="/banners/taller-reparacion.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/70 to-black/55" />
        <div className="relative z-10 grid items-center gap-6 px-6 py-10 text-white sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-sky-400 uppercase">Servicio técnico</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Servicio técnico especializado</h2>
            <p className="mt-2 text-lg font-semibold text-white">Reparaciones en el acto</p>
            <p className="mt-3 max-w-xl text-base font-medium leading-7 text-white">
              Cambio de pantalla, diagnóstico y reparación en el local. Escribinos y te armamos el presupuesto.
            </p>
          </div>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-sky-400"
          >
            Consultar por reparación
          </a>
        </div>
      </div>
    </section>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path
        d={direction === "left" ? "M10 3.5 5.5 8 10 12.5" : "M6 3.5 10.5 8 6 12.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrustStrip() {
  const { config } = useStoreConfig();
  const items = [
    {
      title: "Atención personalizada",
      detail: "Te asesoramos en el local para elegir lo que necesitás.",
      icon: "person" as const,
    },
    {
      title: config.location.title,
      detail: config.location.detail,
      icon: "pin" as const,
    },
    {
      title: "Garantía",
      detail: "Revisamos el producto en el local y te acompañamos después de la compra.",
      icon: "shield" as const,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-12 pb-4 sm:px-6">
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.icon} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <TrustIcon name={item.icon} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-gray-900">{item.title}</span>
              <span className="mt-1 block text-xs leading-5 text-gray-500">{item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TrustIcon({ name }: { name: "person" | "pin" | "shield" }) {
  const common = "h-5 w-5";
  if (name === "person") {
    return (
      <svg viewBox="0 0 20 20" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="10" cy="7" r="2.6" />
        <path d="M4.5 16.2c.8-2.4 2.8-3.7 5.5-3.7s4.7 1.3 5.5 3.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "pin") {
    return (
      <svg viewBox="0 0 20 20" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M10 17s5-4.2 5-8.2A5 5 0 0 0 5 8.8C5 12.8 10 17 10 17Z" strokeLinejoin="round" />
        <circle cx="10" cy="8.6" r="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className={common} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M10 2.8 16 5.2v4.6c0 3.4-2.4 5.8-6 7.4-3.6-1.6-6-4-6-7.4V5.2L10 2.8Z" strokeLinejoin="round" />
      <path d="M7.4 10.1 9.2 11.8 12.8 8.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
