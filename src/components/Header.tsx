import { useEffect, useState } from 'react';
import { useCatalog } from '../data/catalog';
import { useScrollLock } from '../hooks/useScrollLock';
import { money } from '../lib/format';
import { whatsappUrl } from '../lib/whatsapp';
import { CartIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, WhatsAppIcon } from './Icons';

export const NAV = [
  { href: '#tienda', label: 'Tienda', icon: '🛍️' },
  { href: '#por-mayor', label: 'Por mayor', icon: '📦' },
  { href: '#spa', label: 'Spa', icon: '🛁' },
  { href: '#marcas', label: 'Marcas', icon: '⭐' },
  { href: '#visitanos', label: 'Visítanos', icon: '📍' },
];

type Props = {
  count: number;
  total: number;
  favCount: number;
  onCart: () => void;
  onSearch: () => void;
  onFavs: () => void;
};

export function Brand({ name }: { name: string }) {
  // "Plastimascotas Jimmys" → marca grande + apellido pequeño, como el logo del volante.
  const [main, ...rest] = name.split(' ');
  return (
    <a className="brand" href="#inicio" aria-label={`${name}, inicio`}>
      <img src="/img/logo.svg" alt="" width={44} height={44} />
      <span className="brand__text">
        <strong>{main}</strong>
        <span>{rest.length ? `${rest.join(' ')} · Petshop` : 'Petshop'}</span>
      </span>
    </a>
  );
}

export function Header({ count, total, favCount, onCart, onSearch, onFavs }: Props) {
  const { settings } = useCatalog();
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  useScrollLock(open);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <>
      <header className={`header ${stuck ? 'is-stuck' : ''}`}>
        <div className="wrap header__inner">
          <button className="round-btn menu-btn" type="button" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open}>
            <MenuIcon />
          </button>
          <Brand name={settings.name} />
          <nav className="nav" aria-label="Secciones">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="header__actions">
            <button className="round-btn" type="button" onClick={onSearch} aria-label="Buscar productos">
              <SearchIcon />
            </button>
            {favCount > 0 && (
              <button className="round-btn" type="button" onClick={onFavs} aria-label={`Ver mis favoritos (${favCount})`}>
                <HeartIcon />
                <span className="badge-count">{favCount}</span>
              </button>
            )}
            <button className="cart-pill" type="button" onClick={onCart} aria-label={`Ver carrito: ${count} productos, ${money(total)}`}>
              <CartIcon />
              <span className="badge-count">{count}</span>
              <span className="cart-pill__total">{money(total)}</span>
            </button>
          </div>
        </div>
      </header>

      <div className={`drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="drawer__scrim" onClick={() => setOpen(false)} />
        <nav className="drawer__panel" aria-label="Menú">
          <div className="drawer__head">
            <Brand name={settings.name} />
            <button className="round-btn" type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú" tabIndex={open ? 0 : -1}>
              <CloseIcon />
            </button>
          </div>
          {NAV.map((n) => (
            <a key={n.href} className="drawer__link" href={n.href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
              {n.label}
            </a>
          ))}
          <div className="drawer__foot">
            {settings.whatsapp && (
              <a
                className="btn btn--wa"
                href={whatsappUrl(settings.whatsapp, `Hola ${settings.name}, tengo una pregunta.`)}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={open ? 0 : -1}
              >
                <WhatsAppIcon /> Escríbenos
              </a>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
