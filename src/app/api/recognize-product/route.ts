import { connection } from "next/server";
import { canAccessStoreRedesRequest } from "@/lib/store-redes/access";
import { loadRecognitionImage, recognizeProductImage } from "@/lib/store-recognize-product/server";

export async function POST(request: Request) {
  await connection();
  if (!canAccessStoreRedesRequest(request)) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      imageUrl?: string;
      imageBase64?: string;
      mimeType?: string;
    };
    const image = await loadRecognitionImage(body);
    const data = await recognizeProductImage(image);
    return Response.json({ ok: true, ...data });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo analizar el producto." },
      { status: 400 },
    );
  }
}
