"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { StoreWebImageSearch, type WebImageChoice } from "@/components/store-web-image-search";
import { prepareProductImageFile } from "@/lib/admin-image-tools/prepare-product-image";
import { removeProductImageBackground } from "@/lib/admin-image-tools/remove-product-image-background";
import { uploadStoreProductImage } from "@/lib/store-product-images/client-upload";
import { compressWebProductFile } from "@/lib/store-product-images/compress-web";
import { MAX_PRODUCT_EXTRA_IMAGES, normalizeExtraImages } from "@/lib/store-product-images/extras";

type StoreProductImageFieldProps = {
  value: string;
  onChange: (url: string) => void;
  onError?: (message: string) => void;
  onPendingFile?: (file: File | null) => void;
  productId?: string;
  productName?: string;
  extraImages?: string[];
  onExtraImagesChange?: (urls: string[]) => void;
  disabled?: boolean;
};

type ProcessStage = "idle" | "awaiting" | "compressing" | "processing" | "uploading";

export type StoreProductImageFieldHandle = {
  persistPending: () => Promise<string | null>;
};

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Copia aislada del campo de foto del Taller (POS).
 * Misma UX: comprimir → recorte local imgly → Storage.
 * La subida sigue yendo al bucket de la tienda (no cambia Supabase).
 */
export const StoreProductImageField = forwardRef<StoreProductImageFieldHandle, StoreProductImageFieldProps>(
  function StoreProductImageField(
    {
      value,
      onChange,
      onError,
      onPendingFile,
      productId,
      productName = "",
      extraImages = [],
      onExtraImagesChange,
      disabled = false,
    },
    ref,
  ) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const extraGalleryInputRef = useRef<HTMLInputElement>(null);
  const extraCameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [stage, setStage] = useState<ProcessStage>("idle");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processHint, setProcessHint] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [webSearchOpen, setWebSearchOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);

  useEffect(() => {
    if (stage === "awaiting") return;
    setPreview(value || null);
  }, [value, stage]);

  function reportError(message: string) {
    setError(message);
    onError?.(message);
  }

  function stagePendingFile(file: File) {
    if (!file.type.startsWith("image/")) {
      reportError("Elegí un archivo de imagen.");
      return;
    }
    setError(null);
    setProcessHint(null);
    onError?.("");
    setPendingFile(file);
    onPendingFile?.(file);
    setPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setStage("awaiting");
    setProcessHint("¿Querés quitar el fondo de esta foto?");
  }

  async function commitPending(removeBackground: boolean): Promise<string | null> {
    const file = pendingFile;
    if (!file) return null;
    setError(null);
    onError?.("");
    setStage("compressing");
    let previewObjectUrl = preview?.startsWith("blob:") ? preview : null;

    try {
      const prepared = await prepareProductImageFile(file);
      let fileToUpload = prepared;
      let backgroundRemoved = false;

      if (removeBackground) {
        setStage("processing");
        try {
          const processed = await removeProductImageBackground(prepared, {
            alreadyPrepared: true,
          });
          fileToUpload = processed;
          backgroundRemoved = true;
          if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
          previewObjectUrl = URL.createObjectURL(processed);
          setPreview(previewObjectUrl);
        } catch (processError) {
          const message =
            processError instanceof Error ? processError.message : "No se pudo eliminar el fondo.";
          setProcessHint(`Se usará la foto original (sin quitar fondo): ${message}`);
        }
      }

      setStage("uploading");
      const url = await uploadStoreProductImage(fileToUpload, productId, { asIs: true });
      setPendingFile(null);
      onPendingFile?.(null);
      onChange(url);
      setPreview(url);
      setProcessHint(
        backgroundRemoved
          ? "Fondo eliminado · imagen lista para guardar."
          : "Foto subida sin recortar el fondo.",
      );
      return url;
    } catch (uploadError) {
      setPreview(value || null);
      setPendingFile(null);
      onPendingFile?.(null);
      reportError(uploadError instanceof Error ? uploadError.message : "No se pudo subir la imagen.");
      throw uploadError instanceof Error ? uploadError : new Error("No se pudo subir la imagen.");
    } finally {
      if (previewObjectUrl?.startsWith("blob:")) URL.revokeObjectURL(previewObjectUrl);
      setStage("idle");
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      persistPending: async () => {
        if (!pendingFile) return null;
        return commitPending(false);
      },
    }),
    [pendingFile],
  );

  function hasMainPhoto() {
    return Boolean((preview && preview !== "") || value?.trim());
  }

  function pushExtra(url: string) {
    const next = normalizeExtraImages([...extraImages, url], value);
    if (next.length === extraImages.length) {
      reportError("Esa foto ya está en el producto o se alcanzó el máximo.");
      return false;
    }
    onExtraImagesChange?.(next);
    return true;
  }

  async function uploadPickedFile(file: File, asExtra: boolean) {
    setError(null);
    onError?.("");
    setProcessHint(null);
    setStage("compressing");
    try {
      const compressed = await compressWebProductFile(file);
      setStage("uploading");
      const url = await uploadStoreProductImage(compressed, asExtra ? undefined : productId, { asIs: true });
      if (asExtra) {
        if (pushExtra(url)) setProcessHint("Foto extra agregada. Guardá el producto para conservarla.");
      } else {
        setPendingFile(null);
        onPendingFile?.(null);
        onChange(url);
        setPreview(url);
        setProcessHint("Foto de la web lista para guardar.");
      }
      setWebSearchOpen(false);
      setPlusOpen(false);
    } catch (uploadError) {
      reportError(uploadError instanceof Error ? uploadError.message : "No se pudo usar esa foto.");
    } finally {
      setStage("idle");
    }
  }

  async function applyWebImage(hit: WebImageChoice) {
    setError(null);
    onError?.("");
    setProcessHint(null);
    setStage("compressing");
    try {
      const response = await fetch(`/api/store-image-fetch?url=${encodeURIComponent(hit.url)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("No se pudo descargar esa foto.");
      const blob = await response.blob();
      const downloaded = new File([blob], "producto-web.jpg", { type: blob.type || "image/jpeg" });
      await uploadPickedFile(downloaded, hasMainPhoto());
    } catch (webError) {
      setStage("idle");
      reportError(webError instanceof Error ? webError.message : "No se pudo usar esa foto.");
    }
  }

  async function addExtraFromInput(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      reportError("Elegí un archivo de imagen.");
      return;
    }
    await uploadPickedFile(file, true);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) stagePendingFile(file);
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (disabled || (stage !== "idle" && stage !== "awaiting")) return;
    const file = event.dataTransfer.files?.[0];
    if (file) stagePendingFile(file);
  }

  function clearImage() {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPendingFile(null);
    onPendingFile?.(null);
    setError(null);
    setProcessHint(null);
    onError?.("");
    if (stage === "awaiting") {
      setStage("idle");
      setPreview(value || null);
      return;
    }
    setStage("idle");
    onChange("");
    setPreview(null);
  }

  const awaiting = stage === "awaiting";
  const busy = stage !== "idle" && !awaiting;
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
        JPG, PNG o WebP · hasta 20 MB. Primero ves la foto y elegís si querés quitar el fondo (en tu
        dispositivo, gratis) o subirla tal cual. La búsqueda web y el + agregan fotos extra, no reemplazan la principal.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex flex-wrap items-start gap-2">
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
          {extraImages.map((src) => (
            <div key={src} className="relative size-20 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <img src={src} alt="" className="size-full object-contain" />
              <button
                type="button"
                aria-label="Quitar foto extra"
                disabled={disabled || busy}
                onClick={() =>
                  onExtraImagesChange?.(extraImages.filter((item) => item !== src))
                }
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs text-slate-700 shadow-sm"
              >
                ×
              </button>
            </div>
          ))}
          <div className="relative">
            <button
              type="button"
              aria-label="Agregar otra foto"
              disabled={disabled || busy || extraImages.length >= MAX_PRODUCT_EXTRA_IMAGES}
              onClick={() => setPlusOpen((open) => !open)}
              className="flex size-20 items-center justify-center rounded-xl border border-dashed border-sky-300 bg-sky-50 text-3xl font-light text-sky-700 hover:bg-sky-100 disabled:opacity-50"
            >
              +
            </button>
            {plusOpen ? (
              <div className="absolute top-full left-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => extraGalleryInputRef.current?.click()}
                >
                  Galería
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => extraCameraInputRef.current?.click()}
                >
                  Cámara
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setPlusOpen(false);
                    setWebSearchOpen(true);
                  }}
                >
                  Buscar en web
                </button>
              </div>
            ) : null}
          </div>
          <input
            ref={extraGalleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void addExtraFromInput(event)}
            disabled={disabled || busy}
          />
          <input
            ref={extraCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => void addExtraFromInput(event)}
            disabled={disabled || busy}
          />
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
              <button
                type="button"
                className="font-medium text-slate-800 underline-offset-2 hover:underline"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled || busy}
              >
                Sacá una foto
              </button>
              {" o "}
              <button
                type="button"
                className="font-medium text-sky-700 underline-offset-2 hover:underline"
                onClick={() => galleryInputRef.current?.click()}
                disabled={disabled || busy}
              >
                elegí una imagen
              </button>
            </p>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleInputChange}
              disabled={disabled || busy}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInputChange}
              disabled={disabled || busy}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={disabled || busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M10 3.5v9" strokeLinecap="round" />
                <path d="m6.5 7 3.5-3.5L13.5 7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 12.5V15a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2.5" strokeLinecap="round" />
              </svg>
              Elegir de galería
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              Sacá una foto
            </button>
            <button
              type="button"
              onClick={() => setWebSearchOpen(true)}
              disabled={disabled || busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-60"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="5" />
                <path d="M12.5 12.5 17 17" strokeLinecap="round" />
              </svg>
              Buscar foto en web
            </button>
            {awaiting ? (
              <>
                <button
                  type="button"
                  onClick={() => void commitPending(true)}
                  disabled={disabled}
                  className="inline-flex items-center rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-sky-400"
                >
                  Quitar fondo y subir
                </button>
                <button
                  type="button"
                  onClick={() => void commitPending(false)}
                  disabled={disabled}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Subir así
                </button>
              </>
            ) : null}
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
                processHint.includes("¿Querés")
                  ? "text-slate-700"
                  : processHint.toLowerCase().includes("original")
                    ? "text-amber-700"
                    : "text-emerald-700",
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
      <StoreWebImageSearch
        open={webSearchOpen}
        defaultQuery={productName}
        busy={busy}
        onClose={() => {
          if (!busy) setWebSearchOpen(false);
        }}
        onPick={(hit) => void applyWebImage(hit)}
      />
    </div>
  );
  },
);
