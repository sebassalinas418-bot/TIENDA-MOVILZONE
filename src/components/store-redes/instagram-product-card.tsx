"use client";

import { forwardRef, useEffect, useState } from "react";
import { toJpeg } from "html-to-image";
import { redesCardImageSrc } from "@/lib/store-redes/product-image";
import {
  CUSTOM_TEMPLATE_ID,
  DEFAULT_TEMPLATE_ID,
  templateLayout,
  type TemplateKind,
  type TemplateLayout,
} from "@/lib/store-redes/templates";

export type InstagramProductCardProps = {
  templateSrc: string;
  templateId?: string;
  layout?: TemplateLayout;
  title: string;
  headline?: string;
  priceLabel: string;
  image: string;
  features: string[];
};

export const InstagramProductCard = forwardRef<HTMLDivElement, InstagramProductCardProps>(
  function InstagramProductCard(
    { templateSrc, templateId, layout, title, headline, priceLabel, image, features },
    ref,
  ) {
    const zones = layout ?? templateLayout(templateId || DEFAULT_TEMPLATE_ID);
    const bullets = features.map(cleanFeature).filter(Boolean).slice(0, 3);
    const photo = redesCardImageSrc(image);
    const background = templateSrc.trim();
    const kind = zones.kind;
    const baked = Boolean(zones.baked);
    const hidePanel = Boolean(zones.hidePanel);
    const portrait = zones.ratio === "4:5";
    const frame = portrait
      ? { width: 540, height: 675, minWidth: 540, minHeight: 675 }
      : { width: 540, height: 540, minWidth: 540, minHeight: 540 };

    return (
      <div
        ref={ref}
        className={`relative overflow-hidden bg-[#020617] text-white ${portrait ? "aspect-[4/5]" : "aspect-square"}`}
        style={frame}
      >
        {background ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={background} alt="" crossOrigin="anonymous" className="absolute inset-0 z-0 h-full w-full object-cover" />
        ) : (
          <Backdrop kind={kind} />
        )}
        {zones.coverRight ? <div className="absolute inset-y-0 right-0 z-[1] w-[50%] bg-[#071627]" /> : null}

        {photo ? (
          <div className={zones.product}>
            {baked || hidePanel || zones.knockout ? null : (
              <div className="absolute inset-x-[12%] bottom-[6%] h-12 rounded-full bg-cyan-400/40 blur-2xl" />
            )}
            {zones.knockout ? <div className="absolute inset-x-[8%] bottom-[4%] h-16 rounded-full bg-cyan-300/25 blur-3xl" /> : null}
            <KnockoutPhoto src={photo} alt={title} enabled={Boolean(zones.knockout)} />
          </div>
        ) : null}

        {hidePanel ? null : (
        <div className={zones.panel}>
          {kind !== "hero" && !zones.hideStock ? <StockChip /> : null}
          <h2 className={zones.title}>{shortenTitle(title)}</h2>
          {headline ? <p className={zones.headline}>{baked ? `✨ ${shortHeadline(headline)}` : shortHeadline(headline)}</p> : null}
          {kind !== "hero" ? (
            <ul className={zones.features}>
              {bullets.map((item) => (
                <Feature key={item} label={item} kind={kind} />
              ))}
            </ul>
          ) : null}
        </div>
        )}

        {kind === "hero" && !hidePanel ? (
          <ul className={zones.features}>
            {bullets.map((item) => (
              <Feature key={item} label={item} kind={kind} />
            ))}
          </ul>
        ) : null}

        <div className={zones.price}>
          {baked ? (
            <>
              <span className="text-[26px] leading-none font-black tracking-tight text-white drop-shadow-[0_0_12px_rgba(34,211,238,0.65)]">
                {priceLabel}
              </span>
              <span className="mt-1 text-[9px] font-bold tracking-[0.22em] text-cyan-100/90 uppercase">
                Precio de contado
              </span>
            </>
          ) : (
            priceLabel
          )}
        </div>
      </div>
    );
  },
);

function KnockoutPhoto({ src, alt, enabled }: { src: string; alt: string; enabled: boolean }) {
  const [cut, setCut] = useState(src);

  useEffect(() => {
    if (!enabled || !src) {
      setCut(src);
      return;
    }
    let cancel = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(image, 0, 0);
        const data = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = data.data;
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          if (r > 236 && g > 236 && b > 236) {
            pixels[i + 3] = 0;
          } else if (r > 208 && g > 208 && b > 208) {
            const fade = (Math.min(r, g, b) - 208) / 48;
            pixels[i + 3] = Math.round(pixels[i + 3] * (1 - fade));
          }
        }
        context.putImageData(data, 0, 0);
        if (!cancel) setCut(canvas.toDataURL("image/png"));
      } catch {
        if (!cancel) setCut(src);
      }
    };
    image.onerror = () => {
      if (!cancel) setCut(src);
    };
    image.src = src;
    return () => {
      cancel = true;
    };
  }, [enabled, src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cut}
      alt={alt}
      crossOrigin="anonymous"
      className="relative z-[1] h-full w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)]"
    />
  );
}

function Backdrop({ kind }: { kind: TemplateKind }) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#020617]">
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.35) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      {kind === "left" ? <div className="absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" /> : null}
      {kind === "right" ? (
        <>
          <div className="absolute -right-10 bottom-16 h-44 w-44 rounded-full bg-cyan-400/30 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-24 w-full bg-gradient-to-t from-cyan-500/20 to-transparent" />
        </>
      ) : null}
      {kind === "hero" ? (
        <>
          <div className="absolute top-[-20%] left-1/2 h-[70%] w-[90%] -translate-x-1/2 rounded-full bg-cyan-400/25 blur-3xl" />
          <div className="absolute top-0 left-0 h-2 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          <div className="absolute bottom-16 left-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
          <div className="absolute right-3 top-24 rotate-90 text-[56px] font-black tracking-[0.3em] text-white/5">MZ</div>
        </>
      ) : null}
      {kind === "stack" ? (
        <>
          <div className="absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-cyan-950 via-black/90 to-transparent" />
          <div className="absolute bottom-0 left-0 h-1.5 w-full bg-cyan-400" />
        </>
      ) : null}
      {kind === "minimal" ? (
        <>
          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-cyan-300 via-cyan-500 to-cyan-900" />
          <div className="absolute bottom-[-20%] left-[-10%] h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute top-20 right-8 h-24 w-24 rounded-full border border-cyan-400/30" />
          <div className="absolute top-28 right-16 h-10 w-10 rounded-full bg-cyan-400/20" />
        </>
      ) : null}
      <Mark center={kind === "hero"} />
    </div>
  );
}

function Mark({ center = false }: { center?: boolean }) {
  return (
    <div className={`absolute top-3 z-[2] ${center ? "left-1/2 -translate-x-1/2 text-center" : "left-4"}`}>
      <p className="text-[22px] leading-none font-black tracking-tighter text-cyan-300 drop-shadow-[0_0_16px_rgba(34,211,238,1)]">
        MZ
      </p>
      <p className="text-[8px] font-black tracking-[0.28em] text-white/90">MOVIL ZONE</p>
    </div>
  );
}

function StockChip() {
  return (
    <span className="mb-1 w-fit rounded-full border border-cyan-300/70 bg-cyan-400/15 px-2 py-0.5 text-[9px] font-black tracking-[0.18em] text-cyan-200">
      EN STOCK
    </span>
  );
}

function Feature({ label, kind }: { label: string; kind: TemplateKind }) {
  if (kind === "right") {
    return (
      <li className="flex items-center gap-2 rounded-2xl border border-cyan-300/50 bg-[#04111f]/75 px-2.5 py-1.5 backdrop-blur-[2px]">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-black text-black shadow-[0_0_12px_rgba(34,211,238,0.9)]">
          ✓
        </span>
        <span className="text-[10px] leading-tight font-bold tracking-wide text-white uppercase">{label}</span>
      </li>
    );
  }
  if (kind === "hero") {
    return (
      <li className="flex max-w-[31%] flex-col items-center gap-1 rounded-2xl border border-cyan-400/40 bg-black/45 px-2 py-2 text-center backdrop-blur-sm">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-xs font-black text-black">✓</span>
        <span className="text-[9px] leading-tight font-bold tracking-wide text-white uppercase">{label}</span>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-2 rounded-full border border-cyan-400/40 bg-black/35 px-2.5 py-1.5 backdrop-blur-sm">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-black text-black shadow-[0_0_12px_rgba(34,211,238,0.9)]">
        ✓
      </span>
      <span className="text-[11px] leading-tight font-bold tracking-wide text-white uppercase">{label}</span>
    </li>
  );
}

export async function downloadInstagramProductCard(node: HTMLElement, fileName: string) {
  const width = Math.round(node.offsetWidth) || 540;
  const height = Math.round(node.offsetHeight) || width;
  const dataUrl = await toJpeg(node, {
    quality: 0.95,
    pixelRatio: 2,
    cacheBust: true,
    width,
    height,
    backgroundColor: "#020617",
  });
  const link = document.createElement("a");
  link.download = fileName.endsWith(".jpg") ? fileName : `${fileName}.jpg`;
  link.href = dataUrl;
  link.click();
}

function shortenTitle(title: string) {
  const value = title.trim();
  if (value.length <= 34) return value;
  return `${value.slice(0, 32).trim()}…`;
}

function shortHeadline(value: string) {
  const text = value.trim();
  if (text.length <= 42) return text;
  return `${text.slice(0, 40).trim()}…`;
}

function cleanFeature(value: string) {
  return value
    .replace(/^[\s\p{Extended_Pictographic}\p{Emoji_Presentation}]+/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 28);
}
