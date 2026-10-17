import type { SocialSchedule, SocialTemplateMode } from "@/lib/store-redes/types";

export type TemplateKind = "left" | "right" | "hero" | "stack" | "minimal";

export type TemplateLayout = {
  kind: TemplateKind;
  baked?: boolean;
  coverRight?: boolean;
  hidePanel?: boolean;
  hideStock?: boolean;
  knockout?: boolean;
  ratio?: "1:1" | "4:5";
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
    hint: "Plantilla maestra: logo MZ, hueco a la izquierda y ficha a la derecha.",
    src: "/redes/plantilla-mz-master.jpg",
    thumb: "bg-[linear-gradient(215deg,#67e8f9_0%,#0891b2_32%,#020617_70%)]",
    layout: {
      kind: "left",
      baked: true,
      coverRight: true,
      product: "absolute left-[2%] top-[22%] z-10 h-[72%] w-[49%]",
      panel: "absolute top-[19%] right-[3.5%] z-10 flex w-[45%] flex-col gap-2 text-white",
      title:
        "text-[21px] leading-[1.02] font-black tracking-tight text-cyan-300 uppercase drop-shadow-[0_0_16px_rgba(34,211,238,0.75)]",
      headline: "text-[11px] font-bold tracking-wide text-white/90",
      features: "mt-1 flex flex-col gap-1.5",
      price:
        "absolute right-[3.5%] bottom-[6.5%] z-20 flex w-[44%] flex-col items-center rounded-[1.4rem] border border-cyan-300/80 bg-[#04111f]/90 px-3 py-2.5 shadow-[0_0_28px_rgba(34,211,238,0.45)]",
    },
  },
  {
    id: "mz-split",
    name: "Mirror",
    hint: "Local MZ vertical: producto recortado, características y precio.",
    src: "/redes/plantilla-mz-mirror.jpg",
    thumb: "bg-[linear-gradient(135deg,#020617_40%,#22d3ee_100%)]",
    layout: {
      kind: "right",
      hideStock: true,
      knockout: true,
      ratio: "4:5",
      product: "absolute left-[3%] top-[18%] z-10 h-[54%] w-[56%]",
      panel: "absolute top-[24%] right-[4%] z-10 flex w-[41%] flex-col gap-2 text-white",
      title:
        "text-[17px] leading-[1.05] font-black tracking-tight text-cyan-300 uppercase drop-shadow-[0_0_14px_rgba(34,211,238,0.7)]",
      headline: "text-[10px] font-semibold leading-snug text-white/90",
      features: "mt-1 flex flex-col gap-1.5",
      price:
        "absolute right-[6%] bottom-[11.5%] z-20 flex h-[13%] w-[40%] items-center justify-center text-center text-[28px] font-black tracking-tight text-white drop-shadow-[0_0_14px_rgba(34,211,238,0.7)]",
    },
  },
  {
    id: "mz-stage",
    name: "Spotlight",
    hint: "Circuito MZ: producto al centro, características y precio en el recuadro.",
    src: "/redes/plantilla-mz-spotlight.jpg",
    thumb: "bg-[radial-gradient(circle_at_50%_42%,#22d3ee_0%,#083344_38%,#020617_72%)]",
    layout: {
      kind: "right",
      hideStock: true,
      knockout: true,
      ratio: "4:5",
      product: "absolute left-[6%] top-[20%] z-10 h-[50%] w-[55%]",
      panel: "absolute top-[26%] right-[4%] z-10 flex w-[40%] flex-col gap-2 text-white",
      title:
        "text-[17px] leading-[1.05] font-black tracking-tight text-cyan-300 uppercase drop-shadow-[0_0_14px_rgba(34,211,238,0.7)]",
      headline: "text-[10px] font-semibold leading-snug text-white/90",
      features: "mt-1 flex flex-col gap-1.5",
      price:
        "absolute right-[6%] bottom-[11.5%] z-20 flex h-[13%] w-[40%] items-center justify-center text-center text-[28px] font-black tracking-tight text-white drop-shadow-[0_0_14px_rgba(34,211,238,0.7)]",
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
