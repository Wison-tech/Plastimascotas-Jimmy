import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { minPrice, PET_LABEL, productInStock, useCatalog, type Pet, type Product } from '../data/catalog';
import { normalize } from '../lib/format';
import { CategoryIcon } from './CategoryIcon';
import { CloseIcon, SearchIcon } from './Icons';
import { ProductCard } from './ProductCard';

export type Sort = 'relevancia' | 'menor' | 'mayor' | 'nombre';

export type Filters = {
  query: string;
  pet: Pet | null;
  category: string | null;
  wholesale: boolean;
  onlyStock: boolean;
  favs: boolean;
  sort: Sort;
};

export const EMPTY_FILTERS: Filters = { query: '', pet: null, category: null, wholesale: false, onlyStock: false, favs: false, sort: 'relevancia' };

type Props = {
  filters: Filters;
  onFilters: (f: Partial<Filters>) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  favIds: string[];
  qtyOf: (key: string) => number;
  onAdd: (key: string, qty: number) => void;
  onSetQty: (key: string, qty: number) => void;
  onOpen: (p: Product) => void;
  isFav: (id: string) => boolean;
  onFav: (id: string) => void;
};

const PAGE = 12;
const hasWholesale = (p: Product) => p.variants.some((v) => v.wholesalePrice != null);

export function Shop({ filters, onFilters, searchRef, favIds, qtyOf, onAdd, onSetQty, onOpen, isFav, onFav }: Props) {
  const { products, categories, source } = useCatalog();
  const query = useDeferredValue(filters.query);
  const [limit, setLimit] = useState(PAGE);

  const pets = useMemo(() => (Object.keys(PET_LABEL) as Pet[]).filter((p) => products.some((x) => x.pets.includes(p))), [products]);

  const list = useMemo(() => {
    const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
    let out = products.filter(
      (p) =>
        (!filters.pet || p.pets.includes(filters.pet)) &&
        (!filters.category || p.categoryId === filters.category) &&
        (!filters.wholesale || hasWholesale(p)) &&
        (!filters.onlyStock || productInStock(p)) &&
        (!filters.favs || favIds.includes(p.id)) &&
        words.every((w) => p.haystack.includes(w)),
    );
    if (filters.sort === 'menor') out = [...out].sort((a, b) => minPrice(a) - minPrice(b));
    else if (filters.sort === 'mayor') out = [...out].sort((a, b) => minPrice(b) - minPrice(a));
    else if (filters.sort === 'nombre') out = [...out].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    else out = [...out].sort((a, b) => Number(productInStock(b)) - Number(productInStock(a))); // agotados al final
    return out;
  }, [products, query, filters, favIds]);

  // Al cambiar de filtro se vuelve a la primera página.
  useEffect(() => setLimit(PAGE), [query, filters.pet, filters.category, filters.wholesale, filters.onlyStock, filters.favs, filters.sort]);

  const category = categories.find((c) => c.id === filters.category);
  const active =
    !!filters.query || !!filters.pet || !!filters.category || filters.wholesale || filters.onlyStock || filters.favs || filters.sort !== 'relevancia';

  return (
    <section className="section" id="tienda" aria-labelledby="shopTitle">
      <div className="wrap">
        <div className="section__head">
          <span className="kicker">Tienda</span>
          <h2 id="shopTitle">
            Todo en un <em>solo lugar</em>
          </h2>
          <p>Elige, agrega al carrito y envía tu pedido por WhatsApp. Los precios por mayor se aplican solos.</p>
        </div>

        {source === 'bundled' && <p className="sample-note">Mostrando el catálogo guardado: revisa tu conexión para ver precios y existencias al día.</p>}

        <div className="shop__bar">
          <div className="shop__bar-row">
            <div className="search" role="search">
              <SearchIcon />
              <input
                ref={searchRef}
                type="search"
                value={filters.query}
                onChange={(e) => onFilters({ query: e.target.value })}
                onKeyDown={(e) => e.key === 'Escape' && onFilters({ query: '' })}
                placeholder="Busca arena, Dogourmet, antipulgas…"
                aria-label="Buscar productos"
                autoComplete="off"
                enterKeyHint="search"
              />
              {filters.query && (
                <button type="button" className="search__clear" onClick={() => onFilters({ query: '' })} aria-label="Borrar búsqueda">
                  <CloseIcon />
                </button>
              )}
            </div>
            <div className="chips" role="group" aria-label="Filtrar por mascota">
              <button type="button" className={`chip ${!filters.pet ? 'is-active' : ''}`} onClick={() => onFilters({ pet: null })}>
                Todas
              </button>
              {pets.map((p) => (
                <button key={p} type="button" className={`chip ${filters.pet === p ? 'is-active' : ''}`} onClick={() => onFilters({ pet: filters.pet === p ? null : p })}>
                  {PET_LABEL[p]}
                </button>
              ))}
              <button
                type="button"
                className={`chip chip--toggle ${filters.wholesale ? 'is-active' : ''}`}
                onClick={() => onFilters({ wholesale: !filters.wholesale })}
                aria-pressed={filters.wholesale}
              >
                Por mayor
              </button>
              <button
                type="button"
                className={`chip chip--toggle ${filters.onlyStock ? 'is-active' : ''}`}
                onClick={() => onFilters({ onlyStock: !filters.onlyStock })}
                aria-pressed={filters.onlyStock}
              >
                Disponibles
              </button>
              {favIds.length > 0 && (
                <button
                  type="button"
                  className={`chip chip--toggle ${filters.favs ? 'is-active' : ''}`}
                  onClick={() => onFilters({ favs: !filters.favs })}
                  aria-pressed={filters.favs}
                >
                  Favoritos <span className="chip__n">{favIds.length}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="shop__meta">
          <span className="shop__count" aria-live="polite">
            {list.length} producto{list.length === 1 ? '' : 's'}
          </span>
          <div className="shop__selects">
            <label className="sr-only" htmlFor="shopCat">
              Categoría
            </label>
            <select id="shopCat" className="select" value={filters.category ?? ''} onChange={(e) => onFilters({ category: e.target.value || null })}>
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="shopSort">
              Ordenar
            </label>
            <select id="shopSort" className="select" value={filters.sort} onChange={(e) => onFilters({ sort: e.target.value as Sort })}>
              <option value="relevancia">Destacados</option>
              <option value="menor">Menor precio</option>
              <option value="mayor">Mayor precio</option>
              <option value="nombre">Nombre A–Z</option>
            </select>
          </div>
        </div>

        {category && (
          <div className="cat-banner">
            <span aria-hidden="true">
              <CategoryIcon slug={category.id} />
            </span>
            <div>
              <strong>{category.name}</strong>
              {category.description && <p>{category.description}</p>}
            </div>
            <button type="button" className="round-btn" onClick={() => onFilters({ category: null })} aria-label="Quitar categoría">
              <CloseIcon />
            </button>
          </div>
        )}

        {list.length > 0 ? (
          <>
            <div className="grid">
              {list.slice(0, limit).map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  qtyOf={qtyOf}
                  onAdd={onAdd}
                  onSetQty={onSetQty}
                  onOpen={onOpen}
                  isFav={isFav(p.id)}
                  onFav={onFav}
                />
              ))}
            </div>
            {list.length > limit && (
              <div className="more">
                <button type="button" className="btn btn--white" onClick={() => setLimit((l) => l + PAGE)}>
                  Ver más productos ({list.length - limit})
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty">
            <p>No encontramos productos con esos filtros.</p>
            {active && (
              <button type="button" className="btn btn--navy" onClick={() => onFilters(EMPTY_FILTERS)}>
                Ver todos los productos
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
