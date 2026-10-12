import { formatPrice } from "@/data/products";
import { BANNED_HOOKS } from "@/lib/store-redes/copy-prompt";
import type { SocialProductSnap } from "@/lib/store-redes/types";

type Kind = "charger" | "case" | "cable" | "glass" | "audio" | "power" | "generic";

type Pack = {
  hooks: string[];
  features: string[];
  ctas: string[];
};

const PACKS: Record<Kind, Pack> = {
  charger: {
    hooks: ["🚀 Olvidate de quedarte sin batería", "⚡ Tu celu vuelve a 100 al toque"],
    features: [
      "⚡ Carga rápida para el día a día",
      "🔌 Encaje firme, sin aflojar",
      "🛡️ Cuidás el puerto de carga",
      "✨ Listo para usar apenas lo retires",
    ],
    ctas: ["¡Vení a buscar el tuyo a Calle 9!", "¡Pedilo por WhatsApp antes de que vuele!"],
  },
  case: {
    hooks: ["🔥 Protegé tu equipo con estilo", "✨ Brillo y defensa para tu celu"],
    features: [
      "🛡️ Absorbe golpes del día a día",
      "✨ Deja ver el diseño del equipo",
      "👌 Agarre cómodo, menos resbalones",
      "🎯 Calce preciso en botones y cámara",
    ],
    ctas: ["¡Pasá por el local y probalo!", "¡Reservalo por WhatsApp ahora!"],
  },
  cable: {
    hooks: ["✨ ¡Llegó lo que tu celu necesitaba!", "🔌 Adiós al cable que falla"],
    features: [
      "⚡ Transferencia estable y rápida",
      "🪢 Más resistente a los tirones",
      "🔌 Conector que no se afloja",
      "🎒 Ideal para mochila y escritorio",
    ],
    ctas: ["¡Vení a buscar el tuyo!", "¡Pedilo antes de que vuele!"],
  },
  glass: {
    hooks: ["🛡️ Tu pantalla se merece backup", "✨ Brillo nítido, menos sustos"],
    features: [
      "🛡️ Cubre de rayones y golpes leves",
      "✨ Mantiene el tacto original",
      "📷 No tapa el sensor ni la cámara",
      "🛠️ Te lo colocamos en el local",
    ],
    ctas: ["¡Traé el celu y lo dejamos listo!", "¡Anotate por WhatsApp y pasá!"],
  },
  audio: {
    hooks: ["🎧 El upgrade que se escucha", "🔥 Música y llamadas sin enredos"],
    features: [
      "🎧 Sonido nítido para calle y oficina",
      "🔋 Acompañan toda la jornada",
      "🤙 Manos libres cómodos",
      "🎒 Compactos para llevar",
    ],
    ctas: ["¡Probálos en Calle 9!", "¡Pedilos por WhatsApp!"],
  },
  power: {
    hooks: ["🔋 Energía extra cuando sale el plan", "🚀 Olvidate de cazar un enchufe"],
    features: [
      "🔋 Recarga de emergencia",
      "⚡ Salida estable para el celu",
      "🎒 Tamaño para llevar",
      "🔌 Ideal para viajes y laburo",
    ],
    ctas: ["¡Llevate el tuyo hoy!", "¡Reservalo por WhatsApp!"],
  },
  generic: {
    hooks: ["✨ Un extra que tu celu agradece", "🔥 Tecnología que te acompaña"],
    features: [
      "🛠️ Útil en el día a día",
      "✨ Terminación prolija",
      "🛡️ Pensado para cuidar el equipo",
      "📍 Stock en General Pico",
    ],
    ctas: ["¡Vení a buscar el tuyo a Calle 9!", "¡Escribinos y te lo separamos!"],
  },
};

export function draftLocalInstagramCopy(product: SocialProductSnap) {
  const kind = inferKind(product);
  const pack = PACKS[kind];
  const seed = Math.abs(hash(product.id + kind + String(product.price)));
  const hook = pack.hooks[seed % pack.hooks.length];
  const cta = pack.ctas[seed % pack.ctas.length];
  const features = pack.features.slice(0, 4);
  const price = formatPrice(product.price);
  const caption = [hook, "", ...features, "", `${cta} ${price} en Movil Zone.`].join("\n");
  const hashtags = [
    "#MovilZone",
    "#GeneralPico",
    "#LaPampa",
    "#Celulares",
    "#Accesorios",
    hashtag(product.category || kind),
  ].filter((tag, index, all) => all.indexOf(tag) === index);

  return {
    headline: hook,
    caption,
    hashtags,
    features,
    provider: "local" as const,
  };
}

export function inferKind(product: SocialProductSnap): Kind {
  const t = `${product.title} ${product.category} ${product.categoryId} ${product.subcategoryId} ${product.brand}`.toLowerCase();
  if (/power.?bank|bater[ií]a port|cargador port/.test(t)) return "power";
  if (/cargador|charger|20w|25w|gan|wall charger/.test(t)) return "charger";
  if (/funda|carcasa|case|cover|silicona/.test(t)) return "case";
  if (/cable|usb.?c|lightning|tipo c/.test(t)) return "cable";
  if (/vidrio|hidrogel|temple|protector|pantalla|c[aá]mara/.test(t)) return "glass";
  if (/auricular|earbud|bluetooth|jbl|airpod|headset/.test(t)) return "audio";
  return "generic";
}

export function looksLikeBannedOrTitleDump(headline: string, productTitle: string) {
  const h = headline.trim().toLowerCase();
  if (BANNED_HOOKS.some((item) => h.includes(item))) return true;
  const title = productTitle.trim().toLowerCase();
  if (title.length > 4 && (h === title || h.endsWith(`: ${title}`) || h.includes(`: ${title}`))) return true;
  return false;
}

function hashtag(value: string) {
  const compact = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, "");
  return `#${compact || "MovilZone"}`;
}

function hash(value: string) {
  let total = 0;
  for (let i = 0; i < value.length; i += 1) total = (total * 31 + value.charCodeAt(i)) | 0;
  return total;
}
