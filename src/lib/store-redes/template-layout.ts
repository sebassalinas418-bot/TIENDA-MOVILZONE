import {
  cloneSlots,
  defaultTemplateSlots,
  normalizeTemplateSlots,
  type TemplateSlot,
  type TemplateSlots,
} from "@/lib/store-redes/slots";

export type TemplateLayoutZone = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DefaultTemplateLayout = {
  templateId?: string;
  foto: TemplateLayoutZone;
  textos: TemplateLayoutZone;
  precio: TemplateLayoutZone;
};

export type StoredTemplateLayouts = DefaultTemplateLayout & {
  byTemplate?: Record<string, DefaultTemplateLayout>;
};

export function slotsToDefaultLayout(slots: TemplateSlots, templateId?: string): DefaultTemplateLayout {
  return {
    templateId: templateId || undefined,
    foto: { ...slots.product },
    textos: { ...slots.text },
    precio: { ...slots.price },
  };
}

export function defaultLayoutToSlots(layout: DefaultTemplateLayout | null | undefined, templateId?: string): TemplateSlots {
  const fallback = defaultTemplateSlots(templateId || layout?.templateId);
  if (!layout) return fallback;
  return normalizeTemplateSlots(
    {
      product: zoneFromUnknown(layout.foto, fallback.product),
      text: zoneFromUnknown(layout.textos, fallback.text),
      price: zoneFromUnknown(layout.precio, fallback.price),
      offer: fallback.offer,
    },
    templateId || layout.templateId,
  );
}

export function storedLayoutsFromSlotMap(map?: Record<string, TemplateSlots> | null): StoredTemplateLayouts | null {
  if (!map) return null;
  const byTemplate: Record<string, DefaultTemplateLayout> = {};
  for (const [id, slots] of Object.entries(map)) {
    byTemplate[id] = slotsToDefaultLayout(slots, id);
  }
  const first = Object.values(byTemplate)[0];
  if (!first) return null;
  return { ...first, byTemplate };
}

export function parseStoredTemplateLayouts(value: unknown): StoredTemplateLayouts | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const current = parseDefaultLayout(raw);
  const byTemplate: Record<string, DefaultTemplateLayout> = {};
  const nested = raw.byTemplate;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    for (const [id, entry] of Object.entries(nested as Record<string, unknown>)) {
      const parsed = parseDefaultLayout(entry);
      if (parsed) byTemplate[id] = { ...parsed, templateId: id };
    }
  }
  if (!current && !Object.keys(byTemplate).length) return null;
  const layout = current ?? Object.values(byTemplate)[0];
  return {
    ...layout,
    byTemplate: Object.keys(byTemplate).length ? byTemplate : undefined,
  };
}

export function mergeStoredTemplateLayouts(
  current: StoredTemplateLayouts | null,
  next: DefaultTemplateLayout,
): StoredTemplateLayouts {
  const id = next.templateId || "mz-hero";
  const byTemplate = { ...(current?.byTemplate ?? {}) };
  if (current?.templateId && current.foto && current.textos && current.precio) {
    byTemplate[current.templateId] = {
      templateId: current.templateId,
      foto: current.foto,
      textos: current.textos,
      precio: current.precio,
    };
  }
  byTemplate[id] = { ...next, templateId: id };
  return { ...next, templateId: id, byTemplate };
}

export function slotsForTemplate(
  templateId: string,
  stored: StoredTemplateLayouts | null,
  extra?: Record<string, TemplateSlots>,
): TemplateSlots {
  const fromMap = stored?.byTemplate?.[templateId];
  if (fromMap) return defaultLayoutToSlots(fromMap, templateId);
  if (stored?.templateId === templateId) return defaultLayoutToSlots(stored, templateId);
  if (extra?.[templateId]) return cloneSlots(normalizeTemplateSlots(extra[templateId], templateId));
  return defaultTemplateSlots(templateId);
}

function parseDefaultLayout(value: unknown): DefaultTemplateLayout | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const foto = zoneFromUnknown(raw.foto ?? raw.product);
  const textos = zoneFromUnknown(raw.textos ?? raw.text);
  const precio = zoneFromUnknown(raw.precio ?? raw.price);
  if (!foto || !textos || !precio) return null;
  return {
    templateId: typeof raw.templateId === "string" ? raw.templateId : undefined,
    foto,
    textos,
    precio,
  };
}

function zoneFromUnknown(value: unknown, fallback?: TemplateSlot): TemplateLayoutZone | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback ? { ...fallback } : null;
  const raw = value as Record<string, unknown>;
  const x = num(raw.x ?? raw.X);
  const y = num(raw.y ?? raw.Y);
  const w = num(raw.w ?? raw.Ancho ?? raw.ancho);
  const h = num(raw.h ?? raw.Alto ?? raw.alto);
  if (x == null || y == null || w == null || h == null) return fallback ? { ...fallback } : null;
  return { x, y, w, h };
}

function num(value: unknown) {
  const next = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(next) ? next : null;
}
