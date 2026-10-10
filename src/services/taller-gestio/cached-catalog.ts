import { cacheLife } from "next/cache";
import { readTallerCatalog } from "@/services/taller-gestio/server";

export async function readCachedTallerCatalog() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 1, expire: 300 });
  try {
    return await readTallerCatalog();
  } catch {
    return null;
  }
}
