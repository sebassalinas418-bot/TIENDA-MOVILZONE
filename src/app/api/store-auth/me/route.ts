import { readStoreSessionCookie } from "@/lib/store-session-cookie";
import { getStoreCustomerProfile, updateStoreCustomerProfile } from "@/services/store-customers/server";

export async function GET(request: Request) {
  const session = readStoreSessionCookie(request);
  if (!session) return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  try {
    const result = await getStoreCustomerProfile(session.email);
    if (!result.ok) {
      return Response.json({
        ok: true,
        customer: {
          id: session.email,
          email: session.email,
          name: session.name,
          alias: "",
          phone: "",
          addressLine: "",
          addressCity: "",
          addressZip: "",
          verified: session.verified,
          createdAt: "",
        },
      });
    }
    return Response.json(result);
  } catch {
    return Response.json({ ok: false, error: "No se pudo leer el perfil." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = readStoreSessionCookie(request);
  if (!session) return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const body = (await request.json()) as {
    name?: string;
    alias?: string;
    phone?: string;
    addressLine?: string;
    addressCity?: string;
    addressZip?: string;
  };
  try {
    const result = await updateStoreCustomerProfile(session.email, {
      name: body.name,
      alias: body.alias,
      phone: body.phone,
      addressLine: body.addressLine,
      addressCity: body.addressCity,
      addressZip: body.addressZip,
    });
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, error: "No se pudo guardar el perfil." }, { status: 500 });
  }
}
