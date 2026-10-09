import { useMemo, useState } from 'react';
import type { BrandRow, CategoryRow } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { move, saveOrder, useAdminData } from '../data';
import { ConfirmButton, Drawer, Field, Toggle, errText, slugify, toast } from '../ui';

export function CatalogSetupView() {
  const { data, loading, reload } = useAdminData();
  const [catEdit, setCatEdit] = useState<CategoryRow | 'new' | null>(null);
  const [newBrand, setNewBrand] = useState('');
  const [busy, setBusy] = useState(false);

  const cats = useMemo(() => [...(data?.categories ?? [])].sort((a, b) => a.sort - b.sort || a.id - b.id), [data]);
  const brands = useMemo(() => [...(data?.brands ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'es')), [data]);

  if (loading) return <section className="a-view"><p className="a-muted">Cargando…</p></section>;
  if (!data) return null;

  const countIn = (id: number) => data.products.filter((p) => p.category_id === id).length;
  const countBrand = (id: number) => data.products.filter((p) => p.brand_id === id).length;

  const moveCat = async (i: number, d: number) => {
    const list = move(cats, i, d);
    if (list === cats) return;
    await saveOrder('categories', list.map((c) => c.id));
    void reload();
  };

  const addBrand = async () => {
    const name = newBrand.trim();
    if (!name) return;
    setBusy(true);
    const { error } = await supabase!.from('brands').insert({ name, sort: brands.length * 10 });
    setBusy(false);
    if (error) return toast(errText(error), 'error');
    setNewBrand('');
    toast(`Marca ${name} agregada`);
    void reload();
  };

  const updateBrand = async (b: BrandRow, patch: { active?: boolean; name?: string }, ok: string) => {
    const { error } = await supabase!.from('brands').update(patch).eq('id', b.id);
    if (error) return toast(errText(error), 'error');
    toast(ok);
    void reload();
  };

  const deleteBrand = async (b: BrandRow) => {
    const { error } = await supabase!.from('brands').delete().eq('id', b.id);
    if (error) return toast(errText(error), 'error');
    toast(`Marca ${b.name} eliminada`);
    void reload();
  };

  return (
    <section className="a-view">
      <header className="a-view__head">
        <div>
          <h1>Categorías y marcas</h1>
          <p className="a-muted">Así se organiza la tienda. El orden de las categorías es el mismo que ven los clientes.</p>
        </div>
        <button type="button" className="a-btn a-btn--primary" onClick={() => setCatEdit('new')}>
          ＋ Nueva categoría
        </button>
      </header>

      <section className="a-card a-pad">
        <h2 className="a-h2">Categorías</h2>
        <ul className="a-plist a-plist--flat">
          {cats.map((c, i) => (
            <li key={c.id} className={!c.active ? 'is-off' : ''}>
              <span className="a-plist__img" aria-hidden="true">
                {c.icon}
              </span>
              <button type="button" className="a-plist__body" onClick={() => setCatEdit(c)}>
                <strong>{c.name}</strong>
                <span className="a-plist__price">
                  {countIn(c.id)} productos{c.description ? ` · ${c.description}` : ''}
                </span>
                {!c.active && (
                  <span className="a-plist__tags">
                    <span className="a-tag a-tag--off">Oculta</span>
                  </span>
                )}
              </button>
              <span className="a-plist__tools">
                <button type="button" className="a-icon-btn" onClick={() => moveCat(i, -1)} disabled={i === 0} aria-label={`Subir ${c.name}`}>
                  ↑
                </button>
                <button type="button" className="a-icon-btn" onClick={() => moveCat(i, 1)} disabled={i === cats.length - 1} aria-label={`Bajar ${c.name}`}>
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="a-card a-pad">
        <h2 className="a-h2">Marcas</h2>
        <p className="a-muted a-small">Aparecen en la sección «Marcas» de la tienda y sirven para buscar.</p>
        <div className="a-inline" style={{ margin: '10px 0 14px' }}>
          <input
            className="a-input"
            placeholder="Nueva marca, ej: Pro Plan"
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addBrand()}
            maxLength={60}
            aria-label="Nueva marca"
          />
          <button type="button" className="a-btn" onClick={addBrand} disabled={busy || !newBrand.trim()}>
            ＋ Agregar
          </button>
        </div>
        <ul className="a-brands">
          {brands.map((b) => (
            <li key={b.id} className={!b.active ? 'is-off' : ''}>
              <span>
                <strong>{b.name}</strong>
                <small className="a-muted"> · {countBrand(b.id)} productos</small>
              </span>
              <Toggle checked={b.active} onChange={(v) => updateBrand(b, { active: v }, v ? `${b.name} visible` : `${b.name} oculta`)} label={b.active ? 'Visible' : 'Oculta'} />
              <ConfirmButton onConfirm={() => deleteBrand(b)} confirmLabel="¿Eliminar?" className="a-icon-btn">
                ✕
              </ConfirmButton>
            </li>
          ))}
        </ul>
      </section>

      {catEdit && (
        <CategoryEditor
          category={catEdit === 'new' ? null : catEdit}
          count={catEdit === 'new' ? 0 : countIn(catEdit.id)}
          nextSort={cats.length * 10}
          onClose={() => setCatEdit(null)}
          onSaved={() => {
            setCatEdit(null);
            void reload();
          }}
        />
      )}
    </section>
  );
}

function CategoryEditor({ category, count, nextSort, onClose, onSaved }: { category: CategoryRow | null; count: number; nextSort: number; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '🐾');
  const [description, setDescription] = useState(category?.description ?? '');
  const [active, setActive] = useState(category?.active ?? true);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast('Ponle un nombre a la categoría.', 'error');
    setBusy(true);
    const row = { name: name.trim(), icon: icon.trim() || '🐾', description: description.trim() || null, active };
    const res = category
      ? await supabase!.from('categories').update(row).eq('id', category.id)
      : await supabase!.from('categories').insert({ ...row, slug: `${slugify(name) || 'categoria'}-${Date.now().toString(36)}`, sort: nextSort });
    setBusy(false);
    if (res.error) return toast(errText(res.error), 'error');
    toast('Categoría guardada');
    onSaved();
  };

  const remove = async () => {
    const { error } = await supabase!.from('categories').delete().eq('id', category!.id);
    if (error) return toast(errText(error), 'error');
    toast('Categoría eliminada');
    onSaved();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={category ? `Editar ${category.name}` : 'Nueva categoría'}
      footer={
        <div className="a-row a-row--end">
          {category &&
            (count === 0 ? (
              <ConfirmButton onConfirm={remove} confirmLabel="¿Eliminar categoría?">
                Eliminar
              </ConfirmButton>
            ) : (
              <span className="a-muted a-small">Para eliminarla, primero mueve o borra sus {count} productos.</span>
            ))}
          <button type="button" className="a-btn a-btn--primary" onClick={save} disabled={busy}>
            Guardar
          </button>
        </div>
      }
    >
      <div className="a-form-grid">
        <Field label="Nombre">
          <input className="a-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Field>
        <Field label="Ícono" hint="Un emoji">
          <input className="a-input a-input--icon" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={8} />
        </Field>
      </div>
      <Field label="Descripción (opcional)" hint="Se muestra al filtrar la tienda por esta categoría">
        <textarea className="a-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Toggle checked={active} onChange={setActive} label="Visible en la tienda" />
    </Drawer>
  );
}
