"use client";

import { useEffect, useState } from "react";
import type { StoreCustomerPublic } from "@/services/store-customers/types";

export function AdminCustomers() {
  const [customers, setCustomers] = useState<StoreCustomerPublic[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const response = await fetch("/api/store-auth/customers", { credentials: "include" });
        const body = (await response.json()) as {
          ok?: boolean;
          customers?: StoreCustomerPublic[];
          error?: string;
        };
        if (cancel) return;
        setCustomers(body.customers ?? []);
        if (!body.ok) setError(body.error || "No se pudieron cargar los correos.");
      } catch {
        if (!cancel) setError("No se pudieron cargar los correos.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const verified = customers.filter((item) => item.verified).length;

  return (
    <section className="space-y-4">
      <p className="text-sm text-gray-600">
        {loading
          ? "Cargando..."
          : `${customers.length} registro${customers.length === 1 ? "" : "s"} · ${verified} verificado${verified === 1 ? "" : "s"}`}
      </p>
      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      {!loading && customers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
          Todavía no hay clientes registrados en la tienda web. Las cuentas de prueba locales (demo/admin) no aparecen acá.
        </p>
      ) : (
        <ul className="space-y-2">
          {customers.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-950">{item.email}</p>
                <p className="mt-0.5 text-xs text-gray-500">{item.name || "Sin nombre"}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  item.verified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {item.verified ? "Verificado" : "Pendiente de verificación"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
