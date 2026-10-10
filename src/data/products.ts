/**
 * Datos de prueba para el maquetado.
 * No hay conexión a Supabase. Cuando el catálogo lea "sebfix",
 * esa lectura debe ser estricta: sin migraciones, sin cambios de RLS
 * y sin escrituras sobre el sistema de gestión ni el inventario.
 */

export type Product = {
  id: string;
  title: string;
  category: string;
  categoryId: string;
  subcategoryId: string;
  brand: string;
  price: number;
  image: string;
  stock: number;
  stockLabel: string;
  inStock: boolean;
  onSale: boolean;
  isNew: boolean;
  reservedQty?: number;
  sellableStock?: number;
  pendingHold?: boolean;
};

export function describeStock(quantity: number) {
  if (quantity <= 0) return { stockLabel: "Agotado", inStock: false };
  if (quantity === 1) return { stockLabel: "Última unidad", inStock: true };
  return { stockLabel: `Últimas ${quantity}`, inStock: true };
}

export const products: Product[] = [
  {
    id: "1",
    title: "Cable Tipo C",
    category: "Cargadores y Cables",
    categoryId: "cargadores",
    subcategoryId: "cables",
    brand: "Genérico",
    price: 4990,
    image: "/categories/cables.jpg",
    stock: 2,
    stockLabel: "Últimas 2",
    inStock: true,
    onSale: false,
    isNew: true,
  },
  {
    id: "2",
    title: "Cargador 20W",
    category: "Cargadores y Cables",
    categoryId: "cargadores",
    subcategoryId: "cargadores-rapidos",
    brand: "Samsung",
    price: 8990,
    image: "/categories/cargadores.jpg",
    stock: 1,
    stockLabel: "Última unidad",
    inStock: true,
    onSale: true,
    isNew: false,
  },
  {
    id: "3",
    title: "Funda de silicona",
    category: "Fundas y Carcasas",
    categoryId: "fundas",
    subcategoryId: "silicona",
    brand: "Apple",
    price: 5990,
    image: "/categories/fundas.jpg",
    stock: 4,
    stockLabel: "Últimas 4",
    inStock: true,
    onSale: false,
    isNew: true,
  },
  {
    id: "4",
    title: "Vidrio templado",
    category: "Protectores de Pantalla",
    categoryId: "protectores",
    subcategoryId: "vidrios",
    brand: "Genérico",
    price: 3490,
    image: "/categories/protectores.jpg",
    stock: 1,
    stockLabel: "Última unidad",
    inStock: true,
    onSale: false,
    isNew: true,
  },
  {
    id: "5",
    title: "Auriculares inalámbricos",
    category: "Auriculares",
    categoryId: "auriculares",
    subcategoryId: "inalambricos",
    brand: "Sony",
    price: 24990,
    image: "/categories/audio.jpg",
    stock: 2,
    stockLabel: "Últimas 2",
    inStock: true,
    onSale: true,
    isNew: true,
  },
  {
    id: "6",
    title: "Power bank 10.000 mAh",
    category: "Accesorios",
    categoryId: "accesorios",
    subcategoryId: "energia",
    brand: "SanDisk",
    price: 18990,
    image: "/categories/todo.jpg",
    stock: 0,
    stockLabel: "Agotado",
    inStock: false,
    onSale: false,
    isNew: false,
  },
  {
    id: "7",
    title: "Cable Lightning",
    category: "Cargadores y Cables",
    categoryId: "cargadores",
    subcategoryId: "cables",
    brand: "Apple",
    price: 5490,
    image: "/banners/accesorios-cargadores.jpg",
    stock: 2,
    stockLabel: "Últimas 2",
    inStock: true,
    onSale: false,
    isNew: true,
  },
  {
    id: "8",
    title: "Soporte para auto",
    category: "Soportes y Trípodes",
    categoryId: "soportes",
    subcategoryId: "soportes-auto",
    brand: "Genérico",
    price: 7990,
    image: "/categories/accesorios.jpg",
    stock: 1,
    stockLabel: "Última unidad",
    inStock: true,
    onSale: true,
    isNew: false,
  },
];

export const shopCategories = [
  { id: "Fundas y Carcasas", label: "Fundas y Carcasas", image: "/categories/fundas.jpg" },
  { id: "Cargadores y Cables", label: "Cargadores y Cables", image: "/categories/cables.jpg" },
  { id: "Auriculares", label: "Auriculares", image: "/categories/audio.jpg" },
  { id: "Protectores de Pantalla", label: "Protectores de Pantalla", image: "/categories/protectores.jpg" },
  { id: "Soportes y Trípodes", label: "Soportes y Trípodes", image: "/categories/accesorios.jpg" },
  { id: "Accesorios", label: "Accesorios", image: "/categories/cargadores.jpg" },
];

export const brands = ["Genérico", "Samsung", "Apple", "SanDisk", "Sony", "JBL"];

export function formatPrice(amount: number) {
  const formatted = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(amount);

  return `$ ${formatted}`;
}
