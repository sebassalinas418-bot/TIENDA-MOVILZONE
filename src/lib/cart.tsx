"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useOrders } from "@/lib/orders";
import { readSession, SESSION_EVENT } from "@/lib/session";

/**
 * Carrito de prueba. Vive solo en este navegador.
 * No escribe la base "sebfix" ni descuenta inventario.
 */
export type CartLine = {
  productId: string;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const GUEST_CART_KEY = "movilzone.cart";
const CartContext = createContext<CartContextValue | null>(null);

function cartKey(email?: string | null) {
  if (!email) return GUEST_CART_KEY;
  return `movilzone.cart:${email.trim().toLowerCase()}`;
}

function readStoredLines(key: string): CartLine[] {
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line) => line.productId && line.quantity > 0);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { stockOf } = useOrders();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  useEffect(() => {
    function loadForSession() {
      const email = readSession()?.email ?? null;
      setOwnerEmail(email);
      const personal = readStoredLines(cartKey(email));
      if (email && personal.length === 0) {
        const guest = readStoredLines(GUEST_CART_KEY);
        if (guest.length) {
          window.localStorage.setItem(cartKey(email), JSON.stringify(guest));
          setLines(guest);
          setReady(true);
          return;
        }
      }
      setLines(personal);
      setReady(true);
    }
    loadForSession();
    window.addEventListener(SESSION_EVENT, loadForSession);
    return () => window.removeEventListener(SESSION_EVENT, loadForSession);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(cartKey(ownerEmail), JSON.stringify(lines));
  }, [lines, ownerEmail, ready]);

  const count = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);

  function addItem(productId: string) {
    setLines((current) => {
      const max = stockOf(productId);
      const existing = current.find((line) => line.productId === productId);
      if (max < 1) return current;
      if (!existing) return [...current, { productId, quantity: 1 }];
      if (existing.quantity >= max) return current;
      return current.map((line) =>
        line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line,
      );
    });
  }

  function setQuantity(productId: string, quantity: number) {
    const max = stockOf(productId);
    setLines((current) =>
      current.flatMap((line) => {
        if (line.productId !== productId) return [line];
        if (quantity < 1) return [];
        if (quantity > max) return [line];
        return [{ ...line, quantity }];
      }),
    );
  }

  function removeItem(productId: string) {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }

  function clearCart() {
    setLines([]);
  }

  return (
    <CartContext.Provider
      value={{
        lines,
        count,
        open,
        openCart: () => setOpen(true),
        closeCart: () => setOpen(false),
        addItem,
        setQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }
  return context;
}
