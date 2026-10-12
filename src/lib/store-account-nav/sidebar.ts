export type AccountSidebarSection =
  | "escritorio"
  | "pedidos"
  | "direccion"
  | "cuenta";

export const ACCOUNT_SIDEBAR_NAV: { id: AccountSidebarSection; label: string }[] = [
  { id: "escritorio", label: "Escritorio" },
  { id: "pedidos", label: "Pedidos" },
  { id: "direccion", label: "Dirección" },
  { id: "cuenta", label: "Detalles de la cuenta" },
];

export function isAccountSidebarSection(value: string): value is AccountSidebarSection {
  return ACCOUNT_SIDEBAR_NAV.some((item) => item.id === value);
}
