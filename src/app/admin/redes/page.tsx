"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminRedes } from "@/components/admin-redes";
import { SiteFrame } from "@/components/site-frame";
import { useAdminAccess } from "@/lib/admin-access";

export default function AdminRedesPage() {
  const router = useRouter();
  const { isAdmin, ready } = useAdminAccess();

  useEffect(() => {
    if (!ready) return;
    if (!isAdmin) router.replace("/");
  }, [isAdmin, ready, router]);

  if (!ready) {
    return (
      <SiteFrame>
        <div className="min-h-40" />
      </SiteFrame>
    );
  }

  if (!isAdmin) {
    return (
      <SiteFrame>
        <div className="mx-auto w-full max-w-3xl px-4 py-16">
          <h1 className="text-2xl font-bold">No autorizado</h1>
          <p className="mt-2 text-sm text-gray-600">Redes es solo para el administrador de la tienda.</p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-sky-500 px-4 py-2 text-sm font-bold text-white">
            Volver a la tienda
          </Link>
        </div>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-sky-600 uppercase">Administración</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">Redes</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600">
          CRM de publicaciones con Gemini. Solo visible para el administrador. No mueve stock.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-semibold text-sky-700 hover:underline">
          Volver al panel
        </Link>
        <div className="mt-8">
          <AdminRedes />
        </div>
      </div>
    </SiteFrame>
  );
}
