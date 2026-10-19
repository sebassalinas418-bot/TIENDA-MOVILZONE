"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/data/products";
import { useCatalog } from "@/lib/offers";
import { useStoreConfig } from "@/config/store-config";
import {
  downloadInstagramProductCard,
  InstagramProductCard,
} from "@/components/store-redes/instagram-product-card";
import { catalogOfferBadge, featuresFromPost } from "@/lib/store-redes/features";
import { preferRealProductImage } from "@/lib/store-redes/product-image";
import { normalizeScheduleHours, scheduleHours } from "@/lib/store-redes/schedule";
import {
  CUSTOM_TEMPLATE_ID,
  DEFAULT_TEMPLATE_ID,
  OFFICIAL_REDES_TEMPLATES,
  templateLayout,
  templateSrc,
} from "@/lib/store-redes/templates";
import {
  canvasBounds,
  commitSlot,
  defaultTemplateSlots,
  TEMPLATE_SLOT_LABELS,
  type TemplateSlotId,
  type TemplateSlots,
} from "@/lib/store-redes/slots";
import {
  defaultSocialSchedule,
  type SocialAiEngine,
  type SocialFrequency,
  type SocialPost,
  type SocialProductSnap,
  type SocialSchedule,
  type SocialTemplateMode,
} from "@/lib/store-redes/types";

const LOCAL_POSTS = "movilzone.store-redes.posts";
const LOCAL_SCHEDULE = "movilzone.store-redes.schedule";
const LOCAL_TEMPLATE = "movilzone.store-redes.template";
const LOCAL_SLOTS = "movilzone.store-redes.slots";
const LOCAL_ENGINE = "movilzone.store-redes.engine";
const TEMPLATE_MODES: { id: SocialTemplateMode; label: string }[] = [
  { id: "fixed", label: "Fija" },
  { id: "random", label: "Aleatoria (Random)" },
  { id: "sequential", label: "Por orden (Secuencial)" },
];
const CLIENT_GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() || "";
const CLIENT_OPENAI_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY?.trim() || "";

const FREQ: { id: SocialFrequency; label: string }[] = [
  { id: "daily", label: "Todos los días" },
  { id: "every_2_days", label: "Cada 2 días" },
  { id: "weekly", label: "Una vez por semana" },
];

export function AdminRedes() {
  const { products } = useCatalog();
  const { config } = useStoreConfig();
  const pool = useMemo<SocialProductSnap[]>(
    () =>
      products.map((product) => ({
        id: product.id,
        title: product.title,
        brand: product.brand,
        category: product.category,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId,
        price:
          product.onSale && product.salePrice > 0 && product.salePrice < product.price
            ? product.salePrice
            : product.price,
        listPrice: product.price,
        onSale: Boolean(product.onSale && product.salePrice > 0 && product.salePrice < product.price),
        offerBadge: product.onSale ? product.badge : null,
        image: product.image,
        inStock: product.inStock,
      })),
    [products],
  );

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [schedule, setSchedule] = useState<SocialSchedule>(() => defaultSocialSchedule());
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [aiOn, setAiOn] = useState(Boolean(CLIENT_GEMINI_KEY || CLIENT_OPENAI_KEY));
  const [geminiOn, setGeminiOn] = useState(Boolean(CLIENT_GEMINI_KEY));
  const [openaiOn, setOpenaiOn] = useState(Boolean(CLIENT_OPENAI_KEY));
  const [igOn, setIgOn] = useState(false);
  const [engine, setEngine] = useState<SocialAiEngine>("gemini");
  const [customTemplate, setCustomTemplate] = useState("");
  const [slots, setSlots] = useState<TemplateSlots>(() => defaultTemplateSlots(DEFAULT_TEMPLATE_ID));
  const [selectedSlot, setSelectedSlot] = useState<TemplateSlotId | null>(null);
  const [showFooter, setShowFooter] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosts(readLocalPosts());
    setSchedule(readLocalSchedule());
    try {
      const saved = localStorage.getItem(LOCAL_TEMPLATE);
      if (saved) setCustomTemplate(saved);
      const savedEngine = localStorage.getItem(LOCAL_ENGINE);
      if (savedEngine === "openai" || savedEngine === "gemini") setEngine(savedEngine);
    } catch {
      /* ignore */
    }
    void (async () => {
      const response = await fetch("/api/store-redes", { credentials: "include" });
      if (response.status === 401) {
        setError("Solo el administrador puede usar Redes.");
        return;
      }
      const body = (await response.json()) as {
        posts?: SocialPost[];
        schedule?: SocialSchedule;
        status?: { ai?: boolean; gemini?: boolean; openai?: boolean; instagram?: boolean };
      };
      if (body.posts?.length) {
        setPosts(body.posts);
        writeLocalPosts(body.posts);
      }
      if (body.schedule) {
        const next = { ...defaultSocialSchedule(), ...body.schedule };
        if (next.templateId === CUSTOM_TEMPLATE_ID) next.templateId = DEFAULT_TEMPLATE_ID;
        setSchedule(next);
      }
      setAiOn(Boolean(body.status?.ai));
      setGeminiOn(Boolean(body.status?.gemini) || Boolean(CLIENT_GEMINI_KEY));
      setOpenaiOn(Boolean(body.status?.openai) || Boolean(CLIENT_OPENAI_KEY));
      setIgOn(Boolean(body.status?.instagram));
    })();
  }, []);

  const preview = posts[0];
  const previewSnap = preview
    ? (pool.find((item) => item.id === preview.product.id) ?? preview.product)
    : null;
  const selected = pool.find((item) => item.id === selectedId) ?? null;
  const handle = config.instagram || "movilzone.gp";
  const templateMode = schedule.templateMode || "sequential";
  const activeTemplateId = (() => {
    const raw =
      templateMode === "fixed"
        ? schedule.templateId || DEFAULT_TEMPLATE_ID
        : preview?.templateId || schedule.templateId || DEFAULT_TEMPLATE_ID;
    return raw === CUSTOM_TEMPLATE_ID ? DEFAULT_TEMPLATE_ID : raw;
  })();
  const previewTemplateSrc = templateSrc(activeTemplateId, customTemplate);
  const previewLayout = templateLayout(activeTemplateId);

  useEffect(() => {
    setSlots(defaultTemplateSlots(activeTemplateId));
  }, [activeTemplateId]);

  function persistSlots(nextSlots = slots) {
    const map = { ...readLocalSlots(), [activeTemplateId]: nextSlots };
    writeLocalSlots(map);
    const next = { ...schedule, templateSlots: { ...schedule.templateSlots, [activeTemplateId]: nextSlots }, productPool: pool };
    setSchedule(next);
    writeLocalSchedule(next);
    return next;
  }

  async function saveTemplateSlots() {
    const next = persistSlots();
    setBusy("slots");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/store-redes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule", schedule: next }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string; schedule?: SocialSchedule };
      if (!body.ok) {
        setError(body.error || "Las posiciones quedaron en este navegador.");
        return;
      }
      if (body.schedule) setSchedule(body.schedule);
      setNotice("Plantilla guardada. Las coordenadas se usan al generar la imagen.");
    } catch {
      setError("No se pudo guardar en el servidor. Quedó en este navegador.");
    } finally {
      setBusy("");
    }
  }

  async function downloadCard() {
    if (!cardRef.current || !preview) return;
    persistSlots();
    setSelectedSlot(null);
    setBusy("image");
    setError("");
    setNotice("");
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const slug = preview.product.title.replace(/[^\w]+/g, "-").slice(0, 40) || "producto";
      if (!cardRef.current) return;
      await downloadInstagramProductCard(cardRef.current, `instagram-${slug}`);
      setNotice("Imagen JPG descargada con las posiciones actuales.");
    } catch {
      setError("No se pudo armar la imagen. Si la foto es externa, recargá y reintentá.");
    } finally {
      setBusy("");
    }
  }

  async function generate(random: boolean) {
    persistSlots();
    setBusy(random ? "random" : "one");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/store-redes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          random,
          product: selected ?? undefined,
          products: pool,
          engine,
          templateId: templateMode === "fixed" ? activeTemplateId : undefined,
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        warning?: string;
        post?: SocialPost;
        status?: { ai?: boolean; gemini?: boolean; openai?: boolean };
      };
      if (body.status?.ai != null) setAiOn(body.status.ai);
      if (body.status?.gemini != null) setGeminiOn(body.status.gemini);
      if (body.status?.openai != null) setOpenaiOn(body.status.openai);
      if (!body.ok || !body.post) {
        setError(body.error || "No se pudo generar el post.");
        return;
      }
      const next = [body.post, ...posts.filter((item) => item.id !== body.post?.id)].slice(0, 40);
      setPosts(next);
      writeLocalPosts(next);
      setNotice(
        body.post.provider === "openai"
          ? "Post generado con ChatGPT."
          : body.post.provider === "gemini"
            ? "Post generado con Gemini."
            : body.warning ||
                (engine === "openai"
                  ? "Copy local. Poné NEXT_PUBLIC_OPENAI_API_KEY en .env.local y reiniciá el servidor."
                  : "Copy local. Poné NEXT_PUBLIC_GEMINI_API_KEY en .env.local y reiniciá el servidor."),
      );
    } catch {
      setError("No se pudo generar el post.");
    } finally {
      setBusy("");
    }
  }

  async function saveSchedule(next: SocialSchedule) {
    setSchedule(next);
    writeLocalSchedule(next);
    setBusy("schedule");
    setError("");
    try {
      const response = await fetch("/api/store-redes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule", schedule: { ...next, productPool: pool } }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string; schedule?: SocialSchedule };
      if (!body.ok) {
        setError(body.error || "Quedó guardado en este navegador.");
        return;
      }
      if (body.schedule) setSchedule(body.schedule);
      setNotice("Programación guardada.");
    } catch {
      setError("No se pudo guardar en el servidor. Quedó en este navegador.");
    } finally {
      setBusy("");
    }
  }

  async function discard(id: string) {
    const next = posts.filter((item) => item.id !== id);
    setPosts(next);
    writeLocalPosts(next);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/store-redes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discard", id }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!body.ok) setError(body.error || "Se sacó de esta pantalla. No se pudo borrar en el servidor.");
    } catch {
      setError("Se sacó de esta pantalla. No se pudo borrar en el servidor.");
    }
  }

  async function discardAll() {
    setPosts([]);
    writeLocalPosts([]);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/store-redes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discard-all" }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!body.ok) setError(body.error || "Se vació acá. No se pudo borrar en el servidor.");
    } catch {
      setError("Se vació acá. No se pudo borrar en el servidor.");
    }
  }

  async function publish(id: string) {
    setBusy(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/store-redes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", id }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string; post?: SocialPost };
      if (body.post) {
        const next = posts.map((item) => (item.id === body.post?.id ? body.post : item));
        setPosts(next);
        writeLocalPosts(next);
      }
      if (!body.ok) {
        setError(body.error || "Instagram todavía no está conectado.");
        return;
      }
      setNotice("Publicado en Instagram.");
    } catch {
      setError("No se pudo publicar.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-black/5 bg-white px-4 py-4 shadow-sm">
          <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">Catálogo</p>
          <p className="mt-1 text-lg font-bold text-neutral-950">{pool.length} productos</p>
          <p className="mt-1 text-xs text-gray-500">Solo lectura desde la tienda. No mueve stock.</p>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white px-4 py-4 shadow-sm">
          <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">IA</p>
          <p className="mt-1 text-lg font-bold text-neutral-950">
            {engine === "openai" ? (openaiOn ? "ChatGPT listo" : "ChatGPT sin key") : geminiOn ? "Gemini listo" : "Gemini sin key"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {aiOn ? "Elegí el motor abajo y generá." : "Falta la API key del motor elegido."}
          </p>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white px-4 py-4 shadow-sm">
          <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">Instagram</p>
          <p className="mt-1 text-lg font-bold text-neutral-950">{igOn ? "Lista" : "Estructura lista"}</p>
          <p className="mt-1 text-xs text-gray-500">@{handle}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-950">Programación</h2>
        <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
          <span className="text-sm font-semibold text-slate-800">Automatizar publicaciones</span>
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(event) => void saveSchedule({ ...schedule, enabled: event.target.checked, productPool: pool })}
            className="h-4 w-4 accent-sky-500"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {FREQ.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void saveSchedule({ ...schedule, frequency: item.id, productPool: pool })}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                schedule.frequency === item.id ? "bg-sky-500 text-white" : "bg-neutral-950 text-white hover:bg-neutral-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-neutral-900">Horarios (Argentina)</p>
          <p className="mt-1 text-xs text-gray-500">Hasta 5. Ej: 10:00, 14:30 y 20:00.</p>
          <ul className="mt-3 space-y-2">
            {scheduleHours(schedule).map((slot, index) => (
              <li key={`${slot}-${index}`} className="flex items-center gap-2">
                <input
                  type="time"
                  value={slot}
                  onChange={(event) => {
                    const next = [...scheduleHours(schedule)];
                    next[index] = event.target.value || slot;
                    void saveSchedule({ ...schedule, hours: next, productPool: pool });
                  }}
                  className="h-11 w-36 rounded-xl border border-gray-200 px-3 outline-none focus:border-cyan-500"
                />
                {scheduleHours(schedule).length > 1 ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose-600"
                    onClick={() => {
                      const next = scheduleHours(schedule).filter((_, itemIndex) => itemIndex !== index);
                      void saveSchedule({ ...schedule, hours: normalizeScheduleHours(next), productPool: pool });
                    }}
                  >
                    Quitar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {scheduleHours(schedule).length < 5 ? (
            <button
              type="button"
              className="mt-3 rounded-full bg-neutral-950 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800"
              onClick={() => {
                const current = scheduleHours(schedule);
                const nextHour = Math.min(23, ((Number.parseInt(current.at(-1)?.slice(0, 2) || "11", 10) + 4) % 24));
                void saveSchedule({
                  ...schedule,
                  hours: normalizeScheduleHours([...current, `${String(nextHour).padStart(2, "0")}:00`]),
                  productPool: pool,
                });
              }}
            >
              + Agregar horario
            </button>
          ) : (
            <p className="mt-2 text-xs text-gray-500">Máximo 5 horarios.</p>
          )}
          <p className="mt-3 text-xs text-gray-500">
            Con la automatización activa, cada horario usa el modo de plantillas (fija, random o secuencial).
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,34rem)]">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-950">Generar post</h2>
          <label className="mt-4 block text-sm font-medium">
            Motor de IA
            <select
              value={engine}
              onChange={(event) => {
                const next = event.target.value === "openai" ? "openai" : "gemini";
                setEngine(next);
                try {
                  localStorage.setItem(LOCAL_ENGINE, next);
                } catch {
                  /* ignore */
                }
              }}
              className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
            >
              <option value="gemini">Google Gemini (Gratis)</option>
              <option value="openai">OpenAI - ChatGPT (De pago)</option>
            </select>
          </label>
          <label className="mt-4 block text-sm font-medium">
            Producto
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
            >
              <option value="">Al azar del catálogo</option>
              {pool.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void generate(true)}
              className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-50"
            >
              {busy === "random" ? "Generando..." : "Generar al azar"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || !selected}
              onClick={() => void generate(false)}
              className="rounded-full bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {busy === "one" ? "Generando..." : "Generar este producto"}
            </button>
          </div>
          {notice ? <p className="mt-3 text-sm text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          {preview ? (
            <article className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Vista previa</p>
              <h3 className="mt-2 text-base font-bold text-neutral-950">{preview.headline}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview.caption}</p>
              <p className="mt-3 text-xs leading-5 text-sky-700">{preview.hashtags.join(" ")}</p>
              <p className="mt-2 text-[11px] text-slate-400">
                {preview.product.title} · {formatPrice(preview.product.price)} · {preview.provider}
              </p>
            </article>
          ) : null}
        </div>
        {preview ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-3 text-sm">
              <p className="font-semibold text-neutral-950">Plantillas predeterminadas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TEMPLATE_MODES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      void saveSchedule({
                        ...schedule,
                        templateMode: item.id,
                        templateId: item.id === "fixed" ? schedule.templateId || DEFAULT_TEMPLATE_ID : schedule.templateId,
                        productPool: pool,
                      })
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      templateMode === item.id ? "bg-cyan-500 text-black" : "bg-neutral-950 text-white hover:bg-neutral-800"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid max-w-md grid-cols-2 gap-2">
                {OFFICIAL_REDES_TEMPLATES.map((item) => {
                  const selectedTemplate = activeTemplateId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={item.hint}
                      onClick={() => {
                        setCustomTemplate("");
                        try {
                          localStorage.removeItem(LOCAL_TEMPLATE);
                        } catch {
                          /* ignore */
                        }
                        void saveSchedule({
                          ...schedule,
                          templateMode: "fixed",
                          templateId: item.id,
                          lastTemplateIndex: OFFICIAL_REDES_TEMPLATES.findIndex((entry) => entry.id === item.id),
                          productPool: pool,
                        });
                      }}
                      className={`overflow-hidden rounded-xl border-2 ${
                        selectedTemplate ? "border-cyan-400" : "border-transparent"
                      }`}
                    >
                      {item.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.src} alt="" className="aspect-square w-full object-cover" />
                      ) : (
                        <span className={`block aspect-square w-full ${item.thumb}`} />
                      )}
                      <span className="block truncate bg-neutral-950 px-1 py-1 text-center text-[10px] font-bold text-white">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              <label className="mt-3 block text-xs font-semibold text-neutral-800">
                Subir plantilla propia (opcional)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-2 block w-full text-xs"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const value = String(reader.result || "");
                      setCustomTemplate(value);
                      try {
                        if (value.length < 700000) localStorage.setItem(LOCAL_TEMPLATE, value);
                      } catch {
                        setError("La plantilla es muy pesada para guardar acá. Usala igual en esta sesión.");
                      }
                      void saveSchedule({
                        ...schedule,
                        templateMode: "fixed",
                        templateId: CUSTOM_TEMPLATE_ID,
                        productPool: pool,
                      });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {schedule.templateId === CUSTOM_TEMPLATE_ID ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-sky-700"
                  onClick={() => {
                    setCustomTemplate("");
                    localStorage.removeItem(LOCAL_TEMPLATE);
                    void saveSchedule({
                      ...schedule,
                      templateMode: "fixed",
                      templateId: DEFAULT_TEMPLATE_ID,
                      productPool: pool,
                    });
                  }}
                >
                  Volver a plantillas MZ
                </button>
              ) : (
                <p className="mt-2 text-[11px] text-gray-500">
                  Fija usa la elegida. Random y secuencial rotan las plantillas oficiales. El producto se integra al diseño, sin recuadro vacío.
                </p>
              )}
            </div>
            <div className="flex justify-center overflow-x-auto rounded-[1.5rem] border border-black/10 bg-slate-100 p-2">
              <InstagramProductCard
                ref={cardRef}
                templateSrc={previewTemplateSrc}
                templateId={activeTemplateId}
                layout={previewLayout}
                slots={slots}
                editing={busy !== "image"}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                onSlotsChange={setSlots}
                title={preview.product.title}
                headline={preview.headline}
                priceLabel={formatPrice(
                  previewSnap?.onSale && previewSnap.price > 0
                    ? previewSnap.price
                    : preview.product.price || previewSnap?.price || 0,
                )}
                compareAtLabel={
                  previewSnap?.onSale && previewSnap.listPrice && previewSnap.listPrice > previewSnap.price
                    ? formatPrice(previewSnap.listPrice)
                    : ""
                }
                offerBadge={previewSnap ? catalogOfferBadge(previewSnap) : ""}
                image={preferRealProductImage([preview.product.image, previewSnap?.image])}
                features={featuresFromPost(preview)}
                showFooter={showFooter}
              />
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-3">
              <p className="text-xs font-semibold text-neutral-800">Editor de plantilla</p>
              <p className="mt-1 text-[11px] text-gray-500">
                Arrastrá para mover. Los puntos cyan cambian el tamaño. La foto no se deforma.
              </p>
              {previewLayout.baked ? null : (
                <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-neutral-800">
                  <input type="checkbox" checked={showFooter} onChange={(event) => setShowFooter(event.target.checked)} />
                  Mostrar dirección y WhatsApp
                </label>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(Object.keys(TEMPLATE_SLOT_LABELS) as TemplateSlotId[])
                  .filter((id) => id !== "offer" || Boolean(previewSnap?.onSale))
                  .map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedSlot(id)}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      selectedSlot === id ? "bg-sky-500 text-white" : "bg-slate-100 text-neutral-700"
                    }`}
                  >
                    {TEMPLATE_SLOT_LABELS[id]}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(["x", "y", "w", "h"] as const).map((key) => (
                  <label key={key} className="text-[10px] font-bold tracking-wide text-gray-500 uppercase">
                    {key === "x" ? "X" : key === "y" ? "Y" : key === "w" ? "Ancho" : "Alto"}
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={100}
                      value={selectedSlot ? slots[selectedSlot][key] : 0}
                      disabled={!selectedSlot}
                      onChange={(event) => {
                        if (!selectedSlot) return;
                        const value = Number(event.target.value);
                        const slotId = selectedSlot;
                        setSlots((current) => ({
                          ...current,
                          [slotId]: commitSlot(
                            slotId,
                            { ...current[slotId], [key]: value },
                            current,
                            canvasBounds(previewLayout.ratio),
                          ),
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm font-semibold text-neutral-900"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-sky-700"
                onClick={() => setSlots(defaultTemplateSlots(activeTemplateId))}
              >
                Restaurar posición original
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={busy === "slots" || busy === "schedule"}
                onClick={() => void saveTemplateSlots()}
                className="rounded-full border border-sky-300 bg-white px-4 py-2.5 text-sm font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-50"
              >
                {busy === "slots" ? "Guardando..." : "Guardar plantilla"}
              </button>
              <button
                type="button"
                disabled={busy === "image"}
                onClick={() => void downloadCard()}
                className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-50"
              >
                {busy === "image" ? "Armando imagen..." : "Generar y Descargar Imagen"}
              </button>
            </div>
            <p className="text-center text-[11px] text-gray-500">JPG listo para Instagram, con las posiciones del editor.</p>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-200 bg-white px-4 py-16 text-center text-sm text-gray-500">
            Generá un post para ver la pieza de Instagram.
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-neutral-950">Cola de publicaciones</h2>
          {posts.length > 0 ? (
            <button
              type="button"
              onClick={() => void discardAll()}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              Cancelar todo
            </button>
          ) : null}
        </div>
        {posts.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            Todavía no hay borradores.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {posts.map((post) => (
              <li
                key={post.id}
                className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4 sm:flex-row sm:items-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.product.image} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-slate-100 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-neutral-950">{post.headline}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">{post.product.title}</p>
                  {post.publishError ? <p className="mt-1 text-xs text-rose-600">{post.publishError}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={busy === post.id || post.status === "published"}
                    onClick={() => void publish(post.id)}
                    className="rounded-full bg-neutral-950 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {post.status === "published" ? "Publicado" : busy === post.id ? "Subiendo..." : "Subir a Instagram"}
                  </button>
                  <button
                    type="button"
                    aria-label="Cancelar este post"
                    disabled={busy === post.id}
                    onClick={() => void discard(post.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-lg leading-none text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function readLocalPosts(): SocialPost[] {
  try {
    const raw = localStorage.getItem(LOCAL_POSTS);
    return raw ? (JSON.parse(raw) as SocialPost[]) : [];
  } catch {
    return [];
  }
}

function writeLocalPosts(posts: SocialPost[]) {
  localStorage.setItem(LOCAL_POSTS, JSON.stringify(posts.slice(0, 40)));
}

function readLocalSchedule(): SocialSchedule {
  try {
    const raw = localStorage.getItem(LOCAL_SCHEDULE);
    const parsed = raw ? { ...defaultSocialSchedule(), ...(JSON.parse(raw) as SocialSchedule) } : defaultSocialSchedule();
    if (parsed.templateId === CUSTOM_TEMPLATE_ID) parsed.templateId = DEFAULT_TEMPLATE_ID;
    return parsed;
  } catch {
    return defaultSocialSchedule();
  }
}

function writeLocalSchedule(schedule: SocialSchedule) {
  localStorage.setItem(LOCAL_SCHEDULE, JSON.stringify(schedule));
}

function readLocalSlots(): Record<string, TemplateSlots> {
  try {
    const raw = localStorage.getItem(LOCAL_SLOTS);
    return raw ? (JSON.parse(raw) as Record<string, TemplateSlots>) : {};
  } catch {
    return {};
  }
}

function writeLocalSlots(slots: Record<string, TemplateSlots>) {
  localStorage.setItem(LOCAL_SLOTS, JSON.stringify(slots));
}
