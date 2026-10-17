"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { describeStock, products as baseProducts, type Product } from "@/data/products";
import { useStoreConfig } from "@/config/store-config";
import { useOrders } from "@/lib/orders";
import { fetchTallerCatalog, pushTallerProduct } from "@/services/taller-gestio/browser";
import { persistStoreProductImage } from "@/lib/store-product-images/client-upload";
import {
  loadExtraImagesOverlay,
  normalizeExtraImages,
  saveExtraImagesOverlay,
} from "@/lib/store-product-images/extras";
import { isPersistableProductImage, pickCatalogImage } from "@/lib/store-product-images/public-url";
import {
  categorySignature,
  mergeTallerCategoriesIntoStore,
} from "@/services/taller-gestio/categories";
import {
  loadProductPlacements,
  saveProductPlacements,
  type StoreProductPlacement,
} from "@/lib/store-product-placements";
import { loadProductDetails, saveProductDetails } from "@/lib/store-product-details";

/**
 * Ofertas de transferencia: siguen en este navegador y se aplican sobre el precio del taller.
 * Catálogo, stock y altas se leen y escriben en TallerGestio.
 */

export type DiscountKind = "percent" | "fixed";

export type ProductOffer = {
  active: boolean;
  kind: DiscountKind;
  value: number;
};

export type PriceQuote = {
  salePrice: number;
  badge: string | null;
  onSale: boolean;
  error: string | null;
};

export type CatalogProduct = Product & {
  salePrice: number;
  badge: string | null;
  storeHidden?: boolean;
  details?: string;
};

export type NewProductInput = {
  title: string;
  price: number;
  category: string;
  categoryId: string;
  subcategoryId: string;
  brand: string;
  image: string;
  extraImages?: string[];
  stock: number;
  offer: ProductOffer;
  details?: string;
};

export type ProductPatch = {
  price?: number;
  stock?: number;
  offer?: ProductOffer;
  image?: string;
  title?: string;
  category?: string;
  categoryId?: string;
  subcategoryId?: string;
  details?: string;
  extraImages?: string[];
};

type CatalogContextValue = {
  products: CatalogProduct[];
  offerOf: (productId: string) => ProductOffer | null;
  saveOffer: (productId: string, offer: ProductOffer) => void;
  updateProduct: (productId: string, patch: ProductPatch) => Promise<void>;
  addProduct: (input: NewProductInput) => Promise<string>;
  placements: Record<string, StoreProductPlacement>;
  placeProduct: (productId: string, categoryId: string, subcategoryId?: string) => void;
  clearProductPlacement: (productId: string) => void;
  toggleProductHidden: (productId: string) => void;
};

const OFFERS_KEY = "movilzone.offers";
const EXTRAS_KEY = "movilzone.extra-products";
const PRICES_KEY = "movilzone.price-overrides";
const IMAGES_KEY = "movilzone.product-images";
const TITLES_KEY = "movilzone.product-titles";
const HIDDEN_KEY = "movilzone.hidden-products";
const MAX_PERCENT = 90;

const defaultOffers: Record<string, ProductOffer> = {
  "2": { active: true, kind: "percent", value: 10 },
  "5": { active: true, kind: "percent", value: 10 },
  "8": { active: true, kind: "fixed", value: 1000 },
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function quotePrice(price: number, offer: ProductOffer | null): PriceQuote {
  const plain = { salePrice: price, badge: null, onSale: false, error: null };
  if (!offer?.active) return plain;
  if (!Number.isFinite(price) || price <= 0) return { ...plain, error: "El precio original no es válido." };
  if (!Number.isFinite(offer.value) || offer.value <= 0) {
    return { ...plain, error: "Ingresá un descuento mayor a cero." };
  }

  if (offer.kind === "percent") {
    if (offer.value > MAX_PERCENT) {
      return { ...plain, error: `El porcentaje máximo es ${MAX_PERCENT}%.` };
    }
    const salePrice = Math.round(price * (1 - offer.value / 100));
    if (salePrice >= price || salePrice < 1) return { ...plain, error: "El descuento no modifica el precio." };
    return { salePrice, badge: `-${Math.round(offer.value)}%`, onSale: true, error: null };
  }

  const amount = Math.round(offer.value);
  if (amount >= price) return { ...plain, error: "El monto tiene que ser menor al precio original." };
  const percent = Math.round((amount / price) * 100);
  if (percent < 1) return { ...plain, error: "El descuento es demasiado chico para mostrarse." };
  return { salePrice: price - amount, badge: `-${percent}%`, onSale: true, error: null };
}

function applyOffer(product: Product, offer: ProductOffer | undefined): CatalogProduct {
  const quote = quotePrice(product.price, offer ?? null);
  return { ...product, onSale: quote.onSale, salePrice: quote.salePrice, badge: quote.badge };
}

function sanitizeOffer(value: unknown): ProductOffer | null {
  if (!value || typeof value !== "object") return null;
  const offer = value as Partial<ProductOffer>;
  if (offer.kind !== "percent" && offer.kind !== "fixed") return null;
  if (typeof offer.value !== "number" || !Number.isFinite(offer.value) || offer.value < 0) return null;
  return { active: Boolean(offer.active), kind: offer.kind, value: offer.value };
}

function loadOffers() {
  const merged: Record<string, ProductOffer> = { ...defaultOffers };
  const raw = window.localStorage.getItem(OFFERS_KEY);
  if (!raw) return merged;
  try {
    const saved = JSON.parse(raw) as Record<string, unknown>;
    for (const [id, value] of Object.entries(saved)) {
      const offer = sanitizeOffer(value);
      if (offer) merged[id] = offer;
    }
  } catch {
    window.localStorage.removeItem(OFFERS_KEY);
  }
  return merged;
}

function sanitizeExtra(value: unknown): Product | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Product>;
  if (!item.id || !item.title || typeof item.price !== "number" || !Number.isFinite(item.price) || item.price < 1) {
    return null;
  }
  if (baseProducts.some((product) => product.id === item.id)) return null;
  const stock = typeof item.stock === "number" && Number.isFinite(item.stock) ? Math.max(0, Math.floor(item.stock)) : 0;
  const described = describeStock(stock);
  return {
    id: item.id,
    title: item.title,
    category: item.category || "Accesorios",
    categoryId: item.categoryId || "accesorios",
    subcategoryId: item.subcategoryId || "",
    brand: item.brand || "Genérico",
    price: Math.round(item.price),
    image: item.image || "/categories/todo.jpg",
    stock,
    stockLabel: described.stockLabel,
    inStock: described.inStock,
    onSale: false,
    isNew: Boolean(item.isNew),
    details: typeof item.details === "string" && item.details.trim() ? item.details.trim() : undefined,
  };
}

function loadPrices() {
  const raw = window.localStorage.getItem(PRICES_KEY);
  if (!raw) return {};
  try {
    const saved = JSON.parse(raw) as Record<string, unknown>;
    const prices: Record<string, number> = {};
    for (const [id, value] of Object.entries(saved)) {
      if (typeof value === "number" && Number.isFinite(value) && value >= 1) prices[id] = Math.round(value);
    }
    return prices;
  } catch {
    window.localStorage.removeItem(PRICES_KEY);
    return {};
  }
}

function loadHidden() {
  const raw = window.localStorage.getItem(HIDDEN_KEY);
  if (!raw) return {} as Record<string, true>;
  try {
    const saved = JSON.parse(raw) as unknown;
    const hidden: Record<string, true> = {};
    if (Array.isArray(saved)) {
      for (const id of saved) {
        if (typeof id === "string" && id) hidden[id] = true;
      }
      return hidden;
    }
    if (saved && typeof saved === "object") {
      for (const [id, value] of Object.entries(saved as Record<string, unknown>)) {
        if (value) hidden[id] = true;
      }
    }
    return hidden;
  } catch {
    window.localStorage.removeItem(HIDDEN_KEY);
    return {};
  }
}

function loadImages() {
  const raw = window.localStorage.getItem(IMAGES_KEY);
  if (!raw) return {};
  try {
    const saved = JSON.parse(raw) as Record<string, unknown>;
    const images: Record<string, string> = {};
    for (const [id, value] of Object.entries(saved)) {
      if (typeof value === "string" && value.trim()) images[id] = value;
    }
    return images;
  } catch {
    window.localStorage.removeItem(IMAGES_KEY);
    return {};
  }
}

function loadExtras() {
  const raw = window.localStorage.getItem(EXTRAS_KEY);
  if (!raw) return [];
  try {
    const saved = JSON.parse(raw) as unknown[];
    if (!Array.isArray(saved)) return [];
    return saved.flatMap((item) => {
      const product = sanitizeExtra(item);
      return product ? [product] : [];
    });
  } catch {
    window.localStorage.removeItem(EXTRAS_KEY);
    return [];
  }
}

function sameCatalogSnapshot(current: Product[] | null, next: Product[]) {
  if (!current || current.length !== next.length) return false;
  for (let i = 0; i < current.length; i += 1) {
    const a = current[i];
    const b = next[i];
    if (
      a.id !== b.id ||
      a.title !== b.title ||
      a.price !== b.price ||
      a.stock !== b.stock ||
      a.image !== b.image ||
      a.inStock !== b.inStock ||
      a.category !== b.category ||
      a.stockLabel !== b.stockLabel ||
      a.reservedQty !== b.reservedQty ||
      a.pendingHold !== b.pendingHold
    ) {
      return false;
    }
  }
  return true;
}

export function CatalogProvider({
  children,
  initialRemote = null,
  initialHidden = [],
}: {
  children: ReactNode;
  initialRemote?: Product[] | null;
  initialHidden?: string[];
}) {
  const { config, updateConfig } = useStoreConfig();
  const { stock, setProductStock } = useOrders();
  const [offers, setOffers] = useState<Record<string, ProductOffer>>(defaultOffers);
  const [extras, setExtras] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [remote, setRemote] = useState<Product[] | null>(initialRemote);
  const [ready, setReady] = useState(false);
  const [placements, setPlacements] = useState<Record<string, StoreProductPlacement>>({});
  const [images, setImages] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [extraImages, setExtraImages] = useState<Record<string, string[]>>({});
  const [hidden, setHidden] = useState<Record<string, true>>(() => {
    const next: Record<string, true> = {};
    for (const id of initialHidden) {
      if (id) next[id] = true;
    }
    return next;
  });
  const overlayReady = useRef(initialHidden.length > 0);

  useEffect(() => {
    setOffers(loadOffers());
    setExtras(loadExtras());
    setPrices(loadPrices());
    setPlacements(loadProductPlacements());
    setImages(loadImages());
    setDetails(loadProductDetails());
    setExtraImages(loadExtraImagesOverlay());
    const localHidden = loadHidden();
    setHidden((current) => (Object.keys(current).length > 0 ? current : localHidden));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(OFFERS_KEY, JSON.stringify(offers));
      window.localStorage.setItem(EXTRAS_KEY, JSON.stringify(extras));
      window.localStorage.setItem(PRICES_KEY, JSON.stringify(prices));
      saveProductPlacements(placements);
      window.localStorage.setItem(IMAGES_KEY, JSON.stringify(images));
      window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
      saveProductDetails(details);
      saveExtraImagesOverlay(extraImages);
    } catch {
      /* data URLs / plantillas de Redes pueden llenar la cuota */
    }
  }, [extras, offers, prices, placements, images, hidden, details, extraImages, ready]);

  useEffect(() => {
    if (!ready) return;
    for (const product of extras) {
      if (!(product.id in stock)) setProductStock(product.id, product.stock);
    }
  }, [extras, ready, setProductStock, stock]);

  useEffect(() => {
    if (!ready) return;
    let cancel = false;

    async function pull() {
      let products: Product[] | null = null;
      try {
        products = await fetchTallerCatalog();
      } catch {
        return;
      }
      if (cancel || !products) return;
      setRemote((current) => (sameCatalogSnapshot(current, products) ? current : products));
      const titles = new Set(products.map((product) => product.title));
      setExtras((current) => {
        const dropped = current.filter((item) => titles.has(item.title));
        if (dropped.length) {
          setOffers((saved) => {
            const next = { ...saved };
            for (const item of dropped) {
              const match = products.find((product) => product.title === item.title);
              if (match && next[item.id]) next[match.id] = next[item.id];
            }
            return next;
          });
        }
        const next = current.filter((item) => !titles.has(item.title));
        return next.length === current.length ? current : next;
      });
      setPrices((current) => {
        let changed = false;
        const next = { ...current };
        for (const product of products) {
          if (next[product.id] === product.price) continue;
          next[product.id] = product.price;
          changed = true;
        }
        return changed ? next : current;
      });
      for (const product of products) setProductStock(product.id, product.stock);
    }

    void pull();
    const timer = window.setInterval(() => void pull(), 15000);
    const onShow = () => {
      if (document.visibilityState === "hidden") return;
      void pull();
    };
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      cancel = true;
      window.clearInterval(timer);
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    let cancel = false;

    async function pullOverlay() {
      try {
        const response = await fetch("/api/store-overlay", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { hidden?: unknown };
        if (cancel) return;
        if (!Array.isArray(body.hidden)) return;
        const next: Record<string, true> = {};
        for (const id of body.hidden) {
          if (typeof id === "string" && id) next[id] = true;
        }
        setHidden((current) => {
          if (!overlayReady.current) {
            overlayReady.current = true;
            if (Object.keys(next).length === 0 && Object.keys(current).length > 0) {
              void fetch("/api/store-overlay", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({ hidden: Object.keys(current) }),
              });
              return current;
            }
          }
          const currentKeys = Object.keys(current).sort().join(",");
          const nextKeys = Object.keys(next).sort().join(",");
          return currentKeys === nextKeys ? current : next;
        });
      } catch {
        /* se mantiene el overlay local */
      }
      try {
        const galleryResponse = await fetch("/api/store-product-gallery", { cache: "no-store" });
        if (!galleryResponse.ok) return;
        const galleryBody = (await galleryResponse.json()) as { galleries?: Record<string, unknown> };
        if (cancel || !galleryBody.galleries || typeof galleryBody.galleries !== "object") return;
        const next: Record<string, string[]> = {};
        for (const [id, value] of Object.entries(galleryBody.galleries)) {
          const extrasForProduct = normalizeExtraImages(value);
          if (id && extrasForProduct.length) next[id] = extrasForProduct;
        }
        setExtraImages((current) => {
          const currentKeys = JSON.stringify(current);
          const nextKeys = JSON.stringify(next);
          return currentKeys === nextKeys ? current : { ...current, ...next };
        });
      } catch {
        /* se mantiene la galería local */
      }
    }

    void pullOverlay();
    const timer = window.setInterval(() => void pullOverlay(), 15000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [ready]);

  useEffect(() => {
    if (!remote?.length) return;
    const merged = mergeTallerCategoriesIntoStore(
      config.categories,
      remote.map((product) => product.category),
    );
    if (categorySignature(merged) === categorySignature(config.categories)) return;
    updateConfig({ categories: merged });
  }, [remote, config.categories, updateConfig]);

  const products = useMemo(
    () =>
      [...(remote ?? []), ...extras].map((product) => ({
        ...applyOffer(
          {
            ...product,
            price: prices[product.id] ?? product.price,
            image: pickCatalogImage(images[product.id], product.image),
          },
          offers[product.id],
        ),
        storeHidden: Boolean(hidden[product.id]),
        details: details[product.id] || product.details || undefined,
        extraImages: extraImages[product.id] || product.extraImages || [],
      })),
    [details, extraImages, extras, hidden, images, offers, prices, remote],
  );

  function saveOffer(productId: string, offer: ProductOffer) {
    setOffers((current) => ({ ...current, [productId]: offer }));
  }

  async function updateProduct(productId: string, patch: ProductPatch) {
    if (patch.price != null && Number.isFinite(patch.price) && patch.price >= 1) {
      const price = Math.round(patch.price);
      setPrices((current) => ({ ...current, [productId]: price }));
      setExtras((current) => current.map((item) => (item.id === productId ? { ...item, price } : item)));
    }
    if (patch.stock != null && Number.isFinite(patch.stock)) {
      const quantity = Math.max(0, Math.floor(patch.stock));
      const described = describeStock(quantity);
      setProductStock(productId, quantity);
      setExtras((current) =>
        current.map((item) => (item.id === productId ? { ...item, stock: quantity, ...described } : item)),
      );
    }
    if (patch.offer) saveOffer(productId, patch.offer);
    if (patch.image && patch.image.trim()) {
      const image = patch.image.trim();
      if (isPersistableProductImage(image)) {
        setImages((current) => ({ ...current, [productId]: image }));
        setExtras((current) => current.map((item) => (item.id === productId ? { ...item, image } : item)));
      }
    }
    if (patch.details != null) {
      const text = patch.details.trim();
      setDetails((current) => {
        const next = { ...current };
        if (text) next[productId] = text;
        else delete next[productId];
        return next;
      });
    }
    if (patch.extraImages) {
      const extrasForProduct = normalizeExtraImages(patch.extraImages, patch.image);
      setExtraImages((current) => ({ ...current, [productId]: extrasForProduct }));
      setExtras((current) =>
        current.map((item) => (item.id === productId ? { ...item, extraImages: extrasForProduct } : item)),
      );
      if (!productId.startsWith("extra-")) {
        void fetch("/api/store-product-gallery", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, extras: extrasForProduct }),
        });
      }
    }
    if (patch.title?.trim()) {
      const title = patch.title.trim();
      setExtras((current) => current.map((item) => (item.id === productId ? { ...item, title } : item)));
    }
    if (patch.categoryId) {
      setPlacements((current) => ({
        ...current,
        [productId]: {
          categoryId: patch.categoryId!,
          subcategoryId: patch.subcategoryId || undefined,
        },
      }));
      setExtras((current) =>
        current.map((item) =>
          item.id === productId
            ? {
                ...item,
                category: patch.category?.trim() || item.category,
                categoryId: patch.categoryId!,
                subcategoryId: patch.subcategoryId ?? item.subcategoryId,
              }
            : item,
        ),
      );
    }
    const current = products.find((item) => item.id === productId);
    if (!current) return;
    const priceChanged = patch.price != null;
    const stockChanged = patch.stock != null;
    const offerChanged = Boolean(patch.offer);
    const titleChanged = Boolean(patch.title?.trim());
    const categoryChanged = Boolean(patch.categoryId || patch.category?.trim());
    const detailsChanged = patch.details != null;
    const persistImage = isPersistableProductImage(patch.image) ? patch.image!.trim() : "";
    if (!priceChanged && !stockChanged && !offerChanged && !persistImage && !titleChanged && !categoryChanged && !detailsChanged) return;
    if (persistImage) void persistStoreProductImage(productId, persistImage);
    const originalImage =
      (remote ?? []).find((item) => item.id === productId)?.image ??
      extras.find((item) => item.id === productId)?.image ??
      current.image;
    await pushTallerProduct({
      id: productId,
      title: patch.title?.trim() || current.title,
      price: patch.price ?? current.price,
      stock: patch.stock ?? stock[productId] ?? current.stock,
      category: patch.category?.trim() || current.category,
      image: persistImage || (isPersistableProductImage(originalImage) ? originalImage : undefined),
      details: patch.details != null ? patch.details : current.details,
    });
  }

  async function addProduct(input: NewProductInput) {
    const detailsText = input.details?.trim() || "";
    const remoteId = await pushTallerProduct({
      title: input.title.trim(),
      price: Math.round(input.price),
      stock: input.stock,
      category: input.category,
      image: input.image,
      details: detailsText,
    });
    const id = remoteId || `extra-${Date.now().toString(36)}`;
    const described = describeStock(input.stock);
    const product: Product = {
      id,
      title: input.title.trim(),
      category: input.category,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      brand: input.brand,
      price: Math.round(input.price),
      image: input.image,
      stock: input.stock,
      stockLabel: described.stockLabel,
      inStock: described.inStock,
      onSale: false,
      isNew: false,
      details: detailsText || undefined,
      extraImages: normalizeExtraImages(input.extraImages, input.image),
    };
    setExtras((current) => [...current, product]);
    setOffers((current) => ({ ...current, [id]: input.offer }));
    setProductStock(id, input.stock);
    if (detailsText) {
      setDetails((current) => ({ ...current, [id]: detailsText }));
    }
    if (product.extraImages?.length && !id.startsWith("extra-")) {
      setExtraImages((current) => ({ ...current, [id]: product.extraImages ?? [] }));
      void fetch("/api/store-product-gallery", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, extras: product.extraImages }),
      });
    }
    return id;
  }

  function placeProduct(productId: string, categoryId: string, subcategoryId?: string) {
    setPlacements((current) => ({
      ...current,
      [productId]: {
        categoryId,
        subcategoryId: subcategoryId || undefined,
      },
    }));
  }

  function toggleProductHidden(productId: string) {
    setHidden((current) => {
      const next = { ...current };
      if (next[productId]) delete next[productId];
      else next[productId] = true;
      overlayReady.current = true;
      void fetch("/api/store-overlay", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ hidden: Object.keys(next) }),
      });
      return next;
    });
  }

  function clearProductPlacement(productId: string) {
    setPlacements((current) => {
      if (!(productId in current)) return current;
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }

  return (
    <CatalogContext.Provider
      value={{
        products,
        offerOf: (productId) => offers[productId] ?? null,
        saveOffer,
        updateProduct,
        addProduct,
        placements,
        placeProduct,
        clearProductPlacement,
        toggleProductHidden,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("useCatalog debe usarse dentro de CatalogProvider");
  return context;
}
