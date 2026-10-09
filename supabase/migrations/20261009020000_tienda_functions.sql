-- =====================================================================
-- Plastimascotas · funciones: pedidos (cliente), inventario, administradores,
-- métricas y fotos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_order: el cliente crea su pedido. El servidor recalcula los precios
-- (incluido el precio por mayor) y revisa que haya stock. Lo que mande el
-- navegador solo dice QUÉ pidió, nunca CUÁNTO cuesta.
-- El stock NO se descuenta aquí: se descuenta cuando la tienda confirma.
-- ---------------------------------------------------------------------
create or replace function public.create_order(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c jsonb := coalesce(p -> 'customer', '{}'::jsonb);
  it jsonb;
  st public.settings;
  v_order_id uuid;
  v_code text;
  v_token uuid;
  v_product public.products;
  v_variant public.product_variants;
  v_category text;
  v_brand text;
  v_unit integer;
  v_wholesale boolean;
  v_qty integer;
  v_line integer;
  v_subtotal integer := 0;
  v_savings integer := 0;
  v_count integer := 0;
  v_items jsonb := '[]'::jsonb;
  v_seen bigint[] := '{}';
  v_mode text := c ->> 'mode';
  v_name text := btrim(coalesce(c ->> 'name', ''));
  v_phone text := nullif(regexp_replace(coalesce(c ->> 'phone', ''), '[^0-9+ ]', '', 'g'), '');
  v_cash integer := nullif(regexp_replace(coalesce(c ->> 'cash_with', ''), '[^0-9]', '', 'g'), '')::integer;
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
begin
  select * into st from public.settings where id = 1;
  if st.id is null or not st.ordering_enabled then raise exception 'ordering_disabled'; end if;

  if jsonb_typeof(p -> 'items') is distinct from 'array'
     or jsonb_array_length(p -> 'items') = 0
     or jsonb_array_length(p -> 'items') > 60 then
    raise exception 'invalid_items';
  end if;
  if length(v_name) = 0 or length(v_name) > 80 then raise exception 'invalid_name'; end if;
  if v_mode is null or v_mode not in ('domicilio', 'recoger') then raise exception 'invalid_mode'; end if;
  if v_mode = 'domicilio'
     and (coalesce(btrim(c ->> 'address'), '') = '' or coalesce(btrim(c ->> 'barrio'), '') = '') then
    raise exception 'invalid_address';
  end if;
  if not ((c ->> 'payment') = any (st.payment_methods)) then raise exception 'invalid_payment'; end if;
  if v_phone is null or v_phone !~ '^[0-9+ ]{7,20}$' then raise exception 'invalid_phone'; end if;

  -- Código corto y único, p. ej. PJ-7Q3FX
  loop
    v_code := 'PJ-';
    for i in 1..5 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.orders o where o.code = v_code);
  end loop;

  insert into public.orders (
    code, customer_name, customer_phone, mode, address, barrio, reference,
    payment, cash_with, note, items_count, subtotal, total
  ) values (
    v_code, v_name, v_phone, v_mode,
    case when v_mode = 'domicilio' then left(btrim(c ->> 'address'), 160) end,
    case when v_mode = 'domicilio' then left(btrim(c ->> 'barrio'), 80) end,
    case when v_mode = 'domicilio' then nullif(left(btrim(coalesce(c ->> 'reference', '')), 160), '') end,
    c ->> 'payment',
    case when (c ->> 'payment') = 'Efectivo' then v_cash end,
    nullif(left(btrim(coalesce(c ->> 'note', '')), 240), ''),
    1, 0, 0
  )
  returning id, access_token into v_order_id, v_token;

  for it in select value from jsonb_array_elements(p -> 'items') loop
    v_qty := (it ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 999 then raise exception 'invalid_qty'; end if;

    v_variant := null;
    select * into v_variant from public.product_variants pv
      where pv.id = (it ->> 'variant_id')::bigint and pv.active;
    if v_variant.id is null then raise exception 'product_unavailable:%', it ->> 'variant_id'; end if;
    if v_variant.id = any (v_seen) then raise exception 'duplicate_item:%', v_variant.id; end if;
    v_seen := v_seen || v_variant.id;

    select * into v_product from public.products pr where pr.id = v_variant.product_id and pr.active;
    select ca.name into v_category from public.categories ca where ca.id = v_product.category_id and ca.active;
    if v_product.id is null or v_category is null then raise exception 'product_unavailable:%', v_variant.id; end if;
    select b.name into v_brand from public.brands b where b.id = v_product.brand_id;

    if v_variant.track_stock and v_variant.stock < v_qty then
      raise exception 'out_of_stock:%:%', v_variant.id, v_variant.stock;
    end if;

    v_wholesale := v_variant.wholesale_price is not null and v_qty >= v_variant.wholesale_min;
    v_unit := case when v_wholesale then v_variant.wholesale_price else v_variant.price end;
    v_line := v_unit * v_qty;
    v_subtotal := v_subtotal + v_line;
    v_savings := v_savings + (v_variant.price - v_unit) * v_qty;
    v_count := v_count + v_qty;

    insert into public.order_items (
      order_id, product_id, variant_id, product_name, brand_name, category_name, variant_label,
      unit_price, list_price, wholesale, qty, line_total
    ) values (
      v_order_id, v_product.id, v_variant.id, v_product.name, coalesce(v_brand, ''), v_category, v_variant.label,
      v_unit, v_variant.price, v_wholesale, v_qty, v_line
    );

    v_items := v_items || jsonb_build_object(
      'variant_id', v_variant.id, 'name', v_product.name, 'brand', coalesce(v_brand, ''),
      'variant', v_variant.label, 'qty', v_qty, 'unit', v_unit, 'list', v_variant.price,
      'wholesale', v_wholesale, 'line', v_line);
  end loop;

  update public.orders
    set items_count = v_count, subtotal = v_subtotal, savings = v_savings, total = v_subtotal
    where id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id, 'code', v_code, 'token', v_token,
    'subtotal', v_subtotal, 'savings', v_savings, 'total', v_subtotal,
    'items_count', v_count, 'items', v_items);
end;
$$;
revoke execute on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;
comment on function public.create_order(jsonb) is 'Público a propósito: el cliente crea su pedido; recalcula precios y revisa stock en el servidor.';

-- ---------------------------------------------------------------------
-- Seguimiento del pedido por el cliente (con su token secreto)
-- ---------------------------------------------------------------------
create or replace function public.track_orders(p_orders jsonb)
returns table (
  id uuid, code text, status text, status_changed_at timestamptz,
  created_at timestamptz, total integer, delivery_fee integer, customer_signal text
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.code, o.status, o.status_changed_at, o.created_at, o.total, o.delivery_fee, o.customer_signal
  from jsonb_array_elements(case when jsonb_typeof(p_orders) = 'array' then p_orders else '[]'::jsonb end) with ordinality as r(v, n)
  join public.orders o
    on o.id = (r.v ->> 'id')::uuid and o.access_token = (r.v ->> 'token')::uuid
  where r.n <= 10;
$$;
revoke execute on function public.track_orders(jsonb) from public;
grant execute on function public.track_orders(jsonb) to anon, authenticated;
comment on function public.track_orders(jsonb) is 'Público a propósito: solo devuelve pedidos cuyo access_token conoce el cliente.';

-- El cliente avisa "ya lo envié" o "me arrepentí" (solo durante 2 días)
create or replace function public.customer_signal(p_id uuid, p_token uuid, p_signal text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_status text;
begin
  if p_signal not in ('enviado', 'arrepentido') then raise exception 'invalid_signal'; end if;
  update public.orders o
    set customer_signal = p_signal,
        customer_signal_at = now(),
        status = case when p_signal = 'arrepentido' and o.status = 'pendiente' then 'cancelado' else o.status end,
        cancel_reason = case when p_signal = 'arrepentido' and o.status = 'pendiente'
                             then 'El cliente lo canceló desde la página' else o.cancel_reason end
    where o.id = p_id and o.access_token = p_token and o.created_at > now() - interval '2 days'
    returning o.status into v_status;
  if v_status is null then raise exception 'order_not_found'; end if;
  return v_status;
end;
$$;
revoke execute on function public.customer_signal(uuid, uuid, text) from public;
grant execute on function public.customer_signal(uuid, uuid, text) to anon, authenticated;
comment on function public.customer_signal(uuid, uuid, text) is 'Público a propósito: requiere el access_token del pedido; solo 2 días.';

-- ---------------------------------------------------------------------
-- Inventario: entradas y ajustes desde el panel
-- ---------------------------------------------------------------------
create or replace function public.adjust_stock(p_variant_id bigint, p_delta integer, p_reason text, p_note text default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare v_stock integer;
begin
  if not (select private.is_admin()) then raise exception 'not_admin'; end if;
  if p_reason not in ('entrada', 'ajuste') then raise exception 'invalid_reason'; end if;
  if p_delta = 0 then raise exception 'invalid_delta'; end if;
  perform set_config('app.stock_reason', p_reason, true);
  perform set_config('app.stock_note', coalesce(left(btrim(p_note), 200), ''), true);
  update public.product_variants pv set stock = pv.stock + p_delta
    where pv.id = p_variant_id
    returning pv.stock into v_stock;
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_note', '', true);
  if v_stock is null then raise exception 'variant_not_found'; end if;
  return v_stock;
exception
  when check_violation then raise exception 'negative_stock';
end;
$$;
revoke execute on function public.adjust_stock(bigint, integer, text, text) from public, anon;
grant execute on function public.adjust_stock(bigint, integer, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Administradores
-- ---------------------------------------------------------------------
create or replace function public.admin_setup_needed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.admins);
$$;
revoke execute on function public.admin_setup_needed() from public;
grant execute on function public.admin_setup_needed() to anon, authenticated;
comment on function public.admin_setup_needed() is 'Público a propósito: solo dice si aún no existe ningún administrador.';

create or replace function public.claim_first_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  lock table public.admins in exclusive mode;
  if exists (select 1 from public.admins) then raise exception 'admins_exist'; end if;
  insert into public.admins (user_id, email)
    select u.id, coalesce(u.email, '') from auth.users u where u.id = v_uid;
  return true;
end;
$$;
revoke execute on function public.claim_first_admin() from public, anon;
grant execute on function public.claim_first_admin() to authenticated;

create or replace function public.add_admin(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid; v_mail text;
begin
  if not (select private.is_admin()) then raise exception 'not_admin'; end if;
  select u.id, u.email into v_user, v_mail from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1;
  if v_user is null then raise exception 'user_not_found'; end if;
  insert into public.admins (user_id, email) values (v_user, v_mail) on conflict (user_id) do nothing;
  return true;
end;
$$;
revoke execute on function public.add_admin(text) from public, anon;
grant execute on function public.add_admin(text) to authenticated;

-- ---------------------------------------------------------------------
-- Métricas (SECURITY INVOKER: respeta RLS). Zona horaria: America/Bogota.
-- ---------------------------------------------------------------------
create or replace function public.admin_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  result jsonb;
  tz constant text := 'America/Bogota';
  v_low integer;
begin
  if not (select private.is_admin()) then raise exception 'not_admin'; end if;
  select low_stock_threshold into v_low from public.settings where id = 1;

  with o as (
    select * from public.orders where created_at >= p_from and created_at < p_to
  ),
  sold as (
    select * from o where status in ('confirmado', 'preparando', 'en_camino', 'entregado')
  ),
  items as (
    select oi.* from public.order_items oi join sold on sold.id = oi.order_id
  ),
  days as (
    select d::date as day
    from generate_series((p_from at time zone tz)::date, ((p_to - interval '1 second') at time zone tz)::date, interval '1 day') d
  ),
  inv as (
    select pv.*, pr.name as product_name
    from public.product_variants pv join public.products pr on pr.id = pv.product_id
    where pv.active and pr.active and pv.track_stock
  )
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'orders', (select count(*) from o),
      'sold', (select count(*) from sold),
      'pending', (select count(*) from o where status = 'pendiente'),
      'pending_stale', (select count(*) from o where status = 'pendiente' and created_at < now() - interval '2 hours'),
      'cancelled', (select count(*) from o where status = 'cancelado'),
      'customer_regret', (select count(*) from o where customer_signal = 'arrepentido'),
      'customer_sent', (select count(*) from o where customer_signal = 'enviado'),
      'revenue', (select coalesce(sum(total), 0) from sold),
      'avg_ticket', (select coalesce(round(avg(total)), 0) from sold),
      'items_sold', (select coalesce(sum(qty), 0) from items),
      'wholesale_orders', (select count(*) from sold where savings > 0)
    ),
    'inventory', jsonb_build_object(
      'variants', (select count(*) from inv),
      'units', (select coalesce(sum(stock), 0) from inv),
      'value', (select coalesce(sum(stock::bigint * price), 0) from inv),
      'out', (select count(*) from inv where stock = 0),
      'low', (select count(*) from inv where stock > 0 and stock <= v_low)
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', days.day,
        'orders', (select count(*) from o where (o.created_at at time zone tz)::date = days.day),
        'sold', (select count(*) from sold where (sold.created_at at time zone tz)::date = days.day),
        'revenue', (select coalesce(sum(total), 0) from sold where (sold.created_at at time zone tz)::date = days.day)
      ) order by days.day), '[]'::jsonb)
      from days
    ),
    'hours', (
      select jsonb_agg(jsonb_build_object(
        'hour', h,
        'orders', (select count(*) from o where o.status <> 'cancelado' and extract(hour from o.created_at at time zone tz) = h)
      ) order by h)
      from generate_series(0, 23) h
    ),
    'weekdays', (
      select jsonb_agg(jsonb_build_object(
        'dow', d,
        'orders', (select count(*) from o where o.status <> 'cancelado' and extract(dow from o.created_at at time zone tz) = d)
      ) order by d)
      from generate_series(0, 6) d
    ),
    'top', (
      select coalesce(jsonb_agg(t order by t.qty desc, t.revenue desc), '[]'::jsonb) from (
        select coalesce(i.product_id::text, i.product_name) as key, max(i.product_name) as name,
               max(i.category_name) as category, sum(i.qty)::integer as qty, sum(i.line_total)::integer as revenue
        from items i group by 1 order by qty desc, revenue desc limit 10
      ) t
    ),
    'least', (
      select coalesce(jsonb_agg(t order by t.qty, t.name), '[]'::jsonb) from (
        select pr.id, pr.name, ca.name as category, coalesce(sum(i.qty), 0)::integer as qty
        from public.products pr
        join public.categories ca on ca.id = pr.category_id
        left join items i on i.product_id = pr.id
        where pr.active and ca.active
        group by pr.id, pr.name, ca.name
        order by qty, pr.name limit 10
      ) t
    ),
    'categories', (
      select coalesce(jsonb_agg(t order by t.revenue desc), '[]'::jsonb) from (
        select i.category_name as name, sum(i.qty)::integer as qty, sum(i.line_total)::integer as revenue
        from items i group by i.category_name
      ) t
    ),
    'brands', (
      select coalesce(jsonb_agg(t order by t.revenue desc), '[]'::jsonb) from (
        select nullif(i.brand_name, '') as name, sum(i.qty)::integer as qty, sum(i.line_total)::integer as revenue
        from items i where i.brand_name <> '' group by i.brand_name order by revenue desc limit 10
      ) t
    ),
    'modes', (
      select coalesce(jsonb_agg(jsonb_build_object('mode', mode, 'orders', n, 'revenue', rev) order by n desc), '[]'::jsonb)
      from (select mode, count(*) n, coalesce(sum(total), 0) rev from sold group by mode) t
    ),
    'payments', (
      select coalesce(jsonb_agg(jsonb_build_object('payment', payment, 'orders', n) order by n desc), '[]'::jsonb)
      from (select payment, count(*) n from sold group by payment) t
    )
  ) into result;

  return result;
end;
$$;
revoke execute on function public.admin_metrics(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_metrics(timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------
-- Fotos de productos (Storage): lectura pública, escritura solo admins
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy productos_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'productos' and (select private.is_admin()));
create policy productos_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and (select private.is_admin()));
create policy productos_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'productos' and (select private.is_admin()))
  with check (bucket_id = 'productos' and (select private.is_admin()));
create policy productos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and (select private.is_admin()));
