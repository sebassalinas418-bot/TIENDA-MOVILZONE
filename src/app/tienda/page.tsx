import { Suspense } from "react";
import { StoreCatalog } from "@/components/store-catalog";

export default function TiendaPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f7f8fa]" />}>
      <StoreCatalog />
    </Suspense>
  );
}
