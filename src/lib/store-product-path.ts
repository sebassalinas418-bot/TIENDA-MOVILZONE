export function storeProductPath(productId: string) {
  return `/producto/${encodeURIComponent(productId)}`;
}
