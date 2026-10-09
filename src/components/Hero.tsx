import { minPrice, productInStock, useCatalog, type Product } from '../data/catalog';
import { money } from '../lib/format';
import { ArrowRightIcon, ArrowUpRightIcon } from './Icons';
import { ProductImage } from './ProductImage';

/** Resalta la palabra "mascotas" de la frase. */
function Claim({ text }: { text: string }) {
  const i = text.toLowerCase().lastIndexOf('mascotas');
  if (i < 0) return <>{text}</>;
  const word = text.slice(i, i + 8);
  return (
    <>
      {text.slice(0, i)}
      <em>{word}</em>
      {text.slice(i + 8)}
    </>
  );
}

export function Hero({ onOpen, onShopAll }: { onOpen: (p: Product) => void; onShopAll: () => void }) {
  const { products, settings } = useCatalog();
  const pick = products.find((p) => p.featured && productInStock(p)) ?? products.find(productInStock);

  return (
    <section className="hero" id="inicio" aria-labelledby="heroTitle">
      <div className="wrap">
        <h1 id="heroTitle" className="hero__title">
          <Claim text={settings.claim} />
        </h1>
        <p className="hero__lead">
          Comida, accesorios, aseo y salud para perros, gatos, aves y pequeñas mascotas. Pides aquí y te lo confirmamos por
          WhatsApp.
        </p>

        <div className="hero__grid">
          {pick && (
            <button type="button" className="hero__card hero__card--left" onClick={() => onOpen(pick)}>
              <span className="hero__card-media">
                <ProductImage product={pick} />
                <span className="hero__card-go" aria-hidden="true">
                  <ArrowUpRightIcon />
                </span>
              </span>
              <span className="hero__card-kicker">{pick.tag ?? 'Destacado'}</span>
              <span className="hero__card-name">{pick.name}</span>
              <span className="hero__card-price">{money(minPrice(pick))}</span>
            </button>
          )}

          <a className="hero__card hero__card--right" href="#spa">
            <span className="hero__card-media">
              <img src="/img/gato-azul.jpg" alt="" width={640} height={640} loading="lazy" />
              <span className="hero__card-go" aria-hidden="true">
                <ArrowUpRightIcon />
              </span>
            </span>
            <span className="hero__card-kicker">Spa canino y felino</span>
            <span className="hero__card-name">Baño y peluquería para tu mascota</span>
            <span className="hero__card-price" style={{ fontSize: 17 }}>Agenda tu cita</span>
          </a>

          {/* Efecto 3D "rompe el marco": la mascota va DELANTE del panel; el cuerpo queda dentro
              y la cabeza sale por arriba. El texto va abajo, sobre un degradado del color del panel. */}
          <div className="hero__box hero__box--a">
            <img className="hero__pop" src="/img/peek-perro.webp" alt="" width={460} height={609} />
            <div className="hero__box-text">
              <strong>{settings.deliveryNote || 'Domicilios'}</strong>
              <span>Pide desde tu celular y te lo llevamos a casa.</span>
            </div>
          </div>

          <div className="hero__box hero__box--cta">
            <img className="hero__pop" src="/img/hero-perro.webp" alt="Un golden retriever" width={620} height={762} />
            <span className="hero__photo-tag">Al por mayor y al detal</span>
            <div className="hero__box-text">
              <h2>Lo mejor para tu mascota</h2>
              <p>{products.length} productos para pedir desde tu celular</p>
              <button type="button" className="btn btn--orange btn--pill-arrow" onClick={onShopAll}>
                Ver la tienda
                <span className="btn__arrow" aria-hidden="true">
                  <ArrowRightIcon />
                </span>
              </button>
            </div>
          </div>

          <div className="hero__box hero__box--c">
            <img className="hero__pop" src="/img/peek-gato.webp" alt="" width={480} height={467} />
            <div className="hero__box-text">
              <strong>Distribuidores de arena</strong>
              <span>Arena para gatos al por mayor y al detal.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
