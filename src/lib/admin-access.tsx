"use client";

import { useEffect, useState } from "react";
import { isAdminAccess, readDevAdmin, readSession, SESSION_EVENT, writeDevAdmin, type DemoSession } from "@/lib/session";

export function useAdminAccess(session?: DemoSession | null) {
  const [storedSession, setStoredSession] = useState<DemoSession | null>(null);
  const [devAdmin, setDevAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setStoredSession(readSession());
      setDevAdmin(readDevAdmin());
      setReady(true);
    };
    sync();
    window.addEventListener(SESSION_EVENT, sync);
    return () => window.removeEventListener(SESSION_EVENT, sync);
  }, []);

  const active = session === undefined ? storedSession : session;
  return {
    ready,
    devAdmin,
    isAdmin: isAdminAccess(active, devAdmin),
    setDevAdmin: (enabled: boolean) => {
      setDevAdmin(enabled);
      writeDevAdmin(enabled);
    },
  };
}
