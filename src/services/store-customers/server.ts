import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { createClient } from "@supabase/supabase-js";
import {
  displayStorePhone,
  looksLikeEmail,
  normalizeStorePhone,
  phonePlaceholderEmail,
} from "@/lib/store-phone-auth/phone";
import type {
  StoreCustomerOrder,
  StoreCustomerOrderItem,
  StoreCustomerPublic,
} from "@/services/store-customers/types";

export type { StoreCustomerPublic };

const scryptAsync = promisify(scrypt);
const TABLE = "web_store_customers";
const TOKEN_HOURS = 48;

type CustomerRow = {
  id: string;
  email: string;
  name: string;
  alias?: string | null;
  phone?: string | null;
  phone_normalized?: string | null;
  address_line?: string | null;
  address_city?: string | null;
  address_zip?: string | null;
  password_hash: string;
  email_verified_at: string | null;
  verify_token: string | null;
  verify_expires_at: string | null;
  created_at: string;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function publicOf(row: CustomerRow): StoreCustomerPublic {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    alias: row.alias ?? "",
    phone: row.phone ?? "",
    addressLine: row.address_line ?? "",
    addressCity: row.address_city ?? "",
    addressZip: row.address_zip ?? "",
    verified: Boolean(row.email_verified_at),
    createdAt: row.created_at,
  };
}

function orderStatusLabel(status: string) {
  if (status === "pendiente") return "Pendiente";
  if (status === "cancelado") return "Cancelado";
  return "Completado";
}

function itemsFromJson(value: unknown): StoreCustomerOrderItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const quantity = Math.max(0, Math.floor(Number(row.quantity) || 0));
    const unitPrice = Math.max(0, Math.round(Number(row.unitPrice) || 0));
    const name = String(row.name ?? row.title ?? "Artículo");
    return [
      {
        name,
        quantity,
        unitPrice,
        lineTotal: Math.round(Number(row.lineTotal) || unitPrice * quantity),
      },
    ];
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  const check = Buffer.from(hex, "hex");
  if (check.length !== derived.length) return false;
  return timingSafeEqual(derived, check);
}

function newToken() {
  return randomBytes(32).toString("hex");
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function expiresAt() {
  return new Date(Date.now() + TOKEN_HOURS * 60 * 60 * 1000).toISOString();
}

function originFrom(request: Request) {
  const env = process.env.NEXT_PUBLIC_STORE_URL?.trim().replace(/\/$/, "");
  if (env) return env;
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercel) {
    return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel}`;
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

async function sendVerificationEmail(email: string, url: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.WEB_STORE_MAIL_FROM?.trim() || "Movil Zone <onboarding@resend.dev>";
  if (!key) {
    console.info("[tienda web] Verificación (sin RESEND_API_KEY):", url);
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Confirmá tu correo — Movil Zone",
      html: `<p>Hola,</p><p>Para activar tu cuenta de la tienda, abrí este enlace:</p><p><a href="${url}">${url}</a></p><p>El enlace vence en ${TOKEN_HOURS} horas.</p>`,
    }),
  });
  if (!response.ok) {
    console.error("[tienda web] No se pudo enviar el correo de verificación", await response.text());
    return false;
  }
  return true;
}

export async function registerStoreCustomer(
  input: { name: string; email: string; password: string },
  request: Request,
) {
  const client = adminClient();
  if (!client) return { ok: false as const, error: "La tienda no tiene conexión para registrar cuentas." };

  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const password = input.password;
  if (!email || !email.includes("@")) return { ok: false as const, error: "Ingresá un correo válido." };
  if (name.length < 2) return { ok: false as const, error: "Ingresá tu nombre." };
  if (password.length < 6) return { ok: false as const, error: "La contraseña debe tener al menos 6 caracteres." };

  const { data: existing, error: existingError } = await client
    .from(TABLE)
    .select("id, email_verified_at")
    .eq("email", email)
    .maybeSingle();
  if (existingError) return { ok: false as const, error: existingError.message };
  if (existing) {
    if (existing.email_verified_at) {
      return { ok: false as const, error: "Ese correo ya está registrado. Iniciá sesión." };
    }
    return resendStoreVerification(email, request);
  }

  const token = newToken();
  const { error } = await client.from(TABLE).insert({
    email,
    name,
    password_hash: await hashPassword(password),
    email_verified_at: null,
    verify_token: tokenHash(token),
    verify_expires_at: expiresAt(),
  });
  if (error) return { ok: false as const, error: error.message };

  const url = `${originFrom(request)}/verificar-correo?token=${token}`;
  const mailed = await sendVerificationEmail(email, url);
  return {
    ok: true as const,
    pending: true as const,
    mailed,
    devVerifyUrl: mailed ? undefined : url,
  };
}

export async function resendStoreVerification(emailRaw: string, request: Request) {
  const client = adminClient();
  if (!client) return { ok: false as const, error: "Sin conexión." };
  const email = normalizeEmail(emailRaw);
  const { data, error } = await client
    .from(TABLE)
    .select("id, email, email_verified_at")
    .eq("email", email)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "No encontramos ese correo." };
  if (data.email_verified_at) return { ok: false as const, error: "Ese correo ya está verificado. Iniciá sesión." };

  const token = newToken();
  const { error: updateError } = await client
    .from(TABLE)
    .update({
      verify_token: tokenHash(token),
      verify_expires_at: expiresAt(),
    })
    .eq("id", data.id);
  if (updateError) return { ok: false as const, error: updateError.message };

  const url = `${originFrom(request)}/verificar-correo?token=${token}`;
  const mailed = await sendVerificationEmail(email, url);
  return {
    ok: true as const,
    pending: true as const,
    mailed,
    devVerifyUrl: mailed ? undefined : url,
  };
}

export async function verifyStoreCustomer(token: string) {
  const client = adminClient();
  if (!client) return { ok: false as const, error: "Sin conexión." };
  const hashed = tokenHash(token.trim());
  const { data, error } = await client
    .from(TABLE)
    .select("*")
    .eq("verify_token", hashed)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  const row = data as CustomerRow | null;
  if (!row) return { ok: false as const, error: "El enlace no es válido." };
  if (row.verify_expires_at && new Date(row.verify_expires_at).getTime() < Date.now()) {
    return { ok: false as const, error: "El enlace venció. Pedí uno nuevo desde Iniciar sesión." };
  }

  const { error: updateError } = await client
    .from(TABLE)
    .update({
      email_verified_at: new Date().toISOString(),
      verify_token: null,
      verify_expires_at: null,
    })
    .eq("id", row.id);
  if (updateError) return { ok: false as const, error: updateError.message };

  return { ok: true as const, customer: { name: row.name, email: row.email } };
}

export async function loginStoreCustomer(emailRaw: string, password: string) {
  const client = adminClient();
  if (!client) return { ok: false as const, error: "Sin conexión." };
  const email = normalizeEmail(emailRaw);
  const { data, error } = await client.from(TABLE).select("*").eq("email", email).maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  const row = data as CustomerRow | null;
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return { ok: false as const, error: "Correo o contraseña incorrectos." };
  }
  return {
    ok: true as const,
    pending: !row.email_verified_at,
    customer: { name: row.name, email: row.email, verified: Boolean(row.email_verified_at) },
  };
}

export async function getStoreCustomerProfile(emailRaw: string) {
  const client = adminClient();
  if (!client) return { ok: false as const, error: "Sin conexión." };
  const email = normalizeEmail(emailRaw);
  const { data, error } = await client.from(TABLE).select("*").eq("email", email).maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "No encontramos esa cuenta." };
  return { ok: true as const, customer: publicOf(data as CustomerRow) };
}

export async function updateStoreCustomerProfile(
  emailRaw: string,
  patch: { name?: string; alias?: string; phone?: string; addressLine?: string; addressCity?: string; addressZip?: string },
) {
  const client = adminClient();
  if (!client) return { ok: false as const, error: "Sin conexión." };
  const email = normalizeEmail(emailRaw);
  const update: Record<string, string> = {};
  if (patch.name != null) update.name = patch.name.trim();
  if (patch.alias != null) update.alias = patch.alias.trim();
  if (patch.phone != null) {
    update.phone = patch.phone.trim();
    const normalized = normalizeStorePhone(patch.phone);
    if (normalized) update.phone_normalized = normalized;
  }
  if (patch.addressLine != null) update.address_line = patch.addressLine.trim();
  if (patch.addressCity != null) update.address_city = patch.addressCity.trim();
  if (patch.addressZip != null) update.address_zip = patch.addressZip.trim();
  if (!Object.keys(update).length) return getStoreCustomerProfile(email);

  const first = await client.from(TABLE).update(update).eq("email", email);
  if (first.error && update.phone_normalized) {
    delete update.phone_normalized;
    const retry = await client.from(TABLE).update(update).eq("email", email);
    if (retry.error) return { ok: false as const, error: retry.error.message };
  } else if (first.error) {
    return { ok: false as const, error: first.error.message };
  }
  return getStoreCustomerProfile(email);
}

export async function listStoreOrdersForEmail(emailRaw: string) {
  const client = adminClient();
  if (!client) return { ok: false as const, error: "Sin conexión.", orders: [] as StoreCustomerOrder[] };
  const email = normalizeEmail(emailRaw);
  const shopId = process.env.TALLER_SHOP_ID?.trim();
  let query = client
    .from("web_orders")
    .select("order_number, status, total, items, created_at, customer_email")
    .eq("customer_email", email)
    .order("created_at", { ascending: false });
  if (shopId) query = query.eq("shop_id", shopId);
  const { data, error } = await query;
  if (error) return { ok: false as const, error: error.message, orders: [] as StoreCustomerOrder[] };

  const orders: StoreCustomerOrder[] = (data ?? []).map((row) => {
    const items = itemsFromJson(row.items);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const status = String(row.status ?? "pendiente");
    return {
      id: String(row.order_number ?? ""),
      createdAt: String(row.created_at ?? ""),
      status,
      statusLabel: orderStatusLabel(status),
      total: Math.round(Number(row.total) || 0),
      itemCount,
      items,
    };
  });
  return { ok: true as const, orders };
}

export async function listStoreCustomers() {
  const client = adminClient();
  if (!client) return { ok: false as const, error: "Sin conexión.", customers: [] as StoreCustomerPublic[] };
  const { data, error } = await client
    .from(TABLE)
    .select("id, email, name, alias, phone, address_line, address_city, address_zip, email_verified_at, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    const fallback = await client
      .from(TABLE)
      .select("id, email, name, email_verified_at, created_at")
      .order("created_at", { ascending: false });
    if (fallback.error) {
      return { ok: false as const, error: fallback.error.message, customers: [] as StoreCustomerPublic[] };
    }
    const customers = ((fallback.data ?? []) as CustomerRow[]).map((row) => publicOf(row));
    return { ok: true as const, customers };
  }
  const customers = ((data ?? []) as CustomerRow[]).map((row) => publicOf(row));
  return { ok: true as const, customers };
}

type AdminClient = NonNullable<ReturnType<typeof adminClient>>;

async function findCustomerByPhone(client: AdminClient, normalized: string) {
  const placeholder = phonePlaceholderEmail(normalized);
  const byEmail = await client.from(TABLE).select("*").eq("email", placeholder).maybeSingle();
  if (byEmail.data) return byEmail.data as CustomerRow;

  const byNorm = await client.from(TABLE).select("*").eq("phone_normalized", normalized).maybeSingle();
  if (!byNorm.error && byNorm.data) return byNorm.data as CustomerRow;

  const listed = await client.from(TABLE).select("*").not("phone", "is", null);
  if (listed.error || !listed.data) return null;
  const last10 = normalized.slice(-10);
  const match = listed.data.find((row) => {
    const stored = String((row as CustomerRow).phone ?? "");
    const storedNorm = normalizeStorePhone(stored);
    const digits = stored.replace(/\D/g, "");
    return storedNorm === normalized || digits === normalized || digits.endsWith(last10);
  });
  return (match as CustomerRow | undefined) ?? null;
}

async function writeCustomerPhone(client: AdminClient, id: string, phoneRaw: string) {
  const normalized = normalizeStorePhone(phoneRaw);
  if (!normalized) return { ok: false as const, error: "Ingresá un celular válido." };
  const phone = displayStorePhone(normalized);
  const first = await client
    .from(TABLE)
    .update({ phone, phone_normalized: normalized })
    .eq("id", id);
  if (!first.error) return { ok: true as const, phone, normalized };
  const retry = await client.from(TABLE).update({ phone }).eq("id", id);
  if (retry.error) return { ok: false as const, error: retry.error.message };
  return { ok: true as const, phone, normalized };
}

/** Registro con celular (opcional correo). El registro solo-email sigue en registerStoreCustomer. */
export async function registerStoreCustomerFlexible(
  input: { name: string; email?: string; phone?: string; password: string },
  request: Request,
) {
  const name = input.name.trim();
  const password = input.password;
  const emailRaw = (input.email ?? "").trim();
  const phoneRaw = (input.phone ?? "").trim() || (!looksLikeEmail(emailRaw) ? emailRaw : "");
  const email = looksLikeEmail(emailRaw) ? normalizeEmail(emailRaw) : "";
  const normalizedPhone = phoneRaw ? normalizeStorePhone(phoneRaw) : null;

  if (!email && !normalizedPhone) {
    return { ok: false as const, error: "Ingresá un correo o un celular." };
  }
  if (phoneRaw && !normalizedPhone) {
    return { ok: false as const, error: "Ingresá un celular válido." };
  }
  if (email && !normalizedPhone) {
    return registerStoreCustomer({ name, email, password }, request);
  }

  const client = adminClient();
  if (!client) return { ok: false as const, error: "La tienda no tiene conexión para registrar cuentas." };
  if (name.length < 2) return { ok: false as const, error: "Ingresá tu nombre." };
  if (password.length < 6) return { ok: false as const, error: "La contraseña debe tener al menos 6 caracteres." };

  const existingPhone = await findCustomerByPhone(client, normalizedPhone!);
  if (existingPhone) {
    return { ok: false as const, error: "Ese celular ya está registrado. Iniciá sesión." };
  }

  if (email) {
    const created = await registerStoreCustomer({ name, email, password }, request);
    if (!created.ok) return created;
    const { data } = await client.from(TABLE).select("id").eq("email", email).maybeSingle();
    if (data?.id) await writeCustomerPhone(client, String(data.id), phoneRaw);
    return created;
  }

  const phone = displayStorePhone(normalizedPhone!);
  const placeholder = phonePlaceholderEmail(normalizedPhone!);
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    email: placeholder,
    name,
    phone,
    phone_normalized: normalizedPhone,
    password_hash: await hashPassword(password),
    email_verified_at: now,
    verify_token: null,
    verify_expires_at: null,
  };
  const inserted = await client.from(TABLE).insert(row);
  if (inserted.error && /phone_normalized/i.test(inserted.error.message)) {
    delete row.phone_normalized;
    const retry = await client.from(TABLE).insert(row);
    if (retry.error) return { ok: false as const, error: retry.error.message };
  } else if (inserted.error) {
    return { ok: false as const, error: inserted.error.message };
  }
  return {
    ok: true as const,
    pending: false as const,
    mailed: false,
    phoneOnly: true as const,
  };
}

/** Login por correo (delegado) o por celular. No modifica loginStoreCustomer. */
export async function loginStoreCustomerFlexible(identifierRaw: string, password: string) {
  const identifier = identifierRaw.trim();
  if (looksLikeEmail(identifier)) {
    return loginStoreCustomer(identifier, password);
  }
  const normalized = normalizeStorePhone(identifier);
  if (!normalized) return { ok: false as const, error: "Ingresá un correo o un celular válido." };

  const client = adminClient();
  if (!client) return { ok: false as const, error: "Sin conexión." };
  const row = await findCustomerByPhone(client, normalized);
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return { ok: false as const, error: "Celular o contraseña incorrectos." };
  }
  return {
    ok: true as const,
    pending: !row.email_verified_at,
    customer: { name: row.name, email: row.email, verified: Boolean(row.email_verified_at) },
  };
}
