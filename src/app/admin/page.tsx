import type { Metadata } from "next";
import { AdminOrders } from "@/components/admin-orders";

export const metadata: Metadata = {
  title: "Panel Admin · Movil zone",
};

export default function AdminPage() {
  return <AdminOrders />;
}
