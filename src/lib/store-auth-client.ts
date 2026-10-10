"use client";

import { clearTallerToken, readTallerToken, signInTallerAdmin } from "@/services/taller-gestio/browser";
import {
  isListedStoreAdminEmail,
  openAdminSession,
  openCustomerSession,
  signIn,
  syncStoreSessionCookie,
  type DemoSession,
} from "@/lib/session";

export type StoreAuthResult =
  | { ok: true; session: DemoSession; verified: boolean }
  | { ok: false; error: string };

export async function authenticateStoreUser(
  email: string,
  password: string,
  remember = false,
): Promise<StoreAuthResult> {
  const local = signIn(email, password, remember);
  if (local) {
    clearTallerToken();
    await syncStoreSessionCookie({ email, password });
    return { ok: true, session: local, verified: true };
  }

  const storeResponse = await fetch("/api/store-auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const storeBody = (await storeResponse.json()) as {
    ok?: boolean;
    pending?: boolean;
    error?: string;
    customer?: { name: string; email: string; verified?: boolean };
  };

  if (storeBody.ok && storeBody.customer) {
    clearTallerToken();
    const verified = storeBody.customer.verified !== false && !storeBody.pending;
    const session = isListedStoreAdminEmail(storeBody.customer.email)
      ? openAdminSession(storeBody.customer.name, storeBody.customer.email, remember)
      : openCustomerSession(storeBody.customer.name, storeBody.customer.email, verified, remember);
    return { ok: true, session, verified };
  }

  const tallerAdmin = await signInTallerAdmin(email, password);
  if (!tallerAdmin) {
    return { ok: false, error: storeBody.error || "Esos datos no coinciden con una cuenta de la tienda ni del taller." };
  }

  const session = openAdminSession(tallerAdmin.name, tallerAdmin.email, remember);
  await syncStoreSessionCookie({
    email: tallerAdmin.email,
    name: tallerAdmin.name,
    tallerToken: readTallerToken(),
  });
  return { ok: true, session, verified: true };
}

export async function registerStoreUser(name: string, email: string, password: string) {
  const response = await fetch("/api/store-auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return (await response.json()) as {
    ok?: boolean;
    error?: string;
    mailed?: boolean;
    devVerifyUrl?: string;
  };
}

export async function resendStoreVerification(email: string) {
  const response = await fetch("/api/store-auth/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return (await response.json()) as {
    ok?: boolean;
    error?: string;
    mailed?: boolean;
    devVerifyUrl?: string;
  };
}
