create table if not exists public.products (
  id text primary key,
  category text not null,
  name text not null,
  ean text,
  ean_cdi text,
  itf text,
  itf_cdi text,
  codigo_auchan text,
  caixa_default integer,
  validade_minima_dias integer,
  active boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_codigo_auchan_idx on public.products (codigo_auchan);
create index if not exists products_sort_order_idx on public.products (sort_order);

create table if not exists public.app_defaults (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.labels (
  id text primary key,
  product_id text references public.products (id),
  product_snapshot jsonb not null,
  ordem_compra text not null,
  lote text not null,
  data_entrega date,
  data_validade date,
  validade_texto text not null,
  validade_barras text not null,
  caixas integer not null,
  quantidade_etiquetas integer not null,
  sscc text not null unique,
  auchan_validity_status text,
  auchan_days_available integer,
  auchan_days_margin integer,
  auchan_minimum_days integer,
  printed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists labels_created_at_idx on public.labels (created_at desc);
create index if not exists labels_product_id_idx on public.labels (product_id);

create table if not exists public.sscc_counters (
  id text primary key,
  next_serial bigint not null
);

insert into public.sscc_counters (id, next_serial)
values ('default', 500000)
on conflict (id) do nothing;

create or replace function public.reserve_next_sscc_serial()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved_serial bigint;
begin
  update public.sscc_counters
  set next_serial = next_serial + 1
  where id = 'default'
  returning next_serial - 1 into reserved_serial;

  if reserved_serial is null then
    insert into public.sscc_counters (id, next_serial)
    values ('default', 500001)
    returning 500000 into reserved_serial;
  end if;

  return reserved_serial;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.products to anon, authenticated;
grant select, insert, update, delete on public.app_defaults to anon, authenticated;
grant select, insert, update, delete on public.labels to anon, authenticated;
grant execute on function public.reserve_next_sscc_serial() to anon, authenticated;

alter table public.products disable row level security;
alter table public.app_defaults disable row level security;
alter table public.labels disable row level security;
alter table public.sscc_counters disable row level security;
