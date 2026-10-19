"use client";

import { forwardRef, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { toJpeg } from "html-to-image";
import { redesCardImageSrc } from "@/lib/store-redes/product-image";
import {
  canvasBounds,
  cloneSlots,
  constrainMove,
  constrainResize,
  defaultTemplateSlots,
  slotBoxStyle,
  type CanvasBounds,
  type ResizeHandle,
  type TemplateSlot,
  type TemplateSlotId,
  type TemplateSlots,
} from "@/lib/store-redes/slots";
import { adTitleFromName, shortFeatureLine, splitAdTitle } from "@/lib/store-redes/ad-title";
import {
  DEFAULT_TEMPLATE_ID,
  templateLayout,
  type TemplateKind,
  type TemplateLayout,
  type TemplateTone,
} from "@/lib/store-redes/templates";

export type InstagramProductCardProps = {
  templateSrc: string;
  templateId?: string;
  layout?: TemplateLayout;
  slots?: TemplateSlots;
  editing?: boolean;
  selectedSlot?: TemplateSlotId | null;
  onSelectSlot?: (id: TemplateSlotId) => void;
  onSlotsChange?: (slots: TemplateSlots) => void;
  showFooter?: boolean;
  title: string;
  headline?: string;
  priceLabel: string;
  compareAtLabel?: string;
  offerBadge?: string;
  image: string;
  features: string[];
};

const IMPACT = "Impact, Haettenschweiler, 'Arial Black', sans-serif";

const SLOT_COLORS: Record<TemplateSlotId, string> = {
  product: "border-cyan-300",
  text: "border-sky-300",
  price: "border-amber-300",
  offer: "border-rose-400",
};

export const InstagramProductCard = forwardRef<HTMLDivElement, InstagramProductCardProps>(
  function InstagramProductCard(
    {
      templateSrc,
      templateId,
      layout,
      slots,
      editing = false,
      selectedSlot = null,
      onSelectSlot,
      onSlotsChange,
      showFooter = true,
      title,
      headline: _headline,
      priceLabel,
      compareAtLabel = "",
      offerBadge = "",
      image,
      features,
    },
    ref,
  ) {
    const zones = layout ?? templateLayout(templateId || DEFAULT_TEMPLATE_ID);
    const live = cloneSlots(slots ?? defaultTemplateSlots(templateId));
    const bounds = canvasBounds(zones.ratio);
    const bullets = features.map(shortFeatureLine).filter(Boolean).slice(0, 4);
    const displayTitle = adTitleFromName(title);
    const hasPrice = Boolean(priceLabel.trim()) && !/^\$\s*0$/.test(priceLabel.trim());
    const hasOffer = Boolean(offerBadge.trim());
    const photo = redesCardImageSrc(image);
    const background = templateSrc.trim();
    const tone = zones.tone || toneFromKind(zones.kind);
    const baked = Boolean(zones.baked);
    const urban = tone === "urban";
    const light = !background;
    const hidePanel = Boolean(zones.hidePanel);
    const frame =
      zones.ratio === "3:4"
        ? { width: 540, height: 720, minWidth: 540, minHeight: 720 }
        : zones.ratio === "4:5"
          ? { width: 540, height: 675, minWidth: 540, minHeight: 675 }
          : { width: 540, height: 540, minWidth: 540, minHeight: 540 };
    const aspectClass =
      zones.ratio === "3:4" ? "aspect-[3/4]" : zones.ratio === "4:5" ? "aspect-[4/5]" : "aspect-square";

    function patchSlot(id: TemplateSlotId, next: TemplateSlot) {
      onSlotsChange?.({ ...live, [id]: next });
    }

    return (
      <div
        ref={ref}
        className={`relative overflow-hidden ${aspectClass} ${light ? "text-slate-950" : "text-white"}`}
        style={{ ...frame, backgroundColor: light ? "#f8fafc" : "#0f172a" }}
      >
        {background ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={background}
            alt=""
            crossOrigin="anonymous"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
          />
        ) : (
          <Backdrop tone={tone} />
        )}

        {baked ? null : <BrandMark urban={urban} />}

        <div
          className={`pointer-events-none absolute z-20 ${
            baked
              ? "top-[15%] right-[8%] left-[7%] -rotate-[4deg]"
              : urban
                ? "top-12 right-8 left-3"
                : "top-11 right-3 left-3 -rotate-[6deg]"
          }`}
        >
          <h2 style={{ fontFamily: IMPACT, lineHeight: 0.86 }}>
            <DisplayTitle title={displayTitle} baked={baked} urban={urban} />
          </h2>
        </div>

        {photo ? (
          <Layer
            id="product"
            slot={live.product}
            bounds={bounds}
            editing={editing}
            selected={selectedSlot === "product"}
            zIndex={selectedSlot === "product" ? 30 : 10}
            onSelect={onSelectSlot}
            onChange={(slot) => patchSlot("product", slot)}
          >
            <ProductPhoto src={photo} alt={displayTitle} knockout={Boolean(zones.knockout)} />
          </Layer>
        ) : null}

        {hasOffer ? (
          <Layer
            id="offer"
            slot={live.offer}
            bounds={bounds}
            editing={editing}
            selected={selectedSlot === "offer"}
            zIndex={selectedSlot === "offer" ? 33 : 25}
            onSelect={onSelectSlot}
            onChange={(slot) => patchSlot("offer", slot)}
          >
            <div className="flex h-full w-full items-center justify-center">
              <span
                className={`flex h-[92%] w-[92%] -rotate-[22deg] items-center justify-center text-[13px] leading-none font-black text-white shadow-[0_8px_16px_rgba(91,33,182,0.35)] ${
                  urban ? "bg-fuchsia-600" : "bg-rose-600"
                }`}
                style={{ clipPath: "polygon(8% 6%, 96% 0, 100% 78%, 88% 100%, 2% 92%, 0 22%)" }}
              >
                {offerBadge}
              </span>
            </div>
          </Layer>
        ) : null}

        {hidePanel ? null : (
          <Layer
            id="text"
            slot={live.text}
            bounds={bounds}
            editing={editing}
            selected={selectedSlot === "text"}
            zIndex={selectedSlot === "text" ? 31 : 11}
            onSelect={onSelectSlot}
            onChange={(slot) => patchSlot("text", slot)}
          >
            <div className="flex h-full w-full flex-col justify-center overflow-hidden">
              <FeatureList items={bullets} baked={baked} urban={urban} />
            </div>
          </Layer>
        )}

        {hasPrice ? (
          <Layer
            id="price"
            slot={live.price}
            bounds={bounds}
            editing={editing}
            selected={selectedSlot === "price"}
            zIndex={selectedSlot === "price" ? 32 : 22}
            onSelect={onSelectSlot}
            onChange={(slot) => patchSlot("price", slot)}
          >
            <PriceBadge
              priceLabel={baked ? priceLabel.replace(/^\$\s*/, "") : priceLabel}
              compareAtLabel={compareAtLabel}
              baked={baked}
              urban={urban}
            />
          </Layer>
        ) : null}

        {showFooter && !baked ? <FooterBar urban={urban} /> : null}
      </div>
    );
  },
);

const HANDLES: { dir: ResizeHandle; className: string }[] = [
  { dir: "n", className: "left-1/2 top-0 h-3 w-8 -translate-x-1/2 -translate-y-1/2 cursor-n-resize" },
  { dir: "s", className: "left-1/2 bottom-0 h-3 w-8 -translate-x-1/2 translate-y-1/2 cursor-s-resize" },
  { dir: "e", className: "top-1/2 right-0 h-8 w-3 -translate-y-1/2 translate-x-1/2 cursor-e-resize" },
  { dir: "w", className: "top-1/2 left-0 h-8 w-3 -translate-x-1/2 -translate-y-1/2 cursor-w-resize" },
  { dir: "ne", className: "top-0 right-0 h-3.5 w-3.5 -translate-y-1/2 translate-x-1/2 cursor-ne-resize" },
  { dir: "nw", className: "top-0 left-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize" },
  { dir: "se", className: "right-0 bottom-0 h-3.5 w-3.5 translate-x-1/2 translate-y-1/2 cursor-se-resize" },
  { dir: "sw", className: "bottom-0 left-0 h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 cursor-sw-resize" },
];

function Layer({
  id,
  slot,
  bounds,
  editing,
  selected,
  zIndex,
  onSelect,
  onChange,
  children,
}: {
  id: TemplateSlotId;
  slot: TemplateSlot;
  bounds: CanvasBounds;
  editing: boolean;
  selected: boolean;
  zIndex: number;
  onSelect?: (id: TemplateSlotId) => void;
  onChange?: (slot: TemplateSlot) => void;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  function start(event: ReactPointerEvent<HTMLElement>, handle: ResizeHandle | "move") {
    if (!editing || !onChange) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(id);
    const origin = { ...slot };
    const startX = event.clientX;
    const startY = event.clientY;
    const onMove = (next: PointerEvent) => {
      const parent = boxRef.current?.offsetParent as HTMLElement | null;
      if (!parent) return;
      const dx = ((next.clientX - startX) / parent.clientWidth) * 100;
      const dy = ((next.clientY - startY) / parent.clientHeight) * 100;
      onChange(handle === "move" ? constrainMove(origin, dx, dy, id, bounds) : constrainResize(origin, dx, dy, handle, id, bounds));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      ref={boxRef}
      style={slotBoxStyle(slot, zIndex)}
      className={editing ? "cursor-move overflow-visible touch-none" : "overflow-hidden"}
      onPointerDown={(event) => start(event, "move")}
    >
      <div className="h-full w-full overflow-visible">{children}</div>
      {editing && selected ? (
        <>
          <div
            data-editor-ui="1"
            className={`pointer-events-none absolute inset-0 rounded-md border-2 border-dashed ${SLOT_COLORS[id]}`}
          />
          {HANDLES.map((item) => (
            <div
              key={item.dir}
              data-editor-ui="1"
              className={`absolute z-50 rounded-sm bg-cyan-300 ${item.className}`}
              onPointerDown={(event) => start(event, item.dir)}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

function knockStudioBackdrop(data: ImageData) {
  const { width, height, data: pixels } = data;
  const isPaper = (index: number) => {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    return r > 238 && g > 238 && b > 238 && Math.abs(r - g) < 12 && Math.abs(g - b) < 12;
  };
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pos = y * width + x;
    if (seen[pos]) return;
    seen[pos] = 1;
    const index = pos * 4;
    if (!isPaper(index)) return;
    stack.push(pos);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const pos = stack.pop() as number;
    const index = pos * 4;
    pixels[index + 3] = 0;
    const x = pos % width;
    const y = (pos - x) / width;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
}

function ProductPhoto({ src, alt, knockout }: { src: string; alt: string; knockout: boolean }) {
  const [cut, setCut] = useState(src);

  useEffect(() => {
    if (!knockout || !src) {
      setCut(src);
      return;
    }
    let cancel = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const naturalW = image.naturalWidth || image.width;
        const naturalH = image.naturalHeight || image.height;
        const scale = Math.min(1, 900 / Math.max(naturalW, naturalH));
        canvas.width = Math.max(1, Math.round(naturalW * scale));
        canvas.height = Math.max(1, Math.round(naturalH * scale));
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = context.getImageData(0, 0, canvas.width, canvas.height);
        knockStudioBackdrop(data);
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
  }, [knockout, src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cut}
      alt={alt}
      crossOrigin="anonymous"
      className="h-full w-full object-contain"
      style={{ filter: "drop-shadow(12px 22px 18px rgba(15,23,42,0.32))" }}
    />
  );
}

function Backdrop({ tone }: { tone: TemplateTone }) {
  if (tone === "urban") {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#f7f4ff]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#ffffff_0%,#f4f0ff_46%,#e8e4f5_100%)]" />
        <div className="absolute -top-10 -right-8 h-44 w-44 rotate-12 rounded-[2rem] bg-[#7c3aed]/25" />
        <div className="absolute top-24 -right-16 h-64 w-40 -rotate-12 bg-[#2563eb]/20" />
        <div className="absolute bottom-16 -left-10 h-36 w-36 rotate-6 rounded-full bg-[#7c3aed]/15" />
        <div className="absolute right-[18%] bottom-[22%] h-24 w-24 rounded-full border-2 border-[#2563eb]/25" />
        <span className="absolute top-28 right-16 h-2 w-2 rounded-full bg-cyan-300" />
        <span className="absolute top-40 right-10 h-1.5 w-1.5 rounded-full bg-[#7c3aed]" />
        <span className="absolute bottom-28 left-16 h-2 w-8 -rotate-12 rounded-full bg-cyan-300/80" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[#ded8f0]/80 to-transparent" />
      </div>
    );
  }
  const wash =
    tone === "hero"
      ? "bg-[#f7fafc]"
      : tone === "tech"
        ? "bg-[#e8f4ff]"
        : tone === "energy"
          ? "bg-[#f4f7fb]"
          : tone === "clean"
            ? "bg-[#e6f2f8]"
            : "bg-[#eef4f8]";
  return (
    <div className={`absolute inset-0 z-0 overflow-hidden ${wash}`}>
      <div className="absolute -top-16 -left-10 h-[72%] w-[70%] rounded-full bg-white blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-[#d5e0ea] via-[#e8eef4]/80 to-transparent" />
      <div className="absolute bottom-[16%] left-[-10%] h-44 w-36 rounded-full bg-emerald-800/20 blur-2xl" />
      <CyanBlob className="absolute top-[16%] right-[-16%] h-64 w-64 rotate-[18deg] opacity-95" />
      <CyanBlob className="absolute top-[46%] left-[6%] h-24 w-24 rotate-[-24deg] opacity-70" />
      <span className="absolute top-24 right-16 h-2 w-2 rounded-full bg-cyan-400" />
      <span className="absolute top-40 right-10 h-1.5 w-1.5 rounded-full bg-cyan-300" />
      <span className="absolute right-24 bottom-40 h-2 w-2 rounded-full bg-cyan-400" />
    </div>
  );
}

function CyanBlob({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <path
        fill="#22d3ee"
        d="M44.7,-67.3C58.1,-59.2,69.2,-47,76.6,-32.4C84,-17.8,87.8,-0.7,83.7,14.3C79.6,29.4,67.6,42.4,53.8,53.6C40,64.8,24.3,74.2,7.4,77.1C-9.5,80,-27.6,76.4,-42.7,67.6C-57.8,58.7,-69.9,44.6,-76.6,28.2C-83.3,11.8,-84.6,-7,-78.5,-23.3C-72.4,-39.6,-59,-53.4,-44.1,-61.2C-29.2,-69,-14.6,-70.8,0.6,-71.7C15.8,-72.6,31.5,-75.5,44.7,-67.3Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}

function BrandMark({ urban }: { urban?: boolean }) {
  return (
    <div className={`absolute top-3 left-3 z-30 rounded-md px-2.5 py-1.5 shadow-lg ${urban ? "bg-[#1e1b4b]" : "bg-[#07111f]"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-lockup.png" alt="MZ Movil Zone" className="h-8 w-auto max-w-[180px] object-contain" />
    </div>
  );
}

function PriceBadge({
  priceLabel,
  compareAtLabel,
  baked,
  urban,
}: {
  priceLabel: string;
  compareAtLabel?: string;
  baked?: boolean;
  urban?: boolean;
}) {
  if (urban) {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="absolute inset-x-1 inset-y-2 -rotate-2 rounded-[1.4rem] bg-gradient-to-r from-[#7c3aed] to-[#2563eb] shadow-[0_10px_24px_rgba(37,99,235,0.35)]" />
        <div className="relative flex -rotate-2 flex-col items-center px-2 text-center">
          {compareAtLabel ? <span className="text-[11px] font-bold text-violet-100 line-through">{compareAtLabel}</span> : null}
          <span className="text-[40px] leading-none font-black tracking-tight text-white" style={{ fontFamily: IMPACT }}>
            {priceLabel}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {baked ? null : (
        <svg viewBox="0 0 320 110" className="absolute inset-0 h-full w-full" aria-hidden>
          <path
            fill="#111827"
            d="M8 62c12-28 52-48 108-52 62-4 118 12 168 8 18-1 38 10 32 28-6 16-28 22-54 28-48 10-102 4-154 10-38 4-82-4-98-18-10-8-12-4-2-4z"
          />
        </svg>
      )}
      <div className={`relative flex flex-col items-center px-3 text-center ${baked ? "-rotate-[7deg]" : "-rotate-[8deg]"}`}>
        {compareAtLabel ? <span className="text-[11px] font-bold text-rose-300 line-through">{compareAtLabel}</span> : null}
        <span
          className={`${baked ? "text-[40px]" : "text-[52px]"} leading-none font-black tracking-tight text-white italic`}
          style={{ fontFamily: IMPACT, textShadow: "0 2px 0 rgba(0,0,0,0.35)" }}
        >
          {priceLabel}
        </span>
      </div>
    </div>
  );
}

function FooterBar({ urban }: { urban?: boolean }) {
  if (urban) {
    return (
      <div className="absolute inset-x-0 bottom-0 z-30 flex h-11 items-center justify-between bg-[#1e1b4b] px-4 text-[10px] font-black tracking-wide text-white">
        <span>MZ MOVIL ZONE · Calle 9 N° 421</span>
        <span className="text-cyan-300">WhatsApp 2302 57 3969</span>
      </div>
    );
  }
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-30 flex h-[58px] items-end justify-between gap-3 px-5 pb-3 text-[11px] font-black tracking-wide text-white"
      style={{
        background: "#07111f",
        clipPath: "polygon(0 42%, 100% 8%, 100% 100%, 0 100%)",
      }}
    >
      <span className="flex items-center gap-1.5">
        <PinIcon />
        Calle 9 N° 421
      </span>
      <span className="h-4 w-px bg-white/40" />
      <span className="flex items-center gap-1.5">
        <WhatsIcon />
        WhatsApp 2302 57 3969
      </span>
    </div>
  );
}

function DisplayTitle({ title, baked, urban }: { title: string; baked?: boolean; urban?: boolean }) {
  const { main, rest } = splitAdTitle(title);
  const size = main.length > 18 ? 34 : baked ? 42 : 48;
  if (urban) {
    return (
      <span className="block uppercase text-slate-950">
        <span className="block font-black tracking-tighter" style={{ fontSize: size }}>
          {main}
        </span>
        {rest ? (
          <span
            className="mt-1 inline-block max-w-full -rotate-1 rounded-md bg-[#7c3aed] px-2 py-0.5 font-black tracking-tighter text-white"
            style={{ fontSize: Math.max(28, size - 4) }}
          >
            {rest}
          </span>
        ) : null}
      </span>
    );
  }
  if (baked) {
    return (
      <span className="block uppercase italic text-white" style={{ textShadow: "2px 3px 0 rgba(0,0,0,0.45)" }}>
        <span className="block font-black tracking-tighter" style={{ fontSize: size }}>
          {main}
        </span>
        {rest ? (
          <span className="mt-1 block font-black tracking-tighter" style={{ fontSize: size }}>
            {rest}
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <span className="block text-slate-950 uppercase italic" style={{ textShadow: "3px 3px 0 #fff, 5px 5px 0 rgba(34,211,238,0.35)" }}>
      <span className="block font-black tracking-tighter" style={{ fontSize: size }}>
        {main}
      </span>
      {rest ? (
        <span className="relative mt-1 inline-block w-fit max-w-full">
          <svg viewBox="0 0 420 70" className="absolute -inset-x-4 -inset-y-1 h-[130%] w-[124%]" aria-hidden>
            <path
              fill="#22d3ee"
              d="M10 38c14-20 58-30 126-32 82-3 156 10 228 4 22-2 52 8 48 20-4 14-30 18-58 24-62 12-138 4-206 10-48 4-102-2-122-14-12-8-24-6-16-12z"
            />
          </svg>
          <span className="relative px-2 font-black tracking-tighter text-slate-950" style={{ fontSize: size }}>
            {rest}
          </span>
        </span>
      ) : null}
    </span>
  );
}

function FeatureList({ items, baked, urban }: { items: string[]; baked?: boolean; urban?: boolean }) {
  if (baked) {
    const rows = [...items.slice(0, 4), "", "", "", ""].slice(0, 4);
    return (
      <ul className="flex h-full flex-col justify-between py-0.5">
        {rows.map((item, index) => (
          <li key={`${item}-${index}`} className="flex h-[22%] items-center">
            <span className="text-[11px] leading-none font-black tracking-wide text-slate-900 uppercase">
              {item}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((item) => {
        const lines = featureLines(item);
        return (
          <li key={item} className="flex items-center gap-2.5">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                urban ? "bg-[#7c3aed] text-white ring-2 ring-cyan-300" : "bg-slate-950 text-cyan-300 ring-[3px] ring-cyan-300"
              }`}
            >
              <FeatureGlyph label={item} />
            </span>
            <span className="max-w-[8.5rem] text-[12px] leading-[1.05] font-black tracking-wide text-slate-900 uppercase">
              {lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function featureLines(value: string) {
  const words = value.toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [value.toUpperCase()];
  if (value.length <= 10) return [value.toUpperCase()];
  const mid = Math.max(1, Math.ceil(words.length / 2));
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")].filter(Boolean);
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 119.5 9 2.5 2.5 0 0112 11.5z" />
    </svg>
  );
}

function WhatsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current text-cyan-300" aria-hidden>
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.32 4.94L2 22l5.39-1.41a10 10 0 004.65 1.18h.04c5.46 0 9.89-4.4 9.89-9.84C21.97 6.4 17.5 2 12.04 2zm5.76 14.13c-.24.68-1.4 1.3-1.94 1.35-.5.04-1.12.06-1.81-.11-.42-.11-.95-.31-1.64-.6-2.89-1.24-4.77-4.15-4.92-4.34-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.32.02.51-.1.2-.14.32-.29.49-.14.18-.3.39-.43.53-.14.14-.29.3-.12.58.16.29.73 1.2 1.57 1.95 1.08.96 1.99 1.26 2.27 1.4.28.14.45.12.61-.07.16-.2.7-.81.88-1.09.18-.27.37-.23.62-.14.25.1 1.57.74 1.84.87.27.14.45.2.52.31.06.1.06.6-.18 1.28z" />
    </svg>
  );
}

function FeatureGlyph({ label }: { label: string }) {
  const value = label.toLowerCase();
  if (/(bluetooth|inalám|wireless)/.test(value)) return <Icon d="M7 7l10 10-5 5V2l5 5L7 17" />;
  if (/(bater|durac)/.test(value)) return <Icon d="M4 8h14v8H4zM18 11h2v2h-2M7 12h4" />;
  if (/(carga|rápid|rapida|watt)/.test(value)) return <Icon d="M13 2L4 14h7l-1 8 10-14h-7z" />;
  if (/(mouse|óptico|optico)/.test(value)) return <Icon d="M12 3v7h4a5 5 0 11-10 0h4" />;
  if (/(usb|cable|conex)/.test(value)) return <Icon d="M8 4v6M16 4v6M6 10h12v6a4 4 0 01-4 4h-4a4 4 0 01-4-4v-6z" />;
  if (/(sonido|audio|parlant)/.test(value)) return <Icon d="M4 10v4h4l5 4V6L8 10H4z" />;
  if (/(pantalla|hd|defin|4k|hdmi|transm)/.test(value)) return <Icon d="M4 6h16v10H4zM8 20h8" />;
  if (/(3 en 1|multiuso|combo)/.test(value)) return <Icon d="M8 8a2 2 0 114 0 2 2 0 01-4 0zm6 8a2 2 0 114 0 2 2 0 01-4 0zM4 16a2 2 0 114 0 2 2 0 01-4 0zM11 9.5l2.5 5M9.5 9.5L7 14.5" />;
  return <Icon d="M12 3l2 6h6l-5 4 2 7-5-4-5 4 2-7-5-4h6z" />;
}

function Icon({ d }: { d: string }) {
  return (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d={d} />
    </svg>
  );
}

export async function downloadInstagramProductCard(node: HTMLElement, fileName: string) {
  const width = Math.round(node.offsetWidth) || 540;
  const height = Math.round(node.offsetHeight) || width;
  const dataUrl = await toJpeg(node, {
    quality: 0.95,
    pixelRatio: 1080 / width,
    cacheBust: true,
    width,
    height,
    backgroundColor: "#f8fafc",
    filter: (element) => {
      if (!(element instanceof HTMLElement)) return true;
      return element.dataset.editorUi !== "1";
    },
  });
  const link = document.createElement("a");
  link.download = fileName.endsWith(".jpg") ? fileName : `${fileName}.jpg`;
  link.href = dataUrl;
  link.click();
}

function toneFromKind(kind: TemplateKind): TemplateTone {
  if (kind === "hero") return "hero";
  if (kind === "right") return "tech";
  if (kind === "stack") return "energy";
  if (kind === "minimal") return "clean";
  return "impacto";
}


