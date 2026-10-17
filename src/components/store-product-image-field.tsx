"use client";

import { useEffect, useRef, useState } from "react";
import { prepareProductImageFile } from "@/lib/admin-image-tools/prepare-product-image";
import { removeProductImageBackground } from "@/lib/admin-image-tools/remove-product-image-background";
import { uploadStoreProductImage } from "@/lib/store-product-images/client-upload";

type StoreProductImageFieldProps = {
  value: string;
  onChange: (url: string) => void;
  onError?: (message: string) => void;
  productId?: string;
  disabled?: boolean;
};

type ProcessStage = "idle" | "compressing" | "processing" | "uploading";

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Copia aislada del campo de foto del Taller (POS).
 * Misma UX: comprimir → recorte local imgly → Storage.
 * La subida sigue yendo al bucket de la tienda (no cambia Supabase).
 */
export function StoreProductImageField({
  value,
  onChange,
  onError,
  productId,
  disabled = false,
}: StoreProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [stage, setStage] = useState<ProcessStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [processHint, setProcessHint] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  function reportError(message: string) {
    setError(message);
    onError?.(message);
  }

  async function handleFile(file: File) {
    setError(null);
    setProcessHint(null);
    onError?.("");
    setStage("compressing");

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    let previewObjectUrl: string | null = objectUrl;

    try {
      const prepared = await prepareProductImageFile(file);

      setStage("processing");
      let fileToUpload = prepared;
      let backgroundRemoved = false;

      try {
        const processed = await removeProductImageBackground(prepared, {
          alreadyPrepared: true,
        });
        fileToUpload = processed;
        backgroundRemoved = true;
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = URL.createObjectURL(processed);
        setPreview(previewObjectUrl);
      } catch (processError) {
        const message =
          processError instanceof Error ? processError.message : "No se pudo eliminar el fondo.";
        setProcessHint(`Se usará la foto original (sin quitar fondo): ${message}`);
      }

      setStage("uploading");
      const url = await uploadStoreProductImage(fileToUpload, productId, { asIs: true });
      onChange(url);
      setPreview(url);

      if (backgroundRemoved) {
        setProcessHint("Fondo eliminado · imagen lista para guardar.");
      }
    } catch (uploadError) {
      setPreview(value || null);
      reportError(uploadError instanceof Error ? uploadError.message : "No se pudo subir la imagen.");
    } finally {
      if (previewObjectUrl?.startsWith("blob:")) URL.revokeObjectURL(previewObjectUrl);
      if (objectUrl.startsWith("blob:") && objectUrl !== previewObjectUrl) URL.revokeObjectURL(objectUrl);
      setStage("idle");
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (disabled || stage !== "idle") return;
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function clearImage() {
    onChange("");
    setPreview(null);
    setError(null);
    setProcessHint(null);
    onError?.("");
  }

  const busy = stage !== "idle";
  const stageLabel =
    stage === "compressing"
      ? "Comprimiendo…"
      : stage === "processing"
        ? "Quitando fondo con IA…"
        : stage === "uploading"
          ? "Subiendo…"
          : "";

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-900">Foto del producto (POS)</p>
      <p className="text-xs text-slate-500">
        JPG, PNG o WebP · hasta 20 MB · se comprime y se quita el fondo en tu dispositivo (gratis, sin
        OpenAI). Si el recorte falla, igual se guarda la foto original.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]",
            preview ? "border-slate-200" : "border-dashed border-slate-300 bg-slate-100",
          )}
        >
          {preview ? (
            <img src={preview} alt="Vista previa del producto" className="size-full object-contain" />
          ) : (
            <svg viewBox="0 0 24 24" className="size-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 16 5-5 4 4 3-3 6 6" />
              <circle cx="8" cy="9" r="0.8" fill="currentColor" stroke="none" />
              <path d="M4 20 20 4" />
            </svg>
          )}
          {busy ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/80 px-2 text-center">
              <span className="size-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
              <span className="text-[10px] font-medium text-sky-800">{stageLabel}</span>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              if (!disabled && !busy) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={cn(
              "rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
              dragActive ? "border-sky-400 bg-sky-50/70" : "border-slate-300 bg-white",
              (disabled || busy) && "pointer-events-none opacity-60",
            )}
          >
            <svg viewBox="0 0 24 24" className="mx-auto size-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
              <circle cx="12" cy="13.5" r="3.2" />
            </svg>
            <p className="mt-2 text-sm text-slate-700">
              Sacá una foto o{" "}
              <button
                type="button"
                className="font-medium text-sky-700 underline-offset-2 hover:underline"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || busy}
              >
                elegí una imagen
              </button>
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleInputChange}
              disabled={disabled || busy}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M10 3.5v9" strokeLinecap="round" />
                <path d="m6.5 7 3.5-3.5L13.5 7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 12.5V15a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2.5" strokeLinecap="round" />
              </svg>
              {preview ? "Cambiar imagen" : "Subir imagen"}
            </button>
            {preview ? (
              <button
                type="button"
                onClick={clearImage}
                disabled={disabled || busy}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" />
                </svg>
                Quitar
              </button>
            ) : null}
          </div>

          {processHint ? (
            <p
              className={cn(
                "inline-flex items-start gap-1.5 text-xs",
                processHint.toLowerCase().includes("original") ? "text-amber-700" : "text-emerald-700",
              )}
            >
              <svg viewBox="0 0 20 20" className="mt-0.5 size-3.5 shrink-0" fill="currentColor" aria-hidden="true">
                <path d="M10 2.5 12 8l5.5.4-4.2 3.6 1.3 5.3L10 14.6 5.4 17.3 6.7 12 2.5 8.4 8 8 10 2.5Z" />
              </svg>
              <span>{processHint}</span>
            </p>
          ) : null}

          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
