import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { StoreConfigProvider } from "@/config/store-config";
import { CartProvider } from "@/lib/cart";
import { CatalogProvider } from "@/lib/offers";
import { OrdersProvider } from "@/lib/orders";
import { CartDrawer } from "@/components/cart-drawer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Movil zone",
  description: "Catálogo de productos de Movil zone",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f7f8fa] font-sans text-gray-900">
        <StoreConfigProvider>
          <OrdersProvider>
            <CatalogProvider>
              <CartProvider>
                {children}
                <CartDrawer />
              </CartProvider>
            </CatalogProvider>
          </OrdersProvider>
        </StoreConfigProvider>
      </body>
    </html>
  );
}
