"use client";

import { forwardRef } from "react";
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
    const custom = Boolean(templateId === CUSTOM_TEMPLATE_ID && templateSrc.trim());
    const kind = zones.kind;

    return (
      <div
        ref={ref}
        className="relative flex flex-col overflow-hidden bg-[#070b12] text-white"
        style={{ width: 540, height: 540, minWidth: 540, minHeight: 540 }}
      >
        {custom ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={templateSrc} alt="" crossOrigin="anonymous" className="absolute inset-0 z-0 h-full w-full object-cover" />
        ) : (
          <Accent kind={kind} />
        )}

        <header className="relative z-10 flex h-[72px] shrink-0 items-center px-5">
          <div>
            <p className="text-[28px] leading-none font-black tracking-tight text-cyan-400">MZ</p>
            <p className="text-[10px] font-black tracking-[0.18em] text-white">MOVIL ZONE</p>
            <p className="text-[8px] font-semibold tracking-[0.14em] text-cyan-200/80">SERVICIO TÉCNICO & VENTAS</p>
          </div>
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 gap-4 px-5 pb-3">
          <div
            className={`flex h-full w-[48%] items-center justify-center overflow-hidden rounded-[22px] border-[3px] p-3 ${
              kind === "frame" ? "border-cyan-400 bg-black/40" : "border-cyan-400/90 bg-black/20"
            }`}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={title} crossOrigin="anonymous" className="max-h-full max-w-full object-contain" />
            ) : null}
          </div>

          <div className="flex w-[52%] min-w-0 flex-col pt-1">
            <h2 className="text-[26px] leading-[1.05] font-black tracking-tight text-white uppercase">{shortenTitle(title)}</h2>
            {headline ? (
              <p className="mt-2 text-[12px] font-semibold tracking-wide text-cyan-300 uppercase">{shortHeadline(headline)}</p>
            ) : null}
            <ul className="mt-4 flex flex-col gap-2.5">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-cyan-400 text-[11px] font-black text-cyan-300">
                    ✓
                  </span>
                  <span className="pt-0.5 text-[12px] leading-snug font-bold tracking-wide text-white uppercase">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-auto pb-1 text-right text-[32px] leading-none font-black text-cyan-400">{priceLabel}</p>
          </div>
        </div>

        <footer className="relative z-10 flex h-[44px] shrink-0 items-center justify-center gap-3 bg-black">
          <span className="text-[12px] font-bold text-white">Calle 9 N° 421</span>
          <span className="text-cyan-400">|</span>
          <span className="text-[12px] font-black text-white">2302 57 3969</span>
        </footer>
      </div>
    );
  },
);

function Accent({ kind }: { kind: TemplateKind }) {
  if (kind === "studio") {
    return (
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#05070c]" />
        <div className="absolute top-0 right-0 h-40 w-40 bg-cyan-400/15 blur-3xl" />
        <div className="absolute bottom-16 left-0 h-32 w-32 bg-cyan-500/10 blur-3xl" />
      </div>
    );
  }
  if (kind === "frame") {
    return (
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#070b12]" />
        <div className="absolute top-0 right-0 h-24 w-40 bg-cyan-400" />
        <div className="absolute top-8 right-8 h-16 w-28 bg-cyan-300/40" />
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 bg-[#070b12]" />
      <div className="absolute top-0 left-[120px] h-16 w-40 rotate-[-18deg] bg-cyan-400" />
      <div className="absolute top-8 left-[150px] h-8 w-32 rotate-[-18deg] bg-cyan-300/50" />
    </div>
  );
}

export async function downloadInstagramProductCard(node: HTMLElement, fileName: string) {
  const dataUrl = await toJpeg(node, {
    quality: 0.95,
    pixelRatio: 2,
    cacheBust: true,
    width: 540,
    height: 540,
    backgroundColor: "#070b12",
  });
  const link = document.createElement("a");
  link.download = fileName.endsWith(".jpg") ? fileName : `${fileName}.jpg`;
  link.href = dataUrl;
  link.click();
}

function shortenTitle(title: string) {
  const value = title.trim();
  if (value.length <= 42) return value;
  return `${value.slice(0, 40).trim()}…`;
}

function shortHeadline(value: string) {
  const text = value.trim();
  if (text.length <= 56) return text;
  return `${text.slice(0, 54).trim()}…`;
}

function cleanFeature(value: string) {
  return value
    .replace(/^[\s\p{Extended_Pictographic}\p{Emoji_Presentation}]+/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
}
