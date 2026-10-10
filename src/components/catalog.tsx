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
import { readSession, signOut, type DemoSession } from "@/lib/session";

export function Catalog() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<DemoSession | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const { addItem, openCart, closeCart } = useCart();

  useEffect(() => {
    setSession(readSession());
  }, []);

  function handleAddToCart(product: CatalogProduct) {
    if (!session) {
      setLoginOpen(true);
      return;
    }
    if (!product.inStock) return;
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
    const term = value.trim();
    router.push(term ? `/tienda?q=${encodeURIComponent(term)}` : "/tienda");
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
