"use client";

import { useStoreConfig } from "@/config/store-config";

const services = [
  {
    title: "Cambios de pantallas en el día",
    detail: "Reemplazo de pantalla con tiempos de entrega rápidos. En muchos modelos queda lista el mismo día.",
    badge: "Entrega rápida",
  },
  {
    title: "Diagnósticos de placa",
    detail: "Revisión profesional de la placa cuando el equipo no enciende, se apaga o no carga.",
    badge: "Taller",
  },
];

export function RepairView() {
  const { config } = useStoreConfig();
  const message = "Hola, quiero consultar por una reparación en el servicio técnico de Movil zone.";
  const whatsappHref = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`;

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <section className="overflow-hidden rounded-2xl bg-gray-950 text-white shadow-sm">
        <div className="px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-semibold tracking-[0.16em] text-sky-400 uppercase">Taller del local</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight">Servicio técnico</h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white">
            Reparamos en {config.location.title}, {config.location.detail}. Contanos el modelo y el
            problema y te confirmamos el plazo antes de empezar.
          </p>

          <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {services.map((service) => (
              <li key={service.title} className="rounded-2xl bg-white px-5 py-6 text-gray-900">
                <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
                  {service.badge}
                </span>
                <h2 className="mt-4 text-lg font-bold tracking-tight">{service.title}</h2>
                <p className="mt-2 text-base font-medium leading-6 text-neutral-800">{service.detail}</p>
              </li>
            ))}
          </ul>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-sky-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
              <WhatsAppIcon />
            </span>
            Consultar por WhatsApp
          </a>
        </div>
      </section>
    </article>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        fill="#25D366"
        d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.9c-.24.68-1.4 1.25-1.93 1.33-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.7-4.1-4.84-4.29-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07 1-2.35.24-.26.64-.38.85-.38.21 0 .42 0 .6.01.19.01.45-.07.7.53.26.64.88 2.2.96 2.36.08.16.13.35.03.56-.1.21-.15.34-.3.52-.15.18-.31.4-.44.54-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.49.22.56.34.07.13.07.73-.17 1.41z"
      />
    </svg>
  );
}
