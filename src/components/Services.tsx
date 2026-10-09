import { useCatalog } from '../data/catalog';
import { CategoryIcon } from './CategoryIcon';
import { SparkleIcon, TruckIcon } from './Icons';

type Props = { onShopAll: () => void; onWholesale: () => void };

/** "Nuestros servicios": cuatro tarjetas con ícono arriba; la del medio va resaltada como en la referencia. */
export function Services({ onShopAll, onWholesale }: Props) {
  const { products, settings } = useCatalog();
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const items = [
    {
      icon: <CategoryIcon slug="alimento-perro" />,
      title: 'Tienda en línea',
      text: `${products.length} productos: comida, aseo, salud, juguetes y accesorios para tu mascota.`,
      action: onShopAll,
    },
    {
      icon: <CategoryIcon slug="arena" />,
      title: 'Al por mayor',
      text: 'Distribuidores de arena para gatos. El precio por mayor se aplica solo al llevar la cantidad.',
      action: onWholesale,
      featured: true,
    },
    {
      icon: <SparkleIcon />,
      title: 'Spa canino y felino',
      text: 'Baño y peluquería para perros y gatos. Pide tu cita y te confirmamos por WhatsApp.',
      action: () => go('spa'),
    },
    {
      icon: <TruckIcon />,
      title: 'Domicilios',
      text: settings.deliveryNote ? `${settings.deliveryNote} Haz tu pedido desde el celular.` : 'Te lo llevamos a la puerta de tu casa.',
      action: () => go('visitanos'),
    },
  ];

  return (
    <section className="section" id="servicios" aria-labelledby="servTitle">
      <div className="wrap">
        <div className="section__head">
          <h2 id="servTitle">
            Nuestros <em>servicios</em>
          </h2>
          <p>Todo lo que tu mascota necesita, en un solo lugar.</p>
        </div>
        <div className="services">
          {items.map((it) => (
            <button key={it.title} type="button" className={`service ${it.featured ? 'is-featured' : ''}`} onClick={it.action}>
              <span className="service__icon" aria-hidden="true">
                {it.icon}
              </span>
              <strong>{it.title}</strong>
              <span className="service__text">{it.text}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
