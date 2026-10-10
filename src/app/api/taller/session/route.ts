import { verifyTallerAdmin } from "@/services/taller-gestio/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return Response.json({ ok: false }, { status: 400 });
  }
  try {
    const admin = await verifyTallerAdmin(body.email, body.password);
    if (!admin) return Response.json({ ok: false }, { status: 401 });
    return Response.json({ ok: true, ...admin });
  } catch {
    return Response.json({ ok: false }, { status: 401 });
  }
}
