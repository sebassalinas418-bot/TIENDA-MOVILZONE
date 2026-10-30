import { connection } from "next/server";
import { readTallerInventoryCategoryNames } from "@/services/taller-gestio/inventory-categories";

const noStore = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function GET() {
  await connection();
  try {
    const names = await readTallerInventoryCategoryNames();
    return Response.json({ ok: true, names }, { headers: noStore });
  } catch {
    return Response.json({ ok: false, names: [] }, { headers: noStore });
  }
}
