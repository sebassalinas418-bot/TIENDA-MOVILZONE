"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * CMS simulado de la tienda. Vive solo en el navegador.
 * No lee ni escribe la base "sebfix".
 */
export type InfoPage = {
  slug: string;
  title: string;
  summary: string;
  paragraphs: string[];
};

export type StoreValue = {
  title: string;
  description: string;
};

export type TimeRange = {
  start: string;
  end: string;
};

export type OpeningDay = {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  ranges: TimeRange[];
};

export type CategoryOrigin = "taller" | "store";

export type CatalogSubcategory = {
  id: string;
  name: string;
  image?: string;
  origin?: CategoryOrigin;
};

export type CatalogCategory = {
  id: string;
  name: string;
  image: string;
  origin?: CategoryOrigin;
  children: CatalogSubcategory[];
};

export type StoreConfig = {
  storeName: string;
  tagline: string;
  about: {
    title: string;
    subtitle: string;
    paragraphs: string[];
  };
  values: StoreValue[];
  location: {
    title: string;
    detail: string;
  };
  phone: string;
  whatsapp: string;
  instagram: string;
  hours: string[];
  openingHours: OpeningDay[];
  categories: CatalogCategory[];
  infoPages: InfoPage[];
};

export const defaultStoreConfig: StoreConfig = {
  storeName: "Movil zone",
  tagline: "Celulares, accesorios y servicio técnico.",
  about: {
    title: "Sobre nosotros",
    subtitle:
      "Somos Movil zone, tu tienda de celulares, accesorios e informática en General Pico, La Pampa.",
    paragraphs: [
      "En Movil zone ofrecemos celulares, accesorios y servicio técnico con la atención cercana de un local y la comodidad de mirar el catálogo online. El objetivo es que consigas lo que buscás con asesoramiento real.",
      "Podés elegir en la web y retirar en el local, o coordinar un envío por cadete en la zona. Si tenés dudas, escribinos por WhatsApp y te ayudamos a elegir.",
    ],
  },
  values: [
    {
      title: "Productos con garantía",
      description: "Trabajamos con productos con garantía en todo lo que vendemos.",
    },
    {
      title: "Atención personalizada",
      description: "Te asesoramos por WhatsApp o en el local para que elijas lo que necesitás.",
    },
    {
      title: "Local físico",
      description: "Estamos en calle 9 n.º 421, casi esquina 10. Pasá a ver y probar los productos.",
    },
  ],
  location: {
    title: "Calle 9 n.º 421, casi esquina 10",
    detail: "General Pico, La Pampa",
  },
  phone: "+54 9 2302 57-3969",
  whatsapp: "5492302573969",
  instagram: "movilzone.gp",
  hours: [
    "Lunes: 16:30 a 21:00",
    "Martes a Viernes: 09:00 a 13:00 y 16:30 a 20:30",
    "Sábado: 09:00 a 13:00 y 16:30 a 20:30",
    "Domingo: cerrado",
  ],
  openingHours: [
    { day: 0, ranges: [] },
    { day: 1, ranges: [{ start: "16:30", end: "21:00" }] },
    {
      day: 2,
      ranges: [
        { start: "09:00", end: "13:00" },
        { start: "16:30", end: "20:30" },
      ],
    },
    {
      day: 3,
      ranges: [
        { start: "09:00", end: "13:00" },
        { start: "16:30", end: "20:30" },
      ],
    },
    {
      day: 4,
      ranges: [
        { start: "09:00", end: "13:00" },
        { start: "16:30", end: "20:30" },
      ],
    },
    {
      day: 5,
      ranges: [
        { start: "09:00", end: "13:00" },
        { start: "16:30", end: "20:30" },
      ],
    },
    {
      day: 6,
      ranges: [
        { start: "09:00", end: "13:00" },
        { start: "16:30", end: "20:30" },
      ],
    },
  ],
  categories: [
    {
      id: "fundas",
      name: "Fundas y Carcasas",
      image: "/categories/fundas.jpg",
      origin: "store",
      children: [
        { id: "silicona", name: "Silicona", origin: "store" },
        { id: "rigidas", name: "Rígidas", origin: "store" },
        { id: "disenos", name: "Diseños", origin: "store" },
        { id: "magsafe", name: "MagSafe", origin: "store" },
      ],
    },
    {
      id: "cargadores",
      name: "Cargadores y Cables",
      image: "/categories/cables.jpg",
      origin: "store",
      children: [
        { id: "cables", name: "Cables", origin: "store" },
        { id: "cargadores-rapidos", name: "Cargadores", origin: "store" },
      ],
    },
    {
      id: "auriculares",
      name: "Auriculares",
      image: "/categories/audio.jpg",
      origin: "store",
      children: [{ id: "inalambricos", name: "Inalámbricos", origin: "store" }],
    },
    {
      id: "protectores",
      name: "Protectores de Pantalla",
      image: "/categories/protectores.jpg",
      origin: "store",
      children: [{ id: "vidrios", name: "Vidrios templados", origin: "store" }],
    },
    {
      id: "soportes",
      name: "Soportes y Trípodes",
      image: "/categories/accesorios.jpg",
      origin: "store",
      children: [{ id: "soportes-auto", name: "Para el auto", origin: "store" }],
    },
    {
      id: "accesorios",
      name: "Accesorios",
      image: "/categories/cargadores.jpg",
      origin: "store",
      children: [{ id: "energia", name: "Energía", origin: "store" }],
    },
  ],
  infoPages: [
    {
      slug: "envios",
      title: "Envíos y entregas",
      summary: "Retiro en el local o envío por cadete en la zona.",
      paragraphs: [
        "Podés retirar tu pedido sin cargo en el local. Si preferís recibirlo, coordinamos un cadete dentro de General Pico.",
        "El plazo y el costo del envío se confirman por WhatsApp antes de cerrar la compra.",
      ],
    },
    {
      slug: "cambios",
      title: "Cambios y devoluciones",
      summary: "Cambios con el producto en el mismo estado y con su garantía.",
      paragraphs: [
        "Si el producto tiene una falla cubierta por la garantía, lo revisamos en el local y gestionamos el cambio.",
        "Traé el comprobante y el accesorio completo. El plazo y las condiciones se confirman al momento de la compra.",
      ],
    },
    {
      slug: "contacto",
      title: "Contacto",
      summary: "Escribinos o pasá por el local.",
      paragraphs: [
        "La forma más directa es WhatsApp. También podés visitarnos en el horario de atención.",
      ],
    },
    {
      slug: "preguntas",
      title: "Preguntas frecuentes",
      summary: "Respuestas cortas sobre compra, retiro y stock.",
      paragraphs: [
        "El stock del catálogo es de muestra. Antes de comprar, confirmamos disponibilidad por WhatsApp.",
        "El precio destacado es el de pago por transferencia. En el local te indicamos el resto de los medios.",
      ],
    },
    {
      slug: "terminos",
      title: "Términos y Condiciones",
      summary: "Condiciones de compra, retiro y garantía en Movil zone.",
      paragraphs: [
        "Los precios destacados corresponden al pago por transferencia. El resto de los medios se confirma en el local o por WhatsApp.",
        "El stock publicado es de muestra. La compra queda sujeta a disponibilidad y se confirma cuando el local aprueba el pedido.",
        "La garantía se gestiona en el local con el producto y el comprobante. Envíos por cadete y retiros se coordinan antes de cerrar la compra.",
      ],
    },
  ],
};

const STORAGE_KEY = "movilzone.store-config";
const CONFIG_REVISION = 2;

type StoreConfigContextValue = {
  config: StoreConfig;
  updateConfig: (partial: Partial<StoreConfig>) => void;
};

const StoreConfigContext = createContext<StoreConfigContextValue | null>(null);

export function StoreConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StoreConfig>(defaultStoreConfig);

  useEffect(() => {
    function applySaved(raw: string | null) {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as Partial<StoreConfig> & { revision?: number };
        if (saved.revision !== CONFIG_REVISION) {
          window.localStorage.removeItem(STORAGE_KEY);
          return;
        }
        setConfig({ ...defaultStoreConfig, ...saved });
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    applySaved(window.localStorage.getItem(STORAGE_KEY));

    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) applySaved(event.newValue);
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateConfig = useCallback((partial: Partial<StoreConfig>) => {
    setConfig((current) => {
      const next = { ...current, ...partial };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, revision: CONFIG_REVISION }));
      } catch {
        /* cuota llena */
      }
      return next;
    });
  }, []);

  return (
    <StoreConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </StoreConfigContext.Provider>
  );
}

const weekdayIndex: Record<string, OpeningDay["day"]> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function rangesKey(ranges: TimeRange[]) {
  return ranges.map((range) => `${range.start}-${range.end}`).join("|");
}

function rangesLabel(ranges: TimeRange[]) {
  if (ranges.length === 0) return "cerrado";
  return ranges.map((range) => `${range.start} a ${range.end}`).join(" y ");
}

function spanLabel(start: number, end: number) {
  if (start === end) return dayNames[start];
  return `${dayNames[start]} a ${dayNames[end]}`;
}

export function formatPublicHours(openingHours: OpeningDay[]) {
  const byDay = new Map(openingHours.map((day) => [day.day, day.ranges]));
  const rangesOf = (day: number) => byDay.get(day as OpeningDay["day"]) ?? [];
  const lines: string[] = [];

  let start = 1;
  while (start <= 5) {
    const key = rangesKey(rangesOf(start));
    let end = start;
    while (end < 5 && rangesKey(rangesOf(end + 1)) === key) end += 1;
    lines.push(`${spanLabel(start, end)}: ${rangesLabel(rangesOf(start))}`);
    start = end + 1;
  }

  lines.push(`Sábado: ${rangesLabel(rangesOf(6))}`);
  lines.push(`Domingo: ${rangesLabel(rangesOf(0))}`);
  return lines;
}

export function getStoreStatus(openingHours: OpeningDay[], date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const day = weekdayIndex[weekday] ?? 0;
  const now = hour * 60 + minute;
  const ranges = openingHours.find((item) => item.day === day)?.ranges ?? [];
  const current = ranges.find((range) => now >= toMinutes(range.start) && now < toMinutes(range.end));
  return {
    open: Boolean(current),
    until: current?.end ?? null,
  };
}

export function useStoreConfig() {
  const context = useContext(StoreConfigContext);
  if (!context) {
    throw new Error("useStoreConfig debe usarse dentro de StoreConfigProvider");
  }
  return context;
}
