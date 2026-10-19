-- Layout maestro del editor de Redes (foto, textos, precio).
-- No toca products, inventory_movements, web_orders ni TallerGestio.
alter table public.web_store_settings
  add column if not exists default_template_layout jsonb not null default '{}'::jsonb;
