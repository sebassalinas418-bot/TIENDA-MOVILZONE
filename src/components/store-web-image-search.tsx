"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type WebImageChoice = {
  url: string;
  thumb: string;
  title: string;
};

export type WebImageRole = "main" | "extra";

type StoreWebImageSearchProps = {
  open: boolean;
  defaultQuery: string;
  busy: boolean;
  canAddExtra?: boolean;
  currentMain?: string | null;
  currentExtras?: string[];
  onClose: () => void;
  onPick: (hit: WebImageChoice, role: WebImageRole) => void;
};

export function StoreWebImageSearch({
  open,
  defaultQuery,
  busy,
  canAddExtra = true,
  currentMain = "",
  currentExtras = [],
  onClose,
  onPick,
}: StoreWebImageSearchProps) {
  const uploadedMain = currentMain?.trim() ?? "";
  const [query, setQuery] = useState(defaultQuery);
  const [items, setItems] = useState<WebImageChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<WebImageChoice | null>(null);
  const prevBusyRef = useRef(busy);

  useEffect(() => {
    if (prevBusyRef.current && !busy) setPending(null);
    prevBusyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    if (!open) return;
    const term = defaultQuery.trim();
    setQuery(term);
    setItems([]);
    setError("");
    setPending(null);
    if (term.length >= 2) void runSearch(term);
  }, [open, defaultQuery]);

  async function runSearch(term: string) {
    if (term.length < 2 || loading || busy) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: term });
      const response = await fetch(`/api/search-images?${params.toString()}`, {
        credentials: "include",
      });
      const body = (await response.json()) as { ok?: boolean; error?: string; items?: WebImageChoice[] };
      if (!response.ok || !body.ok) {
        setError(body.error || "No se pudo buscar fotos.");
        setItems([]);
        return;
      }
      setItems(body.items ?? []);
      if (!(body.items ?? []).length) setError("No hay fotos para esa búsqueda.");
    } catch {
      setError("No se pudo buscar fotos.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function search(event?: { preventDefault(): void }) {
    event?.preventDefault();
    void runSearch(query.trim());
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="web-image-search-title"
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
          <h3 id="web-image-search-title" className="text-base font-bold text-gray-900">
            Buscar foto en web
          </h3>
          <button
            type="button"
            aria-label="Cerrar"
            disabled={busy}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            ×
          </button>
        </div>
        <form className="flex gap-2 px-4 pb-3" onSubmit={(event) => void search(event)}>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre del producto"
            className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            disabled={loading || busy || query.trim().length < 2}
            className="h-11 shrink-0 rounded-xl bg-sky-500 px-4 text-sm font-bold text-white hover:bg-sky-400 disabled:bg-gray-300"
          >
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </form>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {uploadedMain || currentExtras.length ? (
            <div className="mb-3 rounded-2xl bg-slate-50 p-2">
              <p className="mb-2 px-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Fotos subidas
              </p>
              <div className="flex flex-wrap gap-2">
                {uploadedMain ? (
                  <div className="relative size-16 overflow-hidden rounded-xl border border-sky-300 bg-white">
                    <img src={uploadedMain} alt="Principal" className="size-full object-contain" />
                    <span className="absolute inset-x-0 bottom-0 bg-sky-600/90 py-0.5 text-center text-[9px] font-bold text-white">
                      Principal
                    </span>
                  </div>
                ) : null}
                {currentExtras.map((src, index) => (
                  <div key={src} className="relative size-16 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img src={src} alt={`Secundaria ${index + 1}`} className="size-full object-contain" />
                    <span className="absolute inset-x-0 bottom-0 bg-slate-800/80 py-0.5 text-center text-[9px] font-bold text-white">
                      Extra {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-medium text-sky-700">
              <span className="size-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
              Buscando fotos…
            </div>
          ) : null}
          {error ? <p className="mb-3 text-sm font-medium text-rose-600">{error}</p> : null}
          {!loading && items.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {items.map((item) => {
                const selected = pending?.url === item.url;
                return (
                <li key={item.url}>
                  <button
                    type="button"
                    disabled={busy}
                    title={item.title}
                    onClick={() => setPending(item)}
                    className={`aspect-square w-full overflow-hidden rounded-xl border bg-slate-50 disabled:opacity-60 ${
                      selected ? "border-sky-500 ring-2 ring-sky-400" : "border-gray-200"
                    }`}
                  >
                    <img src={item.thumb} alt="" className="h-full w-full object-contain" />
                  </button>
                </li>
                );
              })}
            </ul>
          ) : !loading && !error ? (
            <p className="py-8 text-center text-sm text-gray-500">Escribí y tocá Buscar para ver miniaturas.</p>
          ) : null}
        </div>
        {pending ? (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="mb-3 flex items-center gap-3">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img src={pending.thumb} alt="" className="size-full object-contain" />
                {busy ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/75">
                    <span className="size-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
                  </div>
                ) : null}
              </div>
              <p className="text-xs font-medium text-slate-600">
                {busy ? "Subiendo esta foto…" : "Elegí dónde va. No se asigna sola."}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={busy}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onPick(pending, "main");
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-500 px-3 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-60"
              >
                Usar como principal
              </button>
              <button
                type="button"
                disabled={busy || !canAddExtra}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onPick(pending, "extra");
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-600 to-sky-500 px-3 text-sm font-bold text-white hover:opacity-95 disabled:opacity-50"
              >
                Agregar como secundaria
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
