"use client";

import { Fragment } from "react";
import { formatPrice } from "@/data/products";
import type { StoreCustomerOrder } from "@/services/store-customers/types";

type AccountOrderListProps = {
  orders: StoreCustomerOrder[];
  openOrder: string | null;
  onOpen: (id: string | null) => void;
  formatWhen: (value: string) => string;
};

export function AccountOrderList({ orders, openOrder, onOpen, formatWhen }: AccountOrderListProps) {
  if (!orders.length) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
        Todavía no hay pedidos con este correo.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3 sm:hidden">
        {orders.map((order) => {
          const open = openOrder === order.id;
          return (
            <li key={order.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-bold text-neutral-950">#{order.id.replace(/^MZ-/, "")}</p>
                <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-sky-700 uppercase">
                  {order.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">{formatWhen(order.createdAt)}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-900">
                {formatPrice(order.total)}
                <span className="font-medium text-gray-500">
                  {" "}
                  · {order.itemCount} artículo{order.itemCount === 1 ? "" : "s"}
                </span>
              </p>
              <button
                type="button"
                onClick={() => onOpen(open ? null : order.id)}
                className="mt-3 w-full rounded-xl bg-neutral-950 py-2 text-sm font-bold text-white"
              >
                {open ? "Ocultar" : "Ver"}
              </button>
              {open ? (
                <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm text-gray-700">
                  {order.items.map((item, index) => (
                    <li key={`${order.id}-${index}`}>
                      {item.name} × {item.quantity} — {formatPrice(item.lineTotal)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-gray-100 bg-white sm:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-[11px] font-bold tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <Fragment key={order.id}>
                <tr className="border-b border-gray-50">
                  <td className="px-4 py-3 font-semibold text-neutral-950">#{order.id.replace(/^MZ-/, "")}</td>
                  <td className="px-4 py-3 text-gray-600">{formatWhen(order.createdAt)}</td>
                  <td className="px-4 py-3 uppercase tracking-wide text-gray-700">{order.statusLabel}</td>
                  <td className="px-4 py-3 text-gray-800">
                    {formatPrice(order.total)} para {order.itemCount} artículo{order.itemCount === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onOpen(openOrder === order.id ? null : order.id)}
                      className="rounded-md bg-neutral-950 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
                {openOrder === order.id ? (
                  <tr key={`${order.id}-detail`}>
                    <td colSpan={5} className="bg-gray-50 px-4 py-3">
                      <ul className="space-y-1 text-sm text-gray-700">
                        {order.items.map((item, index) => (
                          <li key={`${order.id}-${index}`}>
                            {item.name} × {item.quantity} — {formatPrice(item.lineTotal)}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
