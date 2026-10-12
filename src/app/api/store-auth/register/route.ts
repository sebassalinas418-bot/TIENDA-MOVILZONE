import { registerStoreCustomerFlexible } from "@/services/store-customers/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; email?: string; phone?: string; password?: string };
  try {
    const result = await registerStoreCustomerFlexible(
      {
        name: body.name ?? "",
        email: body.email ?? "",
        phone: body.phone ?? "",
        password: body.password ?? "",
      },
      request,
    );
    return Response.json(result, { status: result.ok ? 201 : 400 });
  } catch {
    return Response.json({ ok: false, error: "No se pudo registrar." }, { status: 500 });
  }
}
