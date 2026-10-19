export const FREE_PHOTO_FOOTER = "📍 Calle 9 N° 421, General Pico. 📲 WhatsApp: 2302 57 3969";

export function ensureFreePhotoFooter(text: string) {
  const trimmed = text.trim();
  if (trimmed.endsWith(FREE_PHOTO_FOOTER)) return trimmed;
  const without = trimmed.replace(/\n*📍 Calle 9 N° 421[\s\S]*$/u, "").trim();
  return `${without}\n\n${FREE_PHOTO_FOOTER}`;
}

export function captionHeadline(caption: string) {
  const line = caption
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item && !item.startsWith("#") && !item.startsWith("📍")) || "Foto libre";
  return line.replace(/\s+/g, " ").slice(0, 80);
}

export function captionHashtags(caption: string) {
  const tags = caption.match(/#[\p{L}0-9_]+/gu) ?? [];
  return [...new Set(tags)].slice(0, 12);
}

export function captionFromRecognition(data: { nombre_sugerido?: string; categoria?: string; detalles?: string }) {
  const nombre = (data.nombre_sugerido ?? "").trim();
  const categoria = (data.categoria ?? "").trim();
  const detalles = (data.detalles ?? "").trim();
  const bullets = splitDetails(detalles).map((item) => `• ${item}`);
  const body = [nombre, categoria ? `Categoría: ${categoria}` : "", "", ...bullets].filter((line, index, all) => line || all[index - 1]).join("\n");
  return ensureFreePhotoFooter(`${body.trim()}\n\n#MovilZone #GeneralPico #LaPampa #Tecnologia`);
}

function splitDetails(detalles: string) {
  const parts = detalles
    .split(/\n+|•|\u2022|;|\.\s+/)
    .map((item) => item.replace(/^[-–]\s*/, "").trim())
    .filter((item) => item.length > 2);
  if (parts.length >= 2) return parts.slice(0, 4);
  return detalles ? [detalles] : [];
}
