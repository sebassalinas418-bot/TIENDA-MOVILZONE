import { isListedStoreAdminEmail } from "@/lib/session";
import { isStoreAdminSession, readStoreSessionCookie } from "@/lib/store-session-cookie";

/** Redes en la tienda: solo admin (cookie de sesión + email listado). Los clientes no pasan. */
export function canAccessStoreRedesEmail(email?: string | null) {
  return isListedStoreAdminEmail(email);
}

export function canAccessStoreRedesRequest(request: Request) {
  const session = readStoreSessionCookie(request);
  if (!session) return false;
  if (!isStoreAdminSession(session)) return false;
  return canAccessStoreRedesEmail(session.email) || session.role === "admin";
}
