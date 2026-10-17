import { GoogleGenerativeAI } from "@google/generative-ai";
import { serverGeminiKey } from "@/lib/store-redes/gemini-key";

const PROMPT =
  "Analiza la imagen de este producto tecnológico/accesorio. Devuelve ÚNICAMENTE un objeto JSON válido sin formato markdown con las siguientes claves: 'nombre_sugerido' (título corto y comercial), 'categoria' (ej. Auriculares, Cargadores) y 'detalles' (lista en HTML o texto enriquecido con 4-5 características técnicas principales que deduzcas del empaque o del producto para usar como descripción de venta)";

const MODELS = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash"];
const MAX_BYTES = 8 * 1024 * 1024;

export type RecognizedProduct = {
  nombre_sugerido: string;
  categoria: string;
  detalles: string;
};

function parseRecognition(raw: string): RecognizedProduct | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    const nombre = String(parsed.nombre_sugerido ?? "").trim();
    const categoria = String(parsed.categoria ?? "").trim();
    const detalles = String(parsed.detalles ?? "").trim();
    if (!nombre || !categoria || !detalles) return null;
    return { nombre_sugerido: nombre.slice(0, 120), categoria: categoria.slice(0, 80), detalles: detalles.slice(0, 4000) };
  } catch {
    return null;
  }
}

function allowedImageUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host.endsWith(".supabase.co")) return true;
    return false;
  } catch {
    return false;
  }
}

function mimeFrom(value: string, fallback = "image/jpeg") {
  const mime = value.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime === "image/jpeg" || mime === "image/jpg" || mime === "image/png" || mime === "image/webp") {
    return mime === "image/jpg" ? "image/jpeg" : mime;
  }
  return fallback;
}

export async function loadRecognitionImage(input: { imageUrl?: string; imageBase64?: string; mimeType?: string }) {
  const dataUrl = input.imageBase64?.trim() ?? "";
  if (dataUrl.startsWith("data:image/")) {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) throw new Error("La imagen en base64 no es válida.");
    const bytes = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
    if (bytes.length > MAX_BYTES) throw new Error("La imagen es demasiado grande para analizar.");
    return { mimeType: mimeFrom(match[1]), data: bytes.toString("base64") };
  }
  if (dataUrl && !dataUrl.startsWith("http")) {
    const bytes = Buffer.from(dataUrl.replace(/\s+/g, ""), "base64");
    if (!bytes.length) throw new Error("La imagen en base64 no es válida.");
    if (bytes.length > MAX_BYTES) throw new Error("La imagen es demasiado grande para analizar.");
    return { mimeType: mimeFrom(input.mimeType || "image/jpeg"), data: bytes.toString("base64") };
  }

  const imageUrl = input.imageUrl?.trim() || dataUrl;
  if (!imageUrl || !allowedImageUrl(imageUrl)) {
    throw new Error("Pasá una URL pública de Storage o una imagen en base64.");
  }
  const response = await fetch(imageUrl, { cache: "no-store", redirect: "follow" });
  if (!response.ok) throw new Error("No se pudo leer la imagen del producto.");
  const mimeType = mimeFrom(response.headers.get("content-type") || input.mimeType || "image/jpeg");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new Error("La imagen es demasiado grande para analizar.");
  return { mimeType, data: bytes.toString("base64") };
}

export async function recognizeProductImage(image: { mimeType: string; data: string }): Promise<RecognizedProduct> {
  const key = serverGeminiKey();
  if (!key) throw new Error("Falta GEMINI_API_KEY en el servidor.");

  let lastError = "Gemini no respondió.";
  for (const modelName of MODELS) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      });
      const result = await model.generateContent([
        { text: PROMPT },
        { inlineData: { mimeType: image.mimeType, data: image.data } },
      ]);
      const parsed = parseRecognition(result.response.text().trim());
      if (parsed) return parsed;
      lastError = "La IA no devolvió un JSON válido.";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Gemini no respondió.";
    }
  }
  throw new Error(lastError);
}
