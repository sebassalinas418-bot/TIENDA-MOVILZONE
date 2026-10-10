-- Overlay de la tienda web (productos ocultos al público).
-- Aislado: no toca products, inventory_movements, web_orders ni TallerGestio.
create table if not exists public.web_store_settings (
  shop_id uuid primary key,
  hidden_product_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.web_store_settings enable row level security;
