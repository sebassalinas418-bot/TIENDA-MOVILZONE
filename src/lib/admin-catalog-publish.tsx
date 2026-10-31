"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useCatalog } from "@/lib/offers";
import { useStoreConfig } from "@/config/store-config";
import {
  catalogTreeHasUnsavedChanges,
  persistPublishedCatalogTree,
  subscribeCatalogTreeQueue,
} from "@/lib/store-catalog-tree/client";

type AdminCatalogPublishValue = {
  pending: boolean;
  publishing: boolean;
  error: string | null;
  publish: () => Promise<boolean>;
  requestLeave: (next: () => void) => void;
};

const AdminCatalogPublishContext = createContext<AdminCatalogPublishValue | null>(null);

export function useAdminCatalogPublish() {
  return useContext(AdminCatalogPublishContext);
}

export function AdminCatalogPublishProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { config } = useStoreConfig();
  const { placements } = useCatalog();
  const [pending, setPending] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onAdmin, setOnAdmin] = useState(false);
  const configRef = useRef(config.categories);
  const placementsRef = useRef(placements);
  configRef.current = config.categories;
  placementsRef.current = placements;

  useEffect(() => {
    if (!window.location.pathname.startsWith("/admin")) return;
    setOnAdmin(true);
    const syncPending = () => {
      queueMicrotask(() => setPending(catalogTreeHasUnsavedChanges(configRef.current)));
    };
    syncPending();
    return subscribeCatalogTreeQueue(syncPending);
  }, []);

  useEffect(() => {
    setPending(catalogTreeHasUnsavedChanges(config.categories));
  }, [config.categories]);

  const publish = useCallback(async () => {
    setPublishing(true);
    setError(null);
    try {
      await persistPublishedCatalogTree(configRef.current, placementsRef.current);
      router.refresh();
      setPending(false);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudieron publicar los cambios.");
      setPending(true);
      return false;
    } finally {
      setPublishing(false);
    }
  }, [router]);

  const requestLeave = useCallback((next: () => void) => {
    next();
  }, []);

  return (
    <AdminCatalogPublishContext.Provider value={{ pending, publishing, error, publish, requestLeave }}>
      {children}
      {onAdmin && (pending || publishing) ? (
        <button
          type="button"
          disabled={publishing}
          onClick={() => void publish()}
          className="fixed right-6 bottom-6 z-[70] rounded-full bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-green-500 disabled:opacity-60"
        >
          {publishing ? "Guardando..." : "Reintentar guardado"}
        </button>
      ) : null}
      {error ? (
        <p className="fixed right-6 bottom-[5.5rem] z-[70] w-[min(100%-3rem,20rem)] rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </AdminCatalogPublishContext.Provider>
  );
}
