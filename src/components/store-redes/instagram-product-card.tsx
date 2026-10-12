"use client";

import { forwardRef } from "react";
import { toJpeg } from "html-to-image";
import { redesCardImageSrc } from "@/lib/store-redes/product-image";

export type InstagramProductCardProps = {
  templateSrc: string;
  title: string;
  priceLabel: string;
  image: string;
  features: string[];
};

export const InstagramProductCard = forwardRef<HTMLDivElement, InstagramProductCardProps>(
  function InstagramProductCard({ templateSrc, title, priceLabel, image, features }, ref) {
    const bullets = features.slice(0, 3);
    const photo = redesCardImageSrc(image);
    const frame = templateSrc.trim();

    return (
      <div
        ref={ref}
        style={{
          width: 540,
          height: 540,
          aspectRatio: "1 / 1",
          position: "relative",
          overflow: "hidden",
          background: "#09090b",
        }}
      >
        {frame ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frame}
            alt=""
            crossOrigin="anonymous"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}

        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={title}
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              left: "9%",
              top: "22%",
              width: "44%",
              height: "52%",
              objectFit: "contain",
              filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.45))",
              zIndex: 2,
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            right: "6%",
            top: "24%",
            width: "40%",
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {bullets.map((item) => (
            <p
              key={item}
              style={{
                margin: 0,
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 15,
                fontWeight: 800,
                lineHeight: 1.25,
                color: "#fff",
                textShadow: "0 2px 10px rgba(0,0,0,0.75)",
              }}
            >
              {item}
            </p>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            right: "7%",
            bottom: "14%",
            zIndex: 4,
            minWidth: 108,
            padding: "12px 16px",
            borderRadius: 999,
            background: "linear-gradient(145deg, #facc15, #f97316)",
            color: "#111827",
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 900,
            fontSize: 20,
            textAlign: "center",
            boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
          }}
        >
          {priceLabel}
        </div>
      </div>
    );
  },
);

export async function downloadInstagramProductCard(node: HTMLElement, fileName: string) {
  const dataUrl = await toJpeg(node, {
    quality: 0.95,
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#09090b",
  });
  const link = document.createElement("a");
  link.download = fileName.endsWith(".jpg") ? fileName : `${fileName}.jpg`;
  link.href = dataUrl;
  link.click();
}
