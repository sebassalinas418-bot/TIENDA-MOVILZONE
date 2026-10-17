"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BenefitRow } from "@/components/home-hero";
import { FeaturedProducts, HomeSlider, RepairInvite, TrustStrip } from "@/components/home-cover";
import { LoginPrompt } from "@/components/login-prompt";
import { SiteHeader } from "@/components/site-header";
import { PageSkyFade } from "@/components/site-frame";
import { SiteFooter } from "@/components/store-sections";
import type { CatalogProduct } from "@/lib/offers";
import { useCart } from "@/lib/cart";
import { useAdminAccess } from "@/lib/admin-access";
import { readSession, SESSION_EVENT, signOut, type DemoSession } from "@/lib/session";
import { storeSearchPath } from "@/lib/store-search-path";

export function Catalog() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<DemoSession | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const { addItem, openCart, closeCart } = useCart();
  const { isAdmin } = useAdminAccess();

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    return () => window.removeEventListener(SESSION_EVENT, sync);
  }, []);

  function handleAddToCart(product: CatalogProduct) {
    if (!session) {
      setLoginOpen(true);
      return;
    }
    if (!product.inStock || product.pendingHold) return;
    addItem(product.id);
  }

  function handleCart() {
    if (!session) {
      setLoginOpen(true);
      return;
    }
    openCart();
  }

  function searchStore(value: string) {
    router.push(storeSearchPath(value, isAdmin));
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f7f8fa] text-gray-900">
      <SiteHeader
        query={query}
        onQueryChange={setQuery}
        onSearch={searchStore}
        session={session}
        onLogout={() => {
          signOut();
          setSession(null);
          closeCart();
        }}
        onCart={handleCart}
      />

      <div className="relative">
        <PageSkyFade />
        <div className="relative">
          <HomeSlider />
          <BenefitRow />
          <FeaturedProducts onAddToCart={handleAddToCart} />
          <RepairInvite />
          <TrustStrip />
        </div>
      </div>

      <SiteFooter />

      <LoginPrompt
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onAccept={() => router.push("/login")}
      />
    </div>
  );
}
