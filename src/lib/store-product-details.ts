const STORAGE_KEY = "movilzone.product-details";

export function loadProductDetails(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const next: Record<string, string> = {};
    for (const [id, value] of Object.entries(parsed)) {
      const text = typeof value === "string" ? value.trim() : "";
      if (id && text) next[id] = text;
    }
    return next;
  } catch {
    return {};
  }
}

export function saveProductDetails(details: Record<string, string>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(details));
}

export function stripUnsafeProductHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=/gi, " ")
    .replace(/javascript:/gi, "");
}

export function matchStoreCategory(
  label: string,
  categories: { id: string; name: string; children: { id: string; name: string }[] }[],
) {
  const needle = normalize(label);
  if (!needle) return null;
  for (const category of categories) {
    if (normalize(category.id) === needle || normalize(category.name) === needle) {
      return { categoryId: category.id, subcategoryId: "", categoryName: category.name };
    }
  }
  for (const category of categories) {
    for (const child of category.children) {
      if (normalize(child.id) === needle || normalize(child.name) === needle) {
        return { categoryId: category.id, subcategoryId: child.id, categoryName: category.name };
      }
    }
  }
  for (const category of categories) {
    if (normalize(category.name).includes(needle) || needle.includes(normalize(category.name))) {
      return { categoryId: category.id, subcategoryId: "", categoryName: category.name };
    }
  }
  return null;
}

function normalize(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
