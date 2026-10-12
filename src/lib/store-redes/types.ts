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
};

export type SocialFrequency = "daily" | "every_2_days" | "weekly";

export type SocialSchedule = {
  enabled: boolean;
  frequency: SocialFrequency;
  hour: number;
  randomProduct: boolean;
  lastRunAt: string | null;
  productPool: SocialProductSnap[];
  engine?: SocialAiEngine;
};

export const defaultSocialSchedule = (): SocialSchedule => ({
  enabled: false,
  frequency: "daily",
  hour: 11,
  randomProduct: true,
  lastRunAt: null,
  productPool: [],
  engine: "gemini",
});
