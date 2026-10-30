"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { MobileMenuButton } from "@/components/mobile-nav/store-mobile-chrome";
import { useStoreConfig } from "@/config/store-config";
import { useAdminCatalogPublish } from "@/lib/admin-catalog-publish";
import { useAdminAccess } from "@/lib/admin-access";
import { useCart } from "@/lib/cart";
import type { DemoSession } from "@/lib/session";

type SiteHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch?: (value: string) => void;
  session: DemoSession | null;
  onLogout: () => void;
  onCart: () => void;
};

const links = [
  { href: "/", label: "Inicio" },
  { href: "/tienda", label: "Tienda" },
  { href: "/tienda?vista=ofertas", label: "Ofertas" },
  { href: "/servicio-tecnico", label: "Servicio técnico" },
];

function linkIsActive(pathname: string, vista: string | null, href: string, label: string) {
  if (label === "Inicio") return pathname === "/";
  if (label === "Tienda") return pathname === "/tienda" && vista !== "ofertas";
  if (label === "Ofertas") return pathname === "/tienda" && vista === "ofertas";
  if (label === "Favoritos") return pathname === "/favoritos";
  return pathname === href;
}

export function SiteHeader({
  query,
  onQueryChange,
  onSearch,
  session,
  onLogout,
  onCart,
}: SiteHeaderProps) {
  const { config } = useStoreConfig();
  const { count } = useCart();
  const { isAdmin } = useAdminAccess(session);
  const whatsappHref = `https://wa.me/${config.whatsapp}`;

  const instagramHref = `https://instagram.com/${config.instagram}`;

  return (
    <header id="inicio" className="sticky top-0 z-40 w-full">
      <TopTicker />
      <div className="border-b border-white/10 bg-black">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2 sm:px-6 sm:py-3 lg:flex-nowrap lg:gap-6">
        <MobileMenuButton />
        <GuardedLink href="/" className="shrink-0" aria-label="Movil zone, ir al inicio">
          <img src="/brand/logo-lockup.png" alt="" className="h-9 w-auto sm:h-14 lg:h-[4.5rem]" />
        </GuardedLink>

        <label className="relative order-3 min-w-0 w-full flex-1 basis-full lg:order-none lg:basis-0">
          <span className="sr-only">Buscar productos</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && onSearch) onSearch(query);
            }}
            placeholder="Buscar productos, marcas..."
            className="h-9 w-full rounded-full border border-white/15 bg-white/5 pr-11 pl-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-sky-400 focus:bg-white/10 sm:h-11 sm:pr-12 sm:pl-4"
          />
          {onSearch ? (
            <button
              type="button"
              aria-label="Buscar"
              onClick={() => onSearch(query)}
              className="absolute top-1/2 right-1 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-sky-500 text-white sm:right-1.5 sm:h-8 sm:w-8"
            >
              <SearchIcon />
            </button>
          ) : (
            <span className="absolute top-1/2 right-1 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-sky-500 text-white sm:right-1.5 sm:h-8 sm:w-8">
              <SearchIcon />
            </span>
          )}
        </label>

        <div className="ml-auto flex items-center gap-0.5 lg:ml-0 lg:gap-1">
          {isAdmin ? (
            <GuardedLink
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-400"
            >
              <GearIcon />
              Panel Admin
            </GuardedLink>
          ) : null}
          <span className="hidden lg:inline-flex">
            <AccountMenu session={session} onLogout={onLogout} />
          </span>
          <button
            type="button"
            onClick={onCart}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium text-white hover:bg-white/10 sm:px-3 sm:py-2"
          >
            <CartIcon />
            <span className="hidden sm:inline">Carrito</span>
            {count > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[11px] font-bold text-white">
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <nav className="hidden border-t border-white/10 lg:block" aria-label="Secciones">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-1.5 sm:gap-4 sm:px-6 sm:py-2">
          <SectionNav loggedIn={Boolean(session)} />
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={instagramHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Seguinos en Instagram"
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-extrabold tracking-wide text-white hover:bg-white/10 sm:px-3"
            >
              <InstagramIcon />
              <span className="hidden sm:inline">Seguinos</span>
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Contactanos por WhatsApp"
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-extrabold tracking-wide text-[#25D366] hover:bg-white/10 sm:px-3"
            >
              <WhatsAppIcon />
              <span className="hidden sm:inline">Contactanos</span>
            </a>
          </div>
        </div>
      </nav>
      </div>
    </header>
  );
}

const tickerMessages = [
  "🚚 Envíos en el día en General Pico y zona",
  "💳 10% de descuento pagando por la tienda",
  "🛠️ Servicio técnico especializado",
];

function TopTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % tickerMessages.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="overflow-hidden bg-sky-500 text-white" role="status" aria-live="polite">
      <p
        key={index}
        className="px-3 py-1.5 text-center text-[11px] font-semibold tracking-wide motion-safe:animate-[ticker-in_450ms_ease-out] sm:px-4 sm:py-2 sm:text-sm"
      >
        {tickerMessages[index]}
      </p>
    </div>
  );
}

function SectionNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  return (
    <Suspense fallback={<SectionLinks pathname={pathname} vista={null} loggedIn={loggedIn} />}>
      <SectionLinksLive pathname={pathname} loggedIn={loggedIn} />
    </Suspense>
  );
}

function SectionLinksLive({ pathname, loggedIn }: { pathname: string; loggedIn: boolean }) {
  const vista = useSearchParams().get("vista");
  return <SectionLinks pathname={pathname} vista={vista} loggedIn={loggedIn} />;
}

function GuardedLink({
  href,
  className,
  "aria-label": ariaLabel,
  children,
}: {
  href: string;
  className?: string;
  "aria-label"?: string;
  children: ReactNode;
}) {
  const publish = useAdminCatalogPublish();
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (!publish?.pending) return;
        event.preventDefault();
        publish.requestLeave(() => window.location.assign(href));
      }}
    >
      {children}
    </Link>
  );
}

function SectionLinks({
  pathname,
  vista,
  loggedIn,
}: {
  pathname: string;
  vista: string | null;
  loggedIn: boolean;
}) {
  const publish = useAdminCatalogPublish();
  const items = loggedIn
    ? [...links, { href: "/favoritos", label: "Favoritos" }]
    : links;
  return (
    <div className="flex min-w-0 gap-1 overflow-x-auto">
      {items.map((link) => {
        const active = linkIsActive(pathname, vista, link.href, link.label);
        return (
          <a
            key={link.label}
            href={link.href}
            onClick={(event) => {
              event.preventDefault();
              const go = () => window.location.assign(link.href);
              if (publish?.pending) publish.requestLeave(go);
              else go();
            }}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm ${
              active ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {link.label}
          </a>
        );
      })}
    </div>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="7" cy="7" r="4" />
      <path d="m10.2 10.2 2.6 2.6" strokeLinecap="round" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <defs>
        <linearGradient id="ig-header" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#f9ce34" />
          <stop offset="50%" stopColor="#ee2a7b" />
          <stop offset="100%" stopColor="#6228d7" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="url(#ig-header)" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="url(#ig-header)" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1" fill="url(#ig-header)" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#25D366"
        d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.9c-.24.68-1.4 1.25-1.93 1.33-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.7-4.1-4.84-4.29-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07 1-2.35.24-.26.64-.38.85-.38.21 0 .42 0 .6.01.19.01.45-.07.7.53.26.64.88 2.2.96 2.36.08.16.13.35.03.56-.1.21-.15.34-.3.52-.15.18-.31.4-.44.54-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.49.22.56.34.07.13.07.73-.17 1.41z"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 4h1.2l1 6.5a.8.8 0 0 0 .8.6h5.4a.8.8 0 0 0 .8-.6L13.4 6H5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="13" r=".8" fill="currentColor" stroke="none" />
      <circle cx="11" cy="13" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}
