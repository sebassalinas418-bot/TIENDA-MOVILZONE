"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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
