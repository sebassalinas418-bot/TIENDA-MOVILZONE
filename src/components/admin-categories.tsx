"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStoreConfig, type CatalogCategory } from "@/config/store-config";
import { useCatalog } from "@/lib/offers";
import { deletePublishedSubcategory } from "@/lib/store-catalog-tree/client";
import { removeStoreChild } from "@/services/taller-gestio/categories";

function uniqueId(name: string, taken: string[]) {
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

export function CategoryManager() {
  const router = useRouter();
  const { config, updateConfig } = useStoreConfig();
  const { products } = useCatalog();
  const [categoryName, setCategoryName] = useState("");
  const [subNames, setSubNames] = useState<Record<string, string>>({});

  function save(categories: CatalogCategory[]) {
    updateConfig({ categories });
  }

  function addCategory() {
    const name = categoryName.trim();
    if (!name) return;
    const taken = config.categories.flatMap((item) => [item.id, ...item.children.map((child) => child.id)]);
    save([
      ...config.categories,
      { id: uniqueId(name, taken), name, image: "/categories/todo.jpg", children: [] },
    ]);
    setCategoryName("");
  }

  function renameCategory(categoryId: string, name: string) {
    save(config.categories.map((item) => (item.id === categoryId ? { ...item, name } : item)));
  }

  function removeCategory(categoryId: string) {
    save(config.categories.filter((item) => item.id !== categoryId));
  }

  function addSubcategory(categoryId: string) {
    const name = (subNames[categoryId] ?? "").trim();
    if (!name) return;
    const taken = config.categories.flatMap((item) => [item.id, ...item.children.map((child) => child.id)]);
    save(
      config.categories.map((item) =>
        item.id === categoryId
          ? { ...item, children: [...item.children, { id: uniqueId(name, taken), name }] }
          : item,
      ),
    );
    setSubNames((current) => ({ ...current, [categoryId]: "" }));
  }

  function renameSubcategory(categoryId: string, subcategoryId: string, name: string) {
    save(
      config.categories.map((item) =>
        item.id === categoryId
          ? {
              ...item,
              children: item.children.map((child) => (child.id === subcategoryId ? { ...child, name } : child)),
            }
          : item,
      ),
    );
  }

  async function removeSubcategory(categoryId: string, subcategoryId: string) {
    const previous = config.categories;
    const next = removeStoreChild(previous, categoryId, subcategoryId);
    updateConfig({ categories: next }, { persist: false });
    try {
      const body = await deletePublishedSubcategory(categoryId, subcategoryId);
      if (Array.isArray(body.categories)) {
        updateConfig({ categories: body.categories }, { persist: false });
      }
      router.refresh();
    } catch {
      updateConfig({ categories: previous }, { persist: false });
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          addCategory();
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Nueva categoría</span>
          <input
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Nueva categoría"
            className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-sky-500"
          />
        </label>
        <button type="submit" className="h-11 rounded-full bg-sky-500 px-5 text-sm font-bold text-white hover:bg-sky-400">
          Crear categoría
        </button>
      </form>

      <ul className="space-y-3">
        {config.categories.map((category) => {
          const count = products.filter((product) => product.categoryId === category.id).length;
          return (
            <li key={category.id} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Nombre de la categoría</span>
                  <input
                    value={category.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      if (name.trim()) renameCategory(category.id, name);
                    }}
                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm font-semibold outline-none focus:border-sky-500"
                  />
                </label>
                <span className="text-xs text-gray-400">{count} productos</span>
                <button
                  type="button"
                  onClick={() => removeCategory(category.id)}
                  className="rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-red-200 hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>

              <ul className="mt-3 space-y-2">
                {category.children.map((child) => (
                  <li key={child.id} className="flex items-center gap-2 pl-3">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    <input
                      value={child.name}
                      aria-label={`Subcategoría ${child.name}`}
                      onChange={(event) => {
                        const name = event.target.value;
                        if (name.trim()) renameSubcategory(category.id, child.id, name);
                      }}
                      className="h-9 min-w-0 flex-1 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => void removeSubcategory(category.id, child.id)}
                      className="text-xs font-semibold text-gray-500 hover:text-red-600"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>

              <form
                className="mt-3 flex gap-2 pl-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  addSubcategory(category.id);
                }}
              >
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Nueva subcategoría de {category.name}</span>
                  <input
                    value={subNames[category.id] ?? ""}
                    onChange={(event) => setSubNames((current) => ({ ...current, [category.id]: event.target.value }))}
                    placeholder="Nueva subcategoría"
                    className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-sky-500"
                  />
                </label>
                <button type="submit" className="rounded-full bg-black px-3 text-xs font-bold text-white hover:bg-gray-800">
                  Agregar
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
