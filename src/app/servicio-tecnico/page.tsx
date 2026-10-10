import type { Metadata } from "next";
import { RepairView } from "@/components/repair-view";
import { SiteFrame } from "@/components/site-frame";

export const metadata: Metadata = {
  title: "Servicio técnico · Movil zone",
};

export default function ServicioTecnicoPage() {
  return (
    <SiteFrame>
      <RepairView />
    </SiteFrame>
  );
}
