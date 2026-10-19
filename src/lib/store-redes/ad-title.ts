/** Título comercial a partir del nombre real del catálogo. No inventa modelos. */

const DROP = /^(PARA|CON|DE|DEL|LA|EL|LOS|LAS|UN|UNA|Y)$/;

export function adTitleFromName(title: string) {
  const cleaned = title
    .toUpperCase()
    .replace(/TIPO\s*[-]?C/g, "TIPO C")
    .replace(/\bHDTV\b/g, "HDMI")
    .replace(/\b3\s*EN\s*1\b/g, "")
    .replace(/[^A-Z0-9ÁÉÍÓÚÑÜ+&\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((word, index, all) => {
    if (!word) return false;
    if (word === "A" && all[index + 1] === "HDMI") return true;
    return !DROP.test(word);
  });
  const picked: string[] = [];
  for (const word of words) {
    const next = [...picked, word].join(" ");
    if (picked.length && (next.length > 34 || picked.length >= 6)) break;
    picked.push(word);
  }
  return (picked.join(" ") || cleaned).slice(0, 36);
}

export function splitAdTitle(title: string) {
  const value = adTitleFromName(title);
  if (/\bTIPO C\b/.test(value) && /\bHDMI\b/.test(value)) {
    return { main: "ADAPTADOR TIPO C", rest: "A HDMI" };
  }
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 2) return { main: value, rest: "" };
  const last = words.at(-1) || "";
  if (last.length <= 8) return { main: words.slice(0, -1).join(" "), rest: last };
  if (words.length >= 4) return { main: words.slice(0, 3).join(" "), rest: words.slice(3).join(" ") };
  return { main: words.slice(0, -1).join(" "), rest: last };
}

export function shortFeatureLine(value: string) {
  const text = value
    .replace(/^[\s\p{Extended_Pictographic}\p{Emoji_Presentation}]+/u, "")
    .replace(/\b3\s*EN\s*1\b/gi, "3EN1")
    .replace(/\b(de|del|la|el|los|las|para|una|un)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b3EN1\b/gi, "3 EN 1");
  if (text.length <= 16) return text;
  const cut = text.slice(0, 16);
  const space = cut.lastIndexOf(" ");
  return `${(space > 6 ? cut.slice(0, space) : cut).trim()}`;
}

export function confirmedFeaturesFromTitle(title: string) {
  const value = title.toUpperCase();
  const hints: string[] = [];
  if (/\b(HDMI|HDTV|4K)\b/.test(value)) hints.push("TRANSMISIÓN HD");
  if (/\b(TIPO\s*C|TYPE-?C|USB-?C)\b/.test(value)) hints.push("CARGA + CONEXIÓN");
  if (/\b3\s*EN\s*1\b/.test(value)) hints.push("3 EN 1");
  if (/\bBLUETOOTH\b/.test(value)) hints.push("BLUETOOTH");
  if (/INAL[AÁ]MB/.test(value)) hints.push("INALÁMBRICO");
  if (/\b(MOUSE|RAT[OÓ]N)\b/.test(value)) hints.push("ÓPTICO");
  if (/\b(PARLANTE|SPEAKER|T&G|JBL)\b/.test(value)) hints.push("SONIDO");
  return hints.slice(0, 4);
}
