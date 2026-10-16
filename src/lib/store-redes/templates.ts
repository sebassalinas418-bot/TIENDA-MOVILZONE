import type { SocialSchedule, SocialTemplateMode } from "@/lib/store-redes/types";

export type TemplateKind = "left" | "right" | "hero" | "stack" | "minimal";

export type TemplateLayout = {
  kind: TemplateKind;
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

export const OFFICIAL_REDES_TEMPLATES: OfficialRedesTemplate[] = [
  {
    id: "mz-hero",
    name: "Volt",
    hint: "Neón a full, foto izquierda y ficha a la derecha.",
    src: "",
    thumb: "bg-[linear-gradient(215deg,#67e8f9_0%,#0891b2_32%,#020617_70%)]",
    layout: {
      kind: "left",
      product: "absolute left-4 top-[16%] z-10 h-[66%] w-[46%]",
      panel: "absolute top-[15%] right-4 z-10 flex w-[46%] flex-col gap-2.5 text-white",
      title:
        "text-[22px] leading-[1.05] font-black tracking-tight text-white uppercase drop-shadow-[0_0_18px_rgba(34,211,238,0.55)]",
      headline: "text-[11px] font-bold tracking-[0.14em] text-cyan-300 uppercase",
      features: "mt-1 flex flex-col gap-2",
      price:
        "absolute bottom-7 right-4 z-20 rounded-2xl bg-cyan-400 px-4 py-2 text-[26px] font-black text-black shadow-[0_0_30px_rgba(34,211,238,0.7)]",
    },
  },
  {
    id: "mz-split",
    name: "Mirror",
    hint: "Textos a la izquierda y producto a la derecha.",
    src: "",
    thumb: "bg-[linear-gradient(135deg,#020617_40%,#22d3ee_100%)]",
    layout: {
      kind: "right",
      product: "absolute right-4 top-[16%] z-10 h-[66%] w-[46%]",
      panel: "absolute top-[15%] left-4 z-10 flex w-[46%] flex-col gap-2.5 text-white",
      title:
        "text-[22px] leading-[1.05] font-black tracking-tight text-white uppercase drop-shadow-[0_0_18px_rgba(34,211,238,0.55)]",
      headline: "text-[11px] font-bold tracking-[0.14em] text-cyan-300 uppercase",
      features: "mt-1 flex flex-col gap-2",
      price:
        "absolute bottom-7 left-4 z-20 rounded-2xl border-2 border-cyan-300 bg-black/70 px-4 py-2 text-[26px] font-black text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.45)]",
    },
  },
  {
    id: "mz-stage",
    name: "Spotlight",
    hint: "Producto al centro con halo, como story.",
    src: "",
    thumb: "bg-[radial-gradient(circle_at_50%_42%,#22d3ee_0%,#083344_38%,#020617_72%)]",
    layout: {
      kind: "hero",
      product: "absolute top-[24%] left-1/2 z-10 h-[50%] w-[78%] -translate-x-1/2",
      panel: "absolute top-9 right-5 left-5 z-10 flex flex-col items-center gap-1.5 text-center text-white",
      title:
        "text-[26px] leading-[0.95] font-black tracking-tight text-white uppercase drop-shadow-[0_0_22px_rgba(34,211,238,0.7)]",
      headline: "rounded-full bg-cyan-400 px-3 py-0.5 text-[10px] font-black tracking-wide text-black uppercase",
      features: "absolute bottom-[4.6rem] left-4 right-4 z-10 flex flex-row justify-center gap-2",
      price:
        "absolute bottom-6 left-1/2 z-20 -translate-x-1/2 text-[34px] font-black tracking-tight text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.9)]",
    },
  },
  {
    id: "mz-stack",
    name: "Billboard",
    hint: "Foto grande arriba y ficha tipo afiche abajo.",
    src: "",
    thumb: "bg-[linear-gradient(to_top,#22d3ee_0%,#164e63_28%,#020617_70%)]",
    layout: {
      kind: "stack",
      product: "absolute top-8 left-1/2 z-10 h-[46%] w-[82%] -translate-x-1/2",
      panel: "absolute right-[7.5rem] bottom-6 left-5 z-10 flex flex-col gap-2 text-white",
      title: "text-[22px] leading-[1.02] font-black tracking-tight text-white uppercase",
      headline: "text-[11px] font-bold tracking-[0.12em] text-cyan-200 uppercase",
      features: "flex flex-col gap-1.5",
      price:
        "absolute bottom-7 right-4 z-20 text-[32px] font-black text-white drop-shadow-[0_0_16px_rgba(34,211,238,0.8)]",
    },
  },
  {
    id: "mz-minimal",
    name: "Night",
    hint: "Oscuro, producto enorme y precio que pega.",
    src: "",
    thumb: "bg-[radial-gradient(circle_at_20%_80%,#155e75_0%,#020617_55%)]",
    layout: {
      kind: "minimal",
      product: "absolute top-[12%] left-3 z-10 h-[74%] w-[56%]",
      panel: "absolute top-11 right-4 z-10 flex w-[40%] flex-col gap-2.5 text-white",
      title: "text-[20px] leading-[1.05] font-black tracking-tight text-cyan-300 uppercase",
      headline: "text-[11px] font-semibold text-white/80",
      features: "flex flex-col gap-2",
      price:
        "absolute bottom-8 right-4 z-20 bg-white px-4 py-2 text-[28px] font-black text-black shadow-[0_10px_30px_rgba(34,211,238,0.35)]",
    },
  },
];

const CUSTOM_LAYOUT: TemplateLayout = OFFICIAL_REDES_TEMPLATES[0].layout;

export function officialTemplate(id?: string | null) {
  return OFFICIAL_REDES_TEMPLATES.find((item) => item.id === id) ?? OFFICIAL_REDES_TEMPLATES[0];
}

export function templateSrc(id?: string | null, customSrc?: string) {
  if (id === CUSTOM_TEMPLATE_ID && customSrc) return customSrc;
  return "";
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
