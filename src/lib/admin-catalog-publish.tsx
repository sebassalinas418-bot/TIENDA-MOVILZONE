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
  setCatalogTreePublishHold,
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
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [onAdmin, setOnAdmin] = useState(false);
  const leaveNext = useRef<(() => void) | null>(null);
  const configRef = useRef(config.categories);
  const placementsRef = useRef(placements);
  configRef.current = config.categories;
  placementsRef.current = placements;

  useEffect(() => {
    if (!window.location.pathname.startsWith("/admin")) return;
    setOnAdmin(true);
    setCatalogTreePublishHold(true);
    const syncPending = () => {
      queueMicrotask(() => setPending(catalogTreeHasUnsavedChanges(configRef.current)));
    };
    syncPending();
    const stop = subscribeCatalogTreeQueue(syncPending);
    return () => {
      stop();
      setCatalogTreePublishHold(false);
    };
  }, []);

  useEffect(() => {
    setPending(catalogTreeHasUnsavedChanges(config.categories));
  }, [config.categories]);

  useEffect(() => {
    if (!pending) return;
    function onUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [pending]);

  const publish = useCallback(async () => {
    setPublishing(true);
    setError(null);
    try {
      await persistPublishedCatalogTree(configRef.current, placementsRef.current);
      router.refresh();
      setPending(false);
      setLeaveOpen(false);
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
    if (!catalogTreeHasUnsavedChanges(configRef.current)) {
      next();
      return;
    }
    leaveNext.current = next;
    setLeaveOpen(true);
  }, []);

  async function confirmAndLeave() {
    const ok = await publish();
    if (!ok) return;
    const next = leaveNext.current;
    leaveNext.current = null;
    next?.();
  }

  return (
    <AdminCatalogPublishContext.Provider value={{ pending, publishing, error, publish, requestLeave }}>
      {children}
      {onAdmin ? (
        <button
          type="button"
          disabled={!pending || publishing}
          onClick={() => void publish()}
          className={`fixed right-6 bottom-6 z-[70] rounded-full px-5 py-3 text-sm font-bold shadow-lg transition ${
            pending
              ? "bg-green-600 text-white hover:bg-green-500"
              : "cursor-not-allowed bg-neutral-300 text-neutral-600"
          }`}
        >
          {publishing ? "Guardando..." : pending ? "🟢 Guardar Cambios Pendientes" : "Guardado"}
        </button>
      ) : null}
      {error && !leaveOpen ? (
        <p className="fixed right-6 bottom-[5.5rem] z-[70] w-[min(100%-3rem,20rem)] rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {leaveOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-publish-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <h2 id="admin-publish-title" className="text-lg font-bold text-neutral-950">
              Publicar cambios
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Hay cambios de categorías sin guardar. Guardalos para que se vean en el celular antes de salir.
            </p>
            {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={publishing}
                onClick={() => {
                  leaveNext.current = null;
                  setLeaveOpen(false);
                }}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
              >
                Seguir editando
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={() => void confirmAndLeave()}
                className="rounded-full bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-60"
              >
                {publishing ? "Guardando..." : "Guardar y continuar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminCatalogPublishContext.Provider>
  );
}
