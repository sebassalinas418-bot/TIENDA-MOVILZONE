-- Teléfono de clientes de la tienda. Additive: no altera email, password ni TallerGestio.
alter table public.web_store_customers
  add column if not exists phone text,
  add column if not exists phone_normalized text;

create unique index if not exists web_store_customers_phone_normalized_uidx
  on public.web_store_customers (phone_normalized)
  where phone_normalized is not null and phone_normalized <> '';
