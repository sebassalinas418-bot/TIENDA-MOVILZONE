import { prepareProductImageFile } from "@/lib/admin-image-tools/prepare-product-image";

type RemoveBackgroundOptions = {
  alreadyPrepared?: boolean;
};

/**
 * Misma lógica que inventario de TallerGestio: recorte ONNX en el navegador.
 * No llama APIs del taller ni cambia el guardado de la tienda.
 */
export async function removeProductImageBackground(
  file: File,
  options?: RemoveBackgroundOptions,
): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("El recorte de fondo solo está disponible en el navegador.");
  }

  const prepared = options?.alreadyPrepared ? file : await prepareProductImageFile(file);
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(prepared, {
    model: "isnet_quint8",
    output: {
      format: "image/png",
      quality: 0.9,
    },
  });

  const baseName = prepared.name.replace(/\.[^.]+$/, "") || "producto";
  return new File([blob], `${baseName}-sin-fondo.png`, {
    type: "image/png",
    lastModified: Date.now(),
  });
}
