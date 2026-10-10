import { Suspense } from "react";
import { InfoScreen } from "@/components/info-screens";

export default function InformacionPage() {
  return (
    <Suspense fallback={null}>
      <InfoScreen />
    </Suspense>
  );
}
