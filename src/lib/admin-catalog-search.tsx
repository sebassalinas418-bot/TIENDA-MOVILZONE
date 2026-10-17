"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type AdminCatalogFilter =
  | { kind: "all" }
  | { kind: "category"; categoryId: string }
  | { kind: "sub"; categoryId: string; subcategoryId: string };

export const ADMIN_CATALOG_FILTER_EVENT = "mz-admin-catalog-filter";

export function emitAdminCatalogFilter(filter: AdminCatalogFilter) {
  window.dispatchEvent(new CustomEvent<AdminCatalogFilter>(ADMIN_CATALOG_FILTER_EVENT, { detail: filter }));
}

type AdminCatalogSearchValue = {
  query: string;
  setQuery: (value: string) => void;
};

const AdminCatalogSearchContext = createContext<AdminCatalogSearchValue | null>(null);

export function AdminCatalogSearchProvider({
  children,
  initialQuery = "",
}: {
  children: ReactNode;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return <AdminCatalogSearchContext.Provider value={value}>{children}</AdminCatalogSearchContext.Provider>;
}

export function useAdminCatalogSearch() {
  return useContext(AdminCatalogSearchContext);
}
