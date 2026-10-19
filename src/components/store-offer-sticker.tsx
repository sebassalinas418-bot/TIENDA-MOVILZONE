type StoreOfferStickerProps = {
  label: string;
  className?: string;
};

export function StoreOfferSticker({ label, className = "" }: StoreOfferStickerProps) {
  const text = label.trim();
  if (!text) return null;
  return (
    <span
      className={`pointer-events-none absolute top-2 right-2 z-20 m-0 flex items-center justify-center rounded-full bg-fuchsia-600 leading-none font-black tracking-tight text-white ${
        className || "h-12 w-12 text-[11px] sm:h-14 sm:w-14 sm:text-xs"
      }`}
    >
      {text}
    </span>
  );
}
