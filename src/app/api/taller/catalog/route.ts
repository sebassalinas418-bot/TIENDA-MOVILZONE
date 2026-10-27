import { tallerConfigured } from "@/services/taller-gestio/server";
import { readStorefrontCatalog } from "@/services/taller-gestio/storefront-catalog";

const noStore = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function GET() {
  if (!tallerConfigured()) {
    return Response.json({ connected: false, products: [] }, { headers: noStore });
  }
  try {
    const products = await withTimeout(readStorefrontCatalog(), 8000);
    return Response.json(
      { connected: products !== null, products: products ?? [] },
      { headers: noStore },
    );
  } catch {
    return Response.json({ connected: false, products: [] }, { status: 200, headers: noStore });
  }
}
