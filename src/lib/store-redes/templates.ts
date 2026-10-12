import type { SocialSchedule, SocialTemplateMode } from "@/lib/store-redes/types";

export type TemplateKind = "clean" | "frame" | "studio";

export type TemplateLayout = {
  kind: TemplateKind;
  product: string;
  title: string;
  headline: string;
  features: string;
  price: string;
};

export type OfficialRedesTemplate = {
  id: string;
  name: string;
  hint: string;
  src: string;
  layout: TemplateLayout;
};

export const CUSTOM_TEMPLATE_ID = "custom";
export const DEFAULT_TEMPLATE_ID = "mz-hero";

const CLEAN: TemplateLayout = {
  kind: "clean",
  product: "",
  title: "",
  headline: "",
  features: "",
  price: "",
};

export const OFFICIAL_REDES_TEMPLATES: OfficialRedesTemplate[] = [
  {
    id: "mz-hero",
    name: "Limpia",
    hint: "Producto a la izquierda, texto a la derecha. Precio en texto.",
    src: "/redes/mz-hero.jpg",
    layout: { ...CLEAN, kind: "clean" },
  },
  {
    id: "mz-split",
    name: "Marco",
    hint: "Misma pieza, marco cyan más marcado.",
    src: "/redes/mz-split.jpg",
    layout: { ...CLEAN, kind: "frame" },
  },
  {
    id: "mz-stage",
    name: "Studio",
    hint: "Fondo más oscuro, el producto manda.",
    src: "/redes/mz-stage.jpg",
    layout: { ...CLEAN, kind: "studio" },
  },
];

const CUSTOM_LAYOUT: TemplateLayout = { ...CLEAN, kind: "clean" };

export function officialTemplate(id?: string | null) {
  return OFFICIAL_REDES_TEMPLATES.find((item) => item.id === id) ?? OFFICIAL_REDES_TEMPLATES[0];
}

export function templateSrc(id?: string | null, customSrc?: string) {
  if (id === CUSTOM_TEMPLATE_ID && customSrc) return customSrc;
  return officialTemplate(id).src;
}

export function templateLayout(id?: string | null): TemplateLayout {
  if (id === CUSTOM_TEMPLATE_ID) return CUSTOM_LAYOUT;
  return officialTemplate(id).layout;
}

export function normalizeTemplateMode(value: unknown): SocialTemplateMode {
  if (value === "fixed" || value === "random" || value === "sequential") return value;
  return "sequential";
}

export function pickNextTemplate(schedule: Pick<SocialSchedule, "templateMode" | "templateId" | "lastTemplateIndex">) {
  const list = OFFICIAL_REDES_TEMPLATES;
  const mode = normalizeTemplateMode(schedule.templateMode);
  if (mode === "fixed") {
    if (schedule.templateId === CUSTOM_TEMPLATE_ID) {
      return { templateId: CUSTOM_TEMPLATE_ID, lastTemplateIndex: schedule.lastTemplateIndex ?? 0 };
    }
    const match = list.find((item) => item.id === schedule.templateId) ?? list[0];
    return { templateId: match.id, lastTemplateIndex: list.findIndex((item) => item.id === match.id) };
  }
  if (mode === "random") {
    let index = Math.floor(Math.random() * list.length);
    if (list.length > 1 && index === (schedule.lastTemplateIndex ?? -1)) index = (index + 1) % list.length;
    return { templateId: list[index].id, lastTemplateIndex: index };
  }
  const next = ((schedule.lastTemplateIndex ?? -1) + 1) % list.length;
  return { templateId: list[next].id, lastTemplateIndex: next };
}
