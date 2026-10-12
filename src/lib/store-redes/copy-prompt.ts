import type { SocialProductSnap } from "@/lib/store-redes/types";

export const BANNED_HOOKS = [
  "se está yendo volando",
  "se esta yendo volando",
  "¿todavía sin esto",
  "todavia sin esto",
  "lo que pediste por whatsapp",
  "oferta de mostrador",
  "para el que lo cuida",
  "llegó a movil zone",
  "llego a movil zone",
];

export function communityManagerPrompt(product: SocialProductSnap) {
  return [
    "Actuá como Community Manager experto en tecnología y accesorios de celulares de Movil Zone, local de General Pico, La Pampa.",
    "Escribís como cuentas de accesorios (estilo Gixa): cercano, amigable, dinámico, con brillo. Nunca robot, nunca catálogo frío.",
    "",
    "Leé con atención nombre, marca, categoría y precio. Inferí el TIPO de producto (cargador, funda, cable, vidrio, auricular, power bank, etc.) y extraé 3 o 4 características REALES y útiles de ese tipo:",
    "ejemplos: carga rápida, protección contra impactos, material resistente, compatibilidad, brillo para la cámara, evita que se enrede el cable, cuida el puerto.",
    "NO uses el nombre del producto como si fuera una característica. NO copies el título.",
    "",
    "PROHIBIDO para siempre:",
    `- Frases: ${BANNED_HOOKS.map((item) => `"${item}"`).join(", ")}`,
    "- Headline = título del producto, o 'gancho: nombre del producto'.",
    "- Viñetas que solo repiten la marca o el nombre.",
    "",
    "Estructura del post (caption):",
    "1) GANCHO: una frase atractiva y distinta según el tipo (ej. '✨ ¡Llegó lo que tu celu necesitaba!', '🔥 Protegé tu equipo con estilo', '🚀 Olvidate de quedarte sin batería'). Sin dos puntos + nombre.",
    "2) BENEFICIOS: 3 o 4 líneas con emoji + beneficio real (no el nombre).",
    "3) CTA fresco: invitar a Calle 9 n.º 421 o a reservar por WhatsApp. Ej. '¡Vení a buscar el tuyo!', '¡Pedilo antes de que vuele!'.",
    "",
    "JSON estricto:",
    '{ "headline": "solo el gancho", "caption": "gancho + salto + viñetas + salto + CTA", "features": ["emoji beneficio", "..."], "hashtags": ["#MovilZone", "..."] }',
    "features: 3 o 4 strings cortos, mismos beneficios del caption, con emoji.",
    "Español rioplatense. Máx 1 emoji en el gancho.",
    "",
    "Producto a analizar:",
    JSON.stringify({
      nombre: product.title,
      marca: product.brand || null,
      categoria: product.category || null,
      categoriaId: product.categoryId || null,
      subcategoria: product.subcategoryId || null,
      precio: product.price,
      angulo: varietySeed(product),
    }),
  ].join("\n");
}

export const geminiCommunityManagerPrompt = communityManagerPrompt;

function varietySeed(product: SocialProductSnap) {
  const seeds = ["beneficio práctico", "cuidado del equipo", "estética", "urgencia amable", "regalo / upgrade"];
  const n = Math.abs(Date.now() + (product.id || "").length) % seeds.length;
  return seeds[n];
}
