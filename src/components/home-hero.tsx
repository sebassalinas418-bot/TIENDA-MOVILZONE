"use client";

import { useEffect, useState } from "react";
import { formatPublicHours, getStoreStatus, useStoreConfig, type StoreConfig } from "@/config/store-config";

type HomeHeroProps = {
  onViewProducts: () => void;
};

type StorySlide = {
  id: "ofertas" | "reparacion";
  kicker: string;
  title: string;
  text: string;
  image: string;
  imageAlt: string;
  tone: "sky" | "dark";
  action: "products" | "whatsapp";
};

type HeroSlide = { id: "destacados" } | { id: "instagram" } | { id: "ubicacion" } | { id: "horarios" } | StorySlide;

const slides: HeroSlide[] = [
  { id: "destacados" },
  {
    id: "ofertas",
    kicker: "Ofertas",
    title: "Precios de muestra en accesorios.",
    text: "Cargadores, audio y soportes con el precio destacado por transferencia.",
    image: "/banners/accesorios-cargadores.jpg",
    imageAlt: "Accesorios y cargadores de muestra",
    tone: "dark" as const,
    action: "products" as const,
  },
  {
    id: "reparacion",
    kicker: "Servicio técnico",
    title: "Reparamos tu celular en el local.",
    text: "Cambios de pantalla en el día y diagnósticos de placa.",
    image: "/categories/protectores.jpg",
    imageAlt: "Taller de reparación de muestra",
    tone: "dark" as const,
    action: "whatsapp" as const,
  },
  { id: "ubicacion" },
  { id: "horarios" },
  { id: "instagram" },
];

const AUTO_PLAY_MS = 5500;

export function HomeHero({ onViewProducts }: HomeHeroProps) {
  const { config } = useStoreConfig();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = slides[index];
  const whatsappHref = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Hola, quiero consultar por una reparación en el servicio técnico de Movil zone.")}`;

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AUTO_PLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, index]);

  function step(direction: -1 | 1) {
    setIndex((current) => (current + direction + slides.length) % slides.length);
  }

  return (
    <section id="ofertas" className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) return;
          setPaused(false);
        }}
      >
        <div key={slide.id} className="overflow-hidden rounded-3xl shadow-sm" style={{ animation: "banner-fade 300ms ease" }}>
          {slide.id === "destacados" ? (
            <FundasBanner onOrder={onViewProducts} />
          ) : slide.id === "instagram" ? (
            <InstagramBanner handle={config.instagram} />
          ) : slide.id === "ubicacion" ? (
            <LocationBanner
              addressTitle={config.location.title}
              addressDetail={config.location.detail}
              phone={config.phone}
              whatsapp={config.whatsapp}
            />
          ) : slide.id === "horarios" ? (
            <HoursBanner addressTitle={config.location.title} phone={config.phone} whatsapp={config.whatsapp} />
          ) : (
            <div className={`relative overflow-hidden ${"tone" in slide && slide.tone === "sky" ? "bg-gradient-to-br from-sky-400 via-sky-500 to-sky-700 text-white" : "bg-gray-950 text-white"}`}>
              <BannerBackdrop src={slide.image} tone="dark" />
              <div className="relative z-10 grid items-center gap-6 px-6 py-8 sm:px-16 sm:py-12 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-sky-200 uppercase">{slide.kicker}</p>
                  <h1 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-5xl">{slide.title}</h1>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-white/90 sm:text-base">{slide.text}</p>
                  {slide.action === "whatsapp" ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-sky-400"
                    >
                      <WhatsAppMark />
                      Consultar por WhatsApp
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={onViewProducts}
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      Ver productos
                      <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
                <div className="relative mx-auto flex h-52 w-full max-w-sm items-center justify-center sm:h-64">
                  <div className="absolute inset-6 rotate-12 rounded-3xl bg-white/15" />
                  <img
                    src={slide.image}
                    alt={slide.imageAlt}
                    className="relative h-44 w-44 rounded-2xl object-cover shadow-lg sm:h-52 sm:w-52"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Banner anterior"
          className="absolute top-1/2 left-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-900 bg-white text-gray-900 shadow-md transition-transform duration-200 hover:-translate-y-[55%]"
        >
          <ArrowIcon direction="left" />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Banner siguiente"
          className="absolute top-1/2 right-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-900 bg-white text-gray-900 shadow-md transition-transform duration-200 hover:-translate-y-[55%]"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>
    </section>
  );
}

function BannerBackdrop({ src, tone }: { src: string; tone: "light" | "dark" | "vivid" }) {
  const veil =
    tone === "light"
      ? "bg-gradient-to-r from-white/50 via-white/88 to-white/50"
      : tone === "dark"
        ? "bg-gradient-to-r from-gray-950/45 via-gray-950/82 to-gray-950/45"
        : "bg-gradient-to-r from-violet-700/25 via-fuchsia-600/15 to-orange-400/25";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <img
        src={src}
        alt=""
        className="absolute inset-y-0 left-0 w-1/2 scale-110 object-cover opacity-20 blur-xl transition-opacity duration-500"
      />
      <img
        src={src}
        alt=""
        className="absolute inset-y-0 right-0 w-1/2 scale-110 object-cover opacity-20 blur-xl transition-opacity duration-500"
      />
      <div className={`absolute inset-0 ${veil}`} />
    </div>
  );
}

function FundasBanner({ onOrder }: { onOrder: () => void }) {
  return (
    <div className="relative overflow-hidden bg-white px-4 py-6 text-gray-900 sm:px-8 sm:py-8">
      <BannerBackdrop src="/banners/fundas-colores.jpg" tone="light" />
      <div className="relative z-10 grid items-center gap-4 lg:grid-cols-[0.9fr_1.1fr_0.9fr]">
        <img
          src="/banners/funda-celeste.jpg"
          alt="Funda celeste de muestra"
          className="mx-auto h-44 w-36 rounded-2xl object-cover shadow-md sm:h-56 sm:w-44"
        />
        <div className="text-center">
          <h1 className="text-4xl leading-none font-black tracking-tight sm:text-5xl">
            FUNDAS
            <span className="mt-1 block">PARA CELULAR</span>
          </h1>
          <p className="mx-auto mt-3 inline-flex border border-gray-900 px-3 py-1 text-sm font-bold tracking-[0.18em]">
            VARIOS MODELOS
          </p>
          <div className="mx-auto mt-4 w-full max-w-[220px] rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white">
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M3.5 6 8 10.5 12.5 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="mt-2 text-sm font-black tracking-wide">HACÉ TU PEDIDO</p>
            <button
              type="button"
              onClick={onOrder}
              className="mt-3 inline-flex rounded-full bg-sky-500 px-5 py-1.5 text-sm font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-sky-400"
            >
              Aquí
            </button>
          </div>
        </div>
        <img
          src="/banners/fundas-colores.jpg"
          alt="Fundas de varios colores"
          className="mx-auto h-44 w-full max-w-xs rounded-2xl object-cover shadow-md sm:h-56"
        />
      </div>
    </div>
  );
}

function splitAddress(title: string) {
  const [street, ...rest] = title.split(",");
  return { street: street.trim(), extra: rest.join(",").trim() };
}

function plaquePhone(phone: string) {
  const local = phone.replace(/^\+?\s*54\s*9?\s*/i, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
  return local || phone;
}

function LocationBanner({
  addressTitle,
  addressDetail,
  phone,
  whatsapp,
}: {
  addressTitle: string;
  addressDetail: string;
  phone: string;
  whatsapp: string;
}) {
  const { street, extra } = splitAddress(addressTitle);
  const phoneLabel = plaquePhone(phone);
  const href = `https://wa.me/${whatsapp}`;

  return (
    <div className="relative overflow-hidden bg-black">
      <BannerBackdrop src="/banners/placa-ubicacion.jpg" tone="dark" />
      <div className="relative z-10 mx-auto w-full max-w-[540px]">
        <img src="/banners/placa-ubicacion.jpg" alt="Podés encontrarnos en el local de Movil zone" className="block h-auto w-full" />
        <div className="absolute top-[56%] right-[4%] left-[20%] rounded-full border-2 border-[#00e5ff] bg-black px-4 py-2 text-center">
          <p className="text-lg leading-none font-black tracking-wide text-white uppercase sm:text-2xl">{street}</p>
          {extra ? <p className="mt-1 text-[11px] font-semibold tracking-wide text-white/75 uppercase sm:text-xs">{extra}</p> : null}
          <p className="mt-1 text-[10px] font-black tracking-[0.14em] text-[#00e5ff] sm:text-[11px]">TE ESPERAMOS EN NUESTRO LOCAL</p>
          <p className="mt-0.5 text-[10px] text-white/70 sm:text-[11px]">{addressDetail}</p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Escribir por WhatsApp al ${phoneLabel}`}
          className="absolute top-[89.2%] right-[4%] bottom-[4.2%] inline-flex items-center gap-2 rounded-full border-2 border-[#25D366] bg-black px-3 text-base leading-none font-black text-white transition-colors duration-200 hover:bg-[#25D366] hover:text-black sm:text-lg"
        >
          <WhatsAppMark className="h-5 w-5" fill="currentColor" />
          {phoneLabel}
        </a>
      </div>
    </div>
  );
}

function HoursBanner({
  addressTitle,
  phone,
  whatsapp,
}: {
  addressTitle: string;
  phone: string;
  whatsapp: string;
}) {
  const { street } = splitAddress(addressTitle);
  const phoneLabel = plaquePhone(phone);
  const href = `https://wa.me/${whatsapp}`;

  return (
    <div className="relative overflow-hidden bg-black">
      <BannerBackdrop src="/banners/placa-horarios.jpg" tone="dark" />
      <div className="relative z-10 mx-auto w-full max-w-[380px]">
        <img
          src="/banners/placa-horarios.jpg"
          alt="Horarios de atención de Movil zone, lunes a viernes de 9:00 a 13:00 y de 16:30 a 20:30"
          className="block h-auto w-full"
        />
        <div className="absolute inset-x-[4%] top-[88.2%] bottom-[2.6%] flex items-center justify-between gap-2 rounded-full border-2 border-[#00e5ff] bg-black px-3">
          <p className="min-w-0 truncate text-xs font-black tracking-wide text-white uppercase sm:text-sm">{street}</p>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Escribir por WhatsApp al ${phoneLabel}`}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs leading-none font-black text-white transition-colors duration-200 hover:text-[#25D366] sm:text-sm"
          >
            <WhatsAppMark className="h-4 w-4" fill="#25D366" />
            {phoneLabel}
          </a>
        </div>
      </div>
    </div>
  );
}

function InstagramBanner({ handle }: { handle: string }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 px-6 py-10 text-white sm:px-16 sm:py-14">
      <BannerBackdrop src="/banners/funda-celeste.jpg" tone="vivid" />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
          <InstagramMark />
        </span>
        <h1 className="mt-4 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">
          ¡Seguinos en Instagram para enterarte de todo!
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-white/90 sm:text-base">
          Novedades, reels y fundas recién llegadas en @{handle}.
        </p>
        <a
          href={`https://instagram.com/${handle}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-gray-900 transition-transform duration-200 hover:-translate-y-0.5"
        >
          Ver perfil
        </a>
      </div>
    </div>
  );
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.2" cy="6.8" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

const benefits = [
  {
    title: "Abierto ahora",
    detail: "Horario del local",
    icon: "clock",
  },
  {
    title: "Cadete a domicilio",
    detail: "Envíos en la zona",
    icon: "bike",
  },
  {
    title: "Retiro sin cargo",
    detail: "Pasá a buscarlo",
    icon: "store",
  },
  {
    title: "Pagá online",
    detail: "Transferencia",
    icon: "card",
  },
] as const;

type BenefitIconName = (typeof benefits)[number]["icon"];

function benefitTone(icon: BenefitIconName, known: boolean, open: boolean) {
  if (icon === "clock") {
    if (!known) {
      return {
        card: "border-sky-200 bg-gradient-to-br from-sky-50 to-white hover:border-sky-400 hover:shadow-sky-200/80",
        icon: "bg-neutral-800 text-white",
        dot: "bg-gray-400",
      };
    }
    if (open) {
      return {
        card: "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/80 hover:border-emerald-400 hover:shadow-emerald-200/80",
        icon: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/40",
        dot: "bg-emerald-400",
      };
    }
    return {
      card: "border-orange-300 bg-gradient-to-br from-orange-50 via-white to-rose-100/80 hover:border-orange-400 hover:shadow-orange-200/80",
      icon: "bg-orange-500 text-white shadow-sm shadow-orange-500/40",
      dot: "bg-rose-500",
    };
  }
  if (icon === "bike") {
    return {
      card: "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 hover:border-sky-400 hover:shadow-sky-200/80",
      icon: "bg-sky-500 text-white shadow-sm shadow-sky-500/40",
      dot: "",
    };
  }
  if (icon === "store") {
    return {
      card: "border-neutral-800/20 bg-gradient-to-br from-neutral-100 via-white to-sky-50 hover:border-sky-400 hover:shadow-sky-200/80",
      icon: "bg-neutral-950 text-sky-300 shadow-sm",
      dot: "",
    };
  }
  return {
    card: "border-sky-300 bg-gradient-to-br from-sky-100 via-white to-sky-50 hover:border-sky-500 hover:shadow-sky-300/80",
    icon: "bg-sky-600 text-white shadow-sm shadow-sky-600/40",
    dot: "",
  };
}

export function BenefitRow() {
  const { config } = useStoreConfig();
  const [status, setStatus] = useState<ReturnType<typeof getStoreStatus> | null>(null);
  const [active, setActive] = useState<BenefitIconName | null>(null);

  useEffect(() => {
    const tick = () => setStatus(getStoreStatus(config.openingHours));
    tick();
    const timer = window.setInterval(tick, 30000);
    return () => window.clearInterval(timer);
  }, [config.openingHours]);

  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const open = status?.open ?? false;
  const known = status !== null;

  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-2 px-3 pt-3 sm:grid-cols-2 sm:gap-3 sm:px-6 sm:pt-4 lg:grid-cols-4">
        {benefits.map((benefit) => {
          const isStatus = benefit.icon === "clock";
          const title = isStatus ? (known ? (open ? "Abierto ahora" : "Cerrado") : "Horario") : benefit.title;
          const detail = isStatus
            ? known
              ? open
                ? `Hasta ${status.until}`
                : "Fuera de horario"
              : "Consultando horario"
            : benefit.detail;
          const tone = benefitTone(benefit.icon, known, open);
          return (
            <button
              key={benefit.icon}
              type="button"
              onClick={() => setActive(benefit.icon)}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg ${tone.card}`}
            >
              <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.icon}`}>
                {isStatus ? (
                  <span className={`absolute top-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${tone.dot} ${known ? "animate-pulse" : ""}`} />
                ) : null}
                <BenefitIcon name={benefit.icon} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-neutral-950">{title}</span>
                <span className="block text-sm font-medium text-neutral-800">{detail}</span>
              </span>
            </button>
          );
        })}
      </section>
      {active ? <BenefitModal icon={active} config={config} onClose={() => setActive(null)} /> : null}
    </>
  );
}

function BenefitModal({
  icon,
  config,
  onClose,
}: {
  icon: BenefitIconName;
  config: StoreConfig;
  onClose: () => void;
}) {
  const copy = benefitCopy(icon, config);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="benefit-modal-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-sky-600 uppercase">{copy.kicker}</p>
            <h2 id="benefit-modal-title" className="mt-1 text-xl font-bold text-gray-900">
              {copy.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-gray-500 transition-colors hover:bg-sky-50 hover:text-sky-700"
          >
            ×
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-6 text-gray-600">{copy.body}</div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-black py-2.5 text-sm font-bold text-white transition-colors hover:bg-neutral-800"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function benefitCopy(icon: BenefitIconName, config: StoreConfig) {
  const address = config.location.title;
  const city = config.location.detail;
  if (icon === "clock") {
    return {
      kicker: "Horarios",
      title: "Pasá por el local",
      body: (
        <>
          <p>
            Te esperamos en <span className="font-semibold text-gray-900">{address}</span>, {city}.
          </p>
          <ul className="space-y-1 rounded-2xl bg-sky-50 px-4 py-3 text-gray-800">
            {formatPublicHours(config.openingHours).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p>Si querés, escribinos antes por WhatsApp y te confirmamos que estamos.</p>
        </>
      ),
    };
  }
  if (icon === "bike") {
    return {
      kicker: "Envíos",
      title: "Cadete a domicilio",
      body: (
        <>
          <p>Llevamos tu pedido con cadete dentro de la zona de {city}.</p>
          <p>Por WhatsApp nos pasás la dirección y te confirmamos si llegamos, el plazo y el costo antes de cerrar la compra.</p>
        </>
      ),
    };
  }
  if (icon === "store") {
    return {
      kicker: "Retiro",
      title: "Retiro sin cargo",
      body: (
        <>
          <p>Podés pasar a buscar tu pedido por el local, sin costo de envío.</p>
          <p>
            Te esperamos en <span className="font-semibold text-gray-900">{address}</span>, {city}. Cuando esté listo te avisamos por WhatsApp.
          </p>
        </>
      ),
    };
  }
  return {
    kicker: "Pagos",
    title: "Transferencia y efectivo",
    body: (
      <>
        <p>El precio que ves en cada producto es pagando por transferencia.</p>
        <p>También podés abonar en efectivo al retirar en el local. Si necesitás otro medio, consultanos por WhatsApp.</p>
      </>
    ),
  };
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path
        d={direction === "left" ? "M10 3.5 5.5 8 10 12.5" : "M6 3.5 10.5 8 6 12.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppMark({ className = "h-4 w-4", fill = "#ffffff" }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill={fill}
        d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.9c-.24.68-1.4 1.25-1.93 1.33-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.7-4.1-4.84-4.29-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07 1-2.35.24-.26.64-.38.85-.38.21 0 .42 0 .6.01.19.01.45-.07.7.53.26.64.88 2.2.96 2.36.08.16.13.35.03.56-.1.21-.15.34-.3.52-.15.18-.31.4-.44.54-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.49.22.56.34.07.13.07.73-.17 1.41z"
      />
    </svg>
  );
}

function BenefitIcon({ name }: { name: (typeof benefits)[number]["icon"] }) {
  const common = "h-4 w-4";
  if (name === "clock") {
    return (
      <svg viewBox="0 0 16 16" className={common} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="8" cy="8" r="5.2" />
        <path d="M8 5.2V8l2 1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "bike") {
    return (
      <svg viewBox="0 0 16 16" className={common} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="4" cy="11" r="2.2" />
        <circle cx="12" cy="11" r="2.2" />
        <path d="M4 11h3l2-4h3M7 7l2 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "store") {
    return (
      <svg viewBox="0 0 16 16" className={common} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M3 7.5 4.2 3.5h7.6L13 7.5" strokeLinejoin="round" />
        <path d="M3.5 7.5h9v5H3.5v-5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={common} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2.5" y="4" width="11" height="8" rx="1.5" />
      <path d="M2.5 7h11" />
    </svg>
  );
}
