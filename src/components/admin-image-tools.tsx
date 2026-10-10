"use client";

import { useState } from "react";
import { isolateProductImage } from "@/lib/admin-image-tools/isolate-product";

export function AdminImageTools({
  value,
  onChange,
  onError,
}: {
  value: string;
  onChange: (value: string) => void;
  onError: (value: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function removeBackground() {
    if (!value.trim() || busy) return;
    setBusy(true);
    onError("");
    try {
      onChange(await isolateProductImage(value.trim()));
    } catch {
      onError("No se pudo quitar el fondo de esa imagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={!value.trim() || busy}
        onClick={() => void removeBackground()}
        className="w-full rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Quitando fondo con IA..." : "Quitar fondo automáticamente"}
      </button>
    </div>
  );
}
