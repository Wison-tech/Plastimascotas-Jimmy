import { minPrice, productInStock, useCatalog, type Product } from '../data/catalog';
import { money } from '../lib/format';
import { whatsappUrl } from '../lib/whatsapp';
import { CategoryIcon } from './CategoryIcon';
import { ArrowRightIcon, SparkleIcon, TruckIcon, WhatsAppIcon } from './Icons';
import { ProductImage } from './ProductImage';

/** Resalta la palabra "mascotas" de la frase. */
function Claim({ text }: { text: string }) {
  const i = text.toLowerCase().lastIndexOf('mascotas');
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <em>{text.slice(i, i + 8)}</em>
      {text.slice(i + 8)}
    </>
  );
}

export function Hero({ onOpen, onShopAll }: { onOpen: (p: Product) => void; onShopAll: () => void }) {
  const { products, settings } = useCatalog();
  const pick = products.find((p) => p.featured && productInStock(p)) ?? products.find(productInStock);
  const city = settings.city.split(',')[0].trim();

  return (
    <section className="hero" id="inicio" aria-labelledby="heroTitle">
      <div className="wrap hero__inner">
        <div className="hero__copy">
          <span className="hero__eyebrow">
            <CategoryIcon slug="paw" /> Petshop{city ? ` en ${city}` : ''} · al por mayor y al detal
          </span>
          <h1 id="heroTitle" className="hero__title">
            <Claim text={settings.claim} />
          </h1>
          <p className="hero__lead">
            Comida, arena, accesorios, aseo y salud para perros, gatos, aves y pequeñas mascotas. Arma tu pedido aquí y te lo
            confirmamos por WhatsApp.
          </p>
          <div className="hero__actions">
            <button type="button" className="btn btn--orange" onClick={onShopAll}>
              Ver la tienda <ArrowRightIcon />
            </button>
            {settings.whatsapp && (
              <a
                className="btn btn--white"
                href={whatsappUrl(settings.whatsapp, `Hola ${settings.name}, quiero hacer un pedido.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon /> Escríbenos
              </a>
            )}
          </div>
          <ul className="hero__perks">
            <li>
              <span>
                <TruckIcon />
              </span>
              {settings.deliveryNote || 'Domicilios'}
            </li>
            <li>
              <span>
                <CategoryIcon slug="arena" />
              </span>
              Distribuidores de arena
            </li>
            <li>
              <span>
                <SparkleIcon />
              </span>
              Spa canino y felino
            </li>
          </ul>
        </div>

        {/* Arte: círculo naranja con borde blanco; el perro (recorte sin fondo) sale por arriba del círculo. */}
        <div className="hero__art">
          <span className="hero__shape" aria-hidden="true" />
          <span className="hero__circle" aria-hidden="true" />
          <div className="hero__pet">
            <img src="/img/hero-perro.webp" alt="Un golden retriever" width={620} height={762} />
          </div>

          {pick && (
            <button type="button" className="hero__chip hero__chip--product" onClick={() => onOpen(pick)}>
              <span className="hero__chip-img">
                <ProductImage product={pick} />
              </span>
              <span className="hero__chip-text">
                <small>{pick.tag ?? 'Destacado'}</small>
                <strong>{pick.name}</strong>
                <em>{money(minPrice(pick))}</em>
              </span>
            </button>
          )}
          <a className="hero__chip hero__chip--spa" href="#spa">
            <span className="hero__chip-icon">
              <SparkleIcon />
            </span>
            <span className="hero__chip-text">
              <small>Spa</small>
              <strong>Agenda su baño</strong>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
