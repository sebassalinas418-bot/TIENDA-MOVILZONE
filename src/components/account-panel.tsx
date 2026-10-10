"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFrame } from "@/components/site-frame";
import { formatPrice } from "@/data/products";
import {
  isSessionVerified,
  openCustomerSession,
  readSession,
  signOut,
  type DemoSession,
} from "@/lib/session";
import type { StoreCustomerOrder, StoreCustomerPublic } from "@/services/store-customers/types";

type Section =
  | "escritorio"
  | "pedidos"
  | "descargas"
  | "direccion"
  | "cuenta"
  | "favoritos"
  | "espera"
  | "corriente"
  | "facturas";

const nav: { id: Section; label: string }[] = [
  { id: "escritorio", label: "Escritorio" },
  { id: "pedidos", label: "Pedidos" },
  { id: "descargas", label: "Descargas" },
  { id: "direccion", label: "Dirección" },
  { id: "cuenta", label: "Detalles de la cuenta" },
  { id: "favoritos", label: "Lista de favoritos" },
  { id: "espera", label: "En la lista de espera" },
  { id: "corriente", label: "Cuenta Corriente" },
  { id: "facturas", label: "Facturas" },
];

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(date);
}

export function AccountPanel() {
  const router = useRouter();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [section, setSection] = useState<Section>("pedidos");
  const [profile, setProfile] = useState<StoreCustomerPublic | null>(null);
  const [orders, setOrders] = useState<StoreCustomerOrder[]>([]);
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [devLink, setDevLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressZip, setAddressZip] = useState("");

  useEffect(() => {
    const current = readSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
    setName(current.name);
  }, [router]);

  useEffect(() => {
    if (!session?.email) return;
    let cancel = false;
    void (async () => {
      const [profileRes, ordersRes] = await Promise.all([
        fetch("/api/store-auth/me", { credentials: "include" }),
        fetch("/api/store-auth/orders", { credentials: "include" }),
      ]);
      const profileBody = (await profileRes.json()) as { ok?: boolean; customer?: StoreCustomerPublic };
      const ordersBody = (await ordersRes.json()) as { ok?: boolean; orders?: StoreCustomerOrder[] };
      if (cancel) return;
      if (profileBody.customer) {
        setProfile(profileBody.customer);
        setName(profileBody.customer.name || session.name);
        setAlias(profileBody.customer.alias || "");
        setPhone(profileBody.customer.phone || "");
        setAddressLine(profileBody.customer.addressLine || "");
        setAddressCity(profileBody.customer.addressCity || "");
        setAddressZip(profileBody.customer.addressZip || "");
      }
      setOrders(ordersBody.orders ?? []);
    })();
    return () => {
      cancel = true;
    };
  }, [session]);

  const verified = profile ? profile.verified : isSessionVerified(session);
  const displayName = alias || name || session?.name || "Cliente";

  async function saveProfile() {
    if (!session) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/store-auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          alias,
          phone,
          addressLine,
          addressCity,
          addressZip,
        }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string; customer?: StoreCustomerPublic };
      if (!body.ok) {
        setError(body.error || "No se pudo guardar.");
        return;
      }
      if (body.customer) setProfile(body.customer);
      openCustomerSession(name.trim() || session.name, session.email, verified);
      setNotice("Datos guardados.");
    } catch {
      setError("No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmEmail() {
    if (!session) return;
    setError("");
    setNotice("");
    setDevLink("");
    const response = await fetch("/api/store-auth/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session.email }),
    });
    const body = (await response.json()) as {
      ok?: boolean;
      error?: string;
      mailed?: boolean;
      devVerifyUrl?: string;
    };
    if (!body.ok) {
      setError(body.error || "No se pudo enviar el correo.");
      return;
    }
    setNotice(body.mailed ? "Te enviamos el enlace de confirmación." : "Generamos el enlace de confirmación.");
    if (body.devVerifyUrl) setDevLink(body.devVerifyUrl);
  }

  if (!session) return <SiteFrame><div className="min-h-40" /></SiteFrame>;

  return (
    <SiteFrame>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-center text-2xl font-bold tracking-[0.18em] text-sky-600 uppercase">Mi cuenta</h1>

        <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside>
            <p className="text-sm font-semibold text-neutral-950">{displayName}</p>
            <p className="mt-0.5 truncate text-xs text-gray-500">{session.email}</p>
            <nav className="mt-6 space-y-1">
              {nav.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`block w-full rounded-lg px-2 py-2 text-left text-sm ${
                    section === item.id ? "font-semibold text-sky-600" : "text-neutral-700 hover:text-sky-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  signOut();
                  router.push("/");
                }}
                className="block w-full rounded-lg px-2 py-2 text-left text-sm text-neutral-700 hover:text-rose-700"
              >
                Cerrar sesión
              </button>
            </nav>
          </aside>

          <section>
            {!verified ? (
              <div className="mb-5 flex flex-col gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm text-white sm:flex-row sm:items-center sm:justify-between">
                <p>Confirmá tu dirección de correo electrónico para comprobar si hay pedidos anteriores.</p>
                <button type="button" onClick={() => void confirmEmail()} className="shrink-0 font-bold underline">
                  Confirmar dirección de correo electrónico
                </button>
              </div>
            ) : null}
            {notice ? <p className="mb-3 text-sm text-emerald-700">{notice}</p> : null}
            {devLink ? (
              <p className="mb-3 text-xs text-gray-600">
                Enlace:{" "}
                <a href={devLink} className="font-semibold text-sky-700 underline">
                  verificar correo
                </a>
              </p>
            ) : null}
            {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}

            {section === "escritorio" ? (
              <div>
                <p className="text-sm leading-6 text-gray-600">
                  Hola {displayName}. Desde acá ves tus pedidos, datos y dirección de la tienda.
                </p>
                <OrdersTable orders={orders.slice(0, 3)} openOrder={openOrder} onOpen={setOpenOrder} />
                {orders.length > 3 ? (
                  <button type="button" onClick={() => setSection("pedidos")} className="mt-4 text-sm font-semibold text-sky-700">
                    Ver todos los pedidos
                  </button>
                ) : null}
              </div>
            ) : null}

            {section === "pedidos" ? (
              <OrdersTable orders={orders} openOrder={openOrder} onOpen={setOpenOrder} />
            ) : null}

            {section === "cuenta" ? (
              <form
                className="max-w-lg space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveProfile();
                }}
              >
                <label className="block text-sm font-medium">
                  Nombre
                  <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500" />
                </label>
                <label className="block text-sm font-medium">
                  Alias
                  <input value={alias} onChange={(event) => setAlias(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500" />
                </label>
                <label className="block text-sm font-medium">
                  Correo
                  <input value={session.email} readOnly className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-gray-600" />
                </label>
                <button type="submit" disabled={saving} className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </form>
            ) : null}

            {section === "direccion" ? (
              <form
                className="max-w-lg space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveProfile();
                }}
              >
                <label className="block text-sm font-medium">
                  Teléfono
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500" />
                </label>
                <label className="block text-sm font-medium">
                  Dirección
                  <input value={addressLine} onChange={(event) => setAddressLine(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Ciudad
                    <input value={addressCity} onChange={(event) => setAddressCity(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500" />
                  </label>
                  <label className="block text-sm font-medium">
                    Código postal
                    <input value={addressZip} onChange={(event) => setAddressZip(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500" />
                  </label>
                </div>
                <button type="submit" disabled={saving} className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar dirección"}
                </button>
              </form>
            ) : null}

            {section === "descargas" || section === "favoritos" || section === "espera" || section === "corriente" || section === "facturas" ? (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
                Esta sección todavía no tiene movimientos.
              </p>
            ) : null}
          </section>
        </div>
      </main>
    </SiteFrame>
  );
}

function OrdersTable({
  orders,
  openOrder,
  onOpen,
}: {
  orders: StoreCustomerOrder[];
  openOrder: string | null;
  onOpen: (id: string | null) => void;
}) {
  if (!orders.length) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
        Todavía no hay pedidos con este correo.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-100 text-[11px] font-bold tracking-wide text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-3">Pedido</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <Fragment key={order.id}>
              <tr className="border-b border-gray-50">
                <td className="px-4 py-3 font-semibold text-neutral-950">#{order.id.replace(/^MZ-/, "")}</td>
                <td className="px-4 py-3 text-gray-600">{formatWhen(order.createdAt)}</td>
                <td className="px-4 py-3 uppercase tracking-wide text-gray-700">{order.statusLabel}</td>
                <td className="px-4 py-3 text-gray-800">
                  {formatPrice(order.total)} para {order.itemCount} artículo{order.itemCount === 1 ? "" : "s"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onOpen(openOrder === order.id ? null : order.id)}
                    className="rounded-md bg-neutral-950 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Ver
                  </button>
                </td>
              </tr>
              {openOrder === order.id ? (
                <tr key={`${order.id}-detail`}>
                  <td colSpan={5} className="bg-gray-50 px-4 py-3">
                    <ul className="space-y-1 text-sm text-gray-700">
                      {order.items.map((item, index) => (
                        <li key={`${order.id}-${index}`}>
                          {item.name} × {item.quantity} — {formatPrice(item.lineTotal)}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
