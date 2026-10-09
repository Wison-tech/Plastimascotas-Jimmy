import { useCatalog } from '../data/catalog';
import type { PastOrder } from '../hooks/useCart';
import type { OrderStatus, Tracked } from '../hooks/useOrderTracking';
import { money } from '../lib/format';
import { summary } from './CartSheet';
import { RepeatIcon } from './Icons';

const when = (ts: number) =>
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(ts);

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pendiente', label: 'Recibido' },
  { status: 'confirmado', label: 'Confirmado' },
  { status: 'preparando', label: 'Alistando' },
  { status: 'en_camino', label: 'En camino' },
  { status: 'entregado', label: 'Entregado' },
];

const STATUS_TEXT: Record<OrderStatus, string> = {
  pendiente: 'Esperando que la tienda lo confirme por WhatsApp',
  confirmado: '¡Confirmado! Ya lo tienen en cuenta',
  preparando: 'Están alistando tu pedido',
  en_camino: 'Va en camino o está listo para recoger',
  entregado: 'Entregado. ¡Que lo disfruten!',
  cancelado: 'Este pedido fue cancelado',
};

/** Seguimiento del último pedido, o "Repite tu compra" si ya terminó. */
export function LastOrder({ order, tracked, onRepeat }: { order: PastOrder; tracked?: Tracked; onRepeat: (o: PastOrder) => void }) {
  const { variantByKey } = useCatalog();
  const nameOf = (key: string) => variantByKey[key]?.product.name;
  const live = tracked && tracked.status !== 'entregado' && tracked.status !== 'cancelado';

  if (live) {
    const step = STEPS.findIndex((s) => s.status === tracked.status);
    return (
      <section className="wrap" aria-label="Estado de tu pedido">
        <div className="track" role="status" aria-live="polite">
          <div className="track__head">
            <span className="track__pulse" aria-hidden="true" />
            <div>
              <p className="again__kicker">Tu pedido {order.code}</p>
              <p className="track__text">{STATUS_TEXT[tracked.status]}</p>
            </div>
            <strong className="track__total">{money(tracked.total)}</strong>
          </div>
          <ol className="track__steps">
            {STEPS.map((s, i) => (
              <li key={s.status} className={i <= step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
                {s.label}
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section className="wrap" aria-label="Tu última compra">
      <div className="again">
        <span className="again__icon" aria-hidden="true">
          <RepeatIcon />
        </span>
        <div className="again__body">
          <p className="again__kicker">{tracked?.status === 'cancelado' ? `Pedido ${order.code} cancelado` : `Repite tu compra · ${when(order.date)}`}</p>
          <p className="again__text">{summary(order, nameOf)}</p>
        </div>
        <button className="btn btn--white btn--sm" type="button" onClick={() => onRepeat(order)}>
          Repetir
        </button>
      </div>
    </section>
  );
}
