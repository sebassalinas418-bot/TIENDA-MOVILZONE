import type { Product } from "@/data/products";

const TOKEN_KEY = "movilzone.taller-token";

export type TallerAdmin = {
  name: string;
  email: string;
};

export function readTallerToken() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function writeTallerToken(token: string) {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearTallerToken() {
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export async function fetchTallerCatalog(): Promise<Product[] | null> {
  const response = await fetch("/api/taller/catalog", { cache: "no-store" });
  if (!response.ok) return null;
  const body = (await response.json()) as { connected?: boolean; products?: Product[] };
  if (!body.connected || !Array.isArray(body.products)) return null;
  return body.products;
}

export async function reportWebSale(input: {
  orderId: string;
  items: { productId: string; title: string; quantity: number; unitPrice: number }[];
}) {
  const token = readTallerToken();
  if (!token) return;
  await fetch("/api/taller/sale", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
}

export async function reportIncomingWebOrder(input: {
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  notes?: string;
  createdAt?: string;
  items: { productId: string; title: string; quantity: number; unitPrice: number }[];
}): Promise<{ ok: boolean; reason?: string }> {
  try {
    const response = await fetch("/api/taller/web-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = (await response.json()) as { ok?: boolean; reason?: string };
    return { ok: Boolean(body.ok), reason: body.reason };
  } catch {
    return { ok: false };
  }
}

export async function reportCancelledWebOrder(orderId: string) {
  try {
    await fetch("/api/taller/web-order", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, action: "cancel" }),
    });
  } catch {
    // El pedido local no se bloquea si TallerGestio no responde.
  }
}

export async function fetchWebOrderStatuses(orderIds: string[] = []) {
  try {
    const ids = [...new Set(orderIds.filter(Boolean))].slice(0, 80);
    if (!ids.length) return [];
    const response = await fetch(`/api/taller/web-order?ids=${encodeURIComponent(ids.join(","))}`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) return [];
    const body = (await response.json()) as {
      orders?: { order_number?: string; status?: string }[];
    };
    return Array.isArray(body.orders) ? body.orders : [];
  } catch {
    return [];
  }
}

export async function pushTallerProduct(input: {
  id?: string;
  title: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
  details?: string;
}) {
  const token = readTallerToken();
  if (!token) return null;
  const response = await fetch("/api/taller/product", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { ok?: boolean; id?: string };
  return body.ok ? body.id ?? null : null;
}

export async function signInTallerAdmin(email: string, password: string): Promise<TallerAdmin | null> {
  const response = await fetch("/api/taller/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    ok?: boolean;
    name?: string;
    email?: string;
    accessToken?: string;
  };
  if (!body.ok || !body.email || !body.name || !body.accessToken) return null;
  writeTallerToken(body.accessToken);
  return { name: body.name, email: body.email };
}
