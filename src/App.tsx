import { useCallback, useEffect, useRef, useState } from 'react';
import { CartSheet } from './components/CartSheet';
import { Explore } from './components/Explore';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ArrowRightIcon, CheckIcon, WhatsAppIcon } from './components/Icons';
import { LastOrder } from './components/LastOrder';
import { ProductSheet } from './components/ProductSheet';
import { Brands, Footer, HowToBuy, Spa, Visit, Wholesale } from './components/Sections';
import { EMPTY_FILTERS, Shop, type Filters } from './components/Shop';
import { CatalogContext, useCatalogLoader, type Catalog, type Product } from './data/catalog';
import { useCart, useFavorites } from './hooks/useCart';
import { useOrderTracking } from './hooks/useOrderTracking';
import { money } from './lib/format';
import { whatsappUrl } from './lib/whatsapp';

export default function App() {
  const { catalog, refresh } = useCatalogLoader();
  return (
    <CatalogContext.Provider value={catalog}>
      <Storefront catalog={catalog} refresh={refresh} />
    </CatalogContext.Provider>
  );
}

function Storefront({ catalog, refresh }: { catalog: Catalog; refresh: () => void }) {
  const cart = useCart(catalog);
  const favorites = useFavorites(catalog);
  const tracked = useOrderTracking(cart.history);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [product, setProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef(0);

  const say = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const goShop = useCallback((focusSearch = false) => {
    document.getElementById('tienda')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focusSearch) window.setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 450);
  }, []);

  const patchFilters = useCallback((f: Partial<Filters>) => setFilters((prev) => ({ ...prev, ...f })), []);
  const showOnly = (f: Partial<Filters>) => {
    setFilters({ ...EMPTY_FILTERS, ...f });
    goShop();
  };

  const add = (key: string, qty: number) => {
    const hit = catalog.variantByKey[key];
    cart.add(key, qty);
    if (hit) say(`${hit.product.name}${hit.variant.label ? ` (${hit.variant.label})` : ''} en el carrito`);
  };

  const repeat = (o: Parameters<typeof cart.reorder>[0]) => {
    const n = cart.reorder(o);
    if (n > 0) {
      setCartOpen(true);
    } else say('Esos productos ya no están disponibles');
  };

  // Al abrir una hoja se oculta el aviso para que no tape sus botones.
  useEffect(() => {
    if (product || cartOpen) setToast(null);
  }, [product, cartOpen]);

  const last = cart.history[0];
  const live = last && tracked[last.code];

  return (
    <>
      <Header
        count={cart.count}
        total={cart.total}
        favCount={favorites.favs.length}
        onCart={() => setCartOpen(true)}
        onSearch={() => goShop(true)}
        onFavs={() => showOnly({ favs: true })}
      />
      <main>
        {last && <LastOrder order={last} tracked={live} onRepeat={repeat} />}
        <Hero onOpen={setProduct} onShopAll={() => showOnly({})} />
        <Explore
          pet={filters.pet}
          category={filters.category}
          onPet={(pet) => showOnly({ pet })}
          onCategory={(category) => showOnly({ category })}
        />
        <Shop
          filters={filters}
          onFilters={patchFilters}
          searchRef={searchRef}
          favIds={favorites.favs}
          qtyOf={cart.qtyOf}
          onAdd={add}
          onSetQty={cart.setQty}
          onOpen={setProduct}
          isFav={favorites.isFav}
          onFav={favorites.toggle}
        />
        <Wholesale onShowWholesale={() => showOnly({ wholesale: true })} />
        <Spa />
        <Brands onBrand={(b) => showOnly({ query: b })} />
        <HowToBuy />
        <Visit />
      </main>
      <Footer />

      <button type="button" className={`cartbar ${cart.count > 0 && !cartOpen ? 'is-visible' : ''}`} onClick={() => setCartOpen(true)} tabIndex={cart.count > 0 ? 0 : -1}>
        <span className="cartbar__text">
          <small>
            {cart.count} unidad{cart.count === 1 ? '' : 'es'}
          </small>
          <strong>{money(cart.total)}</strong>
        </span>
        <span className="cartbar__go">
          Ver carrito <ArrowRightIcon />
        </span>
      </button>

      {catalog.settings.whatsapp && (
        <a
          className={`wa-float ${cart.count > 0 ? 'is-hidden' : ''}`}
          href={whatsappUrl(catalog.settings.whatsapp, `Hola ${catalog.settings.name}, tengo una pregunta.`)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escríbenos por WhatsApp"
        >
          <WhatsAppIcon />
        </a>
      )}

      <div className={`toast ${toast ? 'is-on' : ''}`} role="status" aria-live="polite">
        <CheckIcon /> {toast}
      </div>

      <ProductSheet
        product={product}
        onClose={() => setProduct(null)}
        qtyOf={cart.qtyOf}
        onAdd={add}
        isFav={product ? favorites.isFav(product.id) : false}
        onFav={favorites.toggle}
      />
      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={cart.lines}
        total={cart.total}
        savings={cart.savings}
        history={cart.history}
        onAdd={cart.add}
        onSetQty={cart.setQty}
        onClear={cart.clear}
        onArchive={cart.archive}
        onRepeat={repeat}
        onForget={cart.forget}
        onRefreshCatalog={refresh}
      />
    </>
  );
}
