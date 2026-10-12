import { draftLocalInstagramCopy } from "@/lib/store-redes/copy-local";
import type { SocialPost } from "@/lib/store-redes/types";

export function featuresFromPost(post: SocialPost): string[] {
  const listed = (post.features ?? []).map((item) => item.trim()).filter(Boolean);
  if (listed.length >= 3) return listed.slice(0, 4);
  return draftLocalInstagramCopy(post.product).features;
}
