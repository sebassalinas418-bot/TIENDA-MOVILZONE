import type { SocialSchedule, SocialTemplateMode } from "@/lib/store-redes/types";

export type TemplateKind = "left" | "right" | "hero" | "stack" | "minimal";
export type TemplateTone = "impacto" | "hero" | "tech" | "energy" | "clean" | "urban";

export type TemplateLayout = {
  kind: TemplateKind;
  tone?: TemplateTone;
  baked?: boolean;
  coverRight?: boolean;
  hidePanel?: boolean;
  hideStock?: boolean;
  knockout?: boolean;
  ratio?: "1:1" | "4:5" | "3:4";
  product: string;
  panel: string;
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
  thumb: string;
  layout: TemplateLayout;
};

export const CUSTOM_TEMPLATE_ID = "custom";
export const DEFAULT_TEMPLATE_ID = "mz-hero";

const MASTER_SRC = "/redes/plantilla-mz-master.jpg";

const MASTER_LAYOUT: TemplateLayout = {
  kind: "left",
  tone: "impacto",
  baked: true,
  hideStock: true,
  knockout: true,
  ratio: "1:1",
  product: "",
  panel: "",
  title: "",
  headline: "",
  features: "",
  price: "",
};

export const OFFICIAL_REDES_TEMPLATES: OfficialRedesTemplate[] = [
  {
    id: "mz-hero",
    name: "Volt",
    hint: "Plantilla fija MZ: título, producto, características y precio sobre el diseño.",
    src: MASTER_SRC,
    thumb: "bg-[url('/redes/plantilla-mz-master.jpg')] bg-cover bg-center",
    layout: { ...MASTER_LAYOUT, tone: "impacto" },
  },
  {
    id: "mz-urban",
    name: "Urban Color",
    hint: "Fondo claro, violeta y azul eléctrico. Distinta a la plantilla negra y celeste.",
    src: "",
    thumb: "bg-[linear-gradient(135deg,#faf7ff_0%,#7c3aed_42%,#2563eb_78%,#67e8f9_100%)]",
    layout: {
      kind: "left",
      tone: "urban",
      baked: false,
      hideStock: true,
      knockout: true,
      ratio: "1:1",
      product: "",
      panel: "",
      title: "",
      headline: "",
      features: "",
      price: "",
    },
  },
];

const CUSTOM_LAYOUT: TemplateLayout = {
  ...OFFICIAL_REDES_TEMPLATES[0].layout,
  baked: false,
  coverRight: false,
  hidePanel: false,
  ratio: "1:1",
};

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
