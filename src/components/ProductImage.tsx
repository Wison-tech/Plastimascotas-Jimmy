import { useState } from 'react';
import { useCatalog, type Product } from '../data/catalog';

// Fondos suaves para los productos sin foto: cada categoría conserva su color.
const TINTS = ['#e3f0ff', '#fff0c4', '#ffe3e0', '#e2f6ea', '#efe6ff', '#ffe9d1'];

/** Foto del producto, o el ícono de su categoría sobre un color suave mientras no tenga foto. */
export function ProductImage({ product, eager = false }: { product: Product; eager?: boolean }) {
  const { categories } = useCatalog();
  const [broken, setBroken] = useState(false);
  const index = Math.max(0, categories.findIndex((c) => c.id === product.categoryId));
  const icon = categories[index]?.icon ?? '🐾';

  if (product.photo && !broken) {
    return <img className="pimg" src={product.photo} alt="" loading={eager ? 'eager' : 'lazy'} onError={() => setBroken(true)} />;
  }
  return (
    <span className="emoji" style={{ background: TINTS[index % TINTS.length] }} aria-hidden="true">
      {icon}
    </span>
  );
}
