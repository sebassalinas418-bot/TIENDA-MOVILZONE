"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/data/products";
import { useCatalog } from "@/lib/offers";
import { useStoreConfig } from "@/config/store-config";
import {
  downloadInstagramProductCard,
  InstagramProductCard,
} from "@/components/store-redes/instagram-product-card";
import { featuresFromPost } from "@/lib/store-redes/features";
import { preferRealProductImage } from "@/lib/store-redes/product-image";
import {
  defaultSocialSchedule,
  type SocialAiEngine,
  type SocialFrequency,
  type SocialPost,
  type SocialProductSnap,
  type SocialSchedule,
} from "@/lib/store-redes/types";

const LOCAL_POSTS = "movilzone.store-redes.posts";
const LOCAL_SCHEDULE = "movilzone.store-redes.schedule";
const LOCAL_TEMPLATE = "movilzone.store-redes.template";
const LOCAL_ENGINE = "movilzone.store-redes.engine";
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
        price: product.salePrice || product.price,
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
  const [templateSrc, setTemplateSrc] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosts(readLocalPosts());
    setSchedule(readLocalSchedule());
    try {
      const saved = localStorage.getItem(LOCAL_TEMPLATE);
      if (saved) setTemplateSrc(saved);
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
      if (body.schedule) setSchedule({ ...defaultSocialSchedule(), ...body.schedule });
      setAiOn(Boolean(body.status?.ai));
      setGeminiOn(Boolean(body.status?.gemini) || Boolean(CLIENT_GEMINI_KEY));
      setOpenaiOn(Boolean(body.status?.openai) || Boolean(CLIENT_OPENAI_KEY));
      setIgOn(Boolean(body.status?.instagram));
    })();
  }, []);

  const preview = posts[0];
  const selected = pool.find((item) => item.id === selectedId) ?? null;
  const handle = config.instagram || "movilzone.gp";

  async function downloadCard() {
    if (!cardRef.current || !preview) return;
    setBusy("image");
    setError("");
    setNotice("");
    try {
      const slug = preview.product.title.replace(/[^\w]+/g, "-").slice(0, 40) || "producto";
      await downloadInstagramProductCard(cardRef.current, `instagram-${slug}`);
      setNotice("Imagen JPG descargada. Listo para subir a Instagram.");
    } catch {
      setError("No se pudo armar la imagen. Si la foto es externa, recargá y reintentá.");
    } finally {
      setBusy("");
    }
  }

  async function generate(random: boolean) {
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
        <label className="mt-4 block text-sm font-medium">
          Hora (Argentina)
          <input
            type="number"
            min={0}
            max={23}
            value={schedule.hour}
            onChange={(event) => setSchedule((current) => ({ ...current, hour: Number(event.target.value) }))}
            onBlur={() => void saveSchedule({ ...schedule, productPool: pool })}
            className="mt-1 h-11 w-28 rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
          />
        </label>
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
            <label className="block rounded-2xl border border-dashed border-gray-200 bg-white p-3 text-sm">
              <span className="font-semibold text-neutral-950">Plantilla 1080×1080 (JPG/PNG)</span>
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
                    setTemplateSrc(value);
                    try {
                      if (value.length < 700000) localStorage.setItem(LOCAL_TEMPLATE, value);
                    } catch {
                      setError("La plantilla es muy pesada para guardar acá. Usala igual en esta sesión.");
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {templateSrc ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-sky-700"
                  onClick={() => {
                    setTemplateSrc("");
                    localStorage.removeItem(LOCAL_TEMPLATE);
                  }}
                >
                  Quitar plantilla
                </button>
              ) : (
                <p className="mt-2 text-xs text-gray-500">Subí el marco. Encima van la foto, el precio y 3 características.</p>
              )}
            </label>
            <div className="overflow-x-auto rounded-[1.5rem] border border-black/10 bg-slate-100 p-2">
              <InstagramProductCard
                ref={cardRef}
                templateSrc={templateSrc}
                title={preview.product.title}
                headline={preview.headline}
                priceLabel={formatPrice(preview.product.price)}
                image={preferRealProductImage([
                  preview.product.image,
                  pool.find((item) => item.id === preview.product.id)?.image,
                ])}
                features={featuresFromPost(preview)}
              />
            </div>
            <button
              type="button"
              disabled={busy === "image"}
              onClick={() => void downloadCard()}
              className="w-full rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-50"
            >
              {busy === "image" ? "Armando imagen..." : "Generar y Descargar Imagen"}
            </button>
            <p className="text-center text-[11px] text-gray-500">JPG 1080×1080 listo para Instagram.</p>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-200 bg-white px-4 py-16 text-center text-sm text-gray-500">
            Generá un post para ver la pieza de Instagram.
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-neutral-950">Cola de publicaciones</h2>
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
                <button
                  type="button"
                  disabled={busy === post.id || post.status === "published"}
                  onClick={() => void publish(post.id)}
                  className="rounded-full bg-neutral-950 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {post.status === "published" ? "Publicado" : busy === post.id ? "Subiendo..." : "Subir a Instagram"}
                </button>
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
    return raw ? { ...defaultSocialSchedule(), ...(JSON.parse(raw) as SocialSchedule) } : defaultSocialSchedule();
  } catch {
    return defaultSocialSchedule();
  }
}

function writeLocalSchedule(schedule: SocialSchedule) {
  localStorage.setItem(LOCAL_SCHEDULE, JSON.stringify(schedule));
}
