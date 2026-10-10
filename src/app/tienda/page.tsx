import { Suspense } from "react";
import { StoreCatalog } from "@/components/store-catalog";

export default function TiendaPage() {
  return (
    <Suspense fallback={null}>
      <StoreCatalog />
    </Suspense>
  );
}
