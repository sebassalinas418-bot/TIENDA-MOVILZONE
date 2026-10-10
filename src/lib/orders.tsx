"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { products } from "@/data/products";
import {
  fetchWebOrderStatuses,
  reportCancelledWebOrder,
  reportIncomingWebOrder,
} from "@/services/taller-gestio/browser";
import { readSession } from "@/lib/session";

/**
 * Pedidos locales de la tienda. Se sincronizan con TallerGestio (web_orders).
 */
export type OrderStatus = "pendiente" | "aprobado" | "cancelado";

export type OrderItem = {
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
};

export type DeliveryMode = "retiro" | "cadete";

export type StoreOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  delivery: DeliveryMode;
  deliveryText: string;
  customerName?: string;
  customerEmail?: string;
};

type PlaceOrderInput = {
  items: OrderItem[];
  total: number;
  delivery: DeliveryMode;
  deliveryText: string;
  customerName?: string;
  customerEmail?: string;
};

type OrdersContextValue = {
  orders: StoreOrder[];
  stock: Record<string, number>;
  stockOf: (productId: string) => number;
  setProductStock: (productId: string, quantity: number) => void;
  placeOrder: (input: PlaceOrderInput) => StoreOrder;
  approveOrder: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
};

const ORDERS_KEY = "movilzone.orders";
const STOCK_KEY = "movilzone.stock";
const OrdersContext = createContext<OrdersContextValue | null>(null);

function defaultStock() {
  return Object.fromEntries(products.map((product) => [product.id, product.stock]));
}

function createOrderId(existing: StoreOrder[]) {
  let id = "";
  do {
    id = `MZ-${Math.floor(100000 + Math.random() * 900000)}`;
  } while (existing.some((order) => order.id === id));
  return id;
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [stock, setStock] = useState<Record<string, number>>(defaultStock);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const base = defaultStock();
    const rawStock = window.localStorage.getItem(STOCK_KEY);
    if (rawStock) {
      try {
        const saved = JSON.parse(rawStock) as Record<string, number>;
        for (const [id, quantity] of Object.entries(saved)) {
          if (Number.isFinite(quantity)) base[id] = Math.max(0, quantity);
        }
      } catch {
        window.localStorage.removeItem(STOCK_KEY);
      }
    }
    setStock(base);

    const rawOrders = window.localStorage.getItem(ORDERS_KEY);
    if (rawOrders) {
      try {
        const saved = JSON.parse(rawOrders) as StoreOrder[];
        if (Array.isArray(saved)) setOrders(saved);
      } catch {
        window.localStorage.removeItem(ORDERS_KEY);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    window.localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
  }, [orders, ready, stock]);

  useEffect(() => {
    if (!ready) return;
    for (const order of orders) {
      if (order.items.length === 0) continue;
      if (order.status === "cancelado") {
        void reportCancelledWebOrder(order.id);
        continue;
      }
      const session = readSession();
      void reportIncomingWebOrder({
        orderId: order.id,
        customerName: order.customerName ?? session?.name,
        customerEmail: order.customerEmail ?? session?.email,
        notes: order.deliveryText,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          productId: item.productId,
          title: item.title,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
    }
  }, [orders, ready]);

  useEffect(() => {
    if (!ready) return;

    function mapRemoteStatus(status: string): OrderStatus | null {
      if (status === "cancelado") return "cancelado";
      if (status === "pendiente") return "pendiente";
      if (
        status === "pagado" ||
        status === "preparado" ||
        status === "enviado" ||
        status === "entregado"
      ) {
        return "aprobado";
      }
      return null;
    }

    async function pull() {
      const remote = await fetchWebOrderStatuses(orders.map((order) => order.id));
      if (!remote.length) return;
      setOrders((current) => {
        let changed = false;
        const next = current.map((order) => {
          const match = remote.find((row) => row.order_number === order.id);
          const mapped = match?.status ? mapRemoteStatus(match.status) : null;
          if (!mapped || mapped === order.status) return order;
          if (order.status === "cancelado") return order;
          changed = true;
          return { ...order, status: mapped };
        });
        return changed ? next : current;
      });
    }

    void pull();
    const timer = window.setInterval(() => void pull(), 4000);
    return () => window.clearInterval(timer);
  }, [orders, ready]);

  function stockOf(productId: string) {
    return stock[productId] ?? 0;
  }

  function setProductStock(productId: string, quantity: number) {
    setStock((current) => ({ ...current, [productId]: Math.max(0, Math.floor(quantity)) }));
  }

  function placeOrder(input: PlaceOrderInput) {
    const order: StoreOrder = {
      id: createOrderId(orders),
      createdAt: new Date().toISOString(),
      status: "pendiente",
      ...input,
    };
    setOrders((current) => [order, ...current]);
    void reportIncomingWebOrder({
      orderId: order.id,
      customerName: order.customerName ?? input.customerName,
      customerEmail: order.customerEmail ?? input.customerEmail,
      notes: order.deliveryText,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productId: item.productId,
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
    return order;
  }

  function approveOrder(orderId: string) {
    const order = orders.find((item) => item.id === orderId && item.status === "pendiente");
    if (!order) return;
    setStock((current) => {
      const next = { ...current };
      for (const item of order.items) {
        const available = next[item.productId] ?? 0;
        next[item.productId] = Math.max(0, available - item.quantity);
      }
      return next;
    });
    setOrders((current) =>
      current.map((item) => (item.id === orderId ? { ...item, status: "aprobado" } : item)),
    );
  }

  function cancelOrder(orderId: string) {
    setOrders((current) =>
      current.map((item) =>
        item.id === orderId && item.status === "pendiente" ? { ...item, status: "cancelado" } : item,
      ),
    );
    void reportCancelledWebOrder(orderId);
  }

  return (
    <OrdersContext.Provider value={{ orders, stock, stockOf, setProductStock, placeOrder, approveOrder, cancelOrder }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error("useOrders debe usarse dentro de OrdersProvider");
  }
  return context;
}
