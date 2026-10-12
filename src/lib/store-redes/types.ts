export type SocialProductSnap = {
  id: string;
  title: string;
  brand?: string;
  category?: string;
  categoryId?: string;
  subcategoryId?: string;
  price: number;
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
});
