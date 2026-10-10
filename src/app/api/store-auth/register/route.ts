import { registerStoreCustomer } from "@/services/store-customers/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; email?: string; password?: string };
  try {
    const result = await registerStoreCustomer(
      {
        name: body.name ?? "",
        email: body.email ?? "",
        password: body.password ?? "",
      },
      request,
    );
    return Response.json(result, { status: result.ok ? 201 : 400 });
  } catch {
    return Response.json({ ok: false, error: "No se pudo registrar." }, { status: 500 });
  }
}
