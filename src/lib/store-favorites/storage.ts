import { readSession, SESSION_EVENT } from "@/lib/session";

const KEY = "movilzone.favorites";
export const FAVORITES_EVENT = "movilzone-favorites";

function storageKey(email: string) {
  return `${KEY}:${email.trim().toLowerCase()}`;
}

export function readFavoriteIds(email?: string | null): string[] {
  const owner = email ?? readSession()?.email;
  if (!owner || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(owner));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function writeFavoriteIds(email: string, ids: string[]) {
  window.localStorage.setItem(storageKey(email), JSON.stringify([...new Set(ids)]));
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

export function toggleFavoriteId(productId: string) {
  const email = readSession()?.email;
  if (!email) return { on: false, persisted: false as const };
  const current = readFavoriteIds(email);
  const on = current.includes(productId);
  const next = on ? current.filter((id) => id !== productId) : [...current, productId];
  writeFavoriteIds(email, next);
  return { on: !on, persisted: true as const };
}

export { SESSION_EVENT };
