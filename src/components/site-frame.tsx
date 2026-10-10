"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoginPrompt } from "@/components/login-prompt";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/store-sections";
import { isSessionVerified, readSession, SESSION_EVENT, signOut, type DemoSession } from "@/lib/session";
import { useCart } from "@/lib/cart";

export function PageSkyFade() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-gradient-to-b from-sky-300 via-sky-100 to-[#f7f8fa]"
    />
  );
}

export function SiteFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<DemoSession | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const { openCart, closeCart } = useCart();

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    return () => window.removeEventListener(SESSION_EVENT, sync);
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f7f8fa] text-gray-900">
      <SiteHeader
        query={query}
        onQueryChange={setQuery}
        onSearch={(value) => {
          const next = value.trim();
          router.push(next ? `/tienda?q=${encodeURIComponent(next)}` : "/tienda");
        }}
        session={session}
        onLogout={() => {
          signOut();
          setSession(null);
          closeCart();
        }}
        onCart={() => {
          if (!session) {
            setLoginOpen(true);
            return;
          }
          if (!isSessionVerified(session)) {
            router.push("/mi-cuenta");
            return;
          }
          openCart();
        }}
      />
      <div className="relative flex-1">
        <PageSkyFade />
        <div className="relative">{children}</div>
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
