import { useState } from 'react';
import type { Product } from '../data/catalog';
import { CategoryIcon } from './CategoryIcon';

/** Foto del producto, o el ícono de línea de su categoría sobre un fondo neutro mientras no tenga foto. */
export function ProductImage({ product, eager = false }: { product: Product; eager?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (product.photo && !broken) {
    return <img className="pimg" src={product.photo} alt="" loading={eager ? 'eager' : 'lazy'} onError={() => setBroken(true)} />;
  }
  return (
    <span className="ph" aria-hidden="true">
      <CategoryIcon slug={product.categoryId} />
    </span>
  );
}
