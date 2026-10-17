"use client";

import { useEffect, useState } from "react";

export type WebImageChoice = {
  url: string;
  thumb: string;
  title: string;
};

type StoreWebImageSearchProps = {
  open: boolean;
  defaultQuery: string;
  busy: boolean;
  onClose: () => void;
  onPick: (hit: WebImageChoice) => void;
};

export function StoreWebImageSearch({ open, defaultQuery, busy, onClose, onPick }: StoreWebImageSearchProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [items, setItems] = useState<WebImageChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const term = defaultQuery.trim();
    setQuery(term);
    setItems([]);
    setError("");
    if (term.length >= 2) void runSearch(term);
  }, [open, defaultQuery]);

  async function runSearch(term: string) {
    if (term.length < 2 || loading || busy) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/store-image-search?q=${encodeURIComponent(term)}`, {
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

  return (
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
          {error ? <p className="mb-3 text-sm font-medium text-rose-600">{error}</p> : null}
          {busy ? (
            <p className="mb-3 text-sm font-medium text-sky-800">Descargando y subiendo la foto…</p>
          ) : null}
          {items.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {items.map((item) => (
                <li key={item.url}>
                  <button
                    type="button"
                    disabled={busy}
                    title={item.title}
                    onClick={() => onPick(item)}
                    className="aspect-square w-full overflow-hidden rounded-xl border border-gray-200 bg-slate-50 disabled:opacity-60"
                  >
                    <img src={item.thumb} alt="" className="h-full w-full object-contain" />
                  </button>
                </li>
              ))}
            </ul>
          ) : !loading && !error ? (
            <p className="py-8 text-center text-sm text-gray-500">Escribí y tocá Buscar para ver miniaturas.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
