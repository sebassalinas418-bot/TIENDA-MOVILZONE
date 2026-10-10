import { resendStoreVerification } from "@/services/store-customers/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  try {
    const result = await resendStoreVerification(body.email ?? "", request);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return Response.json({ ok: false, error: "No se pudo reenviar." }, { status: 500 });
  }
}
