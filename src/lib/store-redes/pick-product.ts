import type { SocialProductSnap } from "@/lib/store-redes/types";

export function pickSocialProduct(pool: SocialProductSnap[], preferId?: string) {
  const usable = pool.filter((item) => item.title && item.image);
  if (!usable.length) {
    const named = pool.filter((item) => item.title);
    if (!named.length) return null;
    return named[Math.floor(Math.random() * named.length)] ?? null;
  }
  if (preferId) {
    const match = usable.find((item) => item.id === preferId) ?? pool.find((item) => item.id === preferId);
    if (match) return match;
  }
  const inStock = usable.filter((item) => item.inStock !== false);
  const source = inStock.length ? inStock : usable;
  return source[Math.floor(Math.random() * source.length)] ?? null;
}
