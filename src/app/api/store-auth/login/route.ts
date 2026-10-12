import { NextResponse } from "next/server";
import { applyStoreSessionCookie } from "@/lib/store-session-cookie";
import { loginStoreCustomerFlexible } from "@/services/store-customers/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; phone?: string; identifier?: string; password?: string };
  try {
    const identifier = (body.identifier || body.email || body.phone || "").trim();
    const result = await loginStoreCustomerFlexible(identifier, body.password ?? "");
    if (!result.ok || !result.customer) {
      return NextResponse.json(result, { status: 401 });
    }
    const verified = result.customer.verified !== false && !result.pending;
    const response = NextResponse.json(result, { status: 200 });
    const listedAdmin = (
      process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
      process.env.TALLER_ADMIN_EMAIL ||
      ""
    )
      .trim()
      .toLowerCase();
    const isAdmin = listedAdmin !== "" && result.customer.email === listedAdmin;
    return applyStoreSessionCookie(response, {
      email: result.customer.email,
      name: result.customer.name,
      role: isAdmin ? "admin" : "cliente",
      verified,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
