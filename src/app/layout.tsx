import type { Metadata } from "next";
import { StoreConfigProvider } from "@/config/store-config";
import { CartProvider } from "@/lib/cart";
import { OrdersProvider } from "@/lib/orders";
import { CartDrawer } from "@/components/cart-drawer";
import { StoreMobileChrome } from "@/components/mobile-nav/store-mobile-chrome";
import { LiveCatalogShell } from "@/components/live-catalog-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movil zone",
  description: "Catálogo de productos de Movil zone",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f7f8fa] font-sans text-gray-900">
        <StoreConfigProvider>
          <OrdersProvider>
            <LiveCatalogShell>
              <CartProvider>
                <StoreMobileChrome>
                  {children}
                  <CartDrawer />
                </StoreMobileChrome>
              </CartProvider>
            </LiveCatalogShell>
          </OrdersProvider>
        </StoreConfigProvider>
      </body>
    </html>
  );
}
