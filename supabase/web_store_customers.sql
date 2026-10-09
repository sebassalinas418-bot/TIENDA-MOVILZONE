-- Clientes de la tienda web. Aislado: no toca auth, products ni TallerGestio.
create table if not exists public.web_store_customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  password_hash text not null,
  email_verified_at timestamptz,
  verify_token text,
  verify_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists web_store_customers_email_idx
  on public.web_store_customers (email);

create index if not exists web_store_customers_verify_token_idx
  on public.web_store_customers (verify_token);

drop trigger if exists web_store_customers_set_updated_at on public.web_store_customers;
create trigger web_store_customers_set_updated_at
  before update on public.web_store_customers
  for each row
  execute function public.set_updated_at();

alter table public.web_store_customers enable row level security;
