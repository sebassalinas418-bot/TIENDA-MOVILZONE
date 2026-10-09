"use client";

import { useStoreConfig } from "@/config/store-config";

export function AboutView() {
  const { config } = useStoreConfig();
  const whatsappHref = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Hola, quiero consultar por un producto de Movil zone.")}`;

  return (
    <article>
      <header>
        <div className="mx-auto w-full max-w-3xl px-4 py-14 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-950">{config.about.title}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
            {config.about.subtitle}
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4 text-center text-sm leading-7 text-gray-600 sm:text-[15px]">
          {config.about.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {config.values.map((value, index) => (
            <li
              key={value.title}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-6 text-center shadow-sm"
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
                <ValueIcon index={index} />
              </span>
              <h2 className="mt-4 text-sm font-bold text-gray-900">{value.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">{value.description}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
              <PinIcon />
            </span>
            <div>
              <p className="text-sm font-bold text-gray-900">{config.location.title}</p>
              <p className="text-sm text-gray-500">{config.location.detail}</p>
            </div>
          </div>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
          >
            Cómo contactarnos
          </a>
        </div>
      </div>
    </article>
  );
}

function ValueIcon({ index }: { index: number }) {
  if (index === 1) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M4 13v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" />
        <rect x="3" y="12" width="4" height="7" rx="1.5" />
        <rect x="17" y="12" width="4" height="7" rx="1.5" />
      </svg>
    );
  }
  if (index === 2) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6l-7-3Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}
