import { readTallerCatalog, tallerConfigured } from "@/services/taller-gestio/server";

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
    return Response.json({ connected: false, products: [] });
  }
  try {
    const products = await withTimeout(readTallerCatalog(), 4000);
    return Response.json({ connected: products !== null, products: products ?? [] });
  } catch {
    return Response.json({ connected: false, products: [] }, { status: 200 });
  }
}
