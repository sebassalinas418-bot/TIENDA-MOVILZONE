"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { StoreWebImageSearch, type WebImageChoice, type WebImageRole } from "@/components/store-web-image-search";
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
  const [webSearchOpen, setWebSearchOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [pendingExtras, setPendingExtras] = useState<string[]>([]);

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
        pushExtra(url);
      } else {
        setPendingFile(null);
        onPendingFile?.(null);
        onChange(url);
        setPreview(url);
      }
      setPlusOpen(false);
      setWebSearchOpen(false);
    } catch (uploadError) {
      reportError(uploadError instanceof Error ? uploadError.message : "No se pudo usar esa foto.");
    } finally {
      setStage("idle");
    }
  }

  async function applyWebImage(hit: WebImageChoice, role: WebImageRole) {
    setWebSearchOpen(false);
    setPlusOpen(false);
    setError(null);
    onError?.("");
    setProcessHint(null);
    const previewSrc = hit.thumb || hit.url;
    if (role === "extra") {
      setPendingExtras((current) => (current.includes(previewSrc) ? current : [...current, previewSrc]));
    } else {
      setPreview(previewSrc);
    }
    setStage("compressing");
    try {
      const fetchUrl = new URL("/api/store-image-fetch", window.location.origin);
      fetchUrl.searchParams.set("url", hit.url);
      if (hit.thumb && hit.thumb !== hit.url) fetchUrl.searchParams.set("thumb", hit.thumb);
      const response = await fetch(fetchUrl.toString(), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("No se pudo descargar esa foto.");
      const blob = await response.blob();
      const downloaded = new File([blob], "producto-web.jpg", { type: blob.type || "image/jpeg" });
      await uploadPickedFile(downloaded, role === "extra");
      setPendingExtras((current) => current.filter((item) => item !== previewSrc));
    } catch (webError) {
      setPendingExtras((current) => current.filter((item) => item !== previewSrc));
      if (role === "main") setPreview(value || null);
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
  const extrasEnabled = typeof onExtraImagesChange === "function";
  const extrasToShow = extrasEnabled
    ? [...extraImages, ...pendingExtras.filter((item) => !extraImages.includes(item))]
    : [];
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
      <p className="text-xs text-slate-500">La foto grande es la principal. El + suma más fotos, no la reemplaza.</p>

      <div className="space-y-3">
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
          {extrasToShow.map((src) => (
            <div key={src} className="relative size-20 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <img src={src} alt="" referrerPolicy="no-referrer" className="size-full object-contain" />
              <button
                type="button"
                aria-label="Quitar foto extra"
                disabled={disabled || busy}
                onClick={() => {
                  setPendingExtras((current) => current.filter((item) => item !== src));
                  onExtraImagesChange?.(extraImages.filter((item) => item !== src));
                }}
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs text-slate-700 shadow-sm"
              >
                ×
              </button>
            </div>
          ))}
          {extrasEnabled ? (
          <div className="relative">
            <button
              type="button"
              aria-label="Agregar otra foto"
              disabled={disabled || busy || extrasToShow.length >= MAX_PRODUCT_EXTRA_IMAGES}
              onClick={() => setPlusOpen((open) => !open)}
              className="flex size-20 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-fuchsia-500 text-3xl font-light text-white shadow-sm hover:opacity-95 disabled:opacity-50"
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
          ) : null}
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

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={disabled || busy}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-sky-500 px-3 text-sm font-bold text-white shadow-sm hover:bg-sky-400 disabled:opacity-60"
          >
            Elegir de galería
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled || busy}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-cyan-500 px-3 text-sm font-bold text-white shadow-sm hover:bg-cyan-400 disabled:opacity-60"
          >
            Sacá una foto
          </button>
          <button
            type="button"
            onClick={() => setWebSearchOpen(true)}
            disabled={disabled || busy}
            className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-sky-500 px-3 text-sm font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
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
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-600 px-3 text-sm font-bold text-white hover:bg-sky-500"
              >
                Quitar fondo y subir
              </button>
              <button
                type="button"
                onClick={() => void commitPending(false)}
                disabled={disabled}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-violet-500 px-3 text-sm font-bold text-white hover:bg-violet-400"
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
              className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border-2 border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-60"
            >
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
            <span>{processHint}</span>
          </p>
        ) : null}

        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
      <StoreWebImageSearch
        open={webSearchOpen}
        defaultQuery={productName}
        busy={busy}
        canAddExtra={extrasToShow.length < MAX_PRODUCT_EXTRA_IMAGES}
        currentMain={preview}
        currentExtras={extrasToShow}
        onClose={() => {
          if (!busy) setWebSearchOpen(false);
        }}
        onPick={(hit, role) => void applyWebImage(hit, role)}
      />
    </div>
  );
  },
);
