// Genera supabase/seed.sql a partir de src/data/seed.ts.
// Uso (Node 22.6+ con TypeScript nativo): node scripts/gen-seed.ts > supabase/seed.sql
// El catálogo viaja como un solo documento JSON y el SQL lo reparte en las tablas.
import { SEED_BRANDS, SEED_CATEGORIES, SEED_PRODUCTS, SEED_SETTINGS } from '../src/data/seed.ts';

const doc = {
  settings: SEED_SETTINGS,
  categories: SEED_CATEGORIES,
  brands: SEED_BRANDS,
  products: SEED_PRODUCTS,
};
const json = JSON.stringify(doc).replace(/'/g, "''");

console.log(`-- Generado por scripts/gen-seed.ts. Catálogo de EJEMPLO (is_sample = true).
begin;
create temp table seed_doc on commit drop as select '${json}'::jsonb as j;

insert into public.settings (id, name, claim, whatsapp, phones, address, city, payment_methods, delivery_note)
select 1, s->>'name', s->>'claim', s->>'whatsapp',
       array(select jsonb_array_elements_text(s->'phones')), s->>'address', s->>'city',
       array(select jsonb_array_elements_text(s->'paymentMethods')), s->>'deliveryNote'
from (select j->'settings' s from seed_doc) x
on conflict (id) do update set name = excluded.name, claim = excluded.claim, whatsapp = excluded.whatsapp,
  phones = excluded.phones, address = excluded.address, city = excluded.city,
  payment_methods = excluded.payment_methods, delivery_note = excluded.delivery_note;

insert into public.categories (slug, name, icon, description, sort)
select c->>'slug', c->>'name', c->>'icon', c->>'description', (n - 1) * 10
from seed_doc, jsonb_array_elements(j->'categories') with ordinality as t(c, n);

insert into public.brands (name, sort)
select b, (n - 1) * 10 from seed_doc, jsonb_array_elements_text(j->'brands') with ordinality as t(b, n);

insert into public.products (slug, category_id, brand_id, name, description, tag, pets, featured, is_sample, sort)
select p->>'slug',
       (select id from public.categories where slug = p->>'category'),
       (select id from public.brands where name = p->>'brand'),
       p->>'name', p->>'description', p->>'tag',
       array(select jsonb_array_elements_text(p->'pets')),
       coalesce((p->>'featured')::boolean, false), true, (n - 1) * 10
from seed_doc, jsonb_array_elements(j->'products') with ordinality as t(p, n);

insert into public.product_variants (product_id, label, price, compare_at_price, wholesale_price, wholesale_min, stock, sort)
select pr.id, v->>'label', (v->>'price')::int, (v->>'compareAt')::int,
       (v->'wholesale'->>0)::int, (v->'wholesale'->>1)::int, (v->>'stock')::int, (m - 1) * 10
from seed_doc, jsonb_array_elements(j->'products') as t(p),
     jsonb_array_elements(p->'variants') with ordinality as u(v, m),
     public.products pr
where pr.slug = p->>'slug';
commit;`);
