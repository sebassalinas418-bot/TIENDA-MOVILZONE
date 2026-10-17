import { connection } from "next/server";
import { canAccessStoreRedesRequest } from "@/lib/store-redes/access";
import { loadRecognitionImage, recognizeProductImage } from "@/lib/store-recognize-product/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  await connection();
  if (!canAccessStoreRedesRequest(request)) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { imageBase64?: string; mimeType?: string };
    if (!body.imageBase64?.trim()) {
      return Response.json({ ok: false, error: "Falta la imagen en base64." }, { status: 400 });
    }
    const image = loadRecognitionImage({ imageBase64: body.imageBase64, mimeType: body.mimeType });
    const data = await recognizeProductImage(image);
    return Response.json({ ok: true, ...data });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo analizar el producto." },
      { status: 400 },
    );
  }
}
