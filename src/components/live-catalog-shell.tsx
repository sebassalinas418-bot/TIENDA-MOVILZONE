import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { CatalogProvider } from "@/lib/offers";
import { readStoreOverlayHidden } from "@/services/store-overlay/server";
import { readStorefrontCatalog } from "@/services/taller-gestio/storefront-catalog";

async function LiveCatalogData({ children }: { children: ReactNode }) {
  await connection();
  const [initialRemote, overlayHidden] = await Promise.all([
    readStorefrontCatalog().catch(() => null),
    readStoreOverlayHidden().catch(() => []),
  ]);
  return (
    <CatalogProvider initialRemote={initialRemote} initialHidden={overlayHidden ?? []}>
      {children}
    </CatalogProvider>
  );
}

export function LiveCatalogShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<CatalogProvider>{children}</CatalogProvider>}>
      <LiveCatalogData>{children}</LiveCatalogData>
    </Suspense>
  );
}
