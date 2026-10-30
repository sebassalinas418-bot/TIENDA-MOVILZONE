import type { ReactNode } from "react";
import { AdminCatalogPublishProvider } from "@/lib/admin-catalog-publish";
import { CatalogProvider } from "@/lib/offers";

/** El catálogo se hidrata en el cliente. Evita bloquear el layout con Suspense/RSC. */
export function LiveCatalogShell({ children }: { children: ReactNode }) {
  return (
    <CatalogProvider>
      <AdminCatalogPublishProvider>{children}</AdminCatalogPublishProvider>
    </CatalogProvider>
  );
}
