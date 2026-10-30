"use client";

import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { LoginPrompt } from "@/components/login-prompt";
import { useStoreConfig } from "@/config/store-config";
import { useAdminCatalogPublish } from "@/lib/admin-catalog-publish";
import { emitAdminCatalogFilter } from "@/lib/admin-catalog-search";
import { readSession } from "@/lib/session";

const MobileNavContext = createContext<{ openDrawer: () => void } | null>(null);

export function useMobileNav() {
  return useContext(MobileNavContext);
}

export function StoreMobileChrome({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <MobileNavContext.Provider value={{ openDrawer: () => setDrawerOpen(true) }}>
      <div className="pb-[calc(3.85rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        {children}
      </div>
      <Suspense fallback={null}>
        <MobileChromeLive
          drawerOpen={drawerOpen}
          loginOpen={loginOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
          onLoginOpen={() => setLoginOpen(true)}
          onLoginClose={() => setLoginOpen(false)}
        />
      </Suspense>
    </MobileNavContext.Provider>
  );
}

function MobileChromeLive({
  drawerOpen,
  loginOpen,
  onCloseDrawer,
  onLoginOpen,
  onLoginClose,
}: {
  drawerOpen: boolean;
  loginOpen: boolean;
  onCloseDrawer: () => void;
  onLoginOpen: () => void;
  onLoginClose: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    onCloseDrawer();
  }, [pathname]);

  if (pathname.startsWith("/admin")) {
    return <MobileDrawer open={drawerOpen} onClose={onCloseDrawer} admin />;
  }

  return (
    <>
      <MobileDrawer open={drawerOpen} onClose={onCloseDrawer} />
      <MobileBottomNav
        onAccount={() => {
          const session = readSession();
          if (session) {
            window.location.assign("/mi-cuenta");
            return;
          }
          onLoginOpen();
        }}
      />
      <LoginPrompt
        open={loginOpen}
        onClose={onLoginClose}
        onAccept={() => {
          onLoginClose();
          window.location.assign("/login");
        }}
      />
    </>
  );
}

export function MobileMenuButton() {
  const nav = useMobileNav();
  if (!nav) return null;
  return (
    <Suspense fallback={null}>
      <MobileMenuButtonLive openDrawer={nav.openDrawer} />
    </Suspense>
  );
}

function MobileMenuButtonLive({ openDrawer }: { openDrawer: () => void }) {
  return (
    <button
      type="button"
      aria-label="Abrir menú"
      onClick={openDrawer}
      className="mr-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10 lg:hidden"
    >
      <HamburgerIcon />
    </button>
  );
}

function MobileDrawer({ open, onClose, admin = false }: { open: boolean; onClose: () => void; admin?: boolean }) {
  const { config } = useStoreConfig();
  const publish = useAdminCatalogPublish();
  const [tab, setTab] = useState<"categorias" | "menu">("categorias");
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, open]);

  if (!open) return null;

  function go(href: string) {
    const leave = () => {
      onClose();
      window.location.assign(href);
    };
    if (publish?.pending) {
      onClose();
      publish.requestLeave(() => window.location.assign(href));
      return;
    }
    leave();
  }

  function pickCategory(next: Parameters<typeof emitAdminCatalogFilter>[0]) {
    if (admin) {
      emitAdminCatalogFilter(next);
      onClose();
      return;
    }
    if (next.kind === "all") go("/tienda");
    else if (next.kind === "sub") {
      go(`/tienda?categoria=${encodeURIComponent(next.categoryId)}&sub=${encodeURIComponent(next.subcategoryId)}`);
    } else {
      go(`/tienda?categoria=${encodeURIComponent(next.categoryId)}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <button
        type="button"
        aria-label="Cerrar menú"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú de la tienda"
        className="absolute inset-y-0 left-0 flex w-[min(20.5rem,88vw)] flex-col bg-[#141414] text-white shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <img src="/brand/logo-lockup.png" alt="" className="h-9 w-auto" />
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white"
          >
            ×
          </button>
        </div>

        {admin ? (
          <p className="border-b border-white/10 px-4 py-3 text-[11px] font-bold tracking-[0.14em] text-white">
            CATEGORÍAS
          </p>
        ) : (
        <div className="grid grid-cols-2 border-b border-white/10 px-4">
          <button
            type="button"
            onClick={() => setTab("categorias")}
            className={`py-3 text-[11px] font-bold tracking-[0.14em] ${
              tab === "categorias" ? "border-b-2 border-white text-white" : "text-white/45"
            }`}
          >
            CATEGORÍAS
          </button>
          <button
            type="button"
            onClick={() => setTab("menu")}
            className={`py-3 text-[11px] font-bold tracking-[0.14em] ${
              tab === "menu" ? "border-b-2 border-white text-white" : "text-white/45"
            }`}
          >
            MENÚ
          </button>
        </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "categorias" || admin ? (
            <ul>
              {admin ? (
                <li className="border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => pickCategory({ kind: "all" })}
                    className="w-full px-4 py-3.5 text-left text-[13px] font-semibold tracking-wide uppercase"
                  >
                    Todos los productos
                  </button>
                </li>
              ) : null}
              {config.categories.map((item) => {
                const open = expanded.includes(item.id);
                const hasChildren = item.children.length > 0;
                return (
                  <li key={item.id} className="border-b border-white/10">
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        onClick={() => pickCategory({ kind: "category", categoryId: item.id })}
                        className="flex-1 px-4 py-3.5 text-left text-[13px] font-semibold tracking-wide uppercase"
                      >
                        {item.name}
                      </button>
                      {hasChildren ? (
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={`Ver subcategorías de ${item.name}`}
                          onClick={() =>
                            setExpanded((current) =>
                              current.includes(item.id)
                                ? current.filter((id) => id !== item.id)
                                : [...current, item.id],
                            )
                          }
                          className="px-4 text-white/70"
                        >
                          <Chevron open={open} />
                        </button>
                      ) : null}
                    </div>
                    {hasChildren && open ? (
                      <ul className="bg-black/25 pb-2">
                        {item.children.map((child) => (
                          <li key={child.id}>
                            <button
                              type="button"
                              onClick={() =>
                                pickCategory({
                                  kind: "sub",
                                  categoryId: item.id,
                                  subcategoryId: child.id,
                                })
                              }
                              className="w-full px-6 py-2.5 text-left text-sm font-medium text-white/80"
                            >
                              {child.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <nav className="py-2">
              {[
                { href: "/", label: "Inicio" },
                { href: "/tienda", label: "Tienda" },
                { href: "/tienda?vista=ofertas", label: "Ofertas" },
                { href: "/servicio-tecnico", label: "Servicio técnico" },
                ...(readSession() ? [{ href: "/favoritos", label: "Favoritos" }] : []),
              ].map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => go(link.href)}
                  className="block w-full border-b border-white/10 px-4 py-3.5 text-left text-[13px] font-semibold tracking-wide uppercase"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </aside>
    </div>
  );
}

function MobileBottomNav({ onAccount }: { onAccount: () => void }) {
  const pathname = usePathname();
  const { config } = useStoreConfig();
  const whatsappHref = `https://wa.me/${config.whatsapp}`;

  const home = pathname === "/";
  const shop = pathname === "/tienda";
  const account = pathname.startsWith("/mi-cuenta") || pathname.startsWith("/login");

  return (
    <nav
      aria-label="Navegación rápida"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#111] text-white lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        <li>
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault();
              window.location.assign("/");
            }}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${home ? "text-white" : "text-white/55"}`}
          >
            <HomeIcon />
            Inicio
          </a>
        </li>
        <li>
          <a
            href="/tienda"
            onClick={(event) => {
              event.preventDefault();
              window.location.assign("/tienda");
            }}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${shop ? "text-white" : "text-white/55"}`}
          >
            <StoreIcon />
            Tienda
          </a>
        </li>
        <li>
          <button
            type="button"
            onClick={onAccount}
            className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${account ? "text-white" : "text-white/55"}`}
          >
            <UserIcon />
            Mi cuenta
          </button>
        </li>
        <li>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-[#25D366]"
          >
            <WhatsAppIcon />
            WhatsApp
          </a>
        </li>
      </ul>
    </nav>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M4 6.5 8 10.5 12 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" strokeLinejoin="round" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M4 7h16l-1 13H5L4 7z" strokeLinejoin="round" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.2c1.2-3.3 3.7-5 7-5s5.8 1.7 7 5" strokeLinecap="round" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.9c-.24.68-1.4 1.25-1.93 1.33-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.7-4.1-4.84-4.29-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07 1-2.35.24-.26.64-.38.85-.38.21 0 .42 0 .6.01.19.01.45-.07.7.53.26.64.88 2.2.96 2.36.08.16.13.35.03.56-.1.21-.15.34-.3.52-.15.18-.31.4-.44.54-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.49.22.56.34.07.13.07.73-.17 1.41z"
      />
    </svg>
  );
}
