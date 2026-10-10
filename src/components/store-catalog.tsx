"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NewProductModal, ProductEditModal, SubcategoryImageModal } from "@/components/admin-visual";
import { LoginPrompt } from "@/components/login-prompt";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { PageSkyFade } from "@/components/site-frame";
import { SiteFooter } from "@/components/store-sections";
import { useStoreConfig } from "@/config/store-config";
import { brands, describeStock } from "@/data/products";
import { useCatalog, type CatalogProduct } from "@/lib/offers";
import { storeVisibleCategory } from "@/lib/store-product-placements";
import { useCart } from "@/lib/cart";
import { useOrders } from "@/lib/orders";
import { isSessionVerified, readSession, SESSION_EVENT, signOut, type DemoSession } from "@/lib/session";
import {
  collectCategoryFilterIds,
  isTallerOrigin,
  nestTallerCategory,
  removeStoreCategory,
  removeStoreChild,
  reorderChildren,
  reorderTopLevel,
  unnestTallerCategory,
} from "@/services/taller-gestio/categories";

const CAT_DRAG = "text/plain";

type CategoryDrag =
  | { level: "top"; id: string }
  | { level: "child"; id: string; parentId: string };

function readCategoryDrag(event: DragEvent): CategoryDrag | null {
  try {
    const raw = event.dataTransfer.getData(CAT_DRAG);
    if (!raw.startsWith("mzcat:")) return null;
    return JSON.parse(raw.slice(6)) as CategoryDrag;
  } catch {
    return null;
  }
}

function writeCategoryDrag(event: DragEvent, payload: CategoryDrag) {
  event.dataTransfer.setData(CAT_DRAG, `mzcat:${JSON.stringify(payload)}`);
  event.dataTransfer.effectAllowed = "move";
}

function writeProductDrag(event: DragEvent, productId: string) {
  event.dataTransfer.setData(CAT_DRAG, `mzprod:${productId}`);
  event.dataTransfer.effectAllowed = "move";
}

function readProductDrag(event: DragEvent): string | null {
  const raw = event.dataTransfer.getData(CAT_DRAG);
  if (!raw.startsWith("mzprod:")) return null;
  return raw.slice(7) || null;
}

type SortKey = "relevant" | "price-desc" | "price-asc";

type CategoryFilter =
  | { kind: "all" }
  | { kind: "category"; categoryId: string }
  | { kind: "sub"; categoryId: string; subcategoryId: string };

function normalize(value: string) {
  return value.toLocaleLowerCase("es").trim();
}

const subcategoryThumbs: Record<string, string> = {
  silicona: "/banners/funda-celeste.jpg",
  rigidas: "/categories/fundas.jpg",
  disenos: "/banners/fundas-colores.jpg",
  magsafe: "/categories/fundas.jpg",
  cables: "/categories/cables.jpg",
  "cargadores-rapidos": "/categories/cargadores.jpg",
  inalambricos: "/categories/audio.jpg",
  vidrios: "/categories/protectores.jpg",
  "soportes-auto": "/categories/accesorios.jpg",
  energia: "/banners/accesorios-cargadores.jpg",
};

function subcategoryCover(
  categoryImage: string,
  child: { id: string; image?: string },
  catalog: { subcategoryId: string; image: string; inStock: boolean }[],
) {
  if (child.image) return child.image;
  const known = subcategoryThumbs[child.id];
  if (known) return known;
  const own = catalog.filter((item) => item.subcategoryId === child.id && item.image);
  return own.find((item) => item.inStock)?.image ?? own[0]?.image ?? categoryImage;
}

export function StoreCatalog({ admin = false }: { admin?: boolean }) {
  const router = useRouter();
  const vista = useSearchParams().get("vista");
  const { config, updateConfig } = useStoreConfig();
  const {
    products,
    offerOf,
    updateProduct,
    addProduct,
    placements,
    placeProduct,
    clearProductPlacement,
    toggleProductHidden,
  } = useCatalog();
  const [query, setQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>({ kind: "all" });
  const [expanded, setExpanded] = useState<string[]>([]);
  const appliedQuery = useRef(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("relevant");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [subDraft, setSubDraft] = useState<{ categoryId: string; name: string } | null>(null);
  const [coverEdit, setCoverEdit] = useState<{ categoryId: string; subcategoryId: string } | null>(null);
  const [imageEditId, setImageEditId] = useState<string | null>(null);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const { addItem, openCart, closeCart } = useCart();
  const { stock } = useOrders();

  const previousVista = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
    return () => window.removeEventListener(SESSION_EVENT, sync);
  }, []);

  useEffect(() => {
    setOnlyOffers(vista === "ofertas");
    if (previousVista.current && !vista) setFilter({ kind: "all" });
    previousVista.current = vista;
  }, [vista]);

  useEffect(() => {
    if (appliedQuery.current) return;
    const params = new URLSearchParams(window.location.search);
    const categoria = params.get("categoria");
    const sub = params.get("sub");
    if (!categoria) {
      appliedQuery.current = true;
      return;
    }
    const match = config.categories.find((item) => item.id === categoria || item.name === categoria);
    const nestedParent = match
      ? null
      : config.categories.find((item) =>
          item.children.some((child) => child.id === categoria || child.name === categoria),
        );
    if (!match && !nestedParent) return;
    const resolved = match ?? nestedParent;
    if (!resolved) return;
    const child = sub
      ? resolved.children.find((item) => item.id === sub || item.name === sub)
      : nestedParent
        ? resolved.children.find((item) => item.id === categoria || item.name === categoria)
        : undefined;
    if (child) {
      setFilter({ kind: "sub", categoryId: resolved.id, subcategoryId: child.id });
    } else {
      setFilter({ kind: "category", categoryId: resolved.id });
    }
    setExpanded((current) => (current.includes(resolved.id) ? current : [...current, resolved.id]));
    appliedQuery.current = true;
  }, [config.categories]);

  useEffect(() => {
    if (filter.kind === "all") return;
    const match = config.categories.find((item) => item.id === filter.categoryId);
    if (!match) {
      setFilter({ kind: "all" });
      return;
    }
    if (filter.kind === "sub" && !match.children.some((item) => item.id === filter.subcategoryId)) {
      setFilter({ kind: "category", categoryId: match.id });
    }
  }, [config.categories, filter]);

  const categoryTerm = normalize(categoryQuery);
  const visibleCategories = config.categories.filter((item) => {
    if (!categoryTerm) return true;
    return (
      normalize(item.name).includes(categoryTerm) ||
      item.children.some((child) => normalize(child.name).includes(categoryTerm))
    );
  });

  const visibleProducts = useMemo(() => {
    const term = normalize(query);
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);

    const live = products.map((product) => ({ ...product, ...describeStock(stock[product.id] ?? product.stock) }));
    const filtered = live.filter((product) => {
      const vis = storeVisibleCategory(
        product.id,
        { categoryId: product.categoryId, subcategoryId: product.subcategoryId },
        placements,
      );
      const parent =
        filter.kind === "all"
          ? null
          : (config.categories.find((item) => item.id === filter.categoryId) ?? null);
      const ids = parent ? collectCategoryFilterIds(parent) : [];
      const child =
        filter.kind === "sub"
          ? parent?.children.find((item) => item.id === filter.subcategoryId)
          : null;
      const childIds = new Set(parent?.children.map((item) => item.id) ?? []);
      const onChild =
        childIds.has(vis.subcategoryId) ||
        (vis.categoryId !== parent?.id && childIds.has(vis.categoryId));
      const matchesCategory =
        filter.kind === "all" ||
        (filter.kind === "category" &&
          parent &&
          (vis.categoryId === parent.id || vis.subcategoryId === parent.id || ids.includes(vis.categoryId)) &&
          !onChild) ||
        (filter.kind === "sub" &&
          child &&
          (vis.subcategoryId === child.id || vis.categoryId === child.id));
      const matchesQuery =
        !term ||
        normalize(product.title).includes(term) ||
        normalize(product.brand).includes(term);
      const matchesMin = min === null || Number.isNaN(min) || product.salePrice >= min;
      const matchesMax = max === null || Number.isNaN(max) || product.salePrice <= max;
      const matchesBrand =
        selectedBrands.length === 0 || selectedBrands.includes(product.brand);
      const matchesStock = showOutOfStock || product.inStock;
      const matchesOffer = !onlyOffers || product.onSale;
      const matchesVisibility = admin || !product.storeHidden;
      return (
        matchesCategory &&
        matchesQuery &&
        matchesMin &&
        matchesMax &&
        matchesBrand &&
        matchesStock &&
        matchesOffer &&
        matchesVisibility
      );
    });

    if (sortKey === "price-desc") {
      return [...filtered].sort((a, b) => b.salePrice - a.salePrice);
    }
    if (sortKey === "price-asc") {
      return [...filtered].sort((a, b) => a.salePrice - b.salePrice);
    }
    return filtered;
  }, [admin, config.categories, filter, maxPrice, minPrice, onlyOffers, placements, products, query, selectedBrands, showOutOfStock, sortKey, stock]);

  function toggleBrand(brand: string) {
    setSelectedBrands((current) =>
      current.includes(brand) ? current.filter((item) => item !== brand) : [...current, brand],
    );
  }

  function slugId(name: string) {
    const taken = config.categories.flatMap((item) => [item.id, ...item.children.map((child) => child.id)]);
    const base =
      name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "categoria";
    let id = base;
    let n = 2;
    while (taken.includes(id)) {
      id = `${base}-${n}`;
      n += 1;
    }
    return id;
  }

  function addCategory() {
    const name = categoryDraft.trim();
    if (!name) return;
    updateConfig({
      categories: [
        ...config.categories,
        { id: slugId(name), name, image: "/categories/todo.jpg", origin: "store", children: [] },
      ],
    });
    setCategoryDraft("");
    setAddingCategory(false);
  }

  function saveSubcategoryImage(categoryId: string, subcategoryId: string, image: string) {
    updateConfig({
      categories: config.categories.map((item) =>
        item.id === categoryId
          ? {
              ...item,
              children: item.children.map((child) => (child.id === subcategoryId ? { ...child, image } : child)),
            }
          : item,
      ),
    });
  }

  function addSubcategory(categoryId: string) {
    const name = subDraft?.categoryId === categoryId ? subDraft.name.trim() : "";
    if (!name) return;
    updateConfig({
      categories: config.categories.map((item) =>
        item.id === categoryId
          ? { ...item, children: [...item.children, { id: slugId(name), name, origin: "store" as const }] }
          : item,
      ),
    });
    setExpanded((current) => (current.includes(categoryId) ? current : [...current, categoryId]));
    setSubDraft(null);
  }

  function nestIntoStoreCategory(tallerId: string, storeParentId: string) {
    updateConfig({
      categories: nestTallerCategory(config.categories, tallerId, storeParentId),
    });
    setExpanded((current) =>
      current.includes(storeParentId) ? current : [...current, storeParentId],
    );
  }

  function restoreTallerCategory(tallerId: string) {
    updateConfig({
      categories: unnestTallerCategory(config.categories, tallerId),
    });
  }

  function deleteCreatedCategory(storeId: string) {
    const next = removeStoreCategory(config.categories, storeId);
    updateConfig({ categories: next });
    if (filter.kind !== "all" && filter.categoryId === storeId) {
      setFilter({ kind: "all" });
    }
  }

  function deleteCreatedChild(parentId: string, childId: string) {
    updateConfig({
      categories: removeStoreChild(config.categories, parentId, childId),
    });
    if (filter.kind === "sub" && filter.subcategoryId === childId) {
      setFilter({ kind: "category", categoryId: parentId });
    }
  }

  function handleCategoryDrop(event: DragEvent, target: CategoryDrag) {
    event.preventDefault();
    const productId = readProductDrag(event);
    if (productId) {
      assignProductToStoreCategory(productId, target);
      return;
    }
    const dragged = readCategoryDrag(event);
    if (!dragged) return;
    if (dragged.level === "top" && isTallerOrigin(config.categories.find((item) => item.id === dragged.id)?.origin) && target.level === "top") {
      const targetItem = config.categories.find((item) => item.id === target.id);
      if (targetItem && !isTallerOrigin(targetItem.origin)) {
        nestIntoStoreCategory(dragged.id, target.id);
        return;
      }
    }
    if (dragged.level === "top" && target.level === "top") {
      updateConfig({
        categories: reorderTopLevel(config.categories, dragged.id, target.id),
      });
      return;
    }
    if (dragged.level === "child" && target.level === "child" && dragged.parentId === target.parentId) {
      updateConfig({
        categories: reorderChildren(config.categories, dragged.parentId, dragged.id, target.id),
      });
      return;
    }
    if (dragged.level === "child" && target.level === "top") {
      const targetItem = config.categories.find((item) => item.id === target.id);
      if (targetItem && !isTallerOrigin(targetItem.origin) && isTallerOrigin(
        config.categories
          .find((item) => item.id === dragged.parentId)
          ?.children.find((child) => child.id === dragged.id)?.origin,
      )) {
        nestIntoStoreCategory(dragged.id, target.id);
      }
    }
  }

  function assignProductToStoreCategory(productId: string, target: CategoryDrag) {
    if (target.level === "top") {
      placeProduct(productId, target.id);
      setFilter({ kind: "category", categoryId: target.id });
      setExpanded((current) => (current.includes(target.id) ? current : [...current, target.id]));
      return;
    }
    placeProduct(productId, target.parentId, target.id);
    setFilter({ kind: "sub", categoryId: target.parentId, subcategoryId: target.id });
    setExpanded((current) =>
      current.includes(target.parentId) ? current : [...current, target.parentId],
    );
  }

  function handleAddToCart(product: CatalogProduct) {
    if (!session) {
      setLoginOpen(true);
      return;
    }
    if (!isSessionVerified(session)) {
      router.push("/mi-cuenta");
      return;
    }
    if (!product.inStock) return;
    if (!admin && product.storeHidden) return;
    addItem(product.id);
  }

  const filters = (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold tracking-wide text-neutral-900 uppercase">Categoría</h2>
          {admin ? (
            <p className="mt-1 text-[11px] font-medium leading-snug text-neutral-600">
              Arrastrá un producto y soltalo en una categoría o subcategoría de la tienda. No cambia TallerGestio.
            </p>
          ) : null}
        </div>
        {admin && !addingCategory ? (
          <button
            type="button"
            onClick={() => setAddingCategory(true)}
            className="mt-3 flex w-full items-center justify-center rounded-xl border border-dashed border-sky-300 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 hover:bg-sky-100"
          >
            + Nueva categoría
          </button>
        ) : null}
        {admin ? (
          <p className="mt-2 text-[11px] leading-4 text-neutral-500">
            En negro: agrupadores de la tienda (se pueden borrar). En rojo: TallerGestio.
            Arrastrá para agrupar o reordenar. No cambia el taller.
          </p>
        ) : null}
        {admin && addingCategory ? (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              addCategory();
            }}
          >
            <input
              autoFocus
              value={categoryDraft}
              onChange={(event) => setCategoryDraft(event.target.value)}
              placeholder="Ej: Cables y Cargadores"
              className="h-10 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-sky-500"
            />
            <button type="submit" className="rounded-xl bg-sky-500 px-3 text-sm font-bold text-white hover:bg-sky-400">
              Crear
            </button>
          </form>
        ) : null}
        <label className="mt-3 block">
          <span className="sr-only">Buscar categoría</span>
          <input
            type="search"
            value={categoryQuery}
            onChange={(event) => setCategoryQuery(event.target.value)}
            placeholder="Buscar categoría..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-neutral-950 outline-none placeholder:text-neutral-600 focus:border-sky-500"
          />
        </label>
        <ul className="mt-2 space-y-1">
          <li>
            <button
              type="button"
              aria-pressed={filter.kind === "all"}
              onClick={() => setFilter({ kind: "all" })}
              onDragOver={(event) => {
                if (!admin) return;
                event.preventDefault();
              }}
              onDrop={(event) => {
                if (!admin) return;
                event.preventDefault();
                const productId = readProductDrag(event);
                if (productId) clearProductPlacement(productId);
              }}
              className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors duration-200 ${
                filter.kind === "all" ? categoryActive : categoryIdle
              }`}
            >
              Todos los productos
            </button>
          </li>
          {admin ? (
            <li
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const dragged = readCategoryDrag(event);
                if (!dragged) return;
                if (dragged.level === "child") restoreTallerCategory(dragged.id);
                if (dragged.level === "top") {
                  const first = config.categories[0];
                  if (first) {
                    updateConfig({
                      categories: reorderTopLevel(config.categories, dragged.id, first.id),
                    });
                  }
                }
              }}
              className="rounded-xl border border-dashed border-red-200 bg-red-50/60 px-3 py-2 text-[11px] font-medium text-red-700"
            >
              Soltá acá para dejar la categoría de TallerGestio en la raíz
            </li>
          ) : null}
          {visibleCategories.map((item) => {
            const inBranch = filter.kind !== "all" && filter.categoryId === item.id;
            const selected = inBranch && filter.kind === "category";
            const childOpen = inBranch && filter.kind === "sub";
            const open =
              expanded.includes(item.id) ||
              (categoryTerm.length > 0 &&
                item.children.some((child) => normalize(child.name).includes(categoryTerm)));
            const tallerItem = isTallerOrigin(item.origin);
            return (
              <li
                key={item.id}
                onDragOver={(event) => {
                  if (!admin) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!admin) return;
                  handleCategoryDrop(event, { level: "top", id: item.id });
                }}
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    draggable={admin}
                    onDragStart={(event) => {
                      if (!admin) return;
                      writeCategoryDrag(event, { level: "top", id: item.id });
                    }}
                    aria-expanded={item.children.length > 0 ? open : undefined}
                    aria-pressed={inBranch}
                    onClick={() => {
                      setFilter({ kind: "category", categoryId: item.id });
                      setExpanded((current) =>
                        current.includes(item.id) && selected ? current.filter((id) => id !== item.id) : [...new Set([...current, item.id])],
                      );
                      setFiltersOpen(false);
                    }}
                    className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors duration-200 ${
                      selected ? categoryActive : childOpen ? categoryBranch : categoryIdle
                    }`}
                  >
                    <span className={`truncate ${admin && !selected ? (tallerItem ? "text-red-600" : "text-neutral-950") : ""}`}>
                      {item.name}
                    </span>
                    {item.children.length > 0 ? <Chevron open={open} /> : null}
                  </button>
                  {admin ? (
                    <button
                      type="button"
                      aria-label={`Agregar subcategoría en ${item.name}`}
                      onClick={() => {
                        setSubDraft({ categoryId: item.id, name: "" });
                        setExpanded((current) => (current.includes(item.id) ? current : [...current, item.id]));
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-lg font-bold leading-none text-white hover:bg-sky-400"
                    >
                      +
                    </button>
                  ) : null}
                  {admin && !tallerItem ? (
                    <button
                      type="button"
                      aria-label={`Eliminar ${item.name}`}
                      onClick={() => deleteCreatedCategory(item.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
                    >
                      <TrashIcon />
                    </button>
                  ) : null}
                </div>
                {admin && subDraft?.categoryId === item.id ? (
                  <form
                    className="mt-1 flex gap-1 pl-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      addSubcategory(item.id);
                    }}
                  >
                    <input
                      autoFocus
                      value={subDraft.name}
                      onChange={(event) => setSubDraft({ categoryId: item.id, name: event.target.value })}
                      placeholder="Subcategoría"
                      className="h-9 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-2 text-sm outline-none focus:border-sky-500"
                    />
                    <button type="submit" className="rounded-xl bg-black px-2 text-xs font-bold text-white">
                      Ok
                    </button>
                  </form>
                ) : null}
                {item.children.length > 0 ? (
                  <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                      <ul className="mt-1 space-y-1 pb-1 pl-3">
                        {item.children
                          .filter((child) => !categoryTerm || normalize(child.name).includes(categoryTerm) || normalize(item.name).includes(categoryTerm))
                          .map((child) => {
                            const childSelected =
                              filter.kind === "sub" && filter.categoryId === item.id && filter.subcategoryId === child.id;
                            return (
                              <li
                                key={child.id}
                                className="flex items-center gap-1"
                                onDragOver={(event) => {
                                  if (!admin) return;
                                  event.preventDefault();
                                }}
                                onDrop={(event) => {
                                  if (!admin) return;
                                  event.stopPropagation();
                                  handleCategoryDrop(event, {
                                    level: "child",
                                    id: child.id,
                                    parentId: item.id,
                                  });
                                }}
                              >
                                <button
                                  type="button"
                                  draggable={admin}
                                  onDragStart={(event) => {
                                    if (!admin) return;
                                    event.stopPropagation();
                                    writeCategoryDrag(event, {
                                      level: "child",
                                      id: child.id,
                                      parentId: item.id,
                                    });
                                  }}
                                  aria-pressed={childSelected}
                                  onClick={() => {
                                    setFilter({ kind: "sub", categoryId: item.id, subcategoryId: child.id });
                                    setExpanded((current) => (current.includes(item.id) ? current : [...current, item.id]));
                                    setFiltersOpen(false);
                                  }}
                                  className={`flex min-w-0 flex-1 items-center rounded-xl px-3 py-1.5 text-left text-sm font-semibold transition-colors duration-200 ${
                                    childSelected ? categoryActive : categoryIdle
                                  }`}
                                >
                                  <span className={admin && !childSelected && isTallerOrigin(child.origin) ? "text-red-600" : undefined}>
                                    {child.name}
                                  </span>
                                </button>
                                {admin && !isTallerOrigin(child.origin) ? (
                                  <button
                                    type="button"
                                    aria-label={`Eliminar ${child.name}`}
                                    onClick={() => deleteCreatedChild(item.id, child.id)}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                                  >
                                    <TrashIcon />
                                  </button>
                                ) : null}
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-bold tracking-wide text-neutral-900 uppercase">Precio</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label>
            <span className="sr-only">Precio mínimo</span>
            <input
              inputMode="numeric"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value.replace(/[^\d]/g, ""))}
              placeholder="$ mín"
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-neutral-950 outline-none placeholder:text-neutral-600 focus:border-sky-500"
            />
          </label>
          <label>
            <span className="sr-only">Precio máximo</span>
            <input
              inputMode="numeric"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value.replace(/[^\d]/g, ""))}
              placeholder="$ máx"
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-neutral-950 outline-none placeholder:text-neutral-600 focus:border-sky-500"
            />
          </label>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold tracking-wide text-neutral-900 uppercase">Marca</h2>
          {selectedBrands.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedBrands([])}
              className="text-xs font-medium text-sky-600"
            >
              Ver todas
            </button>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {brands.map((brand) => {
            const selected = selectedBrands.includes(brand);
            return (
              <button
                key={brand}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleBrand(brand)}
                className={`rounded-xl border px-2 py-2 text-sm font-semibold transition-colors ${
                  selected
                    ? "border-sky-500 bg-sky-100 text-neutral-950"
                    : "border-gray-200 bg-white text-neutral-900 hover:border-gray-300"
                }`}
              >
                {brand}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold tracking-wide text-neutral-900 uppercase">
          Disponibilidad
        </h2>
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <input
            type="checkbox"
            checked={showOutOfStock}
            onChange={(event) => setShowOutOfStock(event.target.checked)}
            className="h-4 w-4 accent-sky-500"
          />
          Mostrar agotados
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <input
            type="checkbox"
            checked={onlyOffers}
            onChange={(event) => {
              setOnlyOffers(event.target.checked);
              if (!event.target.checked && vista === "ofertas" && !admin) router.replace("/tienda");
            }}
            className="h-4 w-4 accent-sky-500"
          />
          En oferta
        </label>
      </section>
    </div>
  );

  const activeCategory =
    filter.kind === "all" ? null : (config.categories.find((item) => item.id === filter.categoryId) ?? null);
  const activeSubcategory =
    filter.kind === "sub"
      ? (activeCategory?.children.find((item) => item.id === filter.subcategoryId) ?? null)
      : null;
  const showSubcategoryGrid =
    filter.kind === "category" && Boolean(activeCategory && activeCategory.children.length > 0) && normalize(query) === "";
  const panelKey = showSubcategoryGrid
    ? `grid-${activeCategory?.id}`
    : filter.kind === "sub"
      ? `sub-${filter.subcategoryId}`
      : filter.kind === "category"
        ? `cat-${filter.categoryId}`
        : "all";

  const editing = products.find((item) => item.id === editingId) ?? null;
  const imageEditing = products.find((item) => item.id === imageEditId) ?? null;

  const catalog = (
    <>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {vista === "ofertas" ? "Ofertas" : "Nuestra tienda"}
          </h1>
          {admin ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800"
            >
              + Agregar producto nuevo
            </button>
          ) : null}
        </div>

        <div className={`mt-6 ${admin ? "grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]" : "lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8"}`}>
          <aside className={admin ? "block" : "hidden lg:block"}>{filters}</aside>

          <div>
            <div className="flex items-center justify-between gap-3">
              {admin ? null : (
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 lg:hidden"
              >
                {filtersOpen ? "Ocultar filtros" : "Filtros"}
              </button>
              )}
              {showSubcategoryGrid ? null : (
              <label className="ml-auto flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span>Ordenar</span>
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-sky-500"
                >
                  <option value="relevant">Más relevantes</option>
                  <option value="price-desc">Mayor precio</option>
                  <option value="price-asc">Menor precio</option>
                </select>
              </label>
              )}
            </div>

            {!admin && filtersOpen ? (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 lg:hidden">
                {filters}
              </div>
            ) : null}

            <div key={panelKey} className="motion-safe:animate-[catalog-enter_280ms_ease-out]">
            {showSubcategoryGrid && activeCategory ? (
              <section
                className="mt-4"
                onDragOver={(event) => {
                  if (!admin) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!admin) return;
                  event.preventDefault();
                  const productId = readProductDrag(event);
                  if (productId) {
                    assignProductToStoreCategory(productId, { level: "top", id: activeCategory.id });
                  }
                }}
              >
                <h2 className="text-xl font-bold tracking-tight text-gray-900">{activeCategory.name}</h2>
                <p className="mt-1 text-base font-medium text-neutral-800">
                  {admin
                    ? "Elegí una subcategoría o soltá el producto acá / abajo para dejarlo en esta categoría."
                    : "Elegí una subcategoría"}
                </p>
                <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                  {activeCategory.children.map((child) => {
                    const cover = subcategoryCover(
                      activeCategory.image,
                      child,
                      products
                        .filter((product) => admin || !product.storeHidden)
                        .map((product) => {
                        const vis = storeVisibleCategory(
                          product.id,
                          { categoryId: product.categoryId, subcategoryId: product.subcategoryId },
                          placements,
                        );
                        return { ...product, subcategoryId: vis.subcategoryId, categoryId: vis.categoryId };
                      }),
                    );
                    const openSubcategory = () => {
                      setFilter({ kind: "sub", categoryId: activeCategory.id, subcategoryId: child.id });
                      setExpanded((current) =>
                        current.includes(activeCategory.id) ? current : [...current, activeCategory.id],
                      );
                      setFiltersOpen(false);
                    };
                    const editCover = () => setCoverEdit({ categoryId: activeCategory.id, subcategoryId: child.id });
                    return (
                      <li
                        key={child.id}
                        onDragOver={(event) => {
                          if (!admin) return;
                          event.preventDefault();
                        }}
                        onDrop={(event) => {
                          if (!admin) return;
                          event.preventDefault();
                          event.stopPropagation();
                          const productId = readProductDrag(event);
                          if (productId) {
                            assignProductToStoreCategory(productId, {
                              level: "child",
                              id: child.id,
                              parentId: activeCategory.id,
                            });
                          }
                        }}
                      >
                        {admin ? (
                          <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm">
                            <button type="button" onClick={editCover} className="group flex w-full flex-col">
                              <span className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white">
                                <img src={cover} alt="" className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" />
                              </span>
                              <span className="mt-3 line-clamp-2 px-1 text-base font-semibold text-neutral-950">{child.name}</span>
                            </button>
                            <button
                              type="button"
                              onClick={editCover}
                              className="mt-3 rounded-full bg-sky-500 px-3 py-2 text-xs font-bold text-white hover:bg-sky-400"
                            >
                              Editar imagen
                            </button>
                            <button
                              type="button"
                              onClick={openSubcategory}
                              className="mt-2 text-sm font-semibold text-neutral-800 hover:text-sky-700"
                            >
                              Ver productos
                            </button>
                          </article>
                        ) : (
                          <button
                            type="button"
                            onClick={openSubcategory}
                            className="group flex h-full w-full flex-col rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
                          >
                            <span className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white">
                              <img src={cover} alt="" className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" />
                            </span>
                            <span className="mt-3 line-clamp-2 px-1 text-base font-semibold text-neutral-950">{child.name}</span>
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
            {showSubcategoryGrid && visibleProducts.length === 0 ? null : (
              <>
            {filter.kind === "sub" && activeCategory ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setFilter({ kind: "category", categoryId: activeCategory.id })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-900 transition-colors hover:border-sky-300 hover:text-sky-700"
                >
                  <span aria-hidden="true">←</span>
                  {activeCategory.name}
                </button>
                <span className="font-medium text-gray-900">{activeSubcategory?.name}</span>
              </div>
            ) : null}
            <p className="mt-4 text-base font-semibold text-neutral-800">
              {showSubcategoryGrid && activeCategory
                ? `${visibleProducts.length === 1 ? "1 producto" : `${visibleProducts.length} productos`} en ${activeCategory.name}`
                : visibleProducts.length === 1
                  ? "1 producto"
                  : `${visibleProducts.length} productos`}
            </p>
            {onlyOffers ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOnlyOffers(false);
                    if (vista === "ofertas" && !admin) router.replace("/tienda");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-200"
                >
                  En oferta
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">Quitar filtro de ofertas</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOnlyOffers(false);
                    setSelectedBrands([]);
                    setMinPrice("");
                    setMaxPrice("");
                    setQuery("");
                    setCategoryQuery("");
                    setShowOutOfStock(false);
                    setFilter({ kind: "all" });
                    if (vista && !admin) router.replace("/tienda");
                  }}
                  className="text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700"
                >
                  Limpiar todo
                </button>
              </div>
            ) : null}

            {visibleProducts.length > 0 ? (
              <ul className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <li key={product.id}>
                    <ProductCard
                      product={product}
                      onAddToCart={() => handleAddToCart(product)}
                      onEdit={admin ? () => setEditingId(product.id) : undefined}
                      onEditImage={admin ? () => setImageEditId(product.id) : undefined}
                      onToggleHidden={admin ? () => toggleProductHidden(product.id) : undefined}
                      draggable={admin}
                      onDragStart={
                        admin
                          ? (event) => {
                              writeProductDrag(event, product.id);
                            }
                          : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-base font-medium text-neutral-800">
                No hay productos con esos filtros.
              </p>
            )}
              </>
            )}
            </div>
          </div>
        </div>
      </main>
      {admin && editing ? (
        <ProductEditModal
          product={editing}
          stock={stock[editing.id] ?? editing.stock}
          offer={offerOf(editing.id)}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            updateProduct(editing.id, patch);
            setEditingId(null);
          }}
        />
      ) : null}
      {admin && coverEdit ? (
        <SubcategoryImageModal
          name={
            config.categories
              .find((item) => item.id === coverEdit.categoryId)
              ?.children.find((child) => child.id === coverEdit.subcategoryId)?.name ?? "Subcategoría"
          }
          image={subcategoryCover(
            config.categories.find((item) => item.id === coverEdit.categoryId)?.image ?? "",
            config.categories
              .find((item) => item.id === coverEdit.categoryId)
              ?.children.find((child) => child.id === coverEdit.subcategoryId) ?? { id: coverEdit.subcategoryId },
            products,
          )}
          onClose={() => setCoverEdit(null)}
          onSave={(image) => {
            saveSubcategoryImage(coverEdit.categoryId, coverEdit.subcategoryId, image);
            setCoverEdit(null);
          }}
        />
      ) : null}
      {admin && imageEditing ? (
        <SubcategoryImageModal
          name={imageEditing.title}
          image={imageEditing.image}
          onClose={() => setImageEditId(null)}
          onSave={(image) => {
            updateProduct(imageEditing.id, { image });
            setImageEditId(null);
          }}
        />
      ) : null}
      {admin && creating ? (
        <NewProductModal
          onClose={() => setCreating(false)}
          onCreate={(input) => {
            addProduct(input);
            setCreating(false);
          }}
        />
      ) : null}
    </>
  );

  if (admin) {
    return <div className="relative text-gray-900">{catalog}</div>;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f7f8fa] text-gray-900">
      <SiteHeader
        query={query}
        onQueryChange={setQuery}
        session={session}
        onLogout={() => {
          signOut();
          setSession(null);
          closeCart();
        }}
        onCart={() => {
          if (!session) {
            setLoginOpen(true);
            return;
          }
          openCart();
        }}
      />
      <div className="relative flex-1">
        <PageSkyFade />
        <div className="relative">{catalog}</div>
      </div>
      <SiteFooter />
      <LoginPrompt
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onAccept={() => router.push("/login")}
      />
    </div>
  );
}

const categoryIdle = "text-neutral-900 hover:bg-sky-100 hover:text-sky-700";
const categoryActive = "bg-sky-700 font-bold text-white shadow-[inset_4px_0_0_#7dd3fc] hover:bg-sky-800";
const categoryBranch = "bg-sky-100 font-bold text-sky-800 shadow-[inset_4px_0_0_#0284c7]";

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M4 6.5 8 10.5 12 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
