import { useState } from 'react';
import { useCatalog } from '../data/catalog';
import { openStatus, prettyTime } from '../lib/hours';
import { buildSpaMessage, openWhatsApp, whatsappUrl, type SpaRequest } from '../lib/whatsapp';
import { Field } from './Checkout';
import { Brand, NAV } from './Header';
import { ArrowRightIcon, CardIcon, ClockIcon, PawIcon, PhoneIcon, PinIcon, SparkleIcon, TruckIcon, WhatsAppIcon } from './Icons';

// ---------------------------------------------------------------------
// Por mayor
// ---------------------------------------------------------------------
export function Wholesale({ onShowWholesale }: { onShowWholesale: () => void }) {
  const { settings } = useCatalog();
  return (
    <section className="section" id="por-mayor" aria-labelledby="wsTitle">
      <div className="wrap">
        <div className="wholesale">
          <div>
            <span className="kicker" style={{ color: 'var(--yellow)' }}>
              <PawIcon /> Al por mayor y al detal
            </span>
            <h2 id="wsTitle" style={{ marginTop: 8 }}>
              Somos <em>distribuidores</em> de arena para gatos
            </h2>
            <p>
              ¿Tienes un negocio, una veterinaria o muchas mascotas? Compra por cantidad y paga menos. En la tienda verás el precio
              por mayor de cada producto y se aplica solo cuando llegas a la cantidad.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 14, position: 'relative', zIndex: 1 }}>
            <ul className="wholesale__list">
              <li>
                <span aria-hidden="true">🪣</span> Arena para gatos por bolsa o por bulto
              </li>
              <li>
                <span aria-hidden="true">🥣</span> Comida a granel por libra o por kilo
              </li>
              <li>
                <span aria-hidden="true">🐶</span> Concentrados en bulto para perros y gatos
              </li>
            </ul>
            <div className="wholesale__actions">
              <button type="button" className="btn btn--orange" onClick={onShowWholesale}>
                Ver precios por mayor
              </button>
              {settings.whatsapp && (
                <a
                  className="btn btn--white"
                  href={whatsappUrl(settings.whatsapp, 'Hola, quiero cotizar una compra al por mayor.')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon /> Cotizar por WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Spa canino y felino
// ---------------------------------------------------------------------
const SERVICES = ['Baño', 'Corte de pelo', 'Corte de uñas', 'Limpieza de oídos'];
const SIZES = ['Pequeño', 'Mediano', 'Grande'];
const DAYS = ['Hoy', 'Mañana', 'Esta semana', 'Fin de semana'];

export function Spa() {
  const { settings } = useCatalog();
  const [req, setReq] = useState<SpaRequest>({ pet: 'Perro', petName: '', size: '', services: ['Baño'], day: '', owner: '', note: '' });
  const [tried, setTried] = useState(false);
  const set = (p: Partial<SpaRequest>) => setReq((r) => ({ ...r, ...p }));
  const toggle = (s: string) => set({ services: req.services.includes(s) ? req.services.filter((x) => x !== s) : [...req.services, s] });
  const errors = { owner: req.owner.trim() ? undefined : 'Escribe tu nombre', services: req.services.length ? undefined : 'Elige al menos un servicio' };

  const send = () => {
    if (errors.owner || errors.services) {
      setTried(true);
      return;
    }
    openWhatsApp(whatsappUrl(settings.whatsapp, buildSpaMessage(req)));
  };

  return (
    <section className="section" id="spa" aria-labelledby="spaTitle">
      <div className="wrap">
        <div className="section__head">
          <span className="kicker">
            <SparkleIcon /> Spa canino y felino
          </span>
          <h2 id="spaTitle">
            Consiéntelo con un <em>buen baño</em>
          </h2>
          <p>Baño, peluquería y cuidado para perros y gatos. Pide tu cita y te confirmamos el horario y el precio por WhatsApp.</p>
        </div>

        <div className="spa">
          <div className="spa__media">
            <img src="/img/spa.jpg" alt="Un cachorro recién bañado" width={960} height={758} loading="lazy" />
            <div className="spa__sticker">
              <span aria-hidden="true">🛁</span> Perros y gatos
            </div>
          </div>

          <div className="form-card">
            <h3>Pide tu cita</h3>
            <p>Llena esto y te escribimos para confirmar.</p>

            <p className="group__label">Tu mascota es</p>
            <div className="seg" role="radiogroup" aria-label="Tipo de mascota">
              {(['Perro', 'Gato'] as const).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={req.pet === p} className={req.pet === p ? 'is-active' : ''} onClick={() => set({ pet: p })}>
                  {p === 'Perro' ? '🐶' : '🐱'} {p}
                </button>
              ))}
            </div>

            <div className="field-row">
              <Field id="spa-pet" label="Nombre de tu mascota" optional>
                <input id="spa-pet" className="field" value={req.petName} onChange={(e) => set({ petName: e.target.value })} />
              </Field>
              <Field id="spa-owner" label="Tu nombre" error={tried ? errors.owner : undefined}>
                <input id="spa-owner" className="field" value={req.owner} onChange={(e) => set({ owner: e.target.value })} autoComplete="name" />
              </Field>
            </div>

            <p className="group__label">Tamaño</p>
            <div className="seg" role="radiogroup" aria-label="Tamaño">
              {SIZES.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={req.size === s} className={req.size === s ? 'is-active' : ''} onClick={() => set({ size: req.size === s ? '' : s })}>
                  {s}
                </button>
              ))}
            </div>

            <p className="group__label">Servicios</p>
            <div className="pick" role="group" aria-label="Servicios">
              {SERVICES.map((s) => (
                <button key={s} type="button" aria-pressed={req.services.includes(s)} className={req.services.includes(s) ? 'is-active' : ''} onClick={() => toggle(s)}>
                  {s}
                </button>
              ))}
            </div>
            {tried && errors.services && <p className="fieldset__error">{errors.services}</p>}

            <p className="group__label">¿Cuándo te sirve?</p>
            <div className="pick" role="radiogroup" aria-label="Día preferido">
              {DAYS.map((d) => (
                <button key={d} type="button" role="radio" aria-checked={req.day === d} className={req.day === d ? 'is-active' : ''} onClick={() => set({ day: req.day === d ? '' : d })}>
                  {d}
                </button>
              ))}
            </div>

            <Field id="spa-note" label="Algo que debamos saber" optional>
              <textarea id="spa-note" className="field" rows={2} maxLength={200} value={req.note} onChange={(e) => set({ note: e.target.value })} placeholder="Ej: es nervioso con el secador" />
            </Field>

            <button type="button" className="btn btn--wa btn--block" style={{ marginTop: 16 }} onClick={send} disabled={!settings.whatsapp}>
              <WhatsAppIcon /> Pedir cita por WhatsApp
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Marcas
// ---------------------------------------------------------------------
export function Brands({ onBrand }: { onBrand: (name: string) => void }) {
  const { brands, products } = useCatalog();
  const used = brands.filter((b) => products.some((p) => p.brand === b));
  if (!used.length) return null;
  return (
    <section className="section" id="marcas" aria-labelledby="brandsTitle">
      <div className="wrap">
        <div className="section__head">
          <span className="kicker">
            <PawIcon /> Marcas
          </span>
          <h2 id="brandsTitle">
            Las marcas que <em>ya conoces</em>
          </h2>
          <p>Toca una marca para ver sus productos.</p>
        </div>
        <div className="brands">
          {used.map((b) => (
            <span key={b} role="button" tabIndex={0} onClick={() => onBrand(b)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onBrand(b)} style={{ cursor: 'pointer' }}>
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Cómo comprar
// ---------------------------------------------------------------------
export function HowToBuy() {
  const { settings } = useCatalog();
  return (
    <section className="section" aria-labelledby="howTitle">
      <div className="wrap">
        <div className="section__head">
          <span className="kicker">
            <TruckIcon /> Así de fácil
          </span>
          <h2 id="howTitle">
            Cómo <em>comprar</em>
          </h2>
        </div>
        <div className="how">
          <div className="how__step">
            <span className="how__num">1</span>
            <div>
              <strong>Arma tu carrito</strong>
              <p>Busca por mascota, categoría o marca y elige la presentación.</p>
            </div>
          </div>
          <div className="how__step">
            <span className="how__num">2</span>
            <div>
              <strong>Envíalo por WhatsApp</strong>
              <p>Llenas tus datos y el pedido nos llega escrito y con el total.</p>
            </div>
          </div>
          <div className="how__step">
            <span className="how__num">3</span>
            <div>
              <strong>Recíbelo en casa</strong>
              <p>{settings.deliveryNote || 'Te lo llevamos o pasas a recogerlo.'}</p>
            </div>
          </div>
        </div>
        <div className="pays" aria-label="Medios de pago">
          {settings.paymentMethods.map((p) => (
            <span key={p}>
              <CardIcon /> {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Visítanos
// ---------------------------------------------------------------------
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function Visit() {
  const { settings } = useCatalog();
  const status = openStatus(settings.hours);
  const place = [settings.address, settings.city].filter(Boolean).join(', ');
  const maps = place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.name}, ${place}`)}` : null;
  const tel = (p: string) => `tel:+57${p.replace(/\D/g, '')}`;

  return (
    <section className="section" id="visitanos" aria-labelledby="visitTitle">
      <div className="wrap">
        <div className="section__head">
          <span className="kicker">
            <PinIcon /> Visítanos
          </span>
          <h2 id="visitTitle">
            Te esperamos en la <em>tienda</em>
          </h2>
        </div>
        <div className="visit">
          <div className="visit__card">
            {place && (
              <div className="visit__row">
                <span>
                  <PinIcon />
                </span>
                <div>
                  <strong>Dirección</strong>
                  <p>{place}</p>
                </div>
              </div>
            )}
            {settings.phones.length > 0 && (
              <div className="visit__row">
                <span>
                  <PhoneIcon />
                </span>
                <div>
                  <strong>Teléfonos y WhatsApp</strong>
                  {settings.phones.map((p) => (
                    <a key={p} href={tel(p)} style={{ display: 'block' }}>
                      {p}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {settings.hours && (
              <div className="visit__row">
                <span>
                  <ClockIcon />
                </span>
                <div>
                  <strong>
                    Horario {status && <span className={`open-dot ${status.open ? 'is-open' : ''}`}>{status.text}</span>}
                  </strong>
                  {DAY_NAMES.map((d, i) => {
                    const h = settings.hours?.[i];
                    return (
                      <p key={d}>
                        {d}: {h ? `${prettyTime(h[0])} – ${prettyTime(h[1])}` : 'Cerrado'}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
            {settings.whatsapp && (
              <a className="btn btn--wa" href={whatsappUrl(settings.whatsapp, `Hola ${settings.name}, tengo una pregunta.`)} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> Escríbenos por WhatsApp
              </a>
            )}
          </div>
          {maps && (
            <a className="visit__map" href={maps} target="_blank" rel="noopener noreferrer">
              <img src="/img/juguetes.jpg" alt="" width={560} height={560} loading="lazy" />
              <strong>¿Cómo llegar?</strong>
              <span>
                Abrir en Google Maps <ArrowRightIcon />
              </span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Pie
// ---------------------------------------------------------------------
export function Footer() {
  const { settings } = useCatalog();
  return (
    <footer className="footer">
      <div className="wrap">
        <Brand name={settings.name} />
        <p className="footer__claim">{settings.claim}. Productos y comida al por mayor y al detal.</p>
        <nav className="footer__links" aria-label="Secciones">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <p className="footer__small">
          © {new Date().getFullYear()} {settings.name}
          {settings.city ? ` · ${settings.city}` : ''} · <a href="/admin">Administrar</a>
        </p>
      </div>
    </footer>
  );
}
