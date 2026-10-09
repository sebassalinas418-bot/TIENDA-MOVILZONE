import { createHmac } from "crypto";
import { NextResponse } from "next/server";

export type StoreCookieSession = {
  email: string;
  name: string;
  role: "cliente" | "admin";
  verified: boolean;
};

const COOKIE = "mz_web_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  return (
    process.env.WEB_STORE_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "movilzone-dev-session"
  );
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function applyStoreSessionCookie(response: NextResponse, session: StoreCookieSession) {
  const payload = Buffer.from(
    JSON.stringify({ ...session, exp: Date.now() + MAX_AGE * 1000 }),
    "utf8",
  ).toString("base64url");
  const value = `${payload}.${sign(payload)}`;
  response.cookies.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return response;
}

export function clearStoreSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

export function readStoreSessionCookie(request: Request): StoreCookieSession | null {
  const header = request.headers.get("cookie") ?? "";
  const match = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  if (!match) return null;
  const raw = decodeURIComponent(match.slice(COOKIE.length + 1));
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (sign(payload) !== signature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as StoreCookieSession & {
      exp?: number;
    };
    if (!parsed.email || (parsed.exp && parsed.exp < Date.now())) return null;
    return {
      email: parsed.email.trim().toLowerCase(),
      name: parsed.name || "",
      role: parsed.role === "admin" ? "admin" : "cliente",
      verified: parsed.verified !== false,
    };
  } catch {
    return null;
  }
}

export function isStoreAdminSession(session: StoreCookieSession | null) {
  if (!session) return false;
  if (session.role === "admin") return true;
  const listed = (
    process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
    process.env.TALLER_ADMIN_EMAIL ||
    ""
  )
    .trim()
    .toLowerCase();
  return Boolean(listed && session.email === listed);
}
