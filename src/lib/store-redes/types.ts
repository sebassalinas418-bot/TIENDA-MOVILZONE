import type { TemplateSlots } from "@/lib/store-redes/slots";

export type SocialProductSnap = {
  id: string;
  title: string;
  brand?: string;
  category?: string;
  categoryId?: string;
  subcategoryId?: string;
  price: number;
  listPrice?: number;
  onSale?: boolean;
  offerBadge?: string | null;
  image: string;
  inStock?: boolean;
};

export type SocialAiEngine = "gemini" | "openai";

export type SocialPostStatus = "draft" | "ready" | "scheduled" | "published" | "failed";

export type SocialPost = {
  id: string;
  createdAt: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  status: SocialPostStatus;
  product: SocialProductSnap;
  headline: string;
  caption: string;
  hashtags: string[];
  features?: string[];
  provider: "local" | "gemini" | "openai" | "groq";
  publishError?: string;
  igMediaId?: string;
  templateId?: string;
};

export type SocialFrequency = "daily" | "every_2_days" | "weekly";

export type SocialTemplateMode = "fixed" | "random" | "sequential";

/** Campaña de fotos libres: 1 imagen = 1 horario. */
export type FreeCampaignSlot = {
  hour: string;
  imageId: string;
  imageUrl?: string;
  caption?: string;
  headline?: string;
  postId?: string;
};

export type SocialSchedule = {
  enabled: boolean;
  frequency: SocialFrequency;
  hour: number;
  hours?: string[];
  lastRunBySlot?: Record<string, string>;
  randomProduct: boolean;
  lastRunAt: string | null;
  productPool: SocialProductSnap[];
  engine?: SocialAiEngine;
  templateMode?: SocialTemplateMode;
  templateId?: string;
  lastTemplateIndex?: number;
  templateSlots?: Record<string, TemplateSlots>;
  freeCampaignSlots?: FreeCampaignSlot[];
  /** ISO 1=Lunes … 7=Domingo. Solo campaña de fotos libres. */
  freeCampaignDays?: number[];
  /** Motor de la cola de fotos libres. No corta el cron de inventario. */
  freeQueueActive?: boolean;
};

export const defaultSocialSchedule = (): SocialSchedule => ({
  enabled: false,
  frequency: "daily",
  hour: 11,
  hours: ["11:00"],
  lastRunBySlot: {},
  randomProduct: true,
  lastRunAt: null,
  productPool: [],
  engine: "gemini",
  templateMode: "sequential",
  templateId: "mz-hero",
  lastTemplateIndex: -1,
  freeCampaignDays: [],
  freeQueueActive: false,
});
