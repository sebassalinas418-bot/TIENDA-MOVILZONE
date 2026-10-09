import { NextResponse } from "next/server";
import { adminAccount, demoAccount } from "@/lib/session";
import {
  applyStoreSessionCookie,
  clearStoreSessionCookie,
} from "@/lib/store-session-cookie";
import { loginStoreCustomer } from "@/services/store-customers/server";
import { tokenIsTallerAdmin } from "@/services/taller-gestio/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
    tallerToken?: string;
  };
  try {
    if (body.tallerToken) {
      if (!(await tokenIsTallerAdmin(body.tallerToken))) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
      const email = (body.email ?? "").trim().toLowerCase();
      if (!email) return NextResponse.json({ ok: false }, { status: 400 });
      return applyStoreSessionCookie(NextResponse.json({ ok: true }), {
        email,
        name: body.name?.trim() || email,
        role: "admin",
        verified: true,
      });
    }

    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const local = [demoAccount, adminAccount].find(
      (item) => item.email === email && item.password === password,
    );
    if (local) {
      return applyStoreSessionCookie(NextResponse.json({ ok: true }), {
        email: local.email,
        name: local.name,
        role: local.role,
        verified: true,
      });
    }

    const result = await loginStoreCustomer(email, password);
    if (!result.ok || !result.customer) {
      return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
    }
    return applyStoreSessionCookie(NextResponse.json({ ok: true }), {
      email: result.customer.email,
      name: result.customer.name,
      role: "cliente",
      verified: result.customer.verified !== false && !result.pending,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE() {
  return clearStoreSessionCookie(NextResponse.json({ ok: true }));
}
