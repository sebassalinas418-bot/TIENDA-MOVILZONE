/** Ruta del buscador: el admin se queda en el panel; el cliente va al catálogo público. */
export function storeSearchPath(term: string, adminMode: boolean) {
  const q = term.trim();
  if (adminMode) return q ? `/admin?q=${encodeURIComponent(q)}` : "/admin";
  return q ? `/tienda?q=${encodeURIComponent(q)}` : "/tienda";
}
