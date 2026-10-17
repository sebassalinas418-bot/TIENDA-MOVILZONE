"use client";

import { useEffect, useState } from "react";
import { matchStoreCategory } from "@/lib/store-product-details";
import { compressImageForAi } from "@/lib/store-recognize-product/compress-client";

export type ProductAiFillResult = {
  title: string;
  categoryLabel: string;
  categoryId?: string;
  subcategoryId?: string;
  details: string;
};

type ProductAiFillButtonProps = {
  image: string;
  pendingFile?: File | null;
  categories: { id: string; name: string; children: { id: string; name: string }[] }[];
  onResult: (result: ProductAiFillResult) => void;
};

const ANALYZING_STEPS = [
  "Analizando el producto…",
  "Reconociendo marca y modelo…",
  "Leyendo detalles de la foto…",
  "Armando nombre y categoría…",
  "Escribiendo las características…",
];

export function ProductAiFillButton({ image, pendingFile, categories, onResult }: ProductAiFillButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("");
  const [watchingGemini, setWatchingGemini] = useState(false);
  const source = pendingFile || image;
  const ready =
    Boolean(pendingFile) ||
    image.startsWith("data:image/") ||
    image.startsWith("blob:") ||
    /^https?:\/\//i.test(image);

  useEffect(() => {
    if (!watchingGemini) return;
    let index = 0;
    setPhase(ANALYZING_STEPS[0]);
    const timer = window.setInterval(() => {
      index = (index + 1) % ANALYZING_STEPS.length;
      setPhase(ANALYZING_STEPS[index]);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [watchingGemini]);

  async function run() {
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    setWatchingGemini(false);
    setPhase("Preparando la foto…");
    try {
      const payload = await compressImageForAi(source);
      setPhase("Enviando a la IA…");
      setWatchingGemini(true);
      const response = await fetch("/api/recognize-product", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setWatchingGemini(false);
      setPhase("Completando el formulario…");
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        nombre_sugerido?: string;
        categoria?: string;
        detalles?: string;
      };
      if (!response.ok || !body.ok) {
        setError(body.error || "No se pudo completar con IA.");
        return;
      }
      const matched = matchStoreCategory(body.categoria ?? "", categories);
      onResult({
        title: (body.nombre_sugerido ?? "").trim(),
        categoryLabel: (body.categoria ?? "").trim(),
        categoryId: matched?.categoryId,
        subcategoryId: matched?.subcategoryId,
        details: (body.detalles ?? "").trim(),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar con IA.");
    } finally {
      setWatchingGemini(false);
      setBusy(false);
      setPhase("");
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void run()}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-sky-500 px-4 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:from-neutral-300 disabled:to-neutral-300 disabled:text-neutral-500"
      >
        <SparklesIcon spinning={busy} />
        {busy ? "Analizando…" : "✨ Autocompletar datos con IA"}
      </button>
      {busy ? (
        <div className="mt-2 overflow-hidden rounded-2xl border border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 via-white to-sky-50 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-fuchsia-800">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fuchsia-600" />
            </span>
            {phase || "Analizando…"}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fuchsia-100">
            <div className="h-full w-1/3 origin-left rounded-full bg-gradient-to-r from-fuchsia-500 to-sky-400 [animation:ai-scan_1.15s_ease-in-out_infinite]" />
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-neutral-500">Puede tardar unos segundos según la foto. No cierres el panel.</p>
        </div>
      ) : null}
      {!ready ? (
        <p className="mt-1.5 text-xs text-neutral-500">Elegí o subí una foto del producto para habilitar la IA.</p>
      ) : null}
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

function SparklesIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${spinning ? "animate-pulse" : ""}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10 1.6 11.2 6.2 15.8 7.4 11.2 8.6 10 13.2 8.8 8.6 4.2 7.4 8.8 6.2 10 1.6Z" />
      <path d="M15.2 11.4 15.8 13.6 18 14.2 15.8 14.8 15.2 17 14.6 14.8 12.4 14.2 14.6 13.6 15.2 11.4Z" />
      <path d="M4.6 11.8 5.1 13.6 6.9 14.1 5.1 14.6 4.6 16.4 4.1 14.6 2.3 14.1 4.1 13.6 4.6 11.8Z" />
    </svg>
  );
}
