"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AboutView } from "@/components/about-view";
import { SiteFrame } from "@/components/site-frame";
import { formatPublicHours, useStoreConfig } from "@/config/store-config";

export function AboutScreen() {
  return (
    <SiteFrame>
      <AboutView />
    </SiteFrame>
  );
}

export function InfoScreen() {
  const params = useParams<{ slug: string }>();
  const { config } = useStoreConfig();
  const page =
    config.infoPages.find((item) => item.slug === params.slug) ??
    (params.slug === "terminos"
      ? {
          slug: "terminos",
          title: "Términos y Condiciones",
          summary: "Condiciones de compra, retiro y garantía en Movil zone.",
          paragraphs: [
            "Los precios destacados corresponden al pago por transferencia. El resto de los medios se confirma en el local o por WhatsApp.",
            "El stock publicado es de muestra. La compra queda sujeta a disponibilidad y se confirma cuando el local aprueba el pedido.",
            "La garantía se gestiona en el local con el producto y el comprobante. Envíos por cadete y retiros se coordinan antes de cerrar la compra.",
          ],
        }
      : undefined);

  return (
    <SiteFrame>
      {page ? (
        <article>
          <header>
            <div className="mx-auto w-full max-w-3xl px-4 py-14 text-center sm:px-6">
              <h1 className="text-4xl font-bold tracking-tight text-neutral-950">{page.title}</h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                {page.summary}
              </p>
            </div>
          </header>
          <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-12 text-sm leading-7 text-gray-600 sm:px-6 sm:text-[15px]">
            {page.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p>
              Dirección: {config.location.title}, {config.location.detail}. Teléfono: {config.phone}.
            </p>
            {page.slug === "contacto" ? (
              <ul className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm leading-6 text-gray-700">
                {formatPublicHours(config.openingHours).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            <Link href="/sobre-nosotros" className="inline-flex font-semibold text-sky-600 hover:text-sky-700">
              Volver a Sobre nosotros
            </Link>
          </div>
        </article>
      ) : (
        <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">No encontramos esa página</h1>
          <Link href="/sobre-nosotros" className="mt-4 inline-flex font-semibold text-sky-600">
            Ir a Sobre nosotros
          </Link>
        </div>
      )}
    </SiteFrame>
  );
}
