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
import { brands } from "@/data/products";
import { overlayCatalogStock } from "@/lib/web-pending-stock/availability";
import { storeProductGridClass } from "@/lib/store-product-grid/mobile";
import { isStoreSoldOut } from "@/lib/store-sold-out/presentation";
import { useCatalog, type CatalogProduct } from "@/lib/offers";
import { storeVisibleCategory } from "@/lib/store-product-placements";
import { useCart } from "@/lib/cart";
import { useOrders } from "@/lib/orders";
import {
  ADMIN_CATALOG_FILTER_EVENT,
  useAdminCatalogSearch,
  type AdminCatalogFilter,
} from "@/lib/admin-catalog-search";
import { useAdminCatalogPublish } from "@/lib/admin-catalog-publish";
import { useAdminAccess } from "@/lib/admin-access";
import { isSessionVerified, readSession, SESSION_EVENT, signOut, type DemoSession } from "@/lib/session";
import { storeSearchPath } from "@/lib/store-search-path";
import {
  deletePublishedSubcategory,
  persistPublishedCatalogTree,
  promotePublishedSubcategory,
} from "@/lib/store-catalog-tree/client";
import {
  collectCategoryFilterIds,
  isTallerOrigin,
  nestTallerCategory,
  promoteChildToTopLevel,
  remapPlacementsAfterPromote,
  removeStoreCategory,
  removeStoreChild,
  reorderChildren,
  reorderTopLevel,
} from "@/services/taller-gestio/categories";

const CAT_DRAG = "text/plain";
const categoryIdle = "text-neutral-900 hover:bg-sky-100 hover:text-sky-700";
const categoryActive = "bg-sky-700 font-bold text-white shadow-[inset_4px_0_0_#7dd3fc] hover:bg-sky-800";
const categoryBranch = "bg-sky-100 font-bold text-sky-800 shadow-[inset_4px_0_0_#0284c7]";
const storeSubIdle = "bg-black text-white hover:bg-neutral-800";
const storeSubActive = "bg-black font-bold text-white ring-1 ring-white/70";

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

type CatalogCategory = {
  id: string;
  name: string;
  children: { id: string; name: string }[];
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function searchTokens(value: string) {
  return normalize(value).split(/\s+/).filter(Boolean);
}

function textMatchesSearch(haystack: string, term: string) {
  const tokens = searchTokens(term);
  if (tokens.length === 0) return true;
  const hay = normalize(haystack);
  return tokens.every((token) => hay.includes(token));
}

function productMatchesSearch(
  product: { title: string; brand: string; category: string; details?: string },
  term: string,
) {
  return textMatchesSearch(
    [product.title, product.brand, product.category, product.details ?? ""].join(" "),
    term,
  );
}

function readCatalogFilter(
  params: { get(name: string): string | null },
  categories: CatalogCategory[],
): CategoryFilter {
  if (params.get("vista") === "ofertas") return { kind: "all" };
  const categoria = params.get("categoria");
  const sub = params.get("sub");
  if (!categoria) return { kind: "all" };
  const match = categories.find((item) => item.id === categoria || item.name === categoria);
  const nestedParent = match
    ? null
    : categories.find((item) =>
        item.children.some((child) => child.id === categoria || child.name === categoria),
      );
  const resolved = match ?? nestedParent;
  if (!resolved) return { kind: "all" };
  const child = sub
    ? resolved.children.find((item) => item.id === sub || item.name === sub)
    : nestedParent
      ? resolved.children.find((item) => item.id === categoria || item.name === categoria)
      : undefined;
  if (child) return { kind: "sub", categoryId: resolved.id, subcategoryId: child.id };
  return { kind: "category", categoryId: resolved.id };
}

function catalogHref(filter: CategoryFilter, extras?: { vista?: string | null; q?: string | null }) {
  const params = new URLSearchParams();
  if (extras?.vista === "ofertas") {
    params.set("vista", "ofertas");
  } else {
    if (filter.kind === "category" || filter.kind === "sub") params.set("categoria", filter.categoryId);
    if (filter.kind === "sub") params.set("sub", filter.subcategoryId);
    if (extras?.q) params.set("q", extras.q);
  }
  const query = params.toString();
  return query ? `/tienda?${query}` : "/tienda";
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
  const searchParams = useSearchParams();
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
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showOutOfStock, setShowOutOfStock] = useState(true);
  const [onlyOffers, setOnlyOffers] = useState(() => searchParams.get("vista") === "ofertas");
  const [sortKey, setSortKey] = useState<SortKey>("relevant");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [subDraft, setSubDraft] = useState<{ categoryId: string; name: string } | null>(null);
  const [coverEdit, setCoverEdit] = useState<{ categoryId: string; subcategoryId: string } | null>(null);
  const [imageEditId, setImageEditId] = useState<string | null>(null);
  const [relocateSub, setRelocateSub] = useState<{
    mode: "child" | "top";
    parentId: string;
    childId: string;
    childName: string;
    parentName: string;
    products: { id: string; title: string }[];
    dest: string;
  } | null>(null);
  const [relocating, setRelocating] = useState(false);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const { addItem, openCart, closeCart } = useCart();
  const { stock } = useOrders();
  const { isAdmin: sessionIsAdmin } = useAdminAccess();
  const catalogPublish = useAdminCatalogPublish();
  const canManage = admin || sessionIsAdmin;
  const adminSearch = useAdminCatalogSearch();

  const previousVista = useRef<string | null | undefined>(undefined);
  const searchKey = searchParams.toString();

  function applyFilter(next: CategoryFilter, historyMode: "push" | "replace" = "push") {
    setFilter(next);
    if (admin) return;
    const href = catalogHref(next);
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === href) return;
    if (historyMode === "replace") window.history.replaceState({ mzCatalog: true }, "", href);
    else window.history.pushState({ mzCatalog: true }, "", href);
    setOnlyOffers(false);
  }

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    return () => window.removeEventListener(SESSION_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!admin || !adminSearch) return;
    setQuery(adminSearch.query);
    if (adminSearch.query.trim()) {
      setFilter({ kind: "all" });
      setOnlyOffers(false);
    }
  }, [admin, adminSearch?.query]);

  useEffect(() => {
    if (!admin) return;
    const onPick = (event: Event) => {
      const detail = (event as CustomEvent<AdminCatalogFilter>).detail;
      if (!detail) return;
      setQuery("");
      adminSearch?.setQuery("");
      setOnlyOffers(false);
      setFilter(detail);
      if (detail.kind !== "all") {
        setExpanded((current) => (current.includes(detail.categoryId) ? current : [...current, detail.categoryId]));
      }
    };
    window.addEventListener(ADMIN_CATALOG_FILTER_EVENT, onPick);
    return () => window.removeEventListener(ADMIN_CATALOG_FILTER_EVENT, onPick);
  }, [admin, adminSearch]);

  useEffect(() => {
    if (admin) return;
    const syncFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const nextFilter = readCatalogFilter(params, config.categories);
      setFilter(nextFilter);
      const isOffers = params.get("vista") === "ofertas";
      setOnlyOffers(isOffers);
      const nextQ = params.get("q");
      if (nextQ !== null) setQuery(nextQ);
      else if (!params.toString()) setQuery("");
      if (nextFilter.kind !== "all") {
        setExpanded((current) =>
          current.includes(nextFilter.categoryId) ? current : [...current, nextFilter.categoryId],
        );
      }
      const currentVista = params.get("vista");
      if (previousVista.current !== undefined && previousVista.current !== currentVista) {
        setSelectedBrands([]);
        setMinPrice("");
        setMaxPrice("");
        setShowOutOfStock(false);
        setCategoryQuery("");
        setSortKey("relevant");
        setFiltersOpen(false);
        if (isOffers) setFilter({ kind: "all" });
      }
      previousVista.current = currentVista;
    };
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, [admin, searchKey, config.categories]);

  useEffect(() => {
    if (filter.kind === "all" || config.categories.length === 0) return;
    const match = config.categories.find((item) => item.id === filter.categoryId);
    if (!match) {
      setFilter({ kind: "all" });
      return;
    }
    if (filter.kind === "sub" && !match.children.some((item) => item.id === filter.subcategoryId)) {
      setFilter({ kind: "category", categoryId: match.id });
    }
  }, [config.categories, filter]);

  const searchTerm = query.trim();
  const categoryTerm = categoryQuery.trim();
  const visibleCategories = config.categories.filter((item) => {
    if (!categoryTerm) return true;
    return (
      textMatchesSearch(item.name, categoryTerm) ||
      item.children.some((child) => textMatchesSearch(child.name, categoryTerm))
    );
  });

  const visibleProducts = useMemo(() => {
    const term = searchTerm;
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);

    const live = products.map((product) => overlayCatalogStock(product, stock[product.id] ?? product.stock));
    const filtered = live.filter((product) => {
      const vis = storeVisibleCategory(
        product.id,
        { categoryId: product.categoryId, subcategoryId: product.subcategoryId },
        placements,
      );
      const catalogFilter = onlyOffers || term ? ({ kind: "all" } as const) : filter;
      const parent =
        catalogFilter.kind === "all"
          ? null
          : (config.categories.find((item) => item.id === catalogFilter.categoryId) ?? null);
      const ids = parent ? collectCategoryFilterIds(parent) : [];
      const child =
        catalogFilter.kind === "sub"
          ? parent?.children.find((item) => item.id === catalogFilter.subcategoryId)
          : null;
      const childIds = new Set(parent?.children.map((item) => item.id) ?? []);
      const onChild =
        childIds.has(vis.subcategoryId) ||
        (vis.categoryId !== parent?.id && childIds.has(vis.categoryId));
      const matchesCategory =
        catalogFilter.kind === "all" ||
        (catalogFilter.kind === "category" &&
          parent &&
          (vis.categoryId === parent.id || vis.subcategoryId === parent.id || ids.includes(vis.categoryId)) &&
          (admin || !onChild)) ||
        (catalogFilter.kind === "sub" &&
          child &&
          (vis.subcategoryId === child.id || vis.categoryId === child.id));
      const matchesQuery = !term || productMatchesSearch(product, term);
      const matchesMin = min === null || Number.isNaN(min) || product.salePrice >= min;
      const matchesMax = max === null || Number.isNaN(max) || product.salePrice <= max;
      const matchesBrand =
        selectedBrands.length === 0 || selectedBrands.includes(product.brand);
      const matchesStock = showOutOfStock || !isStoreSoldOut(product);
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
  }, [admin, categoryQuery, config.categories, filter, maxPrice, minPrice, onlyOffers, placements, products, query, searchTerm, selectedBrands, showOutOfStock, sortKey, stock]);

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
    const previous = config.categories;
    const next = [
      ...previous,
      { id: slugId(name), name, image: "/categories/todo.jpg", origin: "store" as const, children: [] },
    ];
    updateConfig({ categories: next }, { persist: false });
    setCategoryDraft("");
    setAddingCategory(false);
    void persistHierarchy(previous, next);
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
    const previous = config.categories;
    const next = previous.map((item) =>
      item.id === categoryId
        ? { ...item, children: [...item.children, { id: slugId(name), name, origin: "store" as const }] }
        : item,
    );
    updateConfig({ categories: next }, { persist: false });
    setExpanded((current) => (current.includes(categoryId) ? current : [...current, categoryId]));
    setSubDraft(null);
    void persistHierarchy(previous, next);
  }

  function nestIntoStoreCategory(tallerId: string, storeParentId: string) {
    const previous = config.categories;
    const next = nestTallerCategory(previous, tallerId, storeParentId);
    updateConfig({ categories: next }, { persist: false });
    setExpanded((current) =>
      current.includes(storeParentId) ? current : [...current, storeParentId],
    );
    void persistHierarchy(previous, next);
  }

  function promoteSubcategoryToMain(parentId: string, childId: string) {
    const parent = config.categories.find((item) => item.id === parentId);
    const child = parent?.children.find((item) => item.id === childId);
    if (!parent || !child) return;
    const inSub = productsInSubcategory(parentId, childId);
    const previous = config.categories;
    const next = promoteChildToTopLevel(previous, parentId, childId);
    updateConfig({ categories: next }, { persist: false });
    for (const product of inSub) {
      void updateProduct(product.id, {
        category: child.name,
        categoryId: child.id,
        subcategoryId: "",
      });
    }
    setFilter({ kind: "category", categoryId: child.id });
    void (async () => {
      try {
        const body = await promotePublishedSubcategory(parentId, childId);
        if (Array.isArray(body.categories)) {
          updateConfig({ categories: body.categories }, { persist: false });
        }
        router.refresh();
      } catch {
        updateConfig({ categories: previous }, { persist: false });
      }
    })();
  }

  async function persistHierarchy(
    previous: typeof config.categories,
    next: typeof config.categories,
    nextPlacements = placements,
  ) {
    try {
      const body = await persistPublishedCatalogTree(next, nextPlacements);
      if (Array.isArray(body.categories)) {
        updateConfig({ categories: body.categories }, { persist: false });
      }
      router.refresh();
    } catch {
      updateConfig({ categories: previous }, { persist: false });
    }
  }

  function deleteCreatedCategory(storeId: string) {
    const item = config.categories.find((entry) => entry.id === storeId);
    if (!item) return;
    const ids = new Set(collectCategoryFilterIds(item));
    const inCat = products.filter((product) => {
      const vis = storeVisibleCategory(
        product.id,
        { categoryId: product.categoryId, subcategoryId: product.subcategoryId },
        placements,
      );
      return ids.has(vis.categoryId) || ids.has(vis.subcategoryId);
    });
    const fallback = config.categories.find(
      (entry) => entry.id !== storeId && !isTallerOrigin(entry.origin),
    ) ?? config.categories.find((entry) => entry.id !== storeId);
    if (inCat.length > 0 && fallback) {
      setRelocateSub({
        mode: "top",
        parentId: "",
        childId: storeId,
        childName: item.name,
        parentName: item.name,
        products: inCat.map((product) => ({ id: product.id, title: product.title })),
        dest: `cat:${fallback.id}`,
      });
      return;
    }
    updateConfig({ categories: removeStoreCategory(config.categories, storeId) });
    if (filter.kind !== "all" && filter.categoryId === storeId) {
      setFilter({ kind: "all" });
    }
  }

  function productsInSubcategory(parentId: string, childId: string) {
    return products.filter((product) => {
      const vis = storeVisibleCategory(
        product.id,
        { categoryId: product.categoryId, subcategoryId: product.subcategoryId },
        placements,
      );
      return vis.subcategoryId === childId || vis.categoryId === childId;
    });
  }

  async function removeChildAndResetFilter(parentId: string, childId: string) {
    const previous = config.categories;
    const next = removeStoreChild(previous, parentId, childId);
    updateConfig({ categories: next }, { persist: false });
    if (filter.kind === "sub" && filter.subcategoryId === childId) {
      setFilter({ kind: "category", categoryId: parentId });
    }
    try {
      const body = await deletePublishedSubcategory(parentId, childId);
      if (Array.isArray(body.categories)) {
        updateConfig({ categories: body.categories }, { persist: false });
      }
      router.refresh();
    } catch {
      updateConfig({ categories: previous }, { persist: false });
    }
  }

  function remapPlacementsToParent(
    current: typeof placements,
    parentId: string,
    childId: string,
  ) {
    const next = { ...current };
    for (const [id, placed] of Object.entries(next)) {
      if (placed.subcategoryId === childId || placed.categoryId === childId) {
        next[id] = { categoryId: parentId };
      }
    }
    return next;
  }

  function deleteCreatedChild(parentId: string, childId: string) {
    const parent = config.categories.find((item) => item.id === parentId);
    const child = parent?.children.find((item) => item.id === childId);
    if (!parent || !child) return;
    if (!isTallerOrigin(child.origin)) {
      for (const product of productsInSubcategory(parentId, childId)) {
        placeProduct(product.id, parentId);
      }
    }
    return removeChildAndResetFilter(parentId, childId);
  }

  function resolveRelocateDest(dest: string) {
    if (dest.startsWith("parent:")) {
      const id = dest.slice(7);
      const parent = config.categories.find((item) => item.id === id);
      return { categoryId: id, subcategoryId: "", categoryName: parent?.name ?? id, label: parent?.name ?? id };
    }
    if (dest.startsWith("sub:")) {
      const id = dest.slice(4);
      const parent = config.categories.find((item) => item.children.some((child) => child.id === id));
      const child = parent?.children.find((item) => item.id === id);
      return {
        categoryId: parent?.id ?? id,
        subcategoryId: id,
        categoryName: parent?.name ?? id,
        label: parent && child ? `${parent.name} → ${child.name}` : (child?.name ?? id),
      };
    }
    if (dest.startsWith("cat:")) {
      const id = dest.slice(4);
      const item = config.categories.find((entry) => entry.id === id);
      return { categoryId: id, subcategoryId: "", categoryName: item?.name ?? id, label: item?.name ?? id };
    }
    return null;
  }

  async function confirmRelocateAndDelete() {
    if (!relocateSub) return;
    const next = resolveRelocateDest(relocateSub.dest);
    if (!next) return;
    setRelocating(true);
    try {
      for (const product of relocateSub.products) {
        await updateProduct(product.id, {
          category: next.categoryName,
          categoryId: next.categoryId,
          subcategoryId: next.subcategoryId,
        });
      }
      if (relocateSub.mode === "top") {
        updateConfig({ categories: removeStoreCategory(config.categories, relocateSub.childId) });
        if (filter.kind !== "all" && filter.categoryId === relocateSub.childId) {
          setFilter({ kind: "all" });
        }
      } else {
        await removeChildAndResetFilter(relocateSub.parentId, relocateSub.childId);
      }
      setRelocateSub(null);
    } finally {
      setRelocating(false);
    }
  }

  function handleCategoryDrop(event: DragEvent, target: CategoryDrag) {
    event.preventDefault();
    const productId = readProductDrag(event);
    if (productId) {
      void assignProductToStoreCategory(productId, target);
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
      const previous = config.categories;
      const next = reorderTopLevel(previous, dragged.id, target.id);
      updateConfig({ categories: next }, { persist: false });
      void persistHierarchy(previous, next);
      return;
    }
    if (dragged.level === "child" && target.level === "child" && dragged.parentId === target.parentId) {
      const previous = config.categories;
      const next = reorderChildren(previous, dragged.parentId, dragged.id, target.id);
      updateConfig({ categories: next }, { persist: false });
      void persistHierarchy(previous, next);
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

  async function assignProductToStoreCategory(productId: string, target: CategoryDrag) {
    const next =
      target.level === "top"
        ? {
            categoryId: target.id,
            subcategoryId: "",
            categoryName: config.categories.find((entry) => entry.id === target.id)?.name ?? target.id,
          }
        : {
            categoryId: target.parentId,
            subcategoryId: target.id,
            categoryName:
              config.categories.find((entry) => entry.id === target.parentId)?.name ?? target.parentId,
          };
    const nextPlacements = {
      ...placements,
      [productId]: {
        categoryId: next.categoryId,
        subcategoryId: next.subcategoryId || undefined,
      },
    };
    await updateProduct(productId, {
      category: next.categoryName,
      categoryId: next.categoryId,
      subcategoryId: next.subcategoryId,
    });
    await persistPublishedCatalogTree(config.categories, nextPlacements);
    router.refresh();
    if (next.subcategoryId) {
      setFilter({ kind: "sub", categoryId: next.categoryId, subcategoryId: next.subcategoryId });
      setExpanded((current) =>
        current.includes(next.categoryId) ? current : [...current, next.categoryId],
      );
      return;
    }
    setFilter({ kind: "category", categoryId: next.categoryId });
    setExpanded((current) =>
      current.includes(next.categoryId) ? current : [...current, next.categoryId],
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
    if (!product.inStock || product.pendingHold) return;
    if (!admin && product.storeHidden) return;
    addItem(product.id);
  }

  const productSearchField = (
    <label className="block min-w-0 flex-1">
      <span className="sr-only">Buscar productos</span>
      <input
        type="search"
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          adminSearch?.setQuery(value);
          if (value.trim()) {
            setFilter({ kind: "all" });
            setOnlyOffers(false);
          }
        }}
        placeholder="Buscar producto..."
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-neutral-950 outline-none placeholder:text-neutral-600 focus:border-sky-500"
      />
    </label>
  );

  const extraFilters = (
    <>
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
              if (admin) {
                setOnlyOffers(event.target.checked);
                return;
              }
              if (event.target.checked) window.location.assign("/tienda?vista=ofertas");
              else window.location.assign("/tienda");
            }}
            className="h-4 w-4 accent-sky-500"
          />
          En oferta
        </label>
      </section>
    </>
  );

  const filters = (
    <div className="space-y-4 lg:space-y-6">
      {admin ? null : (
      <section>
        <h2 className="text-sm font-bold tracking-wide text-neutral-900 uppercase">Productos</h2>
        <div className="mt-3">{productSearchField}</div>
      </section>
      )}
      <section>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold tracking-wide text-neutral-900 uppercase">Categoría</h2>
          {admin ? (
            <p className="mt-1 hidden text-[11px] font-medium leading-snug text-neutral-600 lg:block">
              Arrastrá un producto y soltalo en una categoría o subcategoría de la tienda. No cambia TallerGestio.
            </p>
          ) : null}
        </div>
        {admin && !addingCategory ? (
          <button
            type="button"
            onClick={() => setAddingCategory(true)}
            className="mt-2 flex w-full items-center justify-center rounded-xl border border-dashed border-sky-300 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 hover:bg-sky-100"
          >
            + Nueva categoría
          </button>
        ) : null}
        {admin ? (
          <p className="mt-2 hidden text-[11px] leading-4 text-neutral-500 lg:block">
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
        <label className="mt-2 block">
          <span className="sr-only">Buscar categoría</span>
          <input
            type="search"
            value={categoryQuery}
            onChange={(event) => setCategoryQuery(event.target.value)}
            placeholder="Buscar categoría..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-neutral-950 outline-none placeholder:text-neutral-600 focus:border-sky-500"
          />
        </label>
        <ul className={`mt-2 space-y-0.5 ${admin ? "max-h-[36vh] overflow-y-auto overscroll-contain pr-1 lg:max-h-[70vh]" : "space-y-1"}`}>
          <li>
            <button
              type="button"
              aria-pressed={filter.kind === "all"}
              onClick={() => applyFilter({ kind: "all" })}
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
                if (dragged.level === "child") {
                  promoteSubcategoryToMain(dragged.parentId, dragged.id);
                  return;
                }
                if (dragged.level === "top") {
                  const first = config.categories[0];
                  if (first) {
                    const previous = config.categories;
                    const next = reorderTopLevel(previous, dragged.id, first.id);
                    updateConfig({ categories: next }, { persist: false });
                    void persistHierarchy(previous, next);
                  }
                }
              }}
              className="rounded-xl border border-dashed border-sky-300 bg-sky-50 px-3 py-1.5 text-[11px] font-medium leading-snug text-sky-800"
            >
              Soltá acá una subcategoría para dejarla como categoría principal
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
                      applyFilter({ kind: "category", categoryId: item.id });
                      setExpanded((current) =>
                        current.includes(item.id) && selected ? current.filter((id) => id !== item.id) : [...new Set([...current, item.id])],
                      );
                      setFiltersOpen(false);
                    }}
                    className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-semibold transition-colors duration-200 ${
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
                                    applyFilter({ kind: "sub", categoryId: item.id, subcategoryId: child.id });
                                    setExpanded((current) => (current.includes(item.id) ? current : [...current, item.id]));
                                    setFiltersOpen(false);
                                  }}
                                  className={`flex min-w-0 flex-1 items-center rounded-xl px-3 py-1.5 text-left text-sm font-semibold transition-colors duration-200 ${
                                    isTallerOrigin(child.origin)
                                      ? childSelected
                                        ? categoryActive
                                        : categoryIdle
                                      : childSelected
                                        ? storeSubActive
                                        : storeSubIdle
                                  }`}
                                >
                                  <span
                                    className={
                                      admin && !childSelected && isTallerOrigin(child.origin)
                                        ? "text-red-600"
                                        : undefined
                                    }
                                  >
                                    {child.name}
                                  </span>
                                </button>
                                {admin && !isTallerOrigin(child.origin) ? (
                                  <button
                                    type="button"
                                    aria-label={`Eliminar ${child.name}`}
                                    onClick={() => void deleteCreatedChild(item.id, child.id)}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold leading-none text-white hover:bg-neutral-800"
                                  >
                                    ×
                                  </button>
                                ) : admin ? (
                                  <button
                                    type="button"
                                    aria-label={`Sacar ${child.name} de ${item.name}`}
                                    onClick={() => void deleteCreatedChild(item.id, child.id)}
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

      {admin ? (
        <>
          <details className="rounded-xl border border-gray-200 bg-white px-3 py-2 lg:hidden">
            <summary className="cursor-pointer text-sm font-bold text-neutral-900">Más filtros</summary>
            <div className="mt-3 space-y-4">{extraFilters}</div>
          </details>
          <div className="hidden space-y-6 lg:block">{extraFilters}</div>
        </>
      ) : (
        extraFilters
      )}
    </div>
  );

  const activeCategory =
    filter.kind === "all" ? null : (config.categories.find((item) => item.id === filter.categoryId) ?? null);
  const activeSubcategory =
    filter.kind === "sub"
      ? (activeCategory?.children.find((item) => item.id === filter.subcategoryId) ?? null)
      : null;
  const showSubcategoryGrid =
    !admin &&
    !onlyOffers &&
    filter.kind === "category" &&
    Boolean(activeCategory && activeCategory.children.length > 0) &&
    normalize(query) === "" &&
    normalize(categoryQuery) === "";
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
      <main className={`mx-auto w-full max-w-6xl flex-1 px-2 py-3 sm:px-6 sm:py-8 ${admin && catalogPublish?.pending ? "pb-28" : ""}`}>
        {admin ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-2 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="flex items-center gap-2">
              {productSearchField}
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="shrink-0 rounded-full bg-black px-3 py-2.5 text-sm font-bold text-white hover:bg-gray-800 sm:px-4"
              >
                + Producto
              </button>
            </div>
          </div>
        ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {onlyOffers ? "Ofertas" : "Nuestra tienda"}
          </h1>
        </div>
        )}

        <div className={`mt-3 sm:mt-6 ${admin ? "grid gap-3 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8" : "lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8"}`}>
          <aside className="hidden lg:block">{filters}</aside>

          <div>
            <div className="flex items-center justify-between gap-3">
              {admin ? null : (
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 sm:px-4 sm:py-2 lg:hidden"
              >
                {filtersOpen ? "Ocultar filtros" : "Filtros"}
              </button>
              )}
              {showSubcategoryGrid ? null : (
              <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-neutral-900 sm:text-sm">
                <span>Ordenar</span>
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  className="h-8 rounded-xl border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none focus:border-sky-500 sm:h-10 sm:px-3 sm:text-sm"
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
                    void assignProductToStoreCategory(productId, { level: "top", id: activeCategory.id });
                  }
                }}
              >
                <h2 className="text-xl font-bold tracking-tight text-gray-900">{activeCategory.name}</h2>
                <p className="mt-1 text-base font-medium text-neutral-800">
                  {admin
                    ? "Elegí una subcategoría o soltá el producto acá / abajo para dejarlo en esta categoría."
                    : "Elegí una subcategoría"}
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
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
                      applyFilter({ kind: "sub", categoryId: activeCategory.id, subcategoryId: child.id });
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
                            void assignProductToStoreCategory(productId, {
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
                  onClick={() => applyFilter({ kind: "category", categoryId: activeCategory.id })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-900 transition-colors hover:border-sky-300 hover:text-sky-700"
                >
                  <span aria-hidden="true">←</span>
                  {activeCategory.name}
                </button>
                <span className="font-medium text-gray-900">{activeSubcategory?.name}</span>
              </div>
            ) : null}
            <p className="mt-3 text-sm font-semibold text-neutral-800 sm:mt-4 sm:text-base">
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
                    if (admin) {
                      setOnlyOffers(false);
                      return;
                    }
                    window.location.assign("/tienda");
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
                    setSelectedBrands([]);
                    setMinPrice("");
                    setMaxPrice("");
                    setQuery("");
                    adminSearch?.setQuery("");
                    setCategoryQuery("");
                    setShowOutOfStock(false);
                    if (admin) {
                      setOnlyOffers(false);
                      setFilter({ kind: "all" });
                      return;
                    }
                    window.location.assign("/tienda");
                  }}
                  className="text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700"
                >
                  Limpiar todo
                </button>
              </div>
            ) : null}

            {visibleProducts.length > 0 ? (
              <ul className={storeProductGridClass}>
                {visibleProducts.map((product) => (
                  <li key={product.id} className="min-w-0">
                    <ProductCard
                      product={product}
                      onAddToCart={() => handleAddToCart(product)}
                      onEdit={canManage ? () => setEditingId(product.id) : undefined}
                      onEditImage={canManage ? () => setImageEditId(product.id) : undefined}
                      onToggleHidden={canManage ? () => toggleProductHidden(product.id) : undefined}
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
      {admin && relocateSub ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !relocating) setRelocateSub(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="relocate-sub-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
          >
            <h2 id="relocate-sub-title" className="text-lg font-bold text-neutral-950">
              Mover productos antes de borrar
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              <span className="font-semibold text-neutral-950">{relocateSub.childName}</span> tiene{" "}
              {relocateSub.products.length}{" "}
              {relocateSub.products.length === 1 ? "producto" : "productos"}. Elegí a dónde van antes de eliminar{" "}
              {relocateSub.mode === "top" ? "la categoría" : "la subcategoría"}.
            </p>
            <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-gray-100 bg-[#f7f8fa] px-3 py-2">
              {relocateSub.products.map((item) => (
                <li key={item.id} className="truncate text-sm font-medium text-neutral-800">
                  {item.title}
                </li>
              ))}
            </ul>
            <label className="mt-4 block text-sm font-semibold text-neutral-900">
              Mover a
              <select
                value={relocateSub.dest}
                onChange={(event) => setRelocateSub({ ...relocateSub, dest: event.target.value })}
                className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-neutral-950 outline-none focus:border-sky-500"
              >
                {relocateSub.mode === "child" ? (
                  <option value={`parent:${relocateSub.parentId}`}>{relocateSub.parentName} (sin subcategoría)</option>
                ) : null}
                {relocateSub.mode === "child"
                  ? config.categories
                      .find((item) => item.id === relocateSub.parentId)
                      ?.children.filter((child) => child.id !== relocateSub.childId)
                      .map((child) => (
                        <option key={child.id} value={`sub:${child.id}`}>
                          {relocateSub.parentName} → {child.name}
                        </option>
                      ))
                  : null}
                {config.categories
                  .filter(
                    (item) =>
                      item.id !== relocateSub.childId &&
                      item.id !== relocateSub.parentId &&
                      !isTallerOrigin(item.origin),
                  )
                  .map((item) => (
                    <option key={item.id} value={`cat:${item.id}`}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={relocating}
                onClick={() => setRelocateSub(null)}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-100 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={relocating}
                onClick={() => void confirmRelocateAndDelete()}
                className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-60"
              >
                {relocating ? "Moviendo..." : "Mover y eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {canManage && editing ? (
        <ProductEditModal
          product={editing}
          stock={stock[editing.id] ?? editing.stock}
          offer={offerOf(editing.id)}
          onClose={() => setEditingId(null)}
          onSave={async (patch) => {
            await updateProduct(editing.id, patch);
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
      {canManage && imageEditing ? (
        <SubcategoryImageModal
          name={imageEditing.title}
          image={imageEditing.image}
          productId={imageEditing.id}
          extraImages={imageEditing.extraImages}
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
          onCreate={async (input) => {
            await addProduct(input);
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
        onSearch={(value) => router.push(storeSearchPath(value, canManage))}
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
