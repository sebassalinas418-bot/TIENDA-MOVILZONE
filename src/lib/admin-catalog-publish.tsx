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
import { useCatalog } from "@/lib/offers";
import { useStoreConfig } from "@/config/store-config";
import {
  catalogTreeIsPending,
  publishQueuedCatalogTree,
  pushCatalogTree,
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
  const { config } = useStoreConfig();
  const { placements } = useCatalog();
  const [pending, setPending] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const leaveNext = useRef<(() => void) | null>(null);
  const configRef = useRef(config.categories);
  const placementsRef = useRef(placements);
  configRef.current = config.categories;
  placementsRef.current = placements;

  useEffect(() => {
    if (!window.location.pathname.startsWith("/admin")) return;
    setCatalogTreePublishHold(false);
    setPending(catalogTreeIsPending());
    const stop = subscribeCatalogTreeQueue(() => setPending(catalogTreeIsPending()));
    return () => {
      stop();
      if (!catalogTreeIsPending()) setCatalogTreePublishHold(false);
    };
  }, []);

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
    pushCatalogTree({
      categories: configRef.current,
      placements: placementsRef.current,
    });
    const result = await publishQueuedCatalogTree();
    setPublishing(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudieron publicar los cambios.");
      return false;
    }
    setLeaveOpen(false);
    return true;
  }, []);

  const requestLeave = useCallback((next: () => void) => {
    if (!catalogTreeIsPending()) {
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
      {pending ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-[70] flex justify-center px-3">
          <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-sky-200 bg-white px-4 py-3 shadow-xl shadow-sky-900/10">
            <p className="min-w-0 flex-1 text-sm font-semibold text-neutral-900">
              No se pudieron guardar las categorías. Reintentá para que se vean en el celular.
            </p>
            <button
              type="button"
              disabled={publishing}
              onClick={() => void publish()}
              className="shrink-0 rounded-full bg-sky-500 px-4 py-2 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-60"
            >
              {publishing ? "Publicando..." : "Confirmar cambios"}
            </button>
          </div>
        </div>
      ) : null}
      {error && !leaveOpen ? (
        <p className="fixed bottom-[5.5rem] left-1/2 z-[70] w-[min(100%-1.5rem,32rem)] -translate-x-1/2 rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700">
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
              Moviste categorías o productos. Confirmá para que se vean en el celular y en otras PCs antes de salir de Tienda.
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
                className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-60"
              >
                {publishing ? "Publicando..." : "Confirmar y continuar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminCatalogPublishContext.Provider>
  );
}
