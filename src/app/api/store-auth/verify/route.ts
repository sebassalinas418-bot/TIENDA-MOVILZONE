import { NextResponse } from "next/server";
import { applyStoreSessionCookie } from "@/lib/store-session-cookie";
import { verifyStoreCustomer } from "@/services/store-customers/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };
  try {
    const result = await verifyStoreCustomer(body.token ?? "");
    if (!result.ok || !result.customer) {
      return NextResponse.json(result, { status: 400 });
    }
    const response = NextResponse.json(result, { status: 200 });
    return applyStoreSessionCookie(response, {
      email: result.customer.email,
      name: result.customer.name,
      role: "cliente",
      verified: true,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo verificar." }, { status: 500 });
  }
}
