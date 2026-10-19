import { captionFromRecognition, captionHashtags } from "@/lib/store-free-photos/from-recognition";
import { recognizeProductImage } from "@/lib/store-recognize-product/server";

export {
  FREE_PHOTO_FOOTER,
  captionFromRecognition,
  captionHashtags,
  captionHeadline,
  ensureFreePhotoFooter,
} from "@/lib/store-free-photos/from-recognition";

export async function captionFreePhoto(image: { mimeType: string; data: string }) {
  const data = await recognizeProductImage(image);
  const caption = captionFromRecognition(data);
  return {
    caption,
    headline: data.nombre_sugerido,
    hashtags: captionHashtags(caption),
    model: "recognize-product",
  };
}
