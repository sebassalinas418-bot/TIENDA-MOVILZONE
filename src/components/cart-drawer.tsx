"use client";

import { useEffect, useState } from "react";
import { useStoreConfig } from "@/config/store-config";
import { formatPrice } from "@/data/products";
import { useCatalog } from "@/lib/offers";
import { useCart } from "@/lib/cart";
import { useOrders } from "@/lib/orders";
import { PENDING_HOLD_LABEL } from "@/lib/web-pending-stock/availability";
import { readSession } from "@/lib/session";
import { reportIncomingWebOrder } from "@/services/taller-gestio/browser";

type Delivery = "retiro" | "cadete";

export function CartDrawer() {
  const { config } = useStoreConfig();
  const { products } = useCatalog();
  const { lines, open, closeCart, setQuantity, removeItem, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const [delivery, setDelivery] = useState<Delivery>("retiro");
  const [placedId, setPlacedId] = useState<string | null>(null);
  const [holdError, setHoldError] = useState(false);
  const [sending, setSending] = useState(false);

  const items = lines.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product || product.storeHidden) return [];
    return [{ ...line, product, subtotal: product.salePrice * line.quantity }];
  });
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const address = `${config.location.title}, ${config.location.detail}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [closeCart, open]);

  if (!open) return null;

  const deliveryText =
    delivery === "retiro"
      ? `Retiro sin cargo en ${address}.`
      : "Envío por cadete en la zona. El costo se confirma por este chat.";

  async function sendOrder() {
    if (sending) return;
    const session = readSession();
    if (items.some((item) => item.product.pendingHold || !item.product.inStock)) {
      setHoldError(true);
      return;
    }
    const orderId = `MZ-${Math.floor(100000 + Math.random() * 900000)}`;
    const payload = items.map((item) => ({
      productId: item.productId,
      title: item.product.title,
      quantity: item.quantity,
      unitPrice: item.product.salePrice,
    }));
    setSending(true);
    setHoldError(false);
    const recorded = await reportIncomingWebOrder({
      orderId,
      customerName: session?.name,
      customerEmail: session?.email,
      notes: deliveryText,
      items: payload,
    });
    if (!recorded.ok && recorded.reason === "reservado") {
      setHoldError(true);
      setSending(false);
      return;
    }
    const order = placeOrder({
      id: orderId,
      items: payload,
      total,
      delivery,
      deliveryText,
      customerName: session?.name,
      customerEmail: session?.email,
    });
    const message = [
      `Pedido ${order.id}`,
      "Hola, quiero confirmar este pedido de Movil zone:",
      "",
      ...items.map((item) => `• ${item.product.title} x ${item.quantity} — ${formatPrice(item.subtotal)}`),
      "",
      `Total: ${formatPrice(total)} (precio por transferencia)`,
      `Entrega: ${deliveryText}`,
      "Queda pendiente de confirmación hasta que el local apruebe el pago.",
    ].join("\n");
    window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    clearCart();
    setPlacedId(order.id);
    setSending(false);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeCart();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="flex h-full w-full max-w-md flex-col rounded-l-3xl bg-white shadow-xl"
        style={{ animation: "banner-fade 200ms ease" }}
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="cart-title" className="text-lg font-bold text-gray-900">
            Tu carrito
          </h2>
          <button
            type="button"
            aria-label="Cerrar carrito"
            onClick={closeCart}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            ×
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex-1 px-5 py-10">
            {placedId ? (
              <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-6 text-gray-800">
                El pedido <span className="font-bold text-gray-900">{placedId}</span> quedó pendiente de confirmación.
                El stock no se descuenta hasta que el local apruebe el pago.
              </p>
            ) : (
              <p className="text-sm text-gray-500">Todavía no agregaste productos.</p>
            )}
          </div>
        ) : (
          <ul className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {items.map((item) => (
              <li key={item.productId} className="flex gap-3 rounded-2xl border border-gray-100 p-3">
                <img src={item.product.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{item.product.title}</p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900">{formatPrice(item.subtotal)}</p>
                  <p className="text-xs text-gray-400">
                    {formatPrice(item.product.salePrice)} c/u
                    {item.product.onSale ? (
                      <span className="ml-1 line-through">{formatPrice(item.product.price)}</span>
                    ) : null}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-full border border-gray-200">
                      <button
                        type="button"
                        aria-label={`Restar uno de ${item.product.title}`}
                        disabled={item.quantity <= 1}
                        onClick={() => setQuantity(item.productId, item.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-700 enabled:hover:bg-gray-100 disabled:text-gray-300"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Sumar uno de ${item.product.title}`}
                        disabled={item.quantity >= (item.product.sellableStock ?? item.product.stock)}
                        onClick={() => setQuantity(item.productId, item.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-700 enabled:hover:bg-gray-100 disabled:text-gray-300"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="text-xs font-medium text-gray-500 hover:text-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="border-t border-gray-100 px-5 py-4">
          {items.length > 0 ? (
            <>
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Entrega</legend>
                <label className="flex items-start gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="delivery"
                    checked={delivery === "retiro"}
                    onChange={() => setDelivery("retiro")}
                    className="mt-1 accent-sky-500"
                  />
                  <span>Retiro sin cargo en {config.location.title}</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="delivery"
                    checked={delivery === "cadete"}
                    onChange={() => setDelivery("cadete")}
                    className="mt-1 accent-sky-500"
                  />
                  <span>Envío por cadete en la zona</span>
                </label>
              </fieldset>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-lg font-bold text-gray-900">{formatPrice(total)}</span>
              </div>
              {holdError ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {PENDING_HOLD_LABEL}. Esperá a que el local cancele o confirme el pedido anterior.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void sendOrder()}
                disabled={sending}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-sky-400 disabled:bg-gray-300"
              >
                Enviar pedido por WhatsApp
              </button>
              <p className="mt-2 text-center text-xs leading-5 text-gray-400">
                El pedido queda pendiente. El stock se mantiene hasta la aprobación.
              </p>
            </>
          ) : placedId ? null : (
            <p className="text-center text-xs text-gray-400">Agregá un producto para armar el pedido.</p>
          )}
        </footer>
      </aside>
    </div>
  );
}
