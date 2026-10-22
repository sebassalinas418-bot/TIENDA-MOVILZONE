export const FREE_PHOTO_HASHTAGS = ["#MovilZone", "#GeneralPico", "#LaPampa", "#Tecnologia"];
export const FREE_PHOTO_FOOTER = "📍 Calle 9 N° 421, General Pico.\n📲 WhatsApp: 2302 57 3969";

const ONE_LINE_FOOTER = "📍 Calle 9 N° 421, General Pico. 📲 WhatsApp: 2302 57 3969";

export function uniqueHashtags(...groups: Array<string | string[] | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    const chunks = Array.isArray(group) ? group : group ? [group] : [];
    for (const chunk of chunks) {
      const tags = chunk.match(/#[\p{L}0-9_]+/gu) ?? [];
      for (const tag of tags) {
        const key = tag.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(tag);
      }
    }
  }
  return out.slice(0, 12);
}

export function stripHashtagLines(text: string) {
  return text
    .split("\n")
    .filter((line) => {
      const item = line.trim();
      if (!item) return true;
      return !/^(#[\p{L}0-9_]+\s*)+$/u.test(item);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function composeInstagramCaption(caption: string, hashtags: string[] = []) {
  const withFooter = caption.replaceAll(ONE_LINE_FOOTER, FREE_PHOTO_FOOTER).trim();
  const tags = uniqueHashtags(withFooter, hashtags);
  const body = stripHashtagLines(withFooter);
  if (!tags.length) return body;
  return `${body}\n\n${tags.join(" ")}`;
}

export function ensureFreePhotoFooter(text: string) {
  let body = stripHashtagLines(text.replaceAll(ONE_LINE_FOOTER, FREE_PHOTO_FOOTER).trim());
  body = body.replace(/\n*📍 Calle 9 N° 421[\s\S]*$/u, "").trim();
  body = body.replace(/\n*📲\s*WhatsApp:.*$/imu, "").trim();
  const tags = uniqueHashtags(text, FREE_PHOTO_HASHTAGS);
  return composeInstagramCaption(`${body}\n\n${FREE_PHOTO_FOOTER}`, tags);
}

export function captionHeadline(caption: string) {
  const line = caption
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item && !item.startsWith("#") && !item.startsWith("📍") && !item.startsWith("📲")) || "Foto libre";
  return line.replace(/\s+/g, " ").slice(0, 80);
}

export function captionHashtags(caption: string) {
  return uniqueHashtags(caption);
}

export function captionFromRecognition(data: { nombre_sugerido?: string; categoria?: string; detalles?: string }) {
  const nombre = (data.nombre_sugerido ?? "").trim();
  const categoria = (data.categoria ?? "").trim();
  const detalles = (data.detalles ?? "").trim();
  const bullets = splitDetails(detalles).map((item) => `• ${item}`);
  const body = [nombre, categoria ? `Categoría: ${categoria}` : "", "", ...bullets]
    .filter((line, index, all) => line || all[index - 1])
    .join("\n");
  return ensureFreePhotoFooter(body.trim());
}

function splitDetails(detalles: string) {
  const parts = detalles
    .split(/\n+|•|\u2022|;|\.\s+/)
    .map((item) => item.replace(/^[-–]\s*/, "").trim())
    .filter((item) => item.length > 2);
  if (parts.length >= 2) return parts.slice(0, 4);
  return detalles ? [detalles] : [];
}
