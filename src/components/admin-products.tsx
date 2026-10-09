"use client";

import { useState } from "react";
import { useStoreConfig } from "@/config/store-config";
import { brands, formatPrice } from "@/data/products";
import { quotePrice, useCatalog, type DiscountKind, type ProductOffer } from "@/lib/offers";

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

export function ProductManager() {
  const { products, offerOf, saveOffer, addProduct } = useCatalog();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      {adding ? (
        <NewProductForm
          onCancel={() => setAdding(false)}
          onCreate={(input) => {
            addProduct(input);
            setAdding(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setEditing(null);
          }}
          className="rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800"
        >
          Agregar producto
        </button>
      )}

      <ul className="space-y-3">
        {products.map((product) => (
          <li key={product.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{product.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  {product.onSale ? (
                    <>
                      <span className="font-bold text-gray-900">{formatPrice(product.salePrice)}</span>
                      <span className="text-gray-400 line-through">{formatPrice(product.price)}</span>
                      <span className="rounded-md bg-sky-500 px-1.5 py-0.5 text-[11px] font-extrabold text-white">
                        {product.badge}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium text-gray-700">{formatPrice(product.price)}</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setEditing((current) => (current === product.id ? null : product.id));
                }}
                className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 transition-colors hover:border-sky-400 hover:text-sky-700"
              >
                {editing === product.id ? "Cerrar" : "Editar"}
              </button>
            </div>
            {editing === product.id ? (
              <OfferFields
                price={product.price}
                initial={draftFrom(offerOf(product.id))}
                onSave={(draft) => {
                  saveOffer(product.id, offerFrom(draft));
                  setEditing(null);
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-400">Los cambios quedan en este navegador y se ven al instante en la tienda.</p>
    </div>
  );
}

function NewProductForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: Parameters<ReturnType<typeof useCatalog>["addProduct"]>[0]) => void;
}) {
  const { config } = useStoreConfig();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState(config.categories[0]?.id ?? "");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [brand, setBrand] = useState(brands[0] ?? "Genérico");
  const [stock, setStock] = useState("1");
  const [draft, setDraft] = useState<OfferDraft>({ active: false, kind: "percent", value: "10" });

  const category = config.categories.find((item) => item.id === categoryId) ?? config.categories[0];
  const numericPrice = Number(price);
  const quote = quotePrice(Number.isFinite(numericPrice) ? numericPrice : 0, offerFrom(draft));
  const stockCount = Number(stock);
  const canSave =
    title.trim().length > 0 &&
    Number.isFinite(numericPrice) &&
    numericPrice >= 1 &&
    Number.isFinite(stockCount) &&
    stockCount >= 0 &&
    Boolean(category) &&
    (!draft.active || !quote.error);

  return (
    <form
      className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
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
          image: category.image,
          stock: Math.floor(stockCount),
          offer: offerFrom(draft),
        });
      }}
    >
      <h2 className="text-base font-bold text-gray-900">Nuevo producto</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-gray-700">Nombre</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Precio original</span>
          <input
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ""))}
            placeholder="8990"
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Stock</span>
          <input
            inputMode="numeric"
            value={stock}
            onChange={(event) => setStock(event.target.value.replace(/[^\d]/g, ""))}
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Categoría</span>
          <select
            value={category?.id ?? ""}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setSubcategoryId("");
            }}
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 outline-none focus:border-sky-500"
          >
            {config.categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Subcategoría</span>
          <select
            value={subcategoryId}
            onChange={(event) => setSubcategoryId(event.target.value)}
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
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
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
      <OfferFields price={Number.isFinite(numericPrice) ? numericPrice : 0} initial={draft} onChange={setDraft} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Guardar producto
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function OfferFields({
  price,
  initial,
  onSave,
  onChange,
}: {
  price: number;
  initial: OfferDraft;
  onSave?: (draft: OfferDraft) => void;
  onChange?: (draft: OfferDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const quote = quotePrice(price, offerFrom(draft));

  function update(next: OfferDraft) {
    setDraft(next);
    onChange?.(next);
  }

  return (
    <fieldset className="mt-4 rounded-2xl border border-gray-100 bg-[#f7f8fa] p-4">
      <legend className="px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">Ofertas / Descuentos</legend>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(event) => update({ ...draft, active: event.target.checked })}
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
            onClick={() => update({ ...draft, kind })}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
              draft.kind === kind ? "bg-black text-white" : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mt-3 block text-sm">
        <span className="font-medium text-gray-700">{draft.kind === "percent" ? "Porcentaje de descuento" : "Monto a descontar"}</span>
        <span className="mt-1 flex h-10 items-center rounded-xl border border-gray-200 bg-white px-3 focus-within:border-sky-500">
          <span className="text-gray-400">{draft.kind === "percent" ? "%" : "$"}</span>
          <input
            inputMode="numeric"
            disabled={!draft.active}
            value={draft.value}
            onChange={(event) => update({ ...draft, value: event.target.value.replace(/[^\d]/g, "") })}
            className="h-full w-full bg-transparent px-2 outline-none disabled:text-gray-400"
          />
        </span>
      </label>

      <div className="mt-4 rounded-2xl bg-white p-4">
        <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Precio final</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{price > 0 ? formatPrice(quote.salePrice) : "—"}</span>
          {quote.onSale ? <span className="text-sm text-gray-400 line-through">{formatPrice(price)}</span> : null}
          {quote.badge ? (
            <span className="rounded-md bg-sky-500 px-1.5 py-0.5 text-xs font-extrabold text-white">{quote.badge}</span>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {quote.error ?? (quote.onSale ? "Calculado sobre el precio original." : "Sin descuento activo.")}
        </p>
      </div>

      {onSave ? (
        <button
          type="button"
          disabled={draft.active && Boolean(quote.error)}
          onClick={() => onSave(draft)}
          className="mt-4 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Guardar oferta
        </button>
      ) : null}
    </fieldset>
  );
}
