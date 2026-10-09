import { useState } from 'react';
import { PET_ICON, PET_LABEL, type Pet } from '../../data/catalog';
import type { ProductRow } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { move, uploadPhoto, type AdminData } from '../data';
import { ConfirmButton, Drawer, Field, Toggle, cop, errText, slugify, toast } from '../ui';

type VariantDraft = {
  id?: number;
  label: string;
  sku: string;
  price: string;
  compareAt: string;
  wholesalePrice: string;
  wholesaleMin: string;
  stock: string;
  trackStock: boolean;
  active: boolean;
};

const EMPTY_VARIANT: VariantDraft = { label: '', sku: '', price: '', compareAt: '', wholesalePrice: '', wholesaleMin: '', stock: '0', trackStock: true, active: true };
const digits = (s: string) => s.replace(/\D/g, '');
const num = (s: string) => (s.trim() === '' ? null : Number(digits(s)));
const fmt = (s: string) => (s ? Number(s).toLocaleString('es-CO') : '');
const PETS = Object.keys(PET_LABEL) as Pet[];

export function ProductEditor({
  data,
  product,
  defaultCategoryId,
  onClose,
  onSaved,
}: {
  data: AdminData;
  product: ProductRow | null;
  defaultCategoryId?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialVariants: VariantDraft[] = product
    ? data.variants
        .filter((v) => v.product_id === product.id)
        .sort((a, b) => a.sort - b.sort)
        .map((v) => ({
          id: v.id,
          label: v.label,
          sku: v.sku ?? '',
          price: String(v.price),
          compareAt: v.compare_at_price != null ? String(v.compare_at_price) : '',
          wholesalePrice: v.wholesale_price != null ? String(v.wholesale_price) : '',
          wholesaleMin: v.wholesale_min != null ? String(v.wholesale_min) : '',
          stock: String(v.stock),
          trackStock: v.track_stock,
          active: v.active,
        }))
    : [];

  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState<number>(product?.category_id ?? defaultCategoryId ?? data.categories[0]?.id);
  const [brandId, setBrandId] = useState<number | null>(product?.brand_id ?? null);
  const [description, setDescription] = useState(product?.description ?? '');
  const [tag, setTag] = useState(product?.tag ?? '');
  const [pets, setPets] = useState<string[]>(product?.pets ?? []);
  const [photo, setPhoto] = useState<string | null>(product?.photo_url ?? null);
  const [active, setActive] = useState(product?.active ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [variants, setVariants] = useState<VariantDraft[]>(initialVariants.length ? initialVariants : [{ ...EMPTY_VARIANT }]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const category = data.categories.find((c) => c.id === categoryId);
  const brands = [...data.brands].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const validate = (): string | null => {
    if (!name.trim()) return 'Ponle un nombre al producto.';
    if (!categoryId) return 'Elige una categoría.';
    if (!variants.length) return 'El producto necesita al menos una presentación con precio.';
    for (const v of variants) {
      const label = v.label.trim() || 'la presentación';
      const price = num(v.price);
      if (price == null) return `Falta el precio de ${label}.`;
      const compare = num(v.compareAt);
      if (compare != null && compare <= price) return `En ${label}, el precio «antes» debe ser mayor que el precio actual.`;
      const wp = num(v.wholesalePrice);
      const wm = num(v.wholesaleMin);
      if ((wp == null) !== (wm == null)) return `En ${label}, el precio por mayor necesita valor y cantidad mínima.`;
      if (wp != null && wp >= price) return `En ${label}, el precio por mayor debe ser menor que el normal.`;
      if (wm != null && wm < 2) return `En ${label}, la cantidad mínima por mayor debe ser 2 o más.`;
      if (v.trackStock && num(v.stock) == null) return `Falta la cantidad en inventario de ${label}.`;
    }
    if (variants.length > 1 && variants.some((v) => !v.label.trim())) return 'Cuando hay varias presentaciones, cada una necesita nombre (ej: 1 kg, Bulto 25 kg, Talla M).';
    const labels = variants.map((v) => v.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) return 'Hay dos presentaciones con el mismo nombre.';
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) return toast(problem, 'error');
    setBusy(true);
    try {
      const row = {
        name: name.trim(),
        category_id: categoryId,
        brand_id: brandId,
        description: description.trim() || null,
        tag: tag.trim() || null,
        pets,
        photo_url: photo,
        active,
        featured,
        // Un producto editado por el dueño deja de ser "de ejemplo".
        is_sample: false,
      };
      let id = product?.id;
      if (product) {
        const { error } = await supabase!.from('products').update(row).eq('id', product.id);
        if (error) throw error;
      } else {
        let slug = slugify(name) || 'producto';
        if (data.products.some((p) => p.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`;
        const sort = data.products.filter((p) => p.category_id === categoryId).length * 10;
        const { data: ins, error } = await supabase!.from('products').insert({ ...row, slug, sort }).select('id').single();
        if (error) throw error;
        id = ins.id;
      }

      // Presentaciones: se borran las quitadas, y las que quedan se renombran en dos pasos
      // para no chocar con la restricción única (producto, nombre).
      const keep = variants.filter((v) => v.id).map((v) => v.id!);
      const existing = data.variants.filter((v) => v.product_id === id).map((v) => v.id);
      const removed = existing.filter((vid) => !keep.includes(vid));
      if (removed.length) {
        const { error } = await supabase!.from('product_variants').delete().in('id', removed);
        if (error) throw error;
      }
      for (const [i, v] of variants.entries()) {
        if (v.id) {
          const { error } = await supabase!.from('product_variants').update({ label: `__tmp_${i}_${Date.now()}` }).eq('id', v.id);
          if (error) throw error;
        }
      }
      for (const [i, v] of variants.entries()) {
        const vrow = {
          label: variants.length === 1 && !v.label.trim() ? '' : v.label.trim(),
          sku: v.sku.trim() || null,
          price: num(v.price)!,
          compare_at_price: num(v.compareAt),
          wholesale_price: num(v.wholesalePrice),
          wholesale_min: num(v.wholesaleMin),
          stock: v.trackStock ? Math.max(0, num(v.stock) ?? 0) : 0,
          track_stock: v.trackStock,
          active: v.active,
          sort: i * 10,
        };
        const { error } = v.id
          ? await supabase!.from('product_variants').update(vrow).eq('id', v.id)
          : await supabase!.from('product_variants').insert({ ...vrow, product_id: id! });
        if (error) throw error;
      }

      toast(product ? 'Producto actualizado' : 'Producto creado');
      onSaved();
    } catch (e) {
      toast(errText(e as Error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const { error } = await supabase!.from('products').delete().eq('id', product!.id);
    if (error) return toast(errText(error), 'error');
    toast('Producto eliminado. Los pedidos anteriores conservan su nombre y precio.');
    onSaved();
  };

  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    setUploading(true);
    const url = await uploadPhoto(f, product?.slug ?? (slugify(name) || 'producto'));
    setUploading(false);
    if (url) setPhoto(url);
  };

  const setVariant = (i: number, patch: Partial<VariantDraft>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const togglePet = (p: string) => setPets((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));

  return (
    <Drawer
      open
      wide
      onClose={onClose}
      title={product ? `Editar: ${product.name}` : 'Nuevo producto'}
      footer={
        <div className="a-row a-row--end">
          {product && (
            <ConfirmButton onConfirm={remove} confirmLabel="¿Eliminar este producto para siempre?">
              Eliminar
            </ConfirmButton>
          )}
          <button type="button" className="a-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="a-btn a-btn--primary" onClick={save} disabled={busy || uploading}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      <div className="a-editor">
        <div className="a-editor__photo">
          <div className="a-photo">{photo ? <img src={photo} alt="" /> : <span aria-hidden="true">{category?.icon || '🐾'}</span>}</div>
          <label className="a-btn a-btn--block">
            {uploading ? 'Subiendo…' : photo ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
          {photo && (
            <button type="button" className="a-link a-small" onClick={() => setPhoto(null)}>
              Quitar foto
            </button>
          )}
          <p className="a-muted a-small">Una foto cuadrada del empaque con fondo claro se ve mejor. Sin foto se muestra el ícono de la categoría.</p>
        </div>

        <div className="a-editor__main">
          <Field label="Nombre">
            <input className="a-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={90} placeholder="Ej: Dogourmet Adulto Carne a la Parrilla" />
          </Field>
          <div className="a-form-grid">
            <Field label="Categoría">
              <select className="a-input" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Marca" hint="Se crean en «Categorías y marcas»">
              <select className="a-input" value={brandId ?? ''} onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Sin marca</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="a-form-grid">
            <Field label="Etiqueta (opcional)" hint="Ej: Más vendido, Oferta, Importado">
              <input className="a-input" value={tag} onChange={(e) => setTag(e.target.value)} maxLength={24} />
            </Field>
            <div className="a-field">
              <span className="a-field__label">Para qué mascota</span>
              <div className="a-chips a-chips--edit" role="group" aria-label="Mascotas">
                {PETS.map((p) => (
                  <button key={p} type="button" className={`a-chip ${pets.includes(p) ? 'is-on' : ''}`} aria-pressed={pets.includes(p)} onClick={() => togglePet(p)}>
                    {PET_ICON[p]} {PET_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Field label="Descripción (opcional)">
            <textarea className="a-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <h3 className="a-h3">Presentaciones, precios e inventario</h3>
          <p className="a-muted a-small">
            Un solo precio: deja el nombre vacío. Varias: 1 kg / 4 kg / Bulto, Talla S / M / L… El precio por mayor se aplica solo cuando el cliente
            lleva la cantidad mínima.
          </p>
          <ul className="a-vcards">
            {variants.map((v, i) => (
              <li key={v.id ?? `n${i}`} className={`a-vcard ${!v.active ? 'is-off' : ''}`}>
                <div className="a-vcard__head">
                  <input
                    className="a-input"
                    placeholder={variants.length > 1 ? 'Nombre (ej: 1 kg)' : 'Presentación (opcional)'}
                    value={v.label}
                    onChange={(e) => setVariant(i, { label: e.target.value })}
                    aria-label="Nombre de la presentación"
                  />
                  <button type="button" className="a-icon-btn" onClick={() => setVariants((vs) => move(vs, i, -1))} disabled={i === 0} aria-label="Subir">
                    ↑
                  </button>
                  <button type="button" className="a-icon-btn" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} disabled={variants.length === 1} aria-label="Quitar presentación">
                    ✕
                  </button>
                </div>
                <div className="a-vcard__grid">
                  <Money label="Precio" value={v.price} onChange={(x) => setVariant(i, { price: x })} />
                  <Money label="Precio antes (oferta)" value={v.compareAt} onChange={(x) => setVariant(i, { compareAt: x })} optional />
                  <Money label="Precio por mayor" value={v.wholesalePrice} onChange={(x) => setVariant(i, { wholesalePrice: x })} optional />
                  <label className="a-field">
                    <span className="a-field__label">Desde (unidades)</span>
                    <input className="a-input" inputMode="numeric" value={v.wholesaleMin} onChange={(e) => setVariant(i, { wholesaleMin: digits(e.target.value) })} placeholder="Ej: 6" />
                  </label>
                  <label className="a-field">
                    <span className="a-field__label">En inventario</span>
                    <input
                      className="a-input"
                      inputMode="numeric"
                      value={v.trackStock ? v.stock : ''}
                      disabled={!v.trackStock}
                      onChange={(e) => setVariant(i, { stock: digits(e.target.value) })}
                      placeholder={v.trackStock ? '0' : 'Sin control'}
                    />
                  </label>
                  <label className="a-field">
                    <span className="a-field__label">Código / SKU</span>
                    <input className="a-input" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} placeholder="Opcional" />
                  </label>
                </div>
                <div className="a-vcard__foot">
                  <Toggle checked={v.trackStock} onChange={(x) => setVariant(i, { trackStock: x })} label="Controlar inventario" />
                  <Toggle checked={v.active} onChange={(x) => setVariant(i, { active: x })} label="A la venta" />
                  {num(v.wholesalePrice) != null && num(v.price) != null && (
                    <span className="a-muted a-small">
                      Por mayor ahorra {cop((num(v.price) ?? 0) - (num(v.wholesalePrice) ?? 0))} c/u
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="a-btn a-btn--sm" onClick={() => setVariants((vs) => [...vs, { ...EMPTY_VARIANT }])}>
            ＋ Agregar presentación
          </button>
          {product && <p className="a-muted a-small">Si cambias la cantidad aquí, queda registrada como «ajuste» en el historial de Inventario.</p>}

          <h3 className="a-h3">En la tienda</h3>
          <Toggle checked={active} onChange={setActive} label="Visible en la tienda" hint="Apágalo para esconderlo sin borrarlo" />
          <Toggle checked={featured} onChange={setFeatured} label="Destacado" hint="Puede salir en la portada" />
        </div>
      </div>
    </Drawer>
  );
}

function Money({ label, value, onChange, optional }: { label: string; value: string; onChange: (v: string) => void; optional?: boolean }) {
  return (
    <label className="a-field">
      <span className="a-field__label">{label}</span>
      <span className="a-money">
        <span aria-hidden="true">$</span>
        <input className="a-input" inputMode="numeric" value={fmt(value)} onChange={(e) => onChange(digits(e.target.value))} placeholder={optional ? 'Opcional' : '0'} />
      </span>
    </label>
  );
}
