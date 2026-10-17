"use client";

import { useState } from "react";
import { isSharedProductImage } from "@/lib/store-product-images/public-url";
import { matchStoreCategory } from "@/lib/store-product-details";

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

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la foto."));
    reader.readAsDataURL(file);
  });
}

export function ProductAiFillButton({ image, pendingFile, categories, onResult }: ProductAiFillButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = Boolean(pendingFile) || isSharedProductImage(image) || image.startsWith("data:image/");

  async function run() {
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = pendingFile
        ? { imageBase64: await fileToDataUrl(pendingFile), mimeType: pendingFile.type }
        : image.startsWith("data:image/")
          ? { imageBase64: image }
          : { imageUrl: image.trim() };
      const response = await fetch("/api/recognize-product", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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
    } catch {
      setError("No se pudo completar con IA.");
    } finally {
      setBusy(false);
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
        <SparklesIcon />
        {busy ? "Analizando..." : "✨ Autocompletar datos con IA"}
      </button>
      {!ready ? (
        <p className="mt-1.5 text-xs text-neutral-500">Elegí o subí una foto del producto para habilitar la IA.</p>
      ) : null}
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M10 1.6 11.2 6.2 15.8 7.4 11.2 8.6 10 13.2 8.8 8.6 4.2 7.4 8.8 6.2 10 1.6Z" />
      <path d="M15.2 11.4 15.8 13.6 18 14.2 15.8 14.8 15.2 17 14.6 14.8 12.4 14.2 14.6 13.6 15.2 11.4Z" />
      <path d="M4.6 11.8 5.1 13.6 6.9 14.1 5.1 14.6 4.6 16.4 4.1 14.6 2.3 14.1 4.1 13.6 4.6 11.8Z" />
    </svg>
  );
}
