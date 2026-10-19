export type TemplateSlot = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TemplateSlots = {
  product: TemplateSlot;
  text: TemplateSlot;
  price: TemplateSlot;
  offer: TemplateSlot;
};

export type TemplateSlotId = keyof TemplateSlots;

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export type CanvasBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export const TEMPLATE_SLOT_LABELS: Record<TemplateSlotId, string> = {
  product: "Foto",
  text: "Textos",
  price: "Precio",
  offer: "Oferta",
};

const MASTER: TemplateSlots = {
  product: { x: 34, y: 32, w: 48, h: 44 },
  text: { x: 23, y: 41, w: 18, h: 36 },
  price: { x: 58, y: 67, w: 36, h: 16 },
  offer: { x: 72, y: 34, w: 16, h: 12 },
};

const URBAN: TemplateSlots = {
  product: { x: 6, y: 34, w: 58, h: 50 },
  text: { x: 66, y: 32, w: 32, h: 40 },
  price: { x: 54, y: 72, w: 42, h: 18 },
  offer: { x: 50, y: 34, w: 16, h: 12 },
};

const NEON: TemplateSlots = {
  product: { x: 5, y: 36, w: 58, h: 48 },
  text: { x: 65, y: 36, w: 31, h: 38 },
  price: { x: 52, y: 74, w: 44, h: 16 },
  offer: { x: 46, y: 36, w: 16, h: 12 },
};

const LOCAL: TemplateSlots = {
  product: { x: 40, y: 34, w: 56, h: 50 },
  text: { x: 2, y: 42, w: 36, h: 36 },
  price: { x: 50, y: 76, w: 44, h: 13 },
  offer: { x: 80, y: 36, w: 16, h: 12 },
};

const DEFAULTS: Record<string, TemplateSlots> = {
  "mz-hero": cloneMaster(),
  "mz-urban": {
    product: { ...URBAN.product },
    text: { ...URBAN.text },
    price: { ...URBAN.price },
    offer: { ...URBAN.offer },
  },
  "mz-neon": {
    product: { ...NEON.product },
    text: { ...NEON.text },
    price: { ...NEON.price },
    offer: { ...NEON.offer },
  },
  "mz-local": {
    product: { ...LOCAL.product },
    text: { ...LOCAL.text },
    price: { ...LOCAL.price },
    offer: { ...LOCAL.offer },
  },
};

function cloneMaster(): TemplateSlots {
  return {
    product: { ...MASTER.product },
    text: { ...MASTER.text },
    price: { ...MASTER.price },
    offer: { ...MASTER.offer },
  };
}

const MIN = { w: 8, h: 8 };

export function defaultTemplateSlots(templateId?: string | null): TemplateSlots {
  return cloneSlots(DEFAULTS[templateId || "mz-hero"] ?? DEFAULTS["mz-hero"]);
}

export function cloneSlots(slots: TemplateSlots): TemplateSlots {
  return {
    product: { ...slots.product },
    text: { ...slots.text },
    price: { ...slots.price },
    offer: { ...(slots.offer ?? { x: 70, y: 16, w: 22, h: 16 }) },
  };
}

export function canvasBounds(ratio?: "1:1" | "4:5" | "3:4"): CanvasBounds {
  if (ratio === "4:5" || ratio === "3:4") {
    return { minX: 1, minY: 12, maxX: 99, maxY: 88 };
  }
  return { minX: 1, minY: 8, maxX: 99, maxY: 92 };
}

export function normalizeTemplateSlots(
  value: unknown,
  templateId?: string | null,
  ratio?: "1:1" | "4:5" | "3:4",
): TemplateSlots {
  const fallback = defaultTemplateSlots(templateId);
  const bounds = canvasBounds(
    ratio ?? "1:1",
  );
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<TemplateSlots>;
  return {
    product: fitSlot({ ...fallback.product, ...pickBox(raw.product) }, bounds),
    text: fitSlot({ ...fallback.text, ...pickBox(raw.text) }, bounds),
    price: fitSlot({ ...fallback.price, ...pickBox(raw.price) }, bounds),
    offer: fitSlot({ ...fallback.offer, ...pickBox(raw.offer) }, bounds),
  };
}

export function constrainResize(
  origin: TemplateSlot,
  dx: number,
  dy: number,
  handle: ResizeHandle,
  _id: string,
  bounds: CanvasBounds,
): TemplateSlot {
  let x = origin.x;
  let y = origin.y;
  let w = origin.w;
  let h = origin.h;
  const right = origin.x + origin.w;
  const bottom = origin.y + origin.h;
  if (handle.includes("e")) w = Math.max(MIN.w, origin.w + dx);
  if (handle.includes("s")) h = Math.max(MIN.h, origin.h + dy);
  if (handle.includes("w")) {
    x = Math.min(right - MIN.w, origin.x + dx);
    w = right - x;
  }
  if (handle.includes("n")) {
    y = Math.min(bottom - MIN.h, origin.y + dy);
    h = bottom - y;
  }
  return roundRect(fitSlot({ x, y, w, h }, bounds));
}

export function constrainMove(origin: TemplateSlot, dx: number, dy: number, _id: string, bounds: CanvasBounds): TemplateSlot {
  return roundRect(fitSlot({ ...origin, x: origin.x + dx, y: origin.y + dy }, bounds));
}

export function commitSlot(id: TemplateSlotId, next: TemplateSlot, slots: TemplateSlots, bounds: CanvasBounds): TemplateSlot {
  const origin = slots[id];
  const dw = next.w - origin.w;
  const dh = next.h - origin.h;
  if (dw !== 0 && next.x === origin.x && dh === 0) return constrainResize(origin, dw, 0, "e", id, bounds);
  if (dh !== 0 && next.y === origin.y && dw === 0) return constrainResize(origin, 0, dh, "s", id, bounds);
  return constrainMove(origin, next.x - origin.x, next.y - origin.y, id, bounds);
}

export function slotBoxStyle(slot: TemplateSlot, zIndex: number) {
  return {
    position: "absolute" as const,
    left: `${slot.x}%`,
    top: `${slot.y}%`,
    width: `${slot.w}%`,
    height: `${slot.h}%`,
    zIndex,
  };
}

function pickBox(value?: Partial<TemplateSlot>): Partial<TemplateSlot> {
  if (!value) return {};
  const next: Partial<TemplateSlot> = {};
  if (typeof value.x === "number") next.x = value.x;
  if (typeof value.y === "number") next.y = value.y;
  if (typeof value.w === "number") next.w = value.w;
  if (typeof value.h === "number") next.h = value.h;
  return next;
}

function fitSlot(slot: TemplateSlot, bounds: CanvasBounds): TemplateSlot {
  const maxW = bounds.maxX - bounds.minX;
  const maxH = bounds.maxY - bounds.minY;
  const w = Math.min(maxW, Math.max(MIN.w, Number(slot.w) || MIN.w));
  const h = Math.min(maxH, Math.max(MIN.h, Number(slot.h) || MIN.h));
  const x = Math.min(bounds.maxX - w, Math.max(bounds.minX, Number(slot.x) || bounds.minX));
  const y = Math.min(bounds.maxY - h, Math.max(bounds.minY, Number(slot.y) || bounds.minY));
  return { x, y, w, h };
}

function roundRect(slot: TemplateSlot): TemplateSlot {
  return {
    x: roundSlot(slot.x),
    y: roundSlot(slot.y),
    w: roundSlot(slot.w),
    h: roundSlot(slot.h),
  };
}

function roundSlot(value: number) {
  return Math.round(value * 10) / 10;
}
