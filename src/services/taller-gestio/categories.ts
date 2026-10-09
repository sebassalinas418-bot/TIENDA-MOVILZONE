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
  return "/categories/todo.jpg"
}

export function isTallerOrigin(origin?: CategoryOrigin) {
  return origin === "taller"
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

export function collectCategoryFilterIds(item: StoreCategorySlice) {
  return [item.id, ...item.children.map((child) => child.id)]
}

function findTallerNode(
  categories: StoreCategorySlice[],
  slug: string,
): { top?: StoreCategorySlice; child?: StoreCategoryChild; parent?: StoreCategorySlice } {
  for (const item of categories) {
    if (item.id === slug) return { top: item }
    const child = item.children.find((entry) => entry.id === slug)
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
    origin: item.origin ?? (usedSlugs.has(item.id) ? "taller" : "store"),
    children: item.children.map((child) => ({
      ...child,
      origin:
        child.origin ?? (usedSlugs.has(child.id) ? "taller" : "store"),
    })),
  }))

  for (const name of names) {
    const slug = slugTallerCategory(name)
    const found = findTallerNode(next, slug)
    if (found.top) {
      next = next.map((item) =>
        item.id === slug ? { ...item, name, origin: "taller" } : item,
      )
      continue
    }
    if (found.child && found.parent) {
      next = next.map((item) =>
        item.id === found.parent?.id
          ? {
              ...item,
              children: item.children.map((child) =>
                child.id === slug
                  ? { ...child, name, origin: "taller" as const }
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
        (child) => !isTallerOrigin(child.origin) || usedSlugs.has(child.id),
      ),
    }))
    .filter((item) => {
      if (!isTallerOrigin(item.origin)) return true
      return usedSlugs.has(item.id)
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

  let moving: StoreCategorySlice | StoreCategoryChild | null = null
  const without = categories
    .map((item) => ({
      ...item,
      children: item.children.filter((child) => {
        if (child.id !== tallerId || !isTallerOrigin(child.origin)) return true
        moving = child
        return false
      }),
    }))
    .filter((item) => {
      if (item.id !== tallerId || !isTallerOrigin(item.origin)) return true
      moving = item
      return false
    })

  if (!moving) return categories
  const nestedSubs =
    "children" in moving && Array.isArray(moving.children)
      ? moving.children.filter((entry) => !isTallerOrigin(entry.origin))
      : []
  const child: StoreCategoryChild = {
    id: moving.id,
    name: moving.name,
    image: "image" in moving ? moving.image : undefined,
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
  return categories.map((item) => {
    if (item.id !== parentId) return item
    const child = item.children.find((entry) => entry.id === childId)
    if (!child || isTallerOrigin(child.origin)) return item
    return {
      ...item,
      children: item.children.filter((entry) => entry.id !== childId),
    }
  })
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

export function unnestTallerCategory(
  categories: StoreCategorySlice[],
  tallerId: string,
) {
  let moving: StoreCategoryChild | null = null
  const without = categories.map((item) => ({
    ...item,
    children: item.children.filter((child) => {
      if (child.id !== tallerId || !isTallerOrigin(child.origin)) return true
      moving = child
      return false
    }),
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
