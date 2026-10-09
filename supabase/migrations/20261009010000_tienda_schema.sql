-- =====================================================================
-- Plastimascotas Jimmy's · esquema base: catálogo, inventario, pedidos.
-- Precios en pesos colombianos enteros (sin decimales).
-- =====================================================================

create schema if not exists private;

-- ---------------------------------------------------------------------
-- Administradores
-- ---------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke execute on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Ajustes de la tienda (una sola fila)
-- ---------------------------------------------------------------------
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'Plastimascotas Jimmy''s',
  claim text not null default 'Todo para tus mascotas',
  whatsapp text not null default '' check (whatsapp ~ '^[0-9]{0,15}$'),
  phones text[] not null default '{}',
  address text not null default '',
  city text not null default '',
  -- { "0": ["08:00","19:00"], "1": [...] } · null = no mostrar horario
  hours jsonb,
  payment_methods text[] not null default array['Efectivo', 'Nequi', 'Daviplata', 'Tarjeta'],
  delivery_note text not null default '¡Domicilios sin costo!',
  instagram text not null default '',
  facebook text not null default '',
  low_stock_threshold integer not null default 5 check (low_stock_threshold between 0 and 1000),
  ordering_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
create table public.categories (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (length(name) between 1 and 60),
  icon text not null default '🐾',
  description text,
  sort integer not null default 0,
  active boolean not null default true
);

create table public.brands (
  id bigint generated always as identity primary key,
  name text not null unique check (length(name) between 1 and 60),
  sort integer not null default 0,
  active boolean not null default true
);

create table public.products (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category_id bigint not null references public.categories (id) on delete restrict,
  brand_id bigint references public.brands (id) on delete set null,
  name text not null check (length(name) between 1 and 90),
  description text,
  tag text,
  photo_url text,
  -- Para qué mascota es: filtro de la tienda
  pets text[] not null default '{}' check (pets <@ array['perro', 'gato', 'ave', 'roedor', 'peces']::text[]),
  featured boolean not null default false,
  is_sample boolean not null default false,   -- producto de ejemplo: se borra cuando cargues los reales
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_id_idx on public.products (category_id);
create index products_brand_id_idx on public.products (brand_id);

-- Presentaciones ("1 kg", "Bulto 25 kg", "Talla M"): cada una con su precio y su stock.
create table public.product_variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  label text not null default '',
  sku text,
  price integer not null check (price >= 0),
  compare_at_price integer check (compare_at_price is null or compare_at_price > price),  -- "antes"
  wholesale_price integer check (wholesale_price is null or wholesale_price < price),     -- precio por mayor
  wholesale_min integer check (wholesale_min is null or wholesale_min >= 2),             -- desde cuántas unidades
  stock integer not null default 0 check (stock >= 0),
  track_stock boolean not null default true,
  sort integer not null default 0,
  active boolean not null default true,
  unique (product_id, label),
  check ((wholesale_price is null) = (wholesale_min is null))
);
create index product_variants_product_id_idx on public.product_variants (product_id);

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  access_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado', 'cancelado')),
  status_changed_at timestamptz not null default now(),
  stock_applied boolean not null default false,   -- ¿ya se descontó del inventario?
  customer_signal text check (customer_signal in ('enviado', 'arrepentido')),
  customer_signal_at timestamptz,
  customer_name text not null check (length(customer_name) between 1 and 80),
  customer_phone text check (customer_phone ~ '^[0-9+ ]{7,20}$'),
  mode text not null check (mode in ('domicilio', 'recoger')),
  address text,
  barrio text,
  reference text,
  payment text not null,
  cash_with integer check (cash_with >= 0),
  note text,
  items_count integer not null check (items_count > 0),
  subtotal integer not null check (subtotal >= 0),
  savings integer not null default 0 check (savings >= 0),   -- ahorro por precio por mayor
  delivery_fee integer check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  cancel_reason text,
  admin_note text
);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id bigint references public.products (id) on delete set null,
  variant_id bigint references public.product_variants (id) on delete set null,
  product_name text not null,
  brand_name text not null default '',
  category_name text not null default '',
  variant_label text not null default '',
  unit_price integer not null check (unit_price >= 0),
  list_price integer not null check (list_price >= 0),
  wholesale boolean not null default false,
  qty integer not null check (qty between 1 and 999),
  line_total integer not null check (line_total >= 0)
);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

-- ---------------------------------------------------------------------
-- Inventario: cada cambio de stock queda registrado
-- ---------------------------------------------------------------------
create table public.stock_movements (
  id bigint generated always as identity primary key,
  variant_id bigint not null references public.product_variants (id) on delete cascade,
  delta integer not null,
  stock_after integer not null,
  reason text not null check (reason in ('inicial', 'entrada', 'venta', 'devolucion', 'ajuste')),
  order_id uuid references public.orders (id) on delete set null,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index stock_movements_variant_idx on public.stock_movements (variant_id, created_at desc);
create index stock_movements_order_idx on public.stock_movements (order_id);
create index stock_movements_created_idx on public.stock_movements (created_at desc);

-- ---------------------------------------------------------------------
-- Disparadores
-- ---------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger products_touch before update on public.products
  for each row execute function private.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function private.touch_updated_at();

-- Registra todo cambio de stock. El motivo y el pedido llegan por variables de
-- sesión (app.stock_reason / app.stock_order / app.stock_note); si no hay, es un ajuste manual.
create or replace function private.log_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_delta integer := new.stock - case when tg_op = 'INSERT' then 0 else old.stock end;
  v_reason text := coalesce(nullif(current_setting('app.stock_reason', true), ''),
                            case when tg_op = 'INSERT' then 'inicial' else 'ajuste' end);
begin
  if v_delta = 0 and tg_op = 'UPDATE' then return new; end if;
  if tg_op = 'INSERT' and new.stock = 0 then return new; end if;
  insert into public.stock_movements (variant_id, delta, stock_after, reason, order_id, note)
  values (new.id, v_delta, new.stock, v_reason,
          nullif(current_setting('app.stock_order', true), '')::uuid,
          nullif(current_setting('app.stock_note', true), ''));
  return new;
end;
$$;
create trigger variants_log_stock after insert or update of stock on public.product_variants
  for each row execute function private.log_stock();

-- Estado del pedido: al confirmarlo se descuenta el inventario; al cancelarlo, se devuelve.
create or replace function private.order_status_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  it record;
  v_short text;
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;

  -- Descontar: pasa a un estado de venta y aún no se había descontado
  if new.status in ('confirmado', 'preparando', 'en_camino', 'entregado') and not old.stock_applied then
    select string_agg(format('%s %s (hay %s, pide %s)', oi.product_name, oi.variant_label, pv.stock, oi.qty), '; ')
      into v_short
      from public.order_items oi
      join public.product_variants pv on pv.id = oi.variant_id
      where oi.order_id = new.id and pv.track_stock and pv.stock < oi.qty;
    if v_short is not null then
      raise exception 'insufficient_stock:%', v_short;
    end if;

    perform set_config('app.stock_reason', 'venta', true);
    perform set_config('app.stock_order', new.id::text, true);
    perform set_config('app.stock_note', 'Pedido ' || new.code, true);
    for it in select oi.variant_id, oi.qty from public.order_items oi where oi.order_id = new.id and oi.variant_id is not null loop
      update public.product_variants pv set stock = pv.stock - it.qty where pv.id = it.variant_id and pv.track_stock;
    end loop;
    perform set_config('app.stock_reason', '', true);
    perform set_config('app.stock_order', '', true);
    perform set_config('app.stock_note', '', true);
    new.stock_applied := true;

  -- Devolver: se cancela (o vuelve a pendiente) un pedido que ya había descontado
  elsif new.status in ('cancelado', 'pendiente') and old.stock_applied then
    perform set_config('app.stock_reason', 'devolucion', true);
    perform set_config('app.stock_order', new.id::text, true);
    perform set_config('app.stock_note', 'Pedido ' || new.code, true);
    for it in select oi.variant_id, oi.qty from public.order_items oi where oi.order_id = new.id and oi.variant_id is not null loop
      update public.product_variants pv set stock = pv.stock + it.qty where pv.id = it.variant_id and pv.track_stock;
    end loop;
    perform set_config('app.stock_reason', '', true);
    perform set_config('app.stock_order', '', true);
    perform set_config('app.stock_note', '', true);
    new.stock_applied := false;
  end if;
  return new;
end;
$$;
create trigger orders_status_stock before update on public.orders
  for each row execute function private.order_status_stock();

-- ---------------------------------------------------------------------
-- Seguridad (RLS + permisos explícitos: las tablas nuevas no se exponen solas)
-- ---------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_movements enable row level security;

create policy admins_select on public.admins for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy admins_delete on public.admins for delete to authenticated
  using ((select private.is_admin()) and user_id <> (select auth.uid()));

-- Lectura pública del catálogo: anon solo lo activo; admins todo.
create policy settings_read on public.settings for select to anon, authenticated using (true);
create policy categories_read_anon on public.categories for select to anon using (active);
create policy categories_read on public.categories for select to authenticated using (active or (select private.is_admin()));
create policy brands_read_anon on public.brands for select to anon using (active);
create policy brands_read on public.brands for select to authenticated using (active or (select private.is_admin()));
create policy products_read_anon on public.products for select to anon using (active);
create policy products_read on public.products for select to authenticated using (active or (select private.is_admin()));
create policy variants_read_anon on public.product_variants for select to anon using (active);
create policy variants_read on public.product_variants for select to authenticated using (active or (select private.is_admin()));

do $$
declare t text;
begin
  foreach t in array array['settings', 'categories', 'brands', 'products', 'product_variants']
  loop
    execute format('create policy %1$s_admin_insert on public.%1$I for insert to authenticated with check ((select private.is_admin()))', t);
    execute format('create policy %1$s_admin_update on public.%1$I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
    execute format('create policy %1$s_admin_delete on public.%1$I for delete to authenticated using ((select private.is_admin()))', t);
  end loop;
end $$;

create policy orders_admin_select on public.orders for select to authenticated using ((select private.is_admin()));
create policy orders_admin_update on public.orders for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy orders_admin_delete on public.orders for delete to authenticated using ((select private.is_admin()));
create policy order_items_admin_select on public.order_items for select to authenticated using ((select private.is_admin()));
create policy stock_movements_admin_select on public.stock_movements for select to authenticated using ((select private.is_admin()));

grant select on public.settings, public.categories, public.brands, public.products, public.product_variants
  to anon, authenticated;
grant insert, update, delete on public.settings, public.categories, public.brands, public.products, public.product_variants
  to authenticated;
grant select, delete on public.admins to authenticated;
grant select, update, delete on public.orders to authenticated;
grant select on public.order_items, public.stock_movements to authenticated;

alter publication supabase_realtime add table public.orders;
