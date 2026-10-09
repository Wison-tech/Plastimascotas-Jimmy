import { useEffect, useState } from 'react';
import { inStock, PET_ICON, PET_LABEL, priceFor, useCatalog, type Product } from '../data/catalog';
import { maxFor } from '../hooks/useCart';
import { money } from '../lib/format';
import { CloseIcon, HeartIcon, MinusIcon, PlusIcon } from './Icons';
import { StockLabel } from './ProductCard';
import { ProductImage } from './ProductImage';
import { Sheet } from './Sheet';

type Props = {
  product: Product | null;
  onClose: () => void;
  qtyOf: (key: string) => number;
  onAdd: (key: string, qty: number) => void;
  isFav: boolean;
  onFav: (id: string) => void;
};

export function ProductSheet({ product, onClose, qtyOf, onAdd, isFav, onFav }: Props) {
  // Se conserva el último producto mientras la hoja se cierra con su animación.
  const [shown, setShown] = useState<Product | null>(product);
  useEffect(() => {
    if (product) setShown(product);
  }, [product]);

  return (
    <Sheet open={!!product} onClose={onClose} labelledBy="psheetTitle" className="sheet--product">
      {shown && <Body key={shown.id} product={shown} onClose={onClose} qtyOf={qtyOf} onAdd={onAdd} isFav={isFav} onFav={onFav} />}
    </Sheet>
  );
}

function Body({ product, onClose, qtyOf, onAdd, isFav, onFav }: Omit<Props, 'product'> & { product: Product }) {
  const { categories } = useCatalog();
  const first = product.variants.find(inStock) ?? product.variants[0];
  const [key, setKey] = useState(first.key);
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.key === key) ?? first;
  const already = qtyOf(variant.key);
  const room = Math.max(0, maxFor(variant) - already);
  const available = inStock(variant) && room > 0;

  useEffect(() => setQty((q) => Math.max(1, Math.min(q, room || 1))), [key, room]);

  // Precio según el total que quedará en el carrito (lo que ya había + lo que agrega).
  const { unit, wholesale } = priceFor(variant, already + qty);
  const category = categories.find((c) => c.id === product.categoryId);
  const needMore = variant.wholesaleMin != null ? variant.wholesaleMin - (already + qty) : 0;

  return (
    <>
      <div className="psheet__media">
        <ProductImage product={product} eager />
        <button type="button" className="round-btn psheet__fav" onClick={() => onFav(product.id)} aria-pressed={isFav} aria-label={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}>
          <HeartIcon filled={isFav} />
        </button>
        <button type="button" className="round-btn psheet__close" onClick={onClose} aria-label="Cerrar">
          <CloseIcon />
        </button>
      </div>

      <div className="psheet__body">
        <span className="psheet__brand">{[product.brand, category?.name].filter(Boolean).join(' · ')}</span>
        <h3 id="psheetTitle">{product.name}</h3>
        {product.description && <p className="psheet__desc">{product.description}</p>}
        {product.pets.length > 0 && (
          <div className="psheet__pets">
            {product.pets.map((p) => (
              <span key={p}>
                {PET_ICON[p]} {PET_LABEL[p]}
              </span>
            ))}
          </div>
        )}

        {(product.variants.length > 1 || variant.label) && (
          <>
            <p className="group__label">Presentación</p>
            <div className="variants" role="radiogroup" aria-label="Presentación">
              {product.variants.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  role="radio"
                  aria-checked={v.key === variant.key}
                  className={`variant ${v.key === variant.key ? 'is-active' : ''}`}
                  disabled={!inStock(v)}
                  onClick={() => setKey(v.key)}
                >
                  <strong>{v.label || 'Única'}</strong>
                  <span>{money(v.price)}</span>
                  <StockLabel variant={v} />
                </button>
              ))}
            </div>
          </>
        )}

        {variant.wholesalePrice != null && variant.wholesaleMin != null && (
          <p className={`tier ${wholesale ? 'is-on' : ''}`}>
            {wholesale ? (
              <>
                <strong>¡Precio por mayor aplicado!</strong> Pagas {money(variant.wholesalePrice)} c/u en vez de {money(variant.price)}.
              </>
            ) : (
              <>
                <strong>Por mayor:</strong> desde {variant.wholesaleMin} unidades pagas {money(variant.wholesalePrice)} c/u
                {needMore > 0 && ` · te faltan ${needMore}`}.
              </>
            )}
          </p>
        )}

        {already > 0 && (
          <p className="group__label" style={{ textTransform: 'none', letterSpacing: 0 }}>
            Ya tienes {already} en el carrito{room === 0 ? ' (no hay más disponibles)' : ''}.
          </p>
        )}
      </div>

      <div className="psheet__foot">
        <div className="stepper stepper--lg stepper--light" role="group" aria-label="Cantidad">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Quitar uno">
            <MinusIcon />
          </button>
          <output aria-live="polite">{qty}</output>
          <button type="button" onClick={() => setQty((q) => Math.min(room, q + 1))} disabled={qty >= room} aria-label="Agregar uno">
            <PlusIcon />
          </button>
        </div>
        <button
          type="button"
          className="btn btn--orange"
          disabled={!available}
          onClick={() => {
            onAdd(variant.key, qty);
            onClose();
          }}
        >
          {available ? `Agregar · ${money(unit * qty)}` : inStock(variant) ? 'Sin más unidades' : 'Agotado'}
        </button>
      </div>
    </>
  );
}
