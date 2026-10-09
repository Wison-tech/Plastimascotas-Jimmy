import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StockMovementRow } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { useAdminData } from '../data';
import { Drawer, Empty, Field, cop, errText, toast } from '../ui';

type Row = {
  id: number;
  product: string;
  label: string;
  brand?: string;
  icon: string;
  stock: number;
  price: number;
  active: boolean;
};
type Filter = 'todos' | 'bajo' | 'agotado';
type Mode = 'entrada' | 'ajuste';

const REASON: Record<string, { label: string; tone: string }> = {
  inicial: { label: 'Inicial', tone: '' },
  entrada: { label: 'Entrada', tone: 'good' },
  venta: { label: 'Venta', tone: 'info' },
  devolucion: { label: 'Devolución', tone: 'warn' },
  ajuste: { label: 'Ajuste', tone: '' },
};

const when = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export function InventoryView() {
  const { data, loading, reload } = useAdminData();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [moving, setMoving] = useState<Row | null>(null);
  const [moves, setMoves] = useState<StockMovementRow[]>([]);

  const low = data?.settings.low_stock_threshold ?? 5;

  const loadMoves = useCallback(async () => {
    const { data: m, error } = await supabase!.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(40);
    if (error) return toast(errText(error), 'error');
    setMoves(m ?? []);
  }, []);
  useEffect(() => {
    void loadMoves();
  }, [loadMoves]);

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const cats = new Map(data.categories.map((c) => [c.id, c]));
    const brands = new Map(data.brands.map((b) => [b.id, b.name]));
    const prods = new Map(data.products.map((p) => [p.id, p]));
    return data.variants
      .filter((v) => v.track_stock && prods.has(v.product_id))
      .map((v) => {
        const p = prods.get(v.product_id)!;
        return {
          id: v.id,
          product: p.name,
          label: v.label,
          brand: p.brand_id != null ? brands.get(p.brand_id) : undefined,
          icon: cats.get(p.category_id)?.icon ?? '🐾',
          stock: v.stock,
          price: v.price,
          active: v.active && p.active,
        };
      })
      .sort((a, b) => a.stock - b.stock || a.product.localeCompare(b.product, 'es'));
  }, [data]);

  const byVariant = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!term || r.product.toLowerCase().includes(term) || (r.brand ?? '').toLowerCase().includes(term) || r.label.toLowerCase().includes(term)) &&
        (filter === 'todos' || (filter === 'bajo' && r.stock > 0 && r.stock <= low) || (filter === 'agotado' && r.stock === 0)),
    );
  }, [rows, q, filter, low]);

  if (loading) return <section className="a-view"><p className="a-muted">Cargando inventario…</p></section>;
  if (!data) return null;

  const units = rows.reduce((n, r) => n + r.stock, 0);
  const value = rows.reduce((n, r) => n + r.stock * r.price, 0);
  const counts = { todos: rows.length, bajo: rows.filter((r) => r.stock > 0 && r.stock <= low).length, agotado: rows.filter((r) => r.stock === 0).length };

  return (
    <section className="a-view">
      <header className="a-view__head">
        <div>
          <h1>Inventario</h1>
          <p className="a-muted">
            {units.toLocaleString('es-CO')} unidades · {cop(value)} a precio de venta. Las ventas se descuentan solas al confirmar cada pedido.
          </p>
        </div>
      </header>

      <div className="a-filters">
        <input className="a-input a-search" type="search" placeholder="Buscar producto, marca o presentación" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en inventario" />
      </div>
      <div className="a-chips" role="tablist" aria-label="Filtrar">
        {(
          [
            ['todos', 'Todo'],
            ['bajo', `Por agotarse (≤ ${low})`],
            ['agotado', 'Agotados'],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}>
            {label} <span>{counts[id]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Empty icon="📦" title="Nada por aquí">
          {filter === 'agotado' ? '¡Bien! No hay presentaciones agotadas.' : 'Prueba con otra búsqueda.'}
        </Empty>
      ) : (
        <ul className="a-stock">
          {visible.map((r) => {
            const tone = r.stock === 0 ? 'bad' : r.stock <= low ? 'warn' : 'good';
            return (
              <li key={r.id} className={!r.active ? 'is-off' : ''}>
                <span className="a-plist__img" aria-hidden="true">
                  {r.icon}
                </span>
                <span className="a-stock__body">
                  <strong>{r.product}</strong>
                  <span className="a-muted a-small">{[r.brand, r.label, cop(r.price)].filter(Boolean).join(' · ')}</span>
                </span>
                <span className={`a-stock__qty is-${tone}`} aria-label={`${r.stock} unidades`}>
                  {r.stock}
                </span>
                <button type="button" className="a-btn a-btn--sm" onClick={() => setMoving(r)}>
                  Mover
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="a-h2" style={{ marginTop: 28 }}>
        Últimos movimientos
      </h2>
      {moves.length === 0 ? (
        <p className="a-muted">Todavía no hay movimientos.</p>
      ) : (
        <ul className="a-moves">
          {moves.map((m) => {
            const r = byVariant.get(m.variant_id);
            const reason = REASON[m.reason] ?? { label: m.reason, tone: '' };
            return (
              <li key={m.id}>
                <span className={`a-pill a-pill--${reason.tone || 'info'}`}>{reason.label}</span>
                <span className="a-moves__body">
                  <strong>{r ? `${r.product}${r.label ? ` · ${r.label}` : ''}` : 'Producto eliminado'}</strong>
                  <span className="a-muted a-small">
                    {when(m.created_at)}
                    {m.note ? ` · ${m.note}` : ''}
                  </span>
                </span>
                <span className={`a-moves__delta ${m.delta > 0 ? 'is-up' : 'is-down'}`}>
                  {m.delta > 0 ? '+' : ''}
                  {m.delta}
                </span>
                <span className="a-muted a-small a-moves__after">quedan {m.stock_after}</span>
              </li>
            );
          })}
        </ul>
      )}

      {moving && (
        <MoveDrawer
          row={moving}
          onClose={() => setMoving(null)}
          onDone={() => {
            setMoving(null);
            void reload();
            void loadMoves();
          }}
        />
      )}
    </section>
  );
}

function MoveDrawer({ row, onClose, onDone }: { row: Row; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>('entrada');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const n = Number(qty.replace(/\D/g, '') || 0);
  const delta = mode === 'entrada' ? n : n - row.stock;
  const after = row.stock + delta;

  const save = async () => {
    if (mode === 'entrada' && n <= 0) return toast('Escribe cuántas unidades entraron.', 'error');
    if (mode === 'ajuste' && qty.trim() === '') return toast('Escribe cuántas unidades hay en total.', 'error');
    if (delta === 0) return toast('La cantidad queda igual: no hay nada que guardar.', 'error');
    setBusy(true);
    const { error } = await supabase!.rpc('adjust_stock', { p_variant_id: row.id, p_delta: delta, p_reason: mode, p_note: note.trim() || undefined });
    setBusy(false);
    if (error) return toast(error.message.includes('negative_stock') ? 'El inventario no puede quedar en negativo.' : errText(error), 'error');
    toast(`${row.product}: ahora hay ${after}`);
    onDone();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={`${row.product}${row.label ? ` · ${row.label}` : ''}`}
      footer={
        <div className="a-row a-row--end">
          <button type="button" className="a-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="a-btn a-btn--primary" onClick={save} disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      <p className="a-muted">
        Hay <strong>{row.stock}</strong> unidades ahora.
      </p>
      <div className="a-seg" role="tablist" aria-label="Tipo de movimiento" style={{ margin: '12px 0' }}>
        <button type="button" role="tab" aria-selected={mode === 'entrada'} onClick={() => setMode('entrada')}>
          Entró mercancía
        </button>
        <button type="button" role="tab" aria-selected={mode === 'ajuste'} onClick={() => setMode('ajuste')}>
          Conteo / ajuste
        </button>
      </div>
      <Field label={mode === 'entrada' ? '¿Cuántas unidades entraron?' : '¿Cuántas hay en total después de contar?'} hint={qty ? `Quedarán ${after} unidades` : undefined}>
        <input className="a-input" inputMode="numeric" autoFocus value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} placeholder="0" />
      </Field>
      <Field label="Nota (opcional)" hint={mode === 'entrada' ? 'Ej: proveedor, factura' : 'Ej: producto dañado, conteo del mes'}>
        <input className="a-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </Field>
    </Drawer>
  );
}
