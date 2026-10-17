import { connection } from "next/server";
import { readRelatedTallerProductIds, tallerConfigured } from "@/services/taller-gestio/server";

const noStore = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const excludeId = url.searchParams.get("exclude")?.trim() ?? "";
  const category = url.searchParams.get("category")?.trim() ?? "";
  if (!tallerConfigured()) {
    return Response.json({ ids: [] }, { headers: noStore });
  }
  try {
    const ids = await readRelatedTallerProductIds({ excludeId, category, limit: 5 });
    return Response.json({ ids: ids ?? [] }, { headers: noStore });
  } catch {
    return Response.json({ ids: [] }, { status: 200, headers: noStore });
  }
}
