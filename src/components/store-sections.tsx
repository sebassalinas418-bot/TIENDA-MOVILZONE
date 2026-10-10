"use client";

import Link from "next/link";
import { formatPublicHours, useStoreConfig } from "@/config/store-config";
import { useAdminAccess } from "@/lib/admin-access";

type CategoryBoardProps = {
  active: string;
  onSelect: (category: string) => void;
};

export function CategoryBoard({ active, onSelect }: CategoryBoardProps) {
  const { config } = useStoreConfig();
  return (
    <section id="tienda" className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Comprá por categoría</h2>
        <button
          type="button"
          onClick={() => onSelect("Todo")}
          className="text-sm font-medium text-sky-500 hover:text-sky-600"
        >
          Ver todas
        </button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {config.categories.map((item) => {
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(selected ? "Todo" : item.id)}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-200 ${
                selected
                  ? "border-sky-500 bg-sky-50"
                  : "border-gray-200 bg-white hover:border-sky-400 hover:bg-sky-50 hover:shadow-md"
              }`}
            >
              <img
                src={item.image}
                alt=""
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
              />
              <span className="text-sm font-medium text-gray-900">{item.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const infoLinks = [
  { label: "Sobre nosotros", href: "/sobre-nosotros" },
  { label: "Preguntas frecuentes", href: "/informacion/preguntas" },
  { label: "Términos y Condiciones", href: "/informacion/terminos" },
  { label: "Contacto", href: "/informacion/contacto" },
  { label: "Administración", href: "/admin" },
];

const menuLinks = [
  { label: "Inicio", href: "/" },
  { label: "Tienda", href: "/tienda" },
  { label: "Promociones", href: "/tienda?vista=ofertas" },
  { label: "Mi cuenta", href: "/login" },
];

const benefits = [
  { label: "Envíos a todo el local / zona", icon: "truck" },
  { label: "Compra segura", icon: "shield" },
  { label: "Garantía ágil", icon: "bolt" },
  { label: "Despachos en el día", icon: "rocket" },
] as const;

export function SiteFooter() {
  const { config } = useStoreConfig();
  const { isAdmin } = useAdminAccess();
  const hours = formatPublicHours(config.openingHours);

  return (
    <footer className="mt-16">
      <div className="bg-sky-500 text-white">
        <ul className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 sm:px-6 lg:grid-cols-4">
          {benefits.map((item) => (
            <li key={item.label} className="flex items-center justify-center gap-2.5 text-center">
              <BenefitIcon name={item.icon} />
              <span className="text-[11px] font-bold tracking-wide uppercase sm:text-xs">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-neutral-950 text-white">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <Link href="/" aria-label="Movil zone, ir al inicio" className="inline-flex">
              <img src="/brand/logo-lockup.png" alt="" className="h-16 w-auto" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
              Celulares, accesorios y servicio técnico en General Pico.
            </p>
            <p className="mt-5 text-sm font-medium text-white/80">Seguinos en</p>
            <div className="mt-3 flex gap-2">
              <a
                href={`https://instagram.com/${config.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-950 transition-transform hover:-translate-y-0.5"
                aria-label={`Instagram @${config.instagram}`}
              >
                <InstagramMark />
              </a>
              <a
                href={`https://wa.me/${config.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white transition-transform hover:-translate-y-0.5"
                aria-label="WhatsApp"
              >
                <WhatsAppMark />
              </a>
            </div>
          </div>

          <FooterColumn
            title="Info importante"
            links={infoLinks.filter((link) => link.href !== "/admin" || isAdmin)}
          />
          <FooterColumn title="Menú" links={menuLinks} />

          <div>
            <h3 className="text-sm font-semibold text-white">Contacto</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-white/70">
              <li className="flex gap-3">
                <PinIcon />
                <span>
                  {config.location.title}
                  <br />
                  {config.location.detail}
                </span>
              </li>
              <li className="flex gap-3">
                <ChatIcon />
                <a
                  href={`https://wa.me/${config.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-sky-300"
                >
                  WhatsApp {config.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <ClockIcon />
                <ul className="space-y-2">
                  {hours.map((line) => (
                    <HourLine key={line} line={line} />
                  ))}
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-sky-500 px-4 py-3 text-center text-xs font-semibold tracking-wide text-white sm:text-sm">
        Movil Zone © 2026 - Todos los derechos reservados.
      </div>
    </footer>
  );
}

function HourLine({ line }: { line: string }) {
  const split = line.indexOf(": ");
  const day = split === -1 ? line : line.slice(0, split);
  const rest = split === -1 ? "" : line.slice(split + 2);
  const shifts = rest.split(" y ").filter(Boolean);

  return (
    <li>
      <span className="font-medium text-white/90">{day}</span>
      {shifts.map((shift) => (
        <span key={shift} className="block">
          {shift}
        </span>
      ))}
    </li>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-sky-300">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BenefitIcon({ name }: { name: (typeof benefits)[number]["icon"] }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-5 w-5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    "aria-hidden": true as const,
  };
  if (name === "truck") {
    return (
      <svg {...common}>
        <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7" strokeLinejoin="round" />
        <circle cx="7" cy="17.5" r="1.5" />
        <circle cx="17" cy="17.5" r="1.5" />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3.5 19 6.5v5.2c0 4-2.8 6.8-7 8.3-4.2-1.5-7-4.3-7-8.3V6.5z" strokeLinejoin="round" />
        <path d="m8.8 12 2.1 2.1 4.3-4.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "bolt") {
    return (
      <svg {...common}>
        <path d="M13 3 6 13h5l-1 8 7-10h-5z" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3c2.2 2.4 3.5 5.2 3.5 8.2 0 1.2-.8 2-1.6 2.4L12 19l-1.9-5.4c-.8-.4-1.6-1.2-1.6-2.4C8.5 8.2 9.8 5.4 12 3z" strokeLinejoin="round" />
      <path d="M9.2 12.2 6.5 13.5 8 10.2M14.8 12.2 17.5 13.5 16 10.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M6 18.5 4 21V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H8z" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-1 h-4 w-4 shrink-0 text-sky-400" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 8.5V12l2.5 2" strokeLinecap="round" />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.9c-.24.68-1.4 1.25-1.93 1.33-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.7-4.1-4.84-4.29-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07 1-2.35.24-.26.64-.38.85-.38.21 0 .42 0 .6.01.19.01.45-.07.7.53.26.64.88 2.2.96 2.36.08.16.13.35.03.56-.1.21-.15.34-.3.52-.15.18-.31.4-.44.54-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.49.22.56.34.07.13.07.73-.17 1.41z" />
    </svg>
  );
}
