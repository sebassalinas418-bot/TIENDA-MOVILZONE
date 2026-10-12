"use client";

import { forwardRef } from "react";
import { toJpeg } from "html-to-image";
import { redesCardImageSrc } from "@/lib/store-redes/product-image";

export type InstagramProductCardProps = {
  templateSrc: string;
  title: string;
  headline?: string;
  priceLabel: string;
  image: string;
  features: string[];
};

export const InstagramProductCard = forwardRef<HTMLDivElement, InstagramProductCardProps>(
  function InstagramProductCard({ templateSrc, title, headline, priceLabel, image, features }, ref) {
    const bullets = features.map(cleanFeature).filter(Boolean).slice(0, 3);
    const photo = redesCardImageSrc(image);
    const frame = templateSrc.trim();
    const shortTitle = shortenTitle(title);

    return (
      <div
        ref={ref}
        className="relative aspect-square overflow-hidden"
        style={{ width: 540, height: 540, minWidth: 540, minHeight: 540 }}
      >
        {frame ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={frame} alt="" crossOrigin="anonymous" className="absolute inset-0 z-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-sky-100 via-white to-cyan-200" />
        )}

        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-white/25 via-transparent to-black/25" />

        <p className="absolute top-5 right-5 z-10 rounded-full bg-sky-500 px-3 py-1 text-[11px] font-black tracking-[0.18em] text-white uppercase">
          En stock
        </p>

        <div className="absolute top-14 right-5 z-10 w-[46%] text-right">
          <h2 className="text-[28px] leading-[1.05] font-black tracking-tight text-neutral-950 uppercase drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
            {shortTitle}
          </h2>
          {headline ? (
            <p className="mt-2 text-[15px] leading-snug font-semibold text-sky-800 italic">{headline}</p>
          ) : null}
        </div>

        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={title}
            crossOrigin="anonymous"
            className="absolute top-1/4 left-4 z-10 h-1/2 w-1/2 object-contain drop-shadow-2xl"
          />
        ) : null}

        <div className="absolute top-[42%] right-4 z-10 flex w-[44%] flex-col gap-2.5">
          {bullets.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-2xl bg-white/92 px-2.5 py-2 shadow-md ring-1 ring-black/5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-sm font-black text-white">
                ✓
              </span>
              <p className="text-[13px] leading-tight font-extrabold tracking-tight text-neutral-900 uppercase">
                {item}
              </p>
            </div>
          ))}
        </div>

        <div className="absolute bottom-8 left-6 z-20 -rotate-3 rounded-2xl border-4 border-neutral-950 bg-white px-4 py-2 shadow-xl">
          <p className="text-[10px] font-black tracking-[0.2em] text-sky-600 uppercase">Precio</p>
          <p className="text-[30px] leading-none font-black text-neutral-950">{priceLabel}</p>
        </div>
      </div>
    );
  },
);

export async function downloadInstagramProductCard(node: HTMLElement, fileName: string) {
  const dataUrl = await toJpeg(node, {
    quality: 0.95,
    pixelRatio: 2,
    cacheBust: true,
    width: 540,
    height: 540,
    backgroundColor: "#e0f2fe",
  });
  const link = document.createElement("a");
  link.download = fileName.endsWith(".jpg") ? fileName : `${fileName}.jpg`;
  link.href = dataUrl;
  link.click();
}

function shortenTitle(title: string) {
  const value = title.trim();
  if (value.length <= 36) return value;
  return `${value.slice(0, 34).trim()}…`;
}

function cleanFeature(value: string) {
  return value
    .replace(/^[\s\p{Extended_Pictographic}\p{Emoji_Presentation}]+/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 42);
}
