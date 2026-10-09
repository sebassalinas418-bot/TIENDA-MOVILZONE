"use client";

import { useEffect, useState } from "react";

const slides = [
  {
    left: "/banners/funda-celeste.jpg",
    right: "/banners/fundas-colores.jpg",
    leftAlt: "Funda celeste de muestra",
    rightAlt: "Fundas de varios colores",
  },
  {
    left: "/banners/fundas-colores.jpg",
    right: "/banners/accesorios-cargadores.jpg",
    leftAlt: "Fundas de varios colores",
    rightAlt: "Accesorios y cargadores de muestra",
  },
  {
    left: "/banners/accesorios-cargadores.jpg",
    right: "/banners/funda-celeste.jpg",
    leftAlt: "Accesorios y cargadores de muestra",
    rightAlt: "Funda celeste de muestra",
  },
];

export function PromoCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [paused]);

  function go(step: number) {
    setIndex((current) => (current + step + slides.length) % slides.length);
  }

  return (
    <section
      className="group relative mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm"
      aria-roledescription="carrusel"
      aria-label="Ofertas del catálogo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="grid min-h-[280px] grid-cols-1 md:min-h-[340px] md:grid-cols-2">
        <BannerSide
          image={slides[index].left}
          alt={slides[index].leftAlt}
          align="left"
          title="Fundas para celular"
          subtitle="Varios modelos"
        />

        <BannerSide
          image={slides[index].right}
          alt={slides[index].rightAlt}
          align="right"
          title="Accesorios y cargadores"
        />
      </div>

      <button
        type="button"
        aria-label="Banner anterior"
        onClick={() => go(-1)}
        className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow-md transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100"
      >
        <Chevron direction="left" />
      </button>
      <button
        type="button"
        aria-label="Banner siguiente"
        onClick={() => go(1)}
        className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow-md transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100"
      >
        <Chevron direction="right" />
      </button>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.leftAlt}
            type="button"
            aria-label={`Ver banner ${slideIndex + 1}`}
            aria-current={slideIndex === index ? "true" : undefined}
            onClick={() => setIndex(slideIndex)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              slideIndex === index ? "w-5 bg-black" : "w-1.5 bg-black/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function BannerSide({
  image,
  alt,
  title,
  subtitle,
  align,
}: {
  image: string;
  alt: string;
  title: string;
  subtitle?: string;
  align: "left" | "right";
}) {
  return (
    <div className="relative min-h-[210px] overflow-hidden bg-[#f4f6f8]">
      <img
        key={image}
        src={image}
        alt={alt}
        className="absolute inset-0 h-full w-full animate-[banner-fade_700ms_ease] object-cover"
      />
      <div
        className={`relative flex h-full flex-col justify-end p-5 md:justify-center ${
          align === "right" ? "items-end text-right" : "items-start text-left"
        }`}
      >
        <div className="max-w-[16rem] rounded-2xl bg-white/88 px-4 py-3 shadow-sm backdrop-blur-sm">
          <p className="text-2xl leading-none font-black tracking-tight text-black uppercase sm:text-3xl">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-2 text-xs font-semibold tracking-[0.14em] text-black/70 uppercase">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {direction === "left" ? (
        <path d="M10 3.5 5.5 8 10 12.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M6 3.5 10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
