import { confirmedFeaturesFromTitle, shortFeatureLine } from "@/lib/store-redes/ad-title";
import { draftLocalInstagramCopy } from "@/lib/store-redes/copy-local";
import type { SocialPost, SocialProductSnap } from "@/lib/store-redes/types";

export function featuresFromPost(post: SocialPost): string[] {
  return cardFeatures(post.product, post.features);
}

export function cardFeatures(product: SocialProductSnap, listed?: string[]) {
  const confirmed = confirmedFeaturesFromTitle(product.title);
  const extras = (listed?.length ? listed : draftLocalInstagramCopy(product).features)
    .map(shortFeatureLine)
    .map((item) => item.toUpperCase())
    .filter(Boolean);
  const merged: string[] = [...confirmed];
  for (const extra of extras) {
    if (merged.length >= 4) break;
    if (merged.some((item) => extra.includes(item.split(" ")[0]) || item.includes(extra.split(" ")[0]))) continue;
    merged.push(extra);
  }
  return merged.slice(0, 4);
}

export function catalogOfferBadge(product: Pick<SocialProductSnap, "onSale" | "offerBadge" | "price" | "listPrice">) {
  if (!product.onSale) return "";
  if (product.offerBadge && /%/.test(product.offerBadge)) return product.offerBadge.trim();
  if (product.listPrice && product.price && product.listPrice > product.price) {
    const percent = Math.round((1 - product.price / product.listPrice) * 100);
    if (percent > 0) return `-${percent}%`;
  }
  return (product.offerBadge || "").trim();
}
