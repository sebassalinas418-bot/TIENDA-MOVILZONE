import { readStoreOverlayHidden, writeStoreOverlayHidden } from "@/services/store-overlay/server";

const noStore = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function GET() {
  const hidden = await readStoreOverlayHidden();
  return Response.json({ hidden: hidden ?? [] }, { headers: noStore });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { hidden?: unknown };
  const hidden = Array.isArray(body.hidden)
    ? body.hidden.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const ok = await writeStoreOverlayHidden(hidden);
  return Response.json({ ok, hidden }, { status: ok ? 200 : 503, headers: noStore });
}
