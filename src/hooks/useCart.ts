import { useCallback, useMemo } from 'react';
import { priceFor, type Catalog, type Product, type Variant } from '../data/catalog';
import { useStored } from './useStored';

type StoredLine = { key: string; qty: number };
export type CartLine = StoredLine & {
  product: Product;
  variant: Variant;
  unit: number;
  wholesale: boolean;
  /** Lo que se ahorra frente al precio normal por la compra al por mayor */
  savings: number;
  /** Cuántas unidades se pueden pedir como máximo (stock disponible) */
  max: number;
};

export type PastOrder = {
  code: string;
  date: number;
  total: number;
  lines: StoredLine[];
  /** Solo si quedó registrado en Supabase: permiten ver su estado. */
  id?: string;
  token?: string;
};

export const MAX_QTY = 999;
export const maxFor = (v: Variant) => Math.min(MAX_QTY, v.stock ?? MAX_QTY);

function parseShape(raw: unknown): StoredLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((l) =>
    l && typeof l === 'object' && typeof l.key === 'string' && Number(l.qty) > 0
      ? [{ key: l.key, qty: Math.min(MAX_QTY, Math.floor(Number(l.qty))) }]
      : [],
  );
}

function parseHistory(raw: unknown): PastOrder[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((o) =>
    o && typeof o.code === 'string' && typeof o.date === 'number'
      ? [{
          code: o.code,
          date: o.date,
          total: Number(o.total) || 0,
          lines: parseShape(o.lines),
          id: typeof o.id === 'string' ? o.id : undefined,
          token: typeof o.token === 'string' ? o.token : undefined,
        }]
      : [],
  );
}

export function useCart(catalog: Catalog) {
  const [stored, setStored] = useStored<StoredLine[]>('pj-carrito-v1', [], parseShape);
  const [history, setHistory] = useStored<PastOrder[]>('pj-historial-v1', [], parseHistory);

  const lines: CartLine[] = useMemo(
    () =>
      stored.flatMap((l) => {
        const hit = catalog.variantByKey[l.key];
        if (!hit) return [];
        const max = maxFor(hit.variant);
        if (max <= 0) return [];
        const qty = Math.min(l.qty, max);
        const { unit, wholesale } = priceFor(hit.variant, qty);
        return [{ key: l.key, qty, product: hit.product, variant: hit.variant, unit, wholesale, savings: (hit.variant.price - unit) * qty, max }];
      }),
    [stored, catalog],
  );

  /** Cuántas unidades de esa presentación hay ya en el carrito */
  const qtyOf = useCallback((key: string) => lines.find((l) => l.key === key)?.qty ?? 0, [lines]);

  const add = useCallback(
    (key: string, qty: number) =>
      setStored((prev) => {
        const hit = catalog.variantByKey[key];
        const max = hit ? maxFor(hit.variant) : MAX_QTY;
        const found = prev.find((l) => l.key === key);
        if (found) return prev.map((l) => (l.key === key ? { ...l, qty: Math.min(max, l.qty + qty) } : l));
        return [...prev, { key, qty: Math.min(max, qty) }];
      }),
    [setStored, catalog],
  );

  const setQty = useCallback(
    (key: string, qty: number) =>
      setStored((prev) => {
        const hit = catalog.variantByKey[key];
        const max = hit ? maxFor(hit.variant) : MAX_QTY;
        const n = Math.max(0, Math.min(max, Math.floor(qty)));
        return n === 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty: n } : l));
      }),
    [setStored, catalog],
  );

  const clear = useCallback(() => setStored([]), [setStored]);

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + l.unit * l.qty, 0);
  const savings = lines.reduce((n, l) => n + l.savings, 0);

  /** Guarda el pedido enviado en el historial (máx. 5) y vacía el carrito. */
  const archive = useCallback(
    (order: { code: string; total: number; id?: string; token?: string }) => {
      setHistory((prev) => [{ ...order, date: Date.now(), lines: lines.map((l) => ({ key: l.key, qty: l.qty })) }, ...prev].slice(0, 5));
      setStored([]);
    },
    [setHistory, setStored, lines],
  );

  /** Vuelve a cargar un pedido anterior (con precios y stock de hoy). Devuelve cuántas unidades se agregaron. */
  const reorder = useCallback(
    (order: PastOrder) => {
      let added = 0;
      const out = stored.map((l) => ({ ...l }));
      for (const l of order.lines) {
        const hit = catalog.variantByKey[l.key];
        if (!hit) continue;
        const max = maxFor(hit.variant);
        const found = out.find((x) => x.key === l.key);
        const before = found?.qty ?? 0;
        const next = Math.min(max, before + l.qty);
        if (next <= before) continue;
        added += next - before;
        if (found) found.qty = next;
        else out.push({ key: l.key, qty: next });
      }
      setStored(out);
      return added;
    },
    [stored, setStored, catalog],
  );

  /** El cliente canceló un pedido ya archivado: se quita el seguimiento. */
  const forget = useCallback(
    (code: string) => setHistory((prev) => prev.map((o) => (o.code === code ? { ...o, id: undefined, token: undefined } : o))),
    [setHistory],
  );

  return { lines, count, total, savings, qtyOf, add, setQty, clear, history, archive, reorder, forget };
}

export function useFavorites(catalog: Catalog) {
  const [favs, setFavs] = useStored<string[]>('pj-favoritos', [], (raw) =>
    Array.isArray(raw) ? raw.filter((id) => typeof id === 'string') : [],
  );
  const visible = useMemo(() => favs.filter((id) => catalog.byId[id]), [favs, catalog]);
  const toggle = useCallback(
    (id: string) => setFavs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setFavs],
  );
  return { favs: visible, toggle, isFav: (id: string) => favs.includes(id) };
}
