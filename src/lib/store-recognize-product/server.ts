import { serverGeminiKey } from "@/lib/store-redes/gemini-key";

/** Gratis / Lite: flash-latest está en cuota 429; 2.5-flash da 404 a cuentas nuevas. */
const MODELS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest"] as const;
const GEMINI_TIMEOUT_MS = 50_000;
const MAX_BYTES = 400 * 1024;
const PROMPT =
  "Analizá esta foto de producto. Respondé SOLO JSON con claves nombre_sugerido (título corto), categoria y detalles (4 características de venta).";

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

function mimeFrom(value: string, fallback = "image/jpeg") {
  const mime = value.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime === "image/jpeg" || mime === "image/jpg" || mime === "image/png" || mime === "image/webp") {
    return mime === "image/jpg" ? "image/jpeg" : mime;
  }
  return fallback;
}

export function loadRecognitionImage(input: { imageBase64?: string; mimeType?: string }) {
  const dataUrl = input.imageBase64?.trim() ?? "";
  if (dataUrl.startsWith("data:image/")) {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) throw new Error("La imagen en base64 no es válida.");
    const bytes = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
    if (bytes.length > MAX_BYTES) throw new Error("La imagen es demasiado grande para analizar.");
    return { mimeType: mimeFrom(match[1]), data: bytes.toString("base64") };
  }
  if (!dataUrl || dataUrl.startsWith("http")) {
    throw new Error("La IA necesita la foto en base64 ya comprimida, no una URL.");
  }
  const bytes = Buffer.from(dataUrl.replace(/\s+/g, ""), "base64");
  if (!bytes.length) throw new Error("La imagen en base64 no es válida.");
  if (bytes.length > MAX_BYTES) throw new Error("La imagen es demasiado grande para analizar.");
  return { mimeType: mimeFrom(input.mimeType || "image/jpeg"), data: bytes.toString("base64") };
}

function friendlyGeminiError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  if (lower.includes("tardó mucho")) return raw;
  if (
    lower.includes("api key not valid") ||
    lower.includes("unauthorized") ||
    lower.includes("unauthenticated") ||
    lower.includes("access_token_type")
  ) {
    return "La clave de Gemini no es válida. Creá una nueva en Google AI Studio (aistudio.google.com/apikey) y cargala en Vercel como GEMINI_API_KEY.";
  }
  if (lower.includes("quota") || lower.includes("resource exhausted")) {
    return "Gemini alcanzó el límite de uso. Probá de nuevo en unos minutos.";
  }
  if (lower.includes("no longer available") || lower.includes("not found")) {
    return "Ese modelo de Gemini ya no está disponible. Probá de nuevo.";
  }
  return "Gemini no pudo analizar la foto. Probá de nuevo.";
}

function isRetryableModelError(status: number, message: string) {
  const lower = message.toLowerCase();
  return (
    status === 404 ||
    status === 429 ||
    lower.includes("no longer available") ||
    lower.includes("not found") ||
    lower.includes("quota") ||
    lower.includes("resource exhausted")
  );
}

async function generateWithModel(
  key: string,
  model: string,
  image: { mimeType: string; data: string },
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: PROMPT }, { inlineData: { mimeType: image.mimeType, data: image.data } }],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 280,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    },
  );
  const payload = (await response.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const message = payload.error?.message || `Gemini ${response.status}`;
  if (!response.ok) {
    const error = new Error(message);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
  const parsed = parseRecognition(text);
  if (!parsed) throw new Error("La IA no devolvió un JSON válido.");
  return parsed;
}

export async function recognizeProductImage(image: { mimeType: string; data: string }): Promise<RecognizedProduct> {
  const key = serverGeminiKey();
  if (!key) throw new Error("Falta GEMINI_API_KEY en el servidor.");

  let lastError: unknown;
  for (const model of MODELS) {
    try {
      return await generateWithModel(key, model, image);
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new Error("La IA tardó mucho, intentá de nuevo.");
      }
      const status = (error as Error & { status?: number }).status ?? 0;
      const message = error instanceof Error ? error.message : String(error);
      lastError = error;
      if (isRetryableModelError(status, message)) continue;
      throw new Error(friendlyGeminiError(error));
    }
  }
  throw new Error(friendlyGeminiError(lastError));
}
