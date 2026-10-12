import { looksLikeBannedOrTitleDump } from "@/lib/store-redes/copy-local";
import type { SocialAiEngine, SocialProductSnap } from "@/lib/store-redes/types";

export type AiDraft = {
  headline: string;
  caption: string;
  hashtags: string[];
  features: string[];
  provider: "local" | SocialAiEngine;
  hint?: string;
};

export type LocalDraft = Omit<AiDraft, "provider" | "hint"> & { provider: "local" };

export function parseModelJson(raw: string): {
  headline?: string;
  caption?: string;
  hashtags?: unknown;
  features?: unknown;
} | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as {
      headline?: string;
      caption?: string;
      hashtags?: unknown;
      features?: unknown;
    };
  } catch {
    return null;
  }
}

export function draftFromParsed(
  parsed: {
    headline?: string;
    caption?: string;
    hashtags?: unknown;
    features?: unknown;
  },
  fallback: LocalDraft,
  product: SocialProductSnap,
  provider: SocialAiEngine,
): AiDraft {
  const hashtags = Array.isArray(parsed.hashtags)
    ? parsed.hashtags.map((tag) => String(tag)).filter(Boolean).slice(0, 12)
    : fallback.hashtags;
  let features = Array.isArray(parsed.features)
    ? parsed.features.map((item) => String(item).trim()).filter(Boolean).slice(0, 4)
    : [];
  features = features.filter((item) => !looksLikeBannedOrTitleDump(item, product.title));
  if (features.length < 3) features = fallback.features;

  let headline = String(parsed.headline || "").trim().slice(0, 120);
  if (!headline || looksLikeBannedOrTitleDump(headline, product.title)) headline = fallback.headline;

  let caption = String(parsed.caption || "").trim().slice(0, 2200);
  if (!caption || looksLikeBannedOrTitleDump(caption.split("\n")[0] || "", product.title)) {
    caption = fallback.caption;
  }

  return {
    headline,
    caption,
    hashtags: hashtags.length ? hashtags : fallback.hashtags,
    features,
    provider,
  };
}
