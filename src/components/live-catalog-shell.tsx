import type { ReactNode } from "react";
import { CatalogProvider } from "@/lib/offers";

/** El catálogo se hidrata en el cliente. Evita bloquear el layout con Suspense/RSC. */
export function LiveCatalogShell({ children }: { children: ReactNode }) {
  return <CatalogProvider>{children}</CatalogProvider>;
}
