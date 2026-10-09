import { createContext, useContext, useEffect, useState } from 'react';
import type { BrandRow, CategoryRow, ProductRow, SettingsRow, VariantRow } from '../lib/database.types';
import { normalize } from '../lib/format';
import { supabase } from '../lib/supabase';
import { SEED_BRANDS, SEED_CATEGORIES, SEED_PRODUCTS, SEED_SETTINGS, type Pet } from './seed';

export type { Pet };
export type Hours = Partial<Record<number, [string, string]>>;

export type Settings = {
  name: string;
  claim: string;
  whatsapp: string;
  phones: string[];
  address: string;
  city: string;
  hours: Hours | null;
  paymentMethods: string[];
  deliveryNote: string;
  instagram: string;
  facebook: string;
  lowStock: number;
  orderingEnabled: boolean;
};

export type Variant = {
  /** Clave estable en el navegador: el id de la base, o `slug#índice` en la copia de respaldo. */
  key: string;
  dbId?: number;
  label: string;
  price: number;
  compareAt?: number;
  wholesalePrice?: number;
  wholesaleMin?: number;
  /** null = no se controla el inventario de esta presentación */
  stock: number | null;
};

export type Category = { id: string; name: string; icon: string; description?: string };

export type Product = {
  id: string; // slug
  dbId?: number;
  name: string;
  description?: string;
  tag?: string;
  photo?: string;
  brand?: string;
  pets: Pet[];
  featured: boolean;
  categoryId: string;
  variants: Variant[];
  /** Texto con el que se busca (sin tildes) */
  haystack: string;
};

export type Catalog = {
  /** db = recién traído de Supabase · cache = última copia guardada · bundled = copia empaquetada */
  source: 'db' | 'cache' | 'bundled';
  categories: Category[];
  brands: string[];
  products: Product[];
  byId: Record<string, Product>;
  variantByKey: Record<string, { product: Product; variant: Variant }>;
  settings: Settings;
};

export const PET_LABEL: Record<Pet, string> = {
  perro: 'Perros',
  gato: 'Gatos',
  ave: 'Aves',
  roedor: 'Conejos y hámsters',
  peces: 'Peces',
};

export const PET_ICON: Record<Pet, string> = { perro: '🐶', gato: '🐱', ave: '🦜', roedor: '🐹', peces: '🐠' };

/** Precio que paga el cliente según la cantidad (aplica el precio por mayor si alcanza el mínimo). */
export function priceFor(v: Variant, qty: number) {
  const wholesale = v.wholesalePrice != null && v.wholesaleMin != null && qty >= v.wholesaleMin;
  return { unit: wholesale ? v.wholesalePrice! : v.price, wholesale };
}

export const inStock = (v: Variant) => v.stock == null || v.stock > 0;
export const productInStock = (p: Product) => p.variants.some(inStock);
export const minPrice = (p: Product) => Math.min(...p.variants.map((v) => v.price));

function finish(source: Catalog['source'], categories: Category[], brands: string[], products: Product[], settings: Settings): Catalog {
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const variantByKey: Catalog['variantByKey'] = {};
  for (const product of products) for (const variant of product.variants) variantByKey[variant.key] = { product, variant };
  return { source, categories, brands, products, byId, variantByKey, settings };
}

const hay = (...parts: (string | undefined)[]) => normalize(parts.filter(Boolean).join(' '));

// ---------------------------------------------------------------------
// Copia empaquetada (respaldo si Supabase no responde en la primera visita)
// ---------------------------------------------------------------------
export function bundledCatalog(): Catalog {
  const categories = SEED_CATEGORIES.map((c) => ({ id: c.slug, name: c.name, icon: c.icon, description: c.description }));
  const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const products: Product[] = SEED_PRODUCTS.map((p) => ({
    id: p.slug,
    name: p.name,
    description: p.description,
    tag: p.tag,
    brand: p.brand,
    pets: p.pets,
    featured: !!p.featured,
    categoryId: p.category,
    variants: p.variants.map((v, i) => ({
      key: `${p.slug}#${i}`,
      label: v.label,
      price: v.price,
      compareAt: v.compareAt,
      wholesalePrice: v.wholesale?.[0],
      wholesaleMin: v.wholesale?.[1],
      stock: v.stock,
    })),
    haystack: hay(p.name, p.brand, p.tag, p.description, catName[p.category], ...p.pets.map((x) => PET_LABEL[x]), ...p.variants.map((v) => v.label)),
  }));
  return finish('bundled', categories, SEED_BRANDS, products, {
    name: SEED_SETTINGS.name,
    claim: SEED_SETTINGS.claim,
    whatsapp: SEED_SETTINGS.whatsapp,
    phones: SEED_SETTINGS.phones,
    address: SEED_SETTINGS.address,
    city: SEED_SETTINGS.city,
    hours: null,
    paymentMethods: SEED_SETTINGS.paymentMethods,
    deliveryNote: SEED_SETTINGS.deliveryNote,
    instagram: '',
    facebook: '',
    lowStock: 5,
    orderingEnabled: true,
  });
}

// ---------------------------------------------------------------------
// Catálogo desde Supabase
// ---------------------------------------------------------------------
type Raw = {
  settings: SettingsRow;
  categories: CategoryRow[];
  brands: BrandRow[];
  products: ProductRow[];
  variants: VariantRow[];
};

const bySort = <T extends { sort: number; id: number }>(a: T, b: T) => a.sort - b.sort || a.id - b.id;

export function parseHours(h: unknown): Hours | null {
  if (!h || typeof h !== 'object') return null;
  const out: Hours = {};
  for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
    if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string') out[Number(k)] = [v[0], v[1]];
  }
  return Object.keys(out).length ? out : null;
}

export function catalogFromRaw(raw: Raw, source: 'db' | 'cache'): Catalog {
  const cats = raw.categories.filter((c) => c.active).sort(bySort);
  const catById = new Map(cats.map((c) => [c.id, c]));
  const brandById = new Map(raw.brands.map((b) => [b.id, b]));

  const products: Product[] = raw.products
    .filter((p) => p.active && catById.has(p.category_id))
    .sort((a, b) => {
      const ca = catById.get(a.category_id)!;
      const cb = catById.get(b.category_id)!;
      return ca.sort - cb.sort || ca.id - cb.id || bySort(a, b);
    })
    .flatMap((p): Product[] => {
      const variants: Variant[] = raw.variants
        .filter((v) => v.product_id === p.id && v.active)
        .sort(bySort)
        .map((v) => ({
          key: String(v.id),
          dbId: v.id,
          label: v.label,
          price: v.price,
          compareAt: v.compare_at_price ?? undefined,
          wholesalePrice: v.wholesale_price ?? undefined,
          wholesaleMin: v.wholesale_min ?? undefined,
          stock: v.track_stock ? v.stock : null,
        }));
      if (!variants.length) return []; // sin presentación con precio no se puede vender
      const cat = catById.get(p.category_id)!;
      const brand = p.brand_id != null ? brandById.get(p.brand_id) : undefined;
      const pets = p.pets.filter((x): x is Pet => x in PET_LABEL);
      return [{
        id: p.slug,
        dbId: p.id,
        name: p.name,
        description: p.description ?? undefined,
        tag: p.tag ?? undefined,
        photo: p.photo_url ?? undefined,
        brand: brand?.name,
        pets,
        featured: p.featured,
        categoryId: cat.slug,
        variants,
        haystack: hay(p.name, brand?.name, p.tag ?? '', p.description ?? '', cat.name, ...pets.map((x) => PET_LABEL[x]), ...variants.map((v) => v.label)),
      }];
    });

  const usedCats = new Set(products.map((p) => p.categoryId));
  const categories = cats
    .filter((c) => usedCats.has(c.slug))
    .map((c) => ({ id: c.slug, name: c.name, icon: c.icon, description: c.description ?? undefined }));
  const brands = raw.brands.filter((b) => b.active).sort(bySort).map((b) => b.name);

  const s = raw.settings;
  return finish(source, categories, brands, products, {
    name: s.name,
    claim: s.claim,
    whatsapp: s.whatsapp,
    phones: s.phones,
    address: s.address,
    city: s.city,
    hours: parseHours(s.hours),
    paymentMethods: s.payment_methods.length ? s.payment_methods : ['Efectivo'],
    deliveryNote: s.delivery_note,
    instagram: s.instagram,
    facebook: s.facebook,
    lowStock: s.low_stock_threshold,
    orderingEnabled: s.ordering_enabled,
  });
}

export async function fetchRaw(): Promise<Raw> {
  if (!supabase) throw new Error('supabase_not_configured');
  const [settings, categories, brands, products, variants] = await Promise.all([
    supabase.from('settings').select('*').eq('id', 1).single(),
    supabase.from('categories').select('*'),
    supabase.from('brands').select('*'),
    supabase.from('products').select('*'),
    supabase.from('product_variants').select('*'),
  ]);
  for (const r of [settings, categories, brands, products, variants]) {
    if (r.error) throw r.error;
  }
  return {
    settings: settings.data!,
    categories: categories.data!,
    brands: brands.data!,
    products: products.data!,
    variants: variants.data!,
  };
}

// ---------------------------------------------------------------------
// Estado del catálogo en la app
// ---------------------------------------------------------------------
const CACHE_KEY = 'pj-catalogo-v1';

function readCache(): Catalog | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? catalogFromRaw(JSON.parse(raw), 'cache') : null;
  } catch {
    return null;
  }
}

/** Muestra al instante la copia guardada y la actualiza desde Supabase (precios y stock frescos). */
export function useCatalogLoader(): { catalog: Catalog; refresh: () => void } {
  const [catalog, setCatalog] = useState<Catalog>(() => readCache() ?? bundledCatalog());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    fetchRaw()
      .then((raw) => {
        if (!alive) return;
        setCatalog(catalogFromRaw(raw, 'db'));
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(raw));
        } catch {
          /* sin almacenamiento: solo se pierde la carga instantánea */
        }
      })
      .catch(() => {
        /* sin conexión: se queda la copia guardada o la empaquetada */
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  // Stock fresco si la persona vuelve a la pestaña después de un rato.
  useEffect(() => {
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - last > 3 * 60_000) {
        last = Date.now();
        setTick((t) => t + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return { catalog, refresh: () => setTick((t) => t + 1) };
}

export const CatalogContext = createContext<Catalog | null>(null);

export function useCatalog(): Catalog {
  const c = useContext(CatalogContext);
  if (!c) throw new Error('useCatalog fuera de CatalogContext');
  return c;
}
