import { useMemo, useState } from 'react';
import type { ProductRow, VariantRow } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { useAdminData } from '../data';
import { ConfirmButton, Empty, Toggle, cop, errText, toast } from '../ui';
import { ProductEditor } from './ProductEditor';

type StockFilter = 'todos' | 'bajo' | 'agotado' | 'ocultos';

export function ProductsView() {
  const { data, loading, reload } = useAdminData();
  const [catId, setCatId] = useState<number | 0>(0);
  const [q, setQ] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('todos');
  const [editing, setEditing] = useState<ProductRow | 'new' | null>(null);

  const low = data?.settings.low_stock_threshold ?? 5;
  const variantsOf = useMemo(() => {
    const m = new Map<number, VariantRow[]>();
    for (const v of data?.variants ?? []) m.set(v.product_id, [...(m.get(v.product_id) ?? []), v]);
    for (const list of m.values()) list.sort((a, b) => a.sort - b.sort || a.id - b.id);
    return m;
  }, [data]);

  const cats = useMemo(() => [...(data?.categories ?? [])].sort((a, b) => a.sort - b.sort || a.id - b.id), [data]);
  const brandName = (id: number | null) => data?.brands.find((b) => b.id === id)?.name;
  const tracked = (p: ProductRow) => (variantsOf.get(p.id) ?? []).filter((v) => v.track_stock && v.active);
  const isOut = (p: ProductRow) => tracked(p).length > 0 && tracked(p).every((v) => v.stock === 0);
  const isLow = (p: ProductRow) => tracked(p).some((v) => v.stock > 0 && v.stock <= low);

  const products = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return [...data.products]
      .sort((a, b) => {
        const ca = cats.findIndex((c) => c.id === a.category_id);
        const cb = cats.findIndex((c) => c.id === b.category_id);
        return ca - cb || a.sort - b.sort || a.id - b.id;
      })
      .filter(
        (p) =>
          (!catId || p.category_id === catId) &&
          (!term || p.name.toLowerCase().includes(term) || (brandName(p.brand_id) ?? '').toLowerCase().includes(term)) &&
          (stockFilter === 'todos' ||
            (stockFilter === 'bajo' && isLow(p)) ||
            (stockFilter === 'agotado' && isOut(p)) ||
            (stockFilter === 'ocultos' && !p.active)),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, catId, stockFilter, cats]);

  if (loading) return <section className="a-view"><p className="a-muted">Cargando productos…</p></section>;
  if (!data) return null;

  const samples = data.products.filter((p) => p.is_sample).length;
  const counts = {
    todos: data.products.length,
    bajo: data.products.filter(isLow).length,
    agotado: data.products.filter(isOut).length,
    ocultos: data.products.filter((p) => !p.active).length,
  };

  const priceText = (p: ProductRow) => {
    const vs = variantsOf.get(p.id) ?? [];
    if (!vs.length) return 'Sin precio';
    if (vs.length === 1 && !vs[0].label) return cop(vs[0].price);
    const prices = vs.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return `${vs.length} presentaciones · ${min === max ? cop(min) : `${cop(min)} – ${cop(max)}`}`;
  };

  const stockText = (p: ProductRow) => {
    const vs = tracked(p);
    if (!vs.length) return null;
    const units = vs.reduce((n, v) => n + v.stock, 0);
    return `${units} en inventario`;
  };

  const toggleProduct = async (p: ProductRow, active: boolean) => {
    const { error } = await supabase!.from('products').update({ active }).eq('id', p.id);
    if (error) return toast(errText(error), 'error');
    toast(active ? `${p.name} visible en la tienda` : `${p.name} oculto`);
    void reload();
  };

  const deleteSamples = async () => {
    const { error } = await supabase!.from('products').delete().eq('is_sample', true);
    if (error) return toast(errText(error), 'error');
    toast('Productos de ejemplo eliminados. ¡Ya puedes cargar los tuyos!');
    void reload();
  };

  return (
    <section className="a-view">
      <header className="a-view__head">
        <div>
          <h1>Productos</h1>
          <p className="a-muted">Los cambios se ven en la tienda al instante (los clientes los reciben al recargar).</p>
        </div>
        <button type="button" className="a-btn a-btn--primary" onClick={() => setEditing('new')}>
          ＋ Nuevo producto
        </button>
      </header>

      {samples > 0 && (
        <div className="a-card a-pad a-sample">
          <div>
            <strong>Hay {samples} productos de ejemplo.</strong>
            <p className="a-muted a-small">
              Sirven para ver cómo queda la tienda. Edítalos con tus precios reales (dejan de ser ejemplo) o bórralos todos de una vez.
            </p>
          </div>
          <ConfirmButton onConfirm={deleteSamples} confirmLabel={`¿Borrar los ${samples} de ejemplo?`}>
            Borrar ejemplos
          </ConfirmButton>
        </div>
      )}

      <div className="a-filters">
        <input className="a-input a-search" type="search" placeholder="Buscar por nombre o marca" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar producto" />
        <select className="a-input a-select-cat" value={catId} onChange={(e) => setCatId(Number(e.target.value))} aria-label="Categoría">
          <option value={0}>Todas las categorías</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="a-chips" role="tablist" aria-label="Filtrar">
        {(
          [
            ['todos', 'Todos'],
            ['bajo', 'Por agotarse'],
            ['agotado', 'Agotados'],
            ['ocultos', 'Ocultos'],
          ] as [StockFilter, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={stockFilter === id} onClick={() => setStockFilter(id)}>
            {label} <span>{counts[id]}</span>
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <Empty icon="🛍️" title={data.products.length ? 'No hay productos con ese filtro' : 'Aún no hay productos'}>
          <button type="button" className="a-btn a-btn--primary" onClick={() => setEditing('new')}>
            ＋ Agregar producto
          </button>
        </Empty>
      ) : (
        <ul className="a-plist">
          {products.map((p) => {
            const cat = cats.find((c) => c.id === p.category_id);
            const out = isOut(p);
            const lowStock = isLow(p);
            return (
              <li key={p.id} className={!p.active ? 'is-off' : ''}>
                <span className="a-plist__img">{p.photo_url ? <img src={p.photo_url} alt="" loading="lazy" /> : <span aria-hidden="true">{cat?.icon ?? '🐾'}</span>}</span>
                <button type="button" className="a-plist__body" onClick={() => setEditing(p)}>
                  <strong>{p.name}</strong>
                  <span className="a-plist__price">
                    {[brandName(p.brand_id), priceText(p)].filter(Boolean).join(' · ')}
                  </span>
                  <span className="a-plist__tags">
                    {stockText(p) && <span className={`a-tag ${out ? 'a-tag--bad' : lowStock ? 'a-tag--warn' : ''}`}>{out ? 'Agotado' : stockText(p)}</span>}
                    {lowStock && !out && <span className="a-tag a-tag--warn">Por agotarse</span>}
                    {!p.active && <span className="a-tag a-tag--off">Oculto</span>}
                    {p.featured && <span className="a-tag">⭐ Destacado</span>}
                    {p.is_sample && <span className="a-tag">Ejemplo</span>}
                    {(variantsOf.get(p.id) ?? []).some((v) => v.wholesale_price != null) && <span className="a-tag">📦 Por mayor</span>}
                  </span>
                </button>
                <span className="a-plist__tools">
                  <Toggle checked={p.active} onChange={(v) => toggleProduct(p, v)} label={p.active ? 'Visible' : 'Oculto'} />
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <ProductEditor
          data={data}
          product={editing === 'new' ? null : editing}
          defaultCategoryId={catId || cats[0]?.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}
    </section>
  );
}
