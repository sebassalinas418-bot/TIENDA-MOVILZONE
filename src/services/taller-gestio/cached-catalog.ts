import { cacheLife } from "next/cache";
import { readTallerCatalog } from "@/services/taller-gestio/server";

export async function readCachedTallerCatalog() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 0, expire: 1 });
  try {
    return await readTallerCatalog();
  } catch {
    return null;
  }
}
