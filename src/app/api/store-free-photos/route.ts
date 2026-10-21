import { connection } from "next/server";
import { canAccessStoreRedesRequest } from "@/lib/store-redes/access";
import { enqueueFreePhotoPost, uploadFreePhoto } from "@/lib/store-free-photos/enqueue";

export async function POST(request: Request) {
  await connection();
  if (!canAccessStoreRedesRequest(request)) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  try {
    const form = await request.formData();
    const caption = String(form.get("caption") ?? "").trim();
    const headline = String(form.get("headline") ?? "").trim();
    const hour = String(form.get("hour") ?? "").trim();
    const file = form.get("image") ?? form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: "Falta la imagen." }, { status: 400 });
    }
    if (!caption) {
      return Response.json({ ok: false, error: "Falta el texto de la publicación." }, { status: 400 });
    }
    const uploaded = await uploadFreePhoto(file);
    if (!uploaded.ok) return Response.json({ ok: false, error: uploaded.error }, { status: 400 });
    const stored = await enqueueFreePhotoPost({
      caption,
      headline,
      imageUrl: uploaded.url,
      hour: hour || undefined,
    });
    if (!stored.ok) return Response.json({ ok: false, error: stored.error, post: stored.post }, { status: 400 });
    return Response.json({ ok: true, post: stored.post }, { status: 201 });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "No se pudo programar la foto libre." },
      { status: 500 },
    );
  }
}
