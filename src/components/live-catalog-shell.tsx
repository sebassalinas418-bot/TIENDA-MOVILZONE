"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminCatalogPublishProvider } from "@/lib/admin-catalog-publish";
import { CatalogProvider } from "@/lib/offers";

/** El catálogo se hidrata en el cliente. Evita bloquear el layout con Suspense/RSC. */
export function LiveCatalogShell({ children }: { children: ReactNode }) {
  return (
    <CatalogProvider>
      <AdminPathPublish>{children}</AdminPathPublish>
    </CatalogProvider>
  );
}

function AdminPathPublish({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!pathname.startsWith("/admin")) return children;
  return <AdminCatalogPublishProvider>{children}</AdminCatalogPublishProvider>;
}
