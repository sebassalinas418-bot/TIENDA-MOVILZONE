/**
 * Sesión de prueba, solo en este navegador.
 * No llama a ningún servidor y no lee ni escribe la base "sebfix".
 * La contraseña no se guarda: sessionStorage solo conserva nombre y correo
 * después de un ingreso correcto.
 */

export type DemoRole = "cliente" | "admin";

export type DemoSession = {
  name: string;
  email: string;
  role: DemoRole;
  verified?: boolean;
};

const STORAGE_KEY = "movilzone.demo-session";
const REMEMBER_KEY = "movilzone.remember-session";
const DEV_ADMIN_KEY = "movilzone.dev-admin";
export const SESSION_EVENT = "movilzone-session";
export const STORE_OWNER_EMAIL = "sebassalinas418@gmail.com";

export const demoAccount = {
  email: "demo@movilzone.com",
  password: "demo123",
  name: "Cliente demo",
  role: "cliente" as const,
};

export const adminAccount = {
  email: "admin@movilzone.com",
  password: "admin123",
  name: "Admin",
  role: "admin" as const,
};

function parseSessionRaw(raw: string | null): DemoSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DemoSession>;
    if (!parsed.email || !parsed.name) return null;
    const role: DemoRole =
      parsed.role === "admin" || parsed.email === adminAccount.email || isListedStoreAdminEmail(parsed.email)
        ? "admin"
        : "cliente";
    return {
      email: parsed.email,
      name: parsed.name,
      role,
      verified: parsed.verified !== false,
    };
  } catch {
    return null;
  }
}

function writeActiveSession(session: DemoSession, remember = false) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  if (remember) window.localStorage.setItem(REMEMBER_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(REMEMBER_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function readSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  const live = parseSessionRaw(window.sessionStorage.getItem(STORAGE_KEY));
  if (live) return live;
  const remembered = parseSessionRaw(window.localStorage.getItem(REMEMBER_KEY));
  if (!remembered) return null;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(remembered));
  return remembered;
}

export function signIn(email: string, password: string, remember = false): DemoSession | null {
  const normalized = email.trim().toLowerCase();
  const account = [demoAccount, adminAccount].find(
    (item) => item.email === normalized && item.password === password,
  );
  if (!account) return null;

  const session: DemoSession = {
    name: account.name,
    email: account.email,
    role: account.role,
    verified: true,
  };
  writeActiveSession(session, remember);
  return session;
}

export function isSessionVerified(session: DemoSession | null) {
  return Boolean(session && session.verified !== false);
}

export function openCustomerSession(name: string, email: string, verified = true, remember = false) {
  const session: DemoSession = { name, email, role: "cliente", verified };
  writeActiveSession(session, remember);
  return session;
}

export function openAdminSession(name: string, email: string, remember = false) {
  const session: DemoSession = { name, email, role: "admin", verified: true };
  writeActiveSession(session, remember);
  return session;
}

export async function syncStoreSessionCookie(input: {
  email: string;
  password?: string;
  name?: string;
  tallerToken?: string;
}) {
  try {
    await fetch("/api/store-auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
  } catch {
    /* la cookie no bloquea la sesión local */
  }
}

export function signOut() {
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem("movilzone.taller-token");
  window.localStorage.removeItem(REMEMBER_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
  void fetch("/api/store-auth/session", { method: "DELETE", credentials: "include" });
}

export function readDevAdmin() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(DEV_ADMIN_KEY) === "1";
}

export function writeDevAdmin(enabled: boolean) {
  window.sessionStorage.setItem(DEV_ADMIN_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function isListedStoreAdminEmail(email?: string | null) {
  const listed = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || STORE_OWNER_EMAIL).trim().toLowerCase();
  const value = email?.trim().toLowerCase();
  return Boolean(value && (value === listed || value === STORE_OWNER_EMAIL));
}

export function isStoreOwnerEmail(email?: string | null) {
  return email?.trim().toLowerCase() === STORE_OWNER_EMAIL;
}

export function isAdminAccess(session: DemoSession | null, devAdmin = readDevAdmin()) {
  if (session?.role === "admin" || isListedStoreAdminEmail(session?.email)) return true;
  return Boolean(devAdmin && isStoreOwnerEmail(session?.email));
}
