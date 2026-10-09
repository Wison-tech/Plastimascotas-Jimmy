import { useState } from 'react';
import { inStock, priceFor, useCatalog, type Product, type Variant } from '../data/catalog';
import { maxFor } from '../hooks/useCart';
import { money } from '../lib/format';
import { HeartIcon, MinusIcon, PlusIcon, TrashIcon } from './Icons';
import { ProductImage } from './ProductImage';

export function StockLabel({ variant }: { variant: Variant }) {
  const { settings } = useCatalog();
  if (variant.stock == null) return <span className="stock stock--ok">Disponible</span>;
  if (variant.stock <= 0) return <span className="stock stock--out">Agotado</span>;
  if (variant.stock <= settings.lowStock) return <span className="stock stock--low">¡Quedan {variant.stock}!</span>;
  return <span className="stock stock--ok">Disponible</span>;
}

export function wholesaleText(v: Variant) {
  return v.wholesalePrice != null && v.wholesaleMin != null ? `Por mayor: ${money(v.wholesalePrice)} desde ${v.wholesaleMin} und.` : null;
}

const discount = (v: Variant) => (v.compareAt ? Math.round((1 - v.price / v.compareAt) * 100) : 0);

type Props = {
  product: Product;
  qtyOf: (key: string) => number;
  onAdd: (key: string, qty: number) => void;
  onSetQty: (key: string, qty: number) => void;
  onOpen: (p: Product) => void;
  isFav: boolean;
  onFav: (id: string) => void;
};

export function ProductCard({ product, qtyOf, onAdd, onSetQty, onOpen, isFav, onFav }: Props) {
  const firstAvailable = product.variants.find(inStock) ?? product.variants[0];
  const [key, setKey] = useState(firstAvailable.key);
  const variant = product.variants.find((v) => v.key === key) ?? firstAvailable;
  const available = inStock(variant);
  const anyAvailable = product.variants.some(inStock);
  const inCart = qtyOf(variant.key);
  const { unit } = priceFor(variant, Math.max(1, inCart));
  const ws = wholesaleText(variant);
  const off = discount(variant);
  const showChips = product.variants.length > 1 || variant.label !== '';

  return (
    <article className={`pcard ${anyAvailable ? '' : 'is-out'}`}>
      <button type="button" className="pcard__media" onClick={() => onOpen(product)} aria-label={`Ver ${product.name}`}>
        <ProductImage product={product} />
        <span className="pcard__badges">
          {!anyAvailable && <span className="badge badge--gray">Agotado</span>}
          {off > 0 && <span className="badge badge--red">-{off}%</span>}
          {product.tag && <span className="badge">{product.tag}</span>}
        </span>
      </button>
      <button
        type="button"
        className="pcard__fav"
        onClick={() => onFav(product.id)}
        aria-pressed={isFav}
        aria-label={isFav ? `Quitar ${product.name} de favoritos` : `Guardar ${product.name} en favoritos`}
      >
        <HeartIcon filled={isFav} />
      </button>

      <div className="pcard__body">
        <span className="pcard__brand">{product.brand ?? ''}</span>
        <button type="button" className="pcard__name" onClick={() => onOpen(product)}>
          {product.name}
        </button>

        {showChips && (
          <div className="vchips" role="radiogroup" aria-label="Presentación">
            {product.variants.map((v) => (
              <button
                key={v.key}
                type="button"
                role="radio"
                aria-checked={v.key === variant.key}
                className={`vchip ${v.key === variant.key ? 'is-active' : ''}`}
                disabled={!inStock(v)}
                onClick={() => setKey(v.key)}
              >
                {v.label || 'Única'}
              </button>
            ))}
          </div>
        )}

        {ws && <span className="wholesale-note">{ws}</span>}
        <StockLabel variant={variant} />

        <div className="pcard__foot">
          <span className="price">
            {variant.compareAt && <s>{money(variant.compareAt)}</s>}
            <strong>{money(unit)}</strong>
            {unit < variant.price && <small>precio por mayor</small>}
          </span>
          {inCart > 0 ? (
            <div className="stepper" role="group" aria-label={`Cantidad de ${product.name}`}>
              <button type="button" onClick={() => onSetQty(variant.key, inCart - 1)} aria-label={inCart === 1 ? 'Quitar del carrito' : 'Quitar uno'}>
                {inCart === 1 ? <TrashIcon /> : <MinusIcon />}
              </button>
              <output aria-live="polite">{inCart}</output>
              <button type="button" onClick={() => onAdd(variant.key, 1)} disabled={inCart >= maxFor(variant)} aria-label="Agregar uno">
                <PlusIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="add-btn"
              onClick={() => onAdd(variant.key, 1)}
              disabled={!available}
              aria-label={available ? `Agregar ${product.name} ${variant.label} al carrito` : 'Agotado'}
            >
              <PlusIcon />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
