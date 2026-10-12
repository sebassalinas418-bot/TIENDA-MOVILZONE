import { registerStoreCustomerFlexible } from "@/services/store-customers/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string; phone?: string; password?: string };
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
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : "No se pudo registrar.";
    console.error("[tienda web] registro", err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
