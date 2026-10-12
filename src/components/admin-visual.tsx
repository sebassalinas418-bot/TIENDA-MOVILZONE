"use client";

import { useState, type ReactNode } from "react";
import { useStoreConfig } from "@/config/store-config";
import { brands, formatPrice } from "@/data/products";
import { isolateProductFile } from "@/lib/admin-image-tools/isolate-product";
import { prepareProductImageFile } from "@/lib/admin-image-tools/prepare-product-image";
import {
  uploadStoreProductImage,
  uploadStoreProductImageFromDataUrl,
} from "@/lib/store-product-images/client-upload";
import { isPersistableProductImage } from "@/lib/store-product-images/public-url";
import { quotePrice, type CatalogProduct, type DiscountKind, type NewProductInput, type ProductOffer, type ProductPatch } from "@/lib/offers";

type OfferDraft = {
  active: boolean;
  kind: DiscountKind;
  value: string;
};

function draftFrom(offer: ProductOffer | null): OfferDraft {
  if (!offer) return { active: false, kind: "percent", value: "10" };
  return { active: offer.active, kind: offer.kind, value: String(offer.value) };
}

function offerFrom(draft: OfferDraft): ProductOffer {
  return { active: draft.active, kind: draft.kind, value: Number(draft.value) };
}

export function ProductEditModal({
  product,
  stock,
  offer,
  onClose,
  onSave,
}: {
  product: CatalogProduct;
  stock: number;
  offer: ProductOffer | null;
  onClose: () => void;
  onSave: (patch: ProductPatch) => void;
}) {
  const [price, setPrice] = useState(String(product.price));
  const [stockValue, setStockValue] = useState(String(stock));
  const [image, setImage] = useState(product.image);
  const [imageError, setImageError] = useState("");
  const [draft, setDraft] = useState<OfferDraft>(draftFrom(offer));
  const numericPrice = Number(price);
  const numericStock = Number(stockValue);
  const quote = quotePrice(Number.isFinite(numericPrice) ? numericPrice : 0, offerFrom(draft));
  const canSave =
    Number.isFinite(numericPrice) &&
    numericPrice >= 1 &&
    Number.isFinite(numericStock) &&
    numericStock >= 0 &&
    isPersistableProductImage(image.trim()) &&
    (!draft.active || !quote.error);

  return (
    <Modal title={`Editar ${product.title}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          onSave({
            price: Math.round(numericPrice),
            stock: Math.floor(numericStock),
            offer: offerFrom(draft),
            image: image.trim(),
          });
        }}
      >
        <ImagePicker
          value={image}
          error={imageError}
          onChange={setImage}
          onError={setImageError}
          autoIsolate
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Precio original</span>
            <input
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ""))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Stock</span>
            <input
              inputMode="numeric"
              value={stockValue}
              onChange={(event) => setStockValue(event.target.value.replace(/[^\d]/g, ""))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
            />
          </label>
        </div>
        <OfferFields price={Number.isFinite(numericPrice) ? numericPrice : 0} draft={draft} onChange={setDraft} />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function NewProductModal({ onClose, onCreate }: { onClose: () => void; onCreate: (input: NewProductInput) => void }) {
  const { config } = useStoreConfig();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState(config.categories[0]?.id ?? "");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [brand, setBrand] = useState(brands[0] ?? "Genérico");
  const [stock, setStock] = useState("1");
  const [draft, setDraft] = useState<OfferDraft>({ active: false, kind: "percent", value: "10" });
  const [image, setImage] = useState(config.categories[0]?.image ?? "/categories/todo.jpg");
  const [imageError, setImageError] = useState("");
  const category = config.categories.find((item) => item.id === categoryId) ?? config.categories[0];
  const numericPrice = Number(price);
  const numericStock = Number(stock);
  const quote = quotePrice(Number.isFinite(numericPrice) ? numericPrice : 0, offerFrom(draft));
  const canSave =
    title.trim().length > 0 &&
    Number.isFinite(numericPrice) &&
    numericPrice >= 1 &&
    Number.isFinite(numericStock) &&
    numericStock >= 0 &&
    Boolean(category) &&
    isPersistableProductImage(image.trim()) &&
    (!draft.active || !quote.error);

  return (
    <Modal title="Agregar producto nuevo" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave || !category) return;
          onCreate({
            title: title.trim(),
            price: Math.round(numericPrice),
            category: category.name,
            categoryId: category.id,
            subcategoryId,
            brand,
            image: image.trim() || category.image,
            stock: Math.floor(numericStock),
            offer: offerFrom(draft),
          });
        }}
      >
        <CreateFields
          title={title}
          price={price}
          stock={stock}
          brand={brand}
          categoryId={category?.id ?? ""}
          subcategoryId={subcategoryId}
          categories={config.categories}
          onTitle={setTitle}
          onPrice={setPrice}
          onStock={setStock}
          onBrand={setBrand}
          onCategory={(id) => {
            const next = config.categories.find((item) => item.id === id);
            setCategoryId(id);
            setSubcategoryId("");
            if (next && !image.startsWith("data:")) setImage(next.image);
          }}
          onSubcategory={setSubcategoryId}
        />
        <ImagePicker value={image} error={imageError} onChange={setImage} onError={setImageError} />
        <OfferFields price={Number.isFinite(numericPrice) ? numericPrice : 0} draft={draft} onChange={setDraft} />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Agregar producto
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CreateFields(props: {
  title: string;
  price: string;
  stock: string;
  brand: string;
  categoryId: string;
  subcategoryId: string;
  categories: { id: string; name: string; children: { id: string; name: string }[] }[];
  onTitle: (value: string) => void;
  onPrice: (value: string) => void;
  onStock: (value: string) => void;
  onBrand: (value: string) => void;
  onCategory: (value: string) => void;
  onSubcategory: (value: string) => void;
}) {
  const category = props.categories.find((item) => item.id === props.categoryId);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm sm:col-span-2">
        <span className="font-medium text-gray-700">Nombre</span>
        <input
          value={props.title}
          onChange={(event) => props.onTitle(event.target.value)}
          className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-gray-700">Precio original</span>
        <input
          inputMode="numeric"
          value={props.price}
          onChange={(event) => props.onPrice(event.target.value.replace(/[^\d]/g, ""))}
          className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-gray-700">Stock</span>
        <input
          inputMode="numeric"
          value={props.stock}
          onChange={(event) => props.onStock(event.target.value.replace(/[^\d]/g, ""))}
          className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-gray-700">Categoría</span>
        <select
          value={props.categoryId}
          onChange={(event) => props.onCategory(event.target.value)}
          className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 outline-none focus:border-sky-500"
        >
          {props.categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium text-gray-700">Subcategoría</span>
        <select
          value={props.subcategoryId}
          onChange={(event) => props.onSubcategory(event.target.value)}
          className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 outline-none focus:border-sky-500"
        >
          <option value="">Sin subcategoría</option>
          {category?.children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="font-medium text-gray-700">Marca</span>
        <select
          value={props.brand}
          onChange={(event) => props.onBrand(event.target.value)}
          className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 outline-none focus:border-sky-500"
        >
          {brands.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function OfferFields({
  price,
  draft,
  onChange,
}: {
  price: number;
  draft: OfferDraft;
  onChange: (draft: OfferDraft) => void;
}) {
  const quote = quotePrice(price, offerFrom(draft));
  return (
    <fieldset className="rounded-2xl border border-gray-100 bg-[#f7f8fa] p-4">
      <legend className="px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">Ofertas / Descuentos</legend>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(event) => onChange({ ...draft, active: event.target.checked })}
          className="h-4 w-4 accent-sky-500"
        />
        Poner en oferta
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["percent", "Porcentaje (%)"],
            ["fixed", "Monto fijo ($)"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            aria-pressed={draft.kind === kind}
            disabled={!draft.active}
            onClick={() => onChange({ ...draft, kind })}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-40 ${
              draft.kind === kind ? "bg-black text-white" : "border border-gray-200 bg-white text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-sm">
        <span className="font-medium text-gray-700">{draft.kind === "percent" ? "Porcentaje de descuento" : "Monto a descontar"}</span>
        <span className="mt-1 flex h-10 items-center rounded-xl border border-gray-200 bg-white px-3 focus-within:border-sky-500">
          <span className="text-gray-500">{draft.kind === "percent" ? "%" : "$"}</span>
          <input
            inputMode="numeric"
            disabled={!draft.active}
            value={draft.value}
            onChange={(event) => onChange({ ...draft, value: event.target.value.replace(/[^\d]/g, "") })}
            className="h-full w-full bg-transparent px-2 outline-none disabled:text-gray-400"
          />
        </span>
      </label>
      <div className="mt-4 rounded-2xl bg-white p-4">
        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Precio final</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-extrabold text-neutral-950">{price > 0 ? formatPrice(quote.salePrice) : "—"}</span>
          {quote.onSale ? <span className="text-sm font-semibold text-rose-800 line-through">{formatPrice(price)}</span> : null}
          {quote.badge ? <span className="rounded-md bg-fuchsia-600 px-1.5 py-0.5 text-xs font-black text-white">{quote.badge}</span> : null}
        </p>
        <p className="mt-1 text-xs font-medium text-gray-600">{quote.error ?? (quote.onSale ? "Calculado sobre el precio original." : "Sin descuento activo.")}</p>
      </div>
    </fieldset>
  );
}

function ImagePicker({
  value,
  error,
  onChange,
  onError,
  autoIsolate = false,
}: {
  value: string;
  error: string;
  onChange: (value: string) => void;
  onError: (value: string) => void;
  autoIsolate?: boolean;
}) {
  const [reading, setReading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError("Elegí un archivo de imagen.");
      return;
    }
    setReading(true);
    onError("");
    try {
      if (!autoIsolate) {
        onChange(await uploadStoreProductImage(file));
        return;
      }
      try {
        const isolated = await isolateProductFile(file);
        onChange(
          isolated.startsWith("data:")
            ? await uploadStoreProductImageFromDataUrl(isolated)
            : isolated.startsWith("http")
              ? isolated
              : await uploadStoreProductImage(file),
        );
      } catch {
        onChange(await uploadStoreProductImage(await prepareProductImageFile(file)));
        onError("Se usó la foto original porque no se pudo quitar el fondo.");
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo subir esa imagen a Storage.");
    } finally {
      setReading(false);
    }
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex aspect-square max-h-56 items-center justify-center bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]">
          {value ? <img src={value} alt="" className="h-full w-full object-contain" /> : null}
        </div>
      </div>
      {autoIsolate ? (
        <label className="mt-3 flex cursor-pointer items-center justify-center rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-400">
          {reading ? "Quitando fondo con IA..." : "Sacar foto y quitar fondo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={reading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void onFile(file);
            }}
          />
        </label>
      ) : null}
      <label
        className={`mt-3 flex cursor-pointer items-center justify-center rounded-full px-4 py-2.5 text-sm font-bold ${
          autoIsolate
            ? "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
            : "bg-sky-500 text-white hover:bg-sky-400"
        }`}
      >
          {reading ? (autoIsolate ? "Subiendo foto..." : "Subiendo imagen...") : "Subir imagen"}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={reading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onFile(file);
          }}
        />
      </label>
      {value.startsWith("https://") ? (
        <p className="mt-2 text-xs text-gray-500">Foto en Storage. Se ve en celular y escritorio.</p>
      ) : null}
      {error ? <p className="mt-2 text-sm font-medium text-rose-700">{error}</p> : null}
    </div>
  );
}

export function SubcategoryImageModal({
  name,
  image,
  onClose,
  onSave,
}: {
  name: string;
  image: string;
  onClose: () => void;
  onSave: (image: string) => void;
}) {
  const [value, setValue] = useState(image);
  const [error, setError] = useState("");

  function save() {
    const next = value.trim();
    if (!isPersistableProductImage(next)) {
      setError("Subí una imagen. Tiene que quedar una URL http(s) de Storage, no blob ni data.");
      return;
    }
    onSave(next);
  }

  return (
    <Modal title={`Imagen de ${name}`} onClose={onClose}>
      <ImagePicker value={value} error={error} onChange={setValue} onError={setError} />
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">
          Cancelar
        </button>
        <button type="button" onClick={save} className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800">
          Guardar
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="admin-editor-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="admin-editor-title" className="text-lg font-bold text-gray-900">
            {title}
          </h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
