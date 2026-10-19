"use client";

import { useState } from "react";
import { captionFromRecognition } from "@/lib/store-free-photos/from-recognition";
import { compressImageForAi } from "@/lib/store-recognize-product/compress-client";
import type { SocialPost } from "@/lib/store-redes/types";

type Draft = {
  id: string;
  file: File;
  preview: string;
  caption: string;
  headline: string;
  busy: boolean;
  error: string;
};

export function AdminFreePhotos({ embedded = false }: { embedded?: boolean }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    setNotice("");
    const next = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      preview: URL.createObjectURL(file),
      caption: "",
      headline: "",
      busy: true,
      error: "",
    }));
    setDrafts((current) => [...next, ...current]);
    for (const draft of next) {
      try {
        const payload = await compressImageForAi(draft.file);
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
        const caption = body.ok ? captionFromRecognition(body) : "";
        setDrafts((current) =>
          current.map((item) =>
            item.id === draft.id
              ? {
                  ...item,
                  busy: false,
                  caption,
                  headline: (body.nombre_sugerido ?? "").trim(),
                  error: body.ok ? "" : body.error || "No se pudo completar con IA.",
                }
              : item,
          ),
        );
      } catch {
        setDrafts((current) =>
          current.map((item) => (item.id === draft.id ? { ...item, busy: false, error: "No se pudo completar con IA." } : item)),
        );
      }
    }
  }

  async function queueDraft(draft: Draft) {
    if (!draft.caption.trim()) return;
    setSaving(draft.id);
    setNotice("");
    try {
      const form = new FormData();
      form.append("image", draft.file);
      form.append("caption", draft.caption);
      form.append("headline", draft.headline);
      const response = await fetch("/api/store-free-photos", { method: "POST", credentials: "include", body: form });
      const body = (await response.json()) as { ok?: boolean; error?: string; post?: SocialPost };
      if (!body.ok || !body.post) {
        setDrafts((current) =>
          current.map((item) => (item.id === draft.id ? { ...item, error: body.error || "No se pudo guardar." } : item)),
        );
        return;
      }
      window.dispatchEvent(new CustomEvent("mz-free-photo-queued", { detail: body.post }));
      URL.revokeObjectURL(draft.preview);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      setNotice("Foto libre en la cola. Usa los mismos horarios de Redes.");
    } catch {
      setDrafts((current) => current.map((item) => (item.id === draft.id ? { ...item, error: "No se pudo guardar." } : item)));
    } finally {
      setSaving("");
    }
  }

  return (
    <section className={embedded ? "mt-4" : "rounded-3xl border border-black/5 bg-white p-5 shadow-sm"}>
      {embedded ? null : <h2 className="text-lg font-bold text-neutral-950">Subir Fotos Libres</h2>}
      <p className={`${embedded ? "mt-0" : "mt-1"} text-sm text-gray-500`}>
        Independiente del catálogo. Gemini describe la foto y la mandás a la misma cola de horarios.
      </p>
      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50 px-4 py-8 text-center hover:bg-sky-100">
        <span className="rounded-full bg-sky-500 px-4 py-2 text-sm font-bold text-white">Subir fotos</span>
        <span className="mt-2 text-xs font-semibold text-sky-800">Podés elegir varias a la vez. JPG, PNG o WebP.</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(event) => {
            void onFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {notice ? <p className="mt-3 text-sm font-semibold text-emerald-700">{notice}</p> : null}
      {drafts.length ? (
        <ul className="mt-4 space-y-4">
          {drafts.map((draft) => (
            <li key={draft.id} className="rounded-2xl border border-black/5 bg-slate-50 p-3">
              <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">Vista previa</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.preview} alt="" className="h-28 w-28 shrink-0 rounded-xl bg-white object-cover" />
                <textarea
                  value={draft.caption}
                  disabled={draft.busy}
                  onChange={(event) =>
                    setDrafts((current) =>
                      current.map((item) => (item.id === draft.id ? { ...item, caption: event.target.value } : item)),
                    )
                  }
                  rows={7}
                  placeholder={draft.busy ? "Gemini está escribiendo el copy..." : "Texto para Instagram"}
                  className="min-h-[8rem] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sky-500"
                />
              </div>
              {draft.error ? <p className="mt-2 text-xs text-rose-600">{draft.error}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={draft.busy || !draft.caption.trim() || saving === draft.id}
                  onClick={() => void queueDraft(draft)}
                  className="rounded-full bg-sky-500 px-4 py-2 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-50"
                >
                  {saving === draft.id ? "Guardando..." : "Guardar / Programar"}
                </button>
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  onClick={() => {
                    URL.revokeObjectURL(draft.preview);
                    setDrafts((current) => current.filter((item) => item.id !== draft.id));
                  }}
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
