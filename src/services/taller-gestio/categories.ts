export type CategoryOrigin = "taller" | "store"

export type StoreCategoryChild = {
  id: string
  name: string
  image?: string
  origin?: CategoryOrigin
}

export type StoreCategorySlice = {
  id: string
  name: string
  image: string
  origin?: CategoryOrigin
  children: StoreCategoryChild[]
}

export function slugTallerCategory(name: string) {
  const slug = name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || "otros"
}

export function defaultCategoryImage(slug: string) {
  if (slug.includes("funda")) return "/categories/fundas.jpg"
  if (slug.includes("vidrio") || slug.includes("protector")) {
    return "/categories/protectores.jpg"
  }
  if (slug.includes("cable")) return "/categories/cables.jpg"
  if (slug.includes("cargador") || slug.includes("energia")) {
    return "/categories/cargadores.jpg"
  }
  if (
    slug.includes("auricular") ||
    slug.includes("audio") ||
    slug.includes("parlante")
  ) {
    return "/categories/audio.jpg"
  }
  if (slug.includes("soporte")) return "/categories/accesorios.jpg"
  if (slug.includes("celular") || slug.includes("telefono") || slug.includes("equipo")) {
    return "/categories/accesorios.jpg"
  }
  return "/categories/todo.jpg"
}

export function isTallerOrigin(origin?: CategoryOrigin) {
  return origin === "taller"
}

export const BUILTIN_STORE_CATEGORY_IDS = new Set([
  "celulares",
  "fundas",
  "cargadores",
  "auriculares",
  "protectores",
  "soportes",
  "accesorios",
])

export function isBuiltinStoreCategory(id: string) {
  return BUILTIN_STORE_CATEGORY_IDS.has(id)
}

const STORE_ONLY_CHILD_IDS = new Set([
  "silicona",
  "rigidas",
  "disenos",
  "magsafe",
  "inalambricos",
  "energia",
  "celulares-nuevos",
])

const CARGADORES_LEFTOVER_CHILD_IDS = new Set([
  "cables",
  "cable",
  "cargadores",
  "cargadores-rapidos",
  "cargador",
  "auto",
  "autromovil",
  "automovil",
])

function liveInventoryKeys(names: string[]) {
  const live = new Set<string>()
  for (const name of names) {
    const trimmed = name.trim()
    if (!trimmed) continue
    live.add(trimmed.toLowerCase())
    live.add(slugTallerCategory(trimmed))
  }
  return live
}

function keepAlignedNode(
  id: string,
  name: string,
  origin: CategoryOrigin | undefined,
  live: Set<string>,
) {
  if (live.has(id) || live.has(slugTallerCategory(name))) return true
  if (STORE_ONLY_CHILD_IDS.has(id) || isBuiltinStoreCategory(id)) return true
  if (isTallerOrigin(origin)) return false
  return true
}

/** Deja el menú de la tienda alineado a las categorías vivas de Taller. */
export function alignStoreMenuToTallerInventory(
  current: StoreCategorySlice[],
  liveNames: string[],
) {
  const merged = mergeTallerCategoriesIntoStore(current, liveNames)
  const live = liveInventoryKeys(liveNames)
  return stripCargadoresLeftoverChildren(
    detachCablesAsTopLevel(
      merged
        .map((item) => ({
          ...item,
          children: item.children.filter((child) =>
            keepAlignedNode(child.id, child.name, child.origin, live),
          ),
        }))
        .filter(
          (item) =>
            keepAlignedNode(item.id, item.name, item.origin, live) ||
            item.children.length > 0,
        ),
    ),
  )
}

function isCablesNode(id: string, name: string) {
  const slug = slugTallerCategory(name)
  return id === "cables" || slug === "cables" || slug === "cable"
}

function isCargadoresNode(id: string, name: string) {
  const slug = slugTallerCategory(name)
  return id === "cargadores" || slug === "cargadores"
}

function mergeCablesNode(current: StoreCategorySlice | undefined, next: StoreCategorySlice) {
  if (!current) return next
  const extras = next.children.filter((child) => !current.children.some((entry) => entry.id === child.id))
  return {
    ...current,
    ...next,
    children: [...current.children, ...extras],
  }
}

/** Cables queda categoría principal, nunca hija de Cargadores, y arriba de Cargadores. */
export function detachCablesAsTopLevel(categories: StoreCategorySlice[]) {
  let cables: StoreCategorySlice | undefined
  const rest: StoreCategorySlice[] = []
  for (const item of categories) {
    if (isCablesNode(item.id, item.name)) {
      cables = mergeCablesNode(cables, {
        ...item,
        children: item.children.filter((child) => !isCablesNode(child.id, child.name)),
      })
      continue
    }
    const nested = item.children.find((child) => isCablesNode(child.id, child.name))
    if (nested && !cables) {
      cables = {
        id: nested.id || "cables",
        name: nested.name,
        image: nested.image || defaultCategoryImage("cables"),
        origin: nested.origin ?? item.origin ?? "taller",
        children: [],
      }
    }
    rest.push({
      ...item,
      children: item.children.filter((child) => !isCablesNode(child.id, child.name)),
    })
  }
  if (!cables) return rest
  const insertAt = rest.findIndex((item) => isCargadoresNode(item.id, item.name))
  if (insertAt < 0) return [...rest, cables]
  const next = [...rest]
  next.splice(insertAt, 0, cables)
  return next
}

function isCargadoresLeftoverChild(id: string, name: string) {
  const slug = slugTallerCategory(name)
  return (
    CARGADORES_LEFTOVER_CHILD_IDS.has(id) ||
    CARGADORES_LEFTOVER_CHILD_IDS.has(slug) ||
    isCablesNode(id, name) ||
    isCargadoresNode(id, name)
  )
}

/** Saca de Cargadores las subs duplicadas (Cargadores, Cables, auto, etc.). */
export function stripCargadoresLeftoverChildren(categories: StoreCategorySlice[]) {
  return categories.map((item) => {
    if (!isCargadoresNode(item.id, item.name)) return item
    return {
      ...item,
      children: item.children.filter((child) => !isCargadoresLeftoverChild(child.id, child.name)),
    }
  })
}

/** Un PUT viejo no puede borrar subs de tienda que ya están guardadas. */
export function keepExistingStoreChildren(
  current: StoreCategorySlice[],
  incoming: StoreCategorySlice[],
) {
  return incoming.map((item) => {
    const previous = current.find((entry) => entry.id === item.id)
    if (!previous) return item
    const extras = previous.children.filter(
      (child) =>
        !isTallerOrigin(child.origin) &&
        !item.children.some((entry) => entry.id === child.id),
    )
    if (!extras.length) return item
    return { ...item, children: [...item.children, ...extras] }
  })
}

/** Tampoco puede borrar una categoría principal creada en la tienda. */
export function keepExistingStoreNodes(
  current: StoreCategorySlice[],
  incoming: StoreCategorySlice[],
) {
  const merged = keepExistingStoreChildren(current, incoming)
  const extras = current.filter(
    (item) =>
      !isTallerOrigin(item.origin) &&
      !merged.some((entry) => entry.id === item.id),
  )
  return extras.length ? [...merged, ...extras] : merged
}

export function remapCablesPlacements<T extends { categoryId: string; subcategoryId?: string }>(
  placements: Record<string, T>,
): Record<string, T> {
  const next: Record<string, T> = {}
  for (const [id, placed] of Object.entries(placements)) {
    if (isCablesNode(placed.subcategoryId ?? "", placed.subcategoryId ?? "")) {
      next[id] = { ...placed, categoryId: "cables", subcategoryId: undefined }
    } else if (
      placed.subcategoryId &&
      isCargadoresLeftoverChild(placed.subcategoryId, placed.subcategoryId)
    ) {
      next[id] = { ...placed, categoryId: "cargadores", subcategoryId: undefined }
    } else {
      next[id] = placed
    }
  }
  return next
}

export function categorySignature(categories: StoreCategorySlice[]) {
  return JSON.stringify(
    categories.map((item) => ({
      id: item.id,
      name: item.name,
      origin: item.origin ?? "store",
      children: item.children.map((child) => ({
        id: child.id,
        name: child.name,
        origin: child.origin ?? "store",
      })),
    })),
  )
}

/** Une árboles de tienda: el remoto manda el orden; las categorías/subs de la PC que falten se agregan. */
export function mergeStoreCategoryTrees(
  primary: StoreCategorySlice[],
  secondary: StoreCategorySlice[],
): StoreCategorySlice[] {
  const byId = new Map(
    primary.map((item) => [
      item.id,
      { ...item, children: [...item.children] },
    ]),
  )
  const order = primary.map((item) => item.id)
  for (const item of secondary) {
    const existing = byId.get(item.id)
    if (!existing) {
      if (isTallerOrigin(item.origin) || isBuiltinStoreCategory(item.id)) continue
      order.push(item.id)
      byId.set(item.id, { ...item, children: [...item.children] })
    }
    // No reinsertar hijos del otro árbol: si se borró "auto" en Cargadores, no tiene que volver.
  }
  return order
    .map((id) => byId.get(id))
    .filter((item): item is StoreCategorySlice => Boolean(item))
}

export function collectCategoryFilterIds(item: StoreCategorySlice) {
  return [item.id, ...item.children.map((child) => child.id)]
}

function matchesTallerSlug(id: string, name: string, slug: string) {
  return id === slug || slugTallerCategory(name) === slug
}

function inTallerInventory(id: string, name: string, usedSlugs: Set<string>) {
  return usedSlugs.has(id) || usedSlugs.has(slugTallerCategory(name))
}

function findTallerNode(
  categories: StoreCategorySlice[],
  slug: string,
): { top?: StoreCategorySlice; child?: StoreCategoryChild; parent?: StoreCategorySlice } {
  for (const item of categories) {
    if (matchesTallerSlug(item.id, item.name, slug)) return { top: item }
    const child = item.children.find((entry) =>
      matchesTallerSlug(entry.id, entry.name, slug),
    )
    if (child) return { child, parent: item }
  }
  return {}
}

export function mergeTallerCategoriesIntoStore(
  current: StoreCategorySlice[],
  tallerNames: string[],
) {
  const names = [
    ...new Set(tallerNames.map((name) => name.trim()).filter(Boolean)),
  ]
  const usedSlugs = new Set(names.map(slugTallerCategory))
  let next: StoreCategorySlice[] = current.map((item) => ({
    ...item,
    origin: inTallerInventory(item.id, item.name, usedSlugs)
      ? "taller"
      : item.origin ?? "store",
    children: item.children.map((child) => ({
      ...child,
      origin: inTallerInventory(child.id, child.name, usedSlugs)
        ? "taller"
        : child.origin ?? "store",
    })),
  }))

  for (const name of names) {
    const slug = slugTallerCategory(name)
    const found = findTallerNode(next, slug)
    if (found.top) {
      next = next.map((item) =>
        item.id === found.top?.id ? { ...item, origin: "taller" as const } : item,
      )
      continue
    }
    if (found.child && found.parent) {
      next = next.map((item) =>
        item.id === found.parent?.id
          ? {
              ...item,
              children: item.children.map((child) =>
                child.id === found.child?.id
                  ? { ...child, origin: "taller" as const }
                  : child,
              ),
            }
          : item,
      )
      continue
    }
    next.push({
      id: slug,
      name,
      origin: "taller",
      image: defaultCategoryImage(slug),
      children: [],
    })
  }

  next = next
    .map((item) => ({
      ...item,
      children: item.children.filter(
        (child) =>
          !isTallerOrigin(child.origin) ||
          inTallerInventory(child.id, child.name, usedSlugs),
      ),
    }))
    .filter((item) => {
      if (!isTallerOrigin(item.origin)) return true
      return inTallerInventory(item.id, item.name, usedSlugs)
    })

  return next
}

export function nestTallerCategory(
  categories: StoreCategorySlice[],
  tallerId: string,
  storeParentId: string,
) {
  if (tallerId === storeParentId) return categories
  const parent = categories.find((item) => item.id === storeParentId)
  if (!parent || isTallerOrigin(parent.origin)) return categories

  const movingParent = categories.find(
    (item) => item.id === tallerId && isTallerOrigin(item.origin),
  )
  const movingChild = categories
    .flatMap((item) => item.children)
    .find((child) => child.id === tallerId && isTallerOrigin(child.origin))
  const moving = movingParent ?? movingChild
  if (!moving) return categories

  const without = categories
    .map((item) => ({
      ...item,
      children: item.children.filter(
        (child) => child.id !== tallerId || !isTallerOrigin(child.origin),
      ),
    }))
    .filter((item) => item.id !== tallerId || !isTallerOrigin(item.origin))

  const nestedSubs = (movingParent?.children ?? []).filter(
    (entry) => !isTallerOrigin(entry.origin),
  )
  const child: StoreCategoryChild = {
    id: moving.id,
    name: moving.name,
    image: moving.image,
    origin: "taller",
  }

  return without.map((item) =>
    item.id === storeParentId
      ? {
          ...item,
          children: [
            ...item.children.filter((entry) => entry.id !== child.id),
            child,
            ...nestedSubs.filter(
              (entry) =>
                !item.children.some((current) => current.id === entry.id),
            ),
          ],
        }
      : item,
  )
}

export function removeStoreCategory(
  categories: StoreCategorySlice[],
  storeId: string,
) {
  const target = categories.find((item) => item.id === storeId)
  if (!target || isTallerOrigin(target.origin)) return categories
  let next = categories
  for (const child of target.children) {
    if (isTallerOrigin(child.origin)) {
      next = unnestTallerCategory(next, child.id)
    }
  }
  return next.filter((item) => item.id !== storeId)
}

export function removeStoreChild(
  categories: StoreCategorySlice[],
  parentId: string,
  childId: string,
) {
  const parent = categories.find((item) => item.id === parentId)
  const child = parent?.children.find((entry) => entry.id === childId)
  if (!child) return categories
  if (isTallerOrigin(child.origin)) {
    return unnestTallerCategory(categories, childId)
  }
  return categories.map((item) =>
    item.id !== parentId
      ? item
      : {
          ...item,
          children: item.children.filter((entry) => entry.id !== childId),
        },
  )
}

export function reorderTopLevel(
  categories: StoreCategorySlice[],
  draggedId: string,
  beforeId: string | null,
) {
  const from = categories.findIndex((item) => item.id === draggedId)
  if (from < 0) return categories
  const copy = [...categories]
  const [item] = copy.splice(from, 1)
  if (!item) return categories
  if (!beforeId || beforeId === draggedId) return [...copy, item]
  const to = copy.findIndex((entry) => entry.id === beforeId)
  if (to < 0) return [...copy, item]
  copy.splice(to, 0, item)
  return copy
}

export function reorderChildren(
  categories: StoreCategorySlice[],
  parentId: string,
  draggedId: string,
  beforeId: string | null,
) {
  return categories.map((item) => {
    if (item.id !== parentId) return item
    const from = item.children.findIndex((child) => child.id === draggedId)
    if (from < 0) return item
    const copy = [...item.children]
    const [child] = copy.splice(from, 1)
    if (!child) return item
    if (!beforeId || beforeId === draggedId) {
      return { ...item, children: [...copy, child] }
    }
    const to = copy.findIndex((entry) => entry.id === beforeId)
    if (to < 0) return { ...item, children: [...copy, child] }
    copy.splice(to, 0, child)
    return { ...item, children: copy }
  })
}

export function promoteChildToTopLevel(
  categories: StoreCategorySlice[],
  parentId: string,
  childId: string,
) {
  const parent = categories.find((item) => item.id === parentId)
  const child = parent?.children.find((entry) => entry.id === childId)
  if (!child) return categories
  const without = categories.map((item) =>
    item.id !== parentId
      ? item
      : {
          ...item,
          children: item.children.filter((entry) => entry.id !== childId),
        },
  )
  if (without.some((item) => item.id === child.id)) return without
  const insertAt = without.findIndex((item) => item.id === parentId)
  const next: StoreCategorySlice = {
    id: child.id,
    name: child.name,
    image: child.image || defaultCategoryImage(child.id),
    origin: child.origin ?? "store",
    children: [],
  }
  if (insertAt < 0) return [...without, next]
  const copy = [...without]
  copy.splice(insertAt + 1, 0, next)
  return copy
}

export function remapPlacementsAfterPromote<T extends { categoryId: string; subcategoryId?: string }>(
  placements: Record<string, T>,
  childId: string,
): Record<string, T> {
  const next: Record<string, T> = {}
  for (const [id, placed] of Object.entries(placements)) {
    if (placed.categoryId === childId || placed.subcategoryId === childId) {
      next[id] = { ...placed, categoryId: childId, subcategoryId: undefined }
    } else {
      next[id] = placed
    }
  }
  return next
}

export function unnestTallerCategory(
  categories: StoreCategorySlice[],
  tallerId: string,
) {
  const moving =
    categories
      .flatMap((item) => item.children)
      .find((child) => child.id === tallerId && isTallerOrigin(child.origin)) ??
    null
  const without = categories.map((item) => ({
    ...item,
    children: item.children.filter(
      (child) => child.id !== tallerId || !isTallerOrigin(child.origin),
    ),
  }))
  if (!moving) return categories
  if (without.some((item) => item.id === moving?.id)) return without
  return [
    ...without,
    {
      id: moving.id,
      name: moving.name,
      image: moving.image || defaultCategoryImage(moving.id),
      origin: "taller" as const,
      children: [],
    },
  ]
}
