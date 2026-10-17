"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BusinessSettings } from "@/components/admin-business";
import { AdminCustomers } from "@/components/admin-customers";
import { AdminRedes } from "@/components/admin-redes";
import { StoreCatalog } from "@/components/store-catalog";
import { SiteFrame } from "@/components/site-frame";
import { AdminCatalogSearchProvider } from "@/lib/admin-catalog-search";
import { describeStock, formatPrice } from "@/data/products";
import { useAdminAccess } from "@/lib/admin-access";
import { useCatalog } from "@/lib/offers";
import { useOrders, type OrderStatus } from "@/lib/orders";

const statusLabel: Record<OrderStatus, string> = {
  pendiente: "Pendiente de confirmación",
  aprobado: "Aprobado / Completado",
  cancelado: "Cancelado",
};

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

type AdminSection = "pedidos" | "negocio" | "tienda" | "correos" | "redes";

const sectionCopy: Record<AdminSection, { title: string; text: string }> = {
  pedidos: {
    title: "Pedidos",
    text: "Los pedidos llegan pendientes. El stock del catálogo se descuenta recién cuando confirmás el pago.",
  },
  negocio: {
    title: "Negocio",
    text: "Actualizá la dirección, el teléfono, WhatsApp, Instagram y los horarios que ve la tienda.",
  },
  tienda: {
    title: "Tienda",
    text: "El mismo catálogo que ve el cliente, con categorías, precios, ofertas y stock editables.",
  },
  correos: {
    title: "Correos",
    text: "Clientes registrados en la tienda web y si ya confirmaron el correo. No forma parte de TallerGestio.",
  },
  redes: {
    title: "Redes",
    text: "Publicaciones de Instagram con Gemini. Solo el administrador ve esta sección.",
  },
};

export function AdminOrders() {
  const { isAdmin, ready } = useAdminAccess();
  const searchParams = useSearchParams();
  const [section, setSection] = useState<AdminSection>("tienda");
  const searchQ = searchParams.get("q")?.trim() ?? "";

  useEffect(() => {
    if (searchQ) setSection("tienda");
  }, [searchQ]);

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
        <header>
          <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
            <p className="text-xs font-semibold tracking-[0.16em] text-sky-600 uppercase">Administración</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">Panel Admin</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600">
              Esta sección es solo para administradores. Entrá con la cuenta admin o activá el modo administrador desde Mi cuenta.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-full bg-sky-500 px-4 py-2 text-sm font-bold text-white hover:bg-sky-400"
            >
              Volver a la tienda
            </Link>
          </div>
        </header>
      </SiteFrame>
    );
  }

  return (
    <AdminCatalogSearchProvider initialQuery={searchQ}>
    <SiteFrame>
      <header>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-xs font-semibold tracking-[0.16em] text-sky-600 uppercase">Administración</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">{sectionCopy[section].title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600">{sectionCopy[section].text}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {(
              [
                ["pedidos", "Pedidos"],
                ["negocio", "Negocio"],
                ["tienda", "Tienda"],
                ["correos", "Correos"],
                ["redes", "Redes"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  section === id ? "bg-sky-500 text-white" : "bg-neutral-950 text-white hover:bg-neutral-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>
      {section === "tienda" ? (
        <Suspense fallback={null}>
          <StoreCatalog admin />
        </Suspense>
      ) : section === "redes" ? (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <AdminRedes />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          {section === "negocio" ? (
            <BusinessSettings />
          ) : section === "correos" ? (
            <AdminCustomers />
          ) : (
            <OrdersPanel />
          )}
        </div>
      )}
    </SiteFrame>
    </AdminCatalogSearchProvider>
  );
}

function OrdersPanel() {
  const { orders, stock, approveOrder, cancelOrder } = useOrders();
  const { products } = useCatalog();
  const pending = orders.filter((order) => order.status === "pendiente");
  const history = orders.filter((order) => order.status !== "pendiente");

  return (
      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-bold text-gray-900">Pendientes ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
              No hay pedidos esperando confirmación.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {pending.map((order) => (
                <li key={order.id}>
                  <OrderCard orderId={order.id} onApprove={() => approveOrder(order.id)} onCancel={() => cancelOrder(order.id)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {history.length > 0 ? (
          <section>
            <h2 className="text-lg font-bold text-gray-900">Historial</h2>
            <ul className="mt-3 space-y-3">
              {history.map((order) => (
                <li key={order.id}>
                  <OrderCard orderId={order.id} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h2 className="text-lg font-bold text-gray-900">Stock del catálogo</h2>
          <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
            {products.map((product) => {
              const quantity = stock[product.id] ?? product.stock;
              const label = describeStock(quantity).stockLabel;
              return (
                <li key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm font-medium text-gray-900">{product.title}</span>
                  <span className={`text-sm font-semibold ${quantity > 0 ? "text-sky-600" : "text-gray-400"}`}>
                    {quantity} · {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
  );
}

function OrderCard({
  orderId,
  onApprove,
  onCancel,
}: {
  orderId: string;
  onApprove?: () => void;
  onCancel?: () => void;
}) {
  const { orders } = useOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) return null;

  const tone =
    order.status === "pendiente"
      ? "bg-sky-50 text-sky-700"
      : order.status === "aprobado"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-gray-100 text-gray-500";

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-gray-900">{order.id}</p>
          <p className="mt-0.5 text-xs text-gray-400">{formatWhen(order.createdAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{statusLabel[order.status]}</span>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-gray-700">
        {order.items.map((item) => (
          <li key={item.productId} className="flex justify-between gap-3">
            <span>
              {item.title} × {item.quantity}
            </span>
            <span className="font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-gray-500">{order.deliveryText}</p>
      <p className="mt-1 text-right text-base font-bold text-gray-900">{formatPrice(order.total)}</p>
      {order.status === "pendiente" && onApprove && onCancel ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onApprove}
            className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-400"
          >
            Confirmar Pago y Aprobar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancelar pedido
          </button>
        </div>
      ) : null}
    </article>
  );
}
