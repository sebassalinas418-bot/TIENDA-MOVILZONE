import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { CatalogProvider } from "@/lib/offers";
import { readStoreOverlayHidden } from "@/services/store-overlay/server";
import { readStorefrontCatalog } from "@/services/taller-gestio/storefront-catalog";

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function LiveCatalogData({ children }: { children: ReactNode }) {
  await connection();
  const [initialRemote, overlayHidden] = await Promise.all([
    withTimeout(readStorefrontCatalog(), 4000).catch(() => null),
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
