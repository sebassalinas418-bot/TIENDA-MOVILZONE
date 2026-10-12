"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { LoginPrompt } from "@/components/login-prompt";
import { SiteFrame } from "@/components/site-frame";
import { useCatalog } from "@/lib/offers";
import { useCart } from "@/lib/cart";
import { useFavoriteIds } from "@/lib/store-favorites/use-favorite";
import { isSessionVerified, readSession, SESSION_EVENT, type DemoSession } from "@/lib/session";

export function FavoritesView() {
  const router = useRouter();
  const { products } = useCatalog();
  const { addItem, openCart } = useCart();
  const ids = useFavoriteIds();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [ready, setReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSession(readSession());
      setReady(true);
    };
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    return () => window.removeEventListener(SESSION_EVENT, sync);
  }, []);

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, router, session]);

  const favorites = products.filter((product) => ids.includes(product.id) && !product.storeHidden);

  return (
    <SiteFrame>
      <main className="mx-auto w-full max-w-6xl px-3 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Favoritos</h1>
        <p className="mt-1 text-sm text-neutral-600">Los productos que marcaste con el corazón.</p>
        {favorites.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            Todavía no agregaste favoritos.
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-1.5 sm:gap-4 xl:grid-cols-3">
            {favorites.map((product) => (
              <li key={product.id} className="min-w-0">
                <ProductCard
                  product={product}
                  onAddToCart={() => {
                    if (!session) {
                      setLoginOpen(true);
                      return;
                    }
                    if (!isSessionVerified(session)) {
                      router.push("/mi-cuenta");
                      return;
                    }
                    if (!product.inStock || product.pendingHold) return;
                    addItem(product.id);
                    openCart();
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
      <LoginPrompt
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onAccept={() => router.push("/login")}
      />
    </SiteFrame>
  );
}
