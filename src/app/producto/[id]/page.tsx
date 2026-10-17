import { Suspense } from "react";
import { SiteFrame } from "@/components/site-frame";
import { ProductDetailScreen } from "@/components/product-detail-screen";

export default function ProductoPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f7f8fa]" />}>
      <SiteFrame>
        <ProductDetailScreen />
      </SiteFrame>
    </Suspense>
  );
}
