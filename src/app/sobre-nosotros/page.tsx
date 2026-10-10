import type { Metadata } from "next";
import { AboutScreen } from "@/components/info-screens";

export const metadata: Metadata = {
  title: "Sobre nosotros · Movil zone",
};

export default function SobreNosotrosPage() {
  return <AboutScreen />;
}
