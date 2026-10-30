import type { ReactNode } from "react";
import { AdminCategoryRelocator } from "@/components/admin-category-relocator";
import { AdminCatalogPublishProvider } from "@/lib/admin-catalog-publish";
import { CatalogProvider } from "@/lib/offers";

/** El catálogo se hidrata en el cliente. Evita bloquear el layout con Suspense/RSC. */
export function LiveCatalogShell({ children }: { children: ReactNode }) {
  return (
    <CatalogProvider>
      <AdminCatalogPublishProvider>
        {children}
        <AdminCategoryRelocator />
      </AdminCatalogPublishProvider>
    </CatalogProvider>
  );
}
