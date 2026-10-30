"use client";

import { useEffect, useMemo, useState } from "react";
import { useStoreConfig } from "@/config/store-config";
import { useAdminAccess } from "@/lib/admin-access";
import { useCatalog } from "@/lib/offers";
import { readTallerToken } from "@/services/taller-gestio/browser";

type CategoryDeletionEvent = {
  id: string;
  deletedName: string;
  movedTo: string;
  products: { productId: string; sku: string; title: string }[];
};

function adminPath() {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
}

export function AdminCategoryRelocator() {
  const { isAdmin, ready } = useAdminAccess();
  const { config } = useStoreConfig();
  const { placeProduct } = useCatalog();
  const [event, setEvent] = useState<CategoryDeletionEvent | null>(null);
  const [destByProduct, setDestByProduct] = useState<Record<string, string>>({});
  const [batchDest, setBatchDest] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destinations = useMemo(
    () =>
      config.categories.map((item) => ({
        id: item.id,
        name: item.name,
      })),
    [config.categories],
  );

  useEffect(() => {
    if (!ready || !isAdmin || !adminPath()) return;
    let cancel = false;
    async function load() {
      try {
        const token = readTallerToken();
        const response = await fetch("/api/taller/category-events", {
          cache: "no-store",
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok || cancel) return;
        const body = (await response.json()) as { events?: CategoryDeletionEvent[] };
        const next = Array.isArray(body.events) ? body.events[0] : null;
        if (!next || cancel) return;
        setEvent(next);
      } catch {
        /* sin aviso */
      }
    }
    void load();
    return () => {
      cancel = true;
    };
  }, [isAdmin, ready]);

  useEffect(() => {
    if (!event) return;
    const fallback = destinations[0]?.id ?? "";
    setBatchDest((current) => current || fallback);
    setDestByProduct((current) => {
      const next = { ...current };
      for (const item of event.products) {
        if (!next[item.productId]) next[item.productId] = fallback;
      }
      return next;
    });
  }, [destinations, event]);

  if (!event) return null;

  function applyBatch() {
    if (!batchDest) return;
    setDestByProduct((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) next[key] = batchDest;
      return next;
    });
  }

  async function confirm() {
    if (!event) return;
    setSaving(true);
    setError(null);
    const moves = event.products.map((item) => {
      const categoryId = destByProduct[item.productId] || destinations[0]?.id || "";
      const category = destinations.find((entry) => entry.id === categoryId)?.name || "Otros";
      return { productId: item.productId, category, categoryId };
    });
    try {
      const token = readTallerToken();
      const response = await fetch("/api/taller/category-events", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          eventId: event.id,
          moves: moves.map((item) => ({ productId: item.productId, category: item.category })),
        }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setError(body.error || "No se pudieron reubicar los productos.");
        setSaving(false);
        return;
      }
      for (const move of moves) {
        if (move.categoryId) placeProduct(move.productId, move.categoryId);
      }
      setEvent(null);
    } catch {
      setError("No se pudieron reubicar los productos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-relocator-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
      >
        <h2 id="category-relocator-title" className="text-lg font-bold text-neutral-950">
          Reubicar productos
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-700">
          Se eliminó la categoría <span className="font-semibold text-neutral-950">{event.deletedName}</span>{" "}
          desde el Taller. Los siguientes productos fueron movidos a “{event.movedTo}” y requieren reubicación:
        </p>
        {event.products.length ? (
          <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-xl border border-gray-100 bg-[#f7f8fa] p-3">
            {event.products.map((item) => (
              <li key={item.productId} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 truncate text-sm font-medium text-neutral-800">
                  {item.title}
                  {item.sku ? <span className="ml-1 text-xs font-normal text-neutral-500">{item.sku}</span> : null}
                </span>
                <select
                  value={destByProduct[item.productId] ?? ""}
                  onChange={(change) =>
                    setDestByProduct((current) => ({ ...current, [item.productId]: change.target.value }))
                  }
                  className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
                >
                  {destinations.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-neutral-600">No quedaron productos asociados.</p>
        )}
        {destinations.length > 0 ? (
          <label className="mt-4 block text-sm font-semibold text-neutral-900">
            Aplicar a todos
            <div className="mt-1 flex gap-2">
              <select
                value={batchDest}
                onChange={(change) => setBatchDest(change.target.value)}
                className="h-10 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm"
              >
                {destinations.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyBatch}
                className="rounded-xl border border-gray-200 px-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
              >
                Aplicar
              </button>
            </div>
          </label>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void confirm()}
            className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Confirmar reubicación"}
          </button>
        </div>
      </div>
    </div>
  );
}
