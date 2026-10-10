"use client";

import { useState } from "react";
import { isolateProductImage } from "@/lib/admin-image-tools/isolate-product";

type SearchHit = { url: string; thumb: string; title: string };

export function AdminImageTools({
  value,
  searchQuery,
  onChange,
  onError,
}: {
  value: string;
  searchQuery: string;
  onChange: (value: string) => void;
  onError: (value: string) => void;
}) {
  const [busy, setBusy] = useState<"bg" | "search" | null>(null);
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  async function removeBackground() {
    if (!value.trim() || busy) return;
    setBusy("bg");
    onError("");
    try {
      onChange(await isolateProductImage(value.trim()));
    } catch {
      onError("No se pudo quitar el fondo de esa imagen.");
    } finally {
      setBusy(null);
    }
  }

  async function searchWeb() {
    const query = searchQuery.trim();
    if (!query || busy) return;
    setBusy("search");
    onError("");
    try {
      const response = await fetch(`/api/store-image-search?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as { images?: SearchHit[] };
      const images = Array.isArray(body.images) ? body.images : [];
      setHits(images);
      if (!images.length) onError("No encontramos fotos para ese nombre.");
    } catch {
      onError("No se pudo buscar imágenes ahora.");
    } finally {
      setBusy(null);
    }
  }

  function pick(hit: SearchHit) {
    onChange(hit.url);
    onError("");
    setHits(null);
  }

  return (
    <div className="mt-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={!value.trim() || busy !== null}
          onClick={() => void removeBackground()}
          className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "bg" ? "Quitando fondo con IA..." : "Quitar fondo automáticamente"}
        </button>
        <button
          type="button"
          disabled={!searchQuery.trim() || busy !== null}
          onClick={() => void searchWeb()}
          className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "search" ? "Buscando..." : "Buscar imagen en la web"}
        </button>
      </div>
      {hits && hits.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {hits.map((hit) => (
            <li key={hit.url}>
              <button
                type="button"
                onClick={() => pick(hit)}
                className="block w-full overflow-hidden rounded-xl border border-gray-200 bg-white"
                title={hit.title}
              >
                <img src={hit.thumb} alt="" className="aspect-square w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
