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
const DEV_ADMIN_KEY = "movilzone.dev-admin";
export const SESSION_EVENT = "movilzone-session";

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

export function readSession(): DemoSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DemoSession>;
    if (!parsed.email || !parsed.name) return null;
    const role: DemoRole = parsed.role === "admin" || parsed.email === adminAccount.email ? "admin" : "cliente";
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

export function signIn(email: string, password: string): DemoSession | null {
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
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
  return session;
}

export function isSessionVerified(session: DemoSession | null) {
  return Boolean(session && session.verified !== false);
}

export function openCustomerSession(name: string, email: string, verified = true) {
  const session: DemoSession = { name, email, role: "cliente", verified };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
  return session;
}

export function openAdminSession(name: string, email: string) {
  const session: DemoSession = { name, email, role: "admin", verified: true };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
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
  const listed = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").trim().toLowerCase();
  return Boolean(listed && email?.trim().toLowerCase() === listed);
}

export function isAdminAccess(session: DemoSession | null, devAdmin = readDevAdmin()) {
  return session?.role === "admin" || isListedStoreAdminEmail(session?.email) || devAdmin;
}
