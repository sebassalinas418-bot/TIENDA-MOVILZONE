"use client";

import { useCallback, useEffect, useState } from "react";
import { readSession, SESSION_EVENT } from "@/lib/session";
import { FAVORITES_EVENT, readFavoriteIds, toggleFavoriteId } from "@/lib/store-favorites/storage";

export function useFavorite(productId: string) {
  const [on, setOn] = useState(false);

  const sync = useCallback(() => {
    setOn(readFavoriteIds().includes(productId));
  }, [productId]);

  useEffect(() => {
    sync();
    window.addEventListener(FAVORITES_EVENT, sync);
    window.addEventListener(SESSION_EVENT, sync);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync);
      window.removeEventListener(SESSION_EVENT, sync);
    };
  }, [sync]);

  function toggle() {
    const session = readSession();
    if (!session) {
      setOn((current) => !current);
      return { needsLogin: true as const };
    }
    const result = toggleFavoriteId(productId);
    setOn(result.on);
    return { needsLogin: false as const };
  }

  return { on, toggle };
}

export function useFavoriteIds() {
  const [ids, setIds] = useState<string[]>([]);

  const sync = useCallback(() => {
    setIds(readFavoriteIds());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(FAVORITES_EVENT, sync);
    window.addEventListener(SESSION_EVENT, sync);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync);
      window.removeEventListener(SESSION_EVENT, sync);
    };
  }, [sync]);

  return ids;
}
