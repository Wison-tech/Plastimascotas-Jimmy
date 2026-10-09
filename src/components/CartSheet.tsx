import { useEffect, useRef, useState } from 'react';
import { useCatalog } from '../data/catalog';
import type { CartLine, PastOrder } from '../hooks/useCart';
import { useStored } from '../hooks/useStored';
import { money, orderCode } from '../lib/format';
import { rpcErrorCode, supabase } from '../lib/supabase';
import {
  buildMessage,
  checkoutErrors,
  EMPTY_CHECKOUT,
  openWhatsApp,
  ticketFromCart,
  ticketFromServer,
  whatsappUrl,
  type Checkout,
} from '../lib/whatsapp';
import { CheckoutForm } from './Checkout';
import { BackIcon, CheckIcon, CloseIcon, MinusIcon, PawIcon, PlusIcon, RepeatIcon, TrashIcon, WhatsAppIcon } from './Icons';
import { ProductImage } from './ProductImage';
import { Sheet } from './Sheet';

type Props = {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  total: number;
  savings: number;
  history: PastOrder[];
  onAdd: (key: string, qty: number) => void;
  onSetQty: (key: string, qty: number) => void;
  onClear: () => void;
  onArchive: (order: { code: string; total: number; id?: string; token?: string }) => void;
  onRepeat: (order: PastOrder) => void;
  onForget: (code: string) => void;
  onRefreshCatalog: () => void;
};

type Step = 'cart' | 'checkout' | 'sent';
type Sent = { code: string; url: string; id?: string; token?: string; signal?: 'enviado' | 'arrepentido' };

/** Datos del cliente que se recuerdan para el próximo pedido. */
const REMEMBER: (keyof Checkout)[] = ['mode', 'name', 'phone', 'address', 'barrio', 'reference', 'payment'];
const parseCustomer = (raw: unknown): Partial<Checkout> => {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  return Object.fromEntries(REMEMBER.filter((k) => typeof r[k] === 'string').map((k) => [k, r[k]]));
};

export function summary(order: PastOrder, names: (key: string) => string | undefined, max = 2) {
  const list = order.lines.map((l) => `${l.qty}× ${names(l.key) ?? 'Producto'}`);
  return list.slice(0, max).join(', ') + (list.length > max ? ` y ${list.length - max} más` : '');
}

export function CartSheet(props: Props) {
  const { open, onClose, lines, total, savings, history, onAdd, onSetQty, onClear, onArchive, onRepeat, onForget, onRefreshCatalog } = props;
  const { settings, variantByKey } = useCatalog();
  const [step, setStep] = useState<Step>('cart');
  const [customer, setCustomer] = useStored<Partial<Checkout>>('pj-cliente', {}, parseCustomer);
  const [form, setForm] = useState<Checkout>(() => ({ ...EMPTY_CHECKOUT, ...customer }));
  const [showErrors, setShowErrors] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRegret, setConfirmRegret] = useState(false);
  const [signalBusy, setSignalBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const nameOf = (key: string) => {
    const hit = variantByKey[key];
    return hit ? `${hit.product.name}${hit.variant.label ? ` (${hit.variant.label})` : ''}` : undefined;
  };

  // Si la forma de pago guardada ya no existe, usa la primera disponible.
  useEffect(() => {
    if (!settings.paymentMethods.includes(form.payment)) setForm((f) => ({ ...f, payment: settings.paymentMethods[0] }));
  }, [settings.paymentMethods, form.payment]);

  // Cada vez que se abre, empieza en el resumen (salvo que acabe de enviar).
  useEffect(() => {
    if (open) {
      setStep((s) => (s === 'sent' ? 'sent' : 'cart'));
      setConfirmClear(false);
      setSendError(null);
    } else if (step === 'sent') {
      const t = window.setTimeout(() => {
        setStep('cart');
        setSent(null);
        setConfirmRegret(false);
      }, 400);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const patch = (p: Partial<Checkout>) => setForm((f) => ({ ...f, ...p }));
  const errors = checkoutErrors(form, total);
  const valid = Object.keys(errors).length === 0;

  const send = async () => {
    if (sending) return;
    if (!valid) {
      setShowErrors(true);
      const first = Object.keys(errors)[0];
      if (first) document.getElementById(`co-${first}`)?.focus();
      return;
    }
    setSending(true);
    setSendError(null);

    let order: { code: string; total: number; savings: number; id?: string; token?: string; ticket: ReturnType<typeof ticketFromCart> } | null = null;

    // 1) Registrar el pedido (el servidor recalcula precios, revisa stock y da el código).
    const registrable = lines.every((l) => l.variant.dbId != null);
    if (supabase && registrable) {
      const { data, error } = await supabase.rpc('create_order', {
        p: {
          customer: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            mode: form.mode,
            address: form.address.trim(),
            barrio: form.barrio.trim(),
            reference: form.reference.trim(),
            payment: form.payment,
            cash_with: form.cashWith,
            note: form.note.trim(),
          },
          items: lines.map((l) => ({ variant_id: l.variant.dbId!, qty: l.qty })),
        },
      });
      if (error) {
        const code = rpcErrorCode(error);
        if (code === 'ordering_disabled') {
          setSendError('En este momento la tienda no está recibiendo pedidos por la página.');
          onRefreshCatalog();
          setSending(false);
          return;
        }
        if (code === 'out_of_stock') {
          const [, variantId, left] = (error.message ?? '').split(':');
          const hit = Object.values(variantByKey).find((x) => String(x.variant.dbId) === variantId?.trim());
          setSendError(
            hit
              ? `De ${hit.product.name}${hit.variant.label ? ` (${hit.variant.label})` : ''} solo quedan ${Number(left) || 0}. Actualizamos las existencias: revisa tu carrito.`
              : 'Algún producto ya no tiene suficientes unidades. Actualizamos las existencias: revisa tu carrito.',
          );
          onRefreshCatalog();
          setStep('cart');
          setSending(false);
          return;
        }
        if (code === 'product_unavailable' || code === 'duplicate_item') {
          setSendError('La tienda acaba de cambiar algún producto. Actualizamos el catálogo: revisa tu carrito.');
          onRefreshCatalog();
          setStep('cart');
          setSending(false);
          return;
        }
        if (code.startsWith('invalid_')) {
          setSendError('Revisa tus datos: algo no quedó bien escrito.');
          setShowErrors(true);
          setSending(false);
          return;
        }
        // Sin conexión u otro fallo: se envía por WhatsApp igual, sin registrar.
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        const d = data as { id: string; code: string; token: string; total: number; savings: number; items: Parameters<typeof ticketFromServer>[0] };
        order = { code: d.code, total: d.total, savings: d.savings, id: d.id, token: d.token, ticket: ticketFromServer(d.items) };
      }
    }
    if (!order) order = { code: orderCode(), total, savings, ticket: ticketFromCart(lines) };

    const url = whatsappUrl(settings.whatsapp, buildMessage(order.code, order.ticket, order.total, order.savings, form, settings.deliveryNote));

    // 2) Guardar todo ANTES de abrir WhatsApp (si el navegador cambia de pestaña, no se pierde).
    setCustomer(Object.fromEntries(REMEMBER.map((k) => [k, form[k]])) as Partial<Checkout>);
    onArchive({ code: order.code, total: order.total, id: order.id, token: order.token });
    setSent({ code: order.code, url, id: order.id, token: order.token });
    setShowErrors(false);
    patch({ note: '', cashWith: '' });
    setStep('sent');
    setSending(false);

    // 3) Abrir WhatsApp.
    window.setTimeout(() => openWhatsApp(url), 120);
  };

  const signal = async (s: 'enviado' | 'arrepentido') => {
    if (!sent?.id || !sent.token || !supabase) return;
    setSignalBusy(true);
    const { error } = await supabase.rpc('customer_signal', { p_id: sent.id, p_token: sent.token, p_signal: s });
    setSignalBusy(false);
    setConfirmRegret(false);
    if (!error) {
      setSent({ ...sent, signal: s });
      if (s === 'arrepentido') onForget(sent.code);
    }
  };

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const title = step === 'checkout' ? 'Tus datos' : step === 'sent' ? '¡Pedido listo!' : 'Tu carrito';
  const canSend = !!settings.whatsapp && settings.orderingEnabled;

  return (
    <Sheet open={open} onClose={onClose} labelledBy="cartTitle" className="sheet--cart">
      <div className="cart__head">
        {step === 'checkout' ? (
          <button className="round-btn" type="button" onClick={() => setStep('cart')} aria-label="Volver al carrito">
            <BackIcon />
          </button>
        ) : (
          <img src="/img/logo.svg" alt="" width={40} height={40} />
        )}
        <h3 id="cartTitle">{title}</h3>
        <button className="round-btn" type="button" onClick={onClose} aria-label="Cerrar">
          <CloseIcon />
        </button>
      </div>

      {step !== 'sent' && lines.length > 0 && (
        <ol className="steps" aria-label="Pasos">
          <li className="is-done">Carrito</li>
          <li className={step === 'checkout' ? 'is-done' : ''}>Datos</li>
          <li>WhatsApp</li>
        </ol>
      )}

      <div className="cart__body" ref={bodyRef}>
        {step === 'sent' && sent && (
          <div className="sent">
            <span className={`sent__check ${sent.signal === 'arrepentido' ? 'is-cancel' : ''}`} aria-hidden="true">
              {sent.signal === 'arrepentido' ? <CloseIcon /> : <CheckIcon />}
            </span>
            <p className="sent__code">Pedido {sent.code}</p>
            {sent.signal === 'arrepentido' ? (
              <p className="sent__text">Cancelamos tu pedido. Si ya lo habías enviado por WhatsApp, avísale a la tienda.</p>
            ) : sent.signal === 'enviado' ? (
              <p className="sent__text">
                <strong>¡Gracias!</strong> Cuando la tienda lo confirme verás el estado de tu pedido en la página de inicio.
              </p>
            ) : (
              <p className="sent__text">
                Abrimos WhatsApp con tu pedido escrito. <strong>Toca enviar en WhatsApp</strong> para que la tienda lo reciba y
                te lo confirme.
              </p>
            )}

            {sent.signal !== 'arrepentido' && (
              <a className="btn btn--wa" href={sent.url} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> {sent.signal ? 'Abrir el chat' : '¿No se abrió? Abrir WhatsApp'}
              </a>
            )}

            {sent.id && !sent.signal && (
              <div className="sent__ask">
                {confirmRegret ? (
                  <>
                    <p>¿Seguro que quieres cancelar este pedido?</p>
                    <div className="sent__row">
                      <button className="btn btn--danger" type="button" disabled={signalBusy} onClick={() => signal('arrepentido')}>
                        Sí, cancelar
                      </button>
                      <button className="btn btn--white" type="button" onClick={() => setConfirmRegret(false)}>
                        No
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>¿Ya enviaste el mensaje en WhatsApp?</p>
                    <div className="sent__row">
                      <button className="btn btn--navy" type="button" disabled={signalBusy} onClick={() => signal('enviado')}>
                        <CheckIcon /> Sí, ya lo envié
                      </button>
                      <button className="btn btn--white" type="button" onClick={() => setConfirmRegret(true)}>
                        Me arrepentí
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {!sent.id && (
              <p className="sent__note">
                Sin conexión con el sistema: el pedido no quedó registrado en la página, pero el mensaje de WhatsApp lleva todo el
                detalle.
              </p>
            )}

            <button className="btn btn--ghost" type="button" onClick={onClose}>
              Seguir comprando
            </button>
          </div>
        )}

        {step === 'cart' && lines.length === 0 && (
          <div className="cart__empty">
            <p className="cart__empty-icon" aria-hidden="true">
              <PawIcon />
            </p>
            <p>Tu carrito está vacío. Toca el botón + de cualquier producto para empezar.</p>
            {history.length > 0 && (
              <div className="history">
                <p className="group__label">Tus pedidos anteriores</p>
                {history.map((o) => (
                  <div className="history__row" key={o.code + o.date}>
                    <div>
                      <strong>{o.code}</strong>
                      <span>{summary(o, nameOf, 3)}</span>
                    </div>
                    <button className="btn btn--white btn--sm" type="button" onClick={() => onRepeat(o)}>
                      <RepeatIcon /> Repetir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'cart' && lines.length > 0 && (
          <>
            {sendError && <p className="form-alert">{sendError}</p>}
            <ul className="cart__list">
              {lines.map((l) => (
                <li className="line" key={l.key}>
                  <span className="line__img" aria-hidden="true">
                    <ProductImage product={l.product} />
                  </span>
                  <div className="line__info">
                    <strong>{l.product.name}</strong>
                    <span>{[l.product.brand, l.variant.label, l.qty > 1 ? `${money(l.unit)} c/u` : ''].filter(Boolean).join(' · ')}</span>
                    {l.wholesale && <span className="wholesale-note">Precio por mayor · ahorras {money(l.savings)}</span>}
                    {!l.wholesale && l.variant.wholesaleMin != null && l.variant.wholesalePrice != null && (
                      <span className="wholesale-note" style={{ color: 'var(--orange)' }}>
                        Lleva {l.variant.wholesaleMin - l.qty} más y pagas {money(l.variant.wholesalePrice)} c/u
                      </span>
                    )}
                  </div>
                  <div className="line__row">
                    <div className="stepper stepper--light" role="group" aria-label={`Cantidad de ${l.product.name}`}>
                      <button type="button" onClick={() => onSetQty(l.key, l.qty - 1)} aria-label={l.qty === 1 ? 'Quitar del carrito' : 'Quitar uno'}>
                        {l.qty === 1 ? <TrashIcon /> : <MinusIcon />}
                      </button>
                      <output>{l.qty}</output>
                      <button type="button" onClick={() => onAdd(l.key, 1)} disabled={l.qty >= l.max} aria-label="Agregar uno">
                        <PlusIcon />
                      </button>
                    </div>
                    <em>{money(l.unit * l.qty)}</em>
                  </div>
                </li>
              ))}
            </ul>

            <div className="clear-row">
              {confirmClear ? (
                <>
                  <span>¿Vaciar el carrito?</span>
                  <button
                    type="button"
                    className="link-btn link-btn--danger"
                    onClick={() => {
                      onClear();
                      setConfirmClear(false);
                    }}
                  >
                    Sí, vaciar
                  </button>
                  <button type="button" className="link-btn" onClick={() => setConfirmClear(false)}>
                    No
                  </button>
                </>
              ) : (
                <button type="button" className="link-btn" onClick={() => setConfirmClear(true)}>
                  Vaciar carrito
                </button>
              )}
            </div>
          </>
        )}

        {step === 'checkout' && lines.length > 0 && (
          <>
            <CheckoutForm data={form} onChange={patch} total={total} showErrors={showErrors} />
            {sendError && <p className="form-alert">{sendError}</p>}
          </>
        )}
      </div>

      {step !== 'sent' && lines.length > 0 && (
        <div className="cart__foot">
          <div className="cart__total">
            <span>
              Total · {count} unidad{count === 1 ? '' : 'es'}
            </span>
            <strong>{money(total)}</strong>
          </div>
          {savings > 0 && <span className="cart__save">Ahorras {money(savings)} por comprar al por mayor</span>}
          {!settings.orderingEnabled ? (
            <p className="setup-warning">En este momento no estamos recibiendo pedidos por la página. Escríbenos por WhatsApp.</p>
          ) : step === 'cart' ? (
            <button className="btn btn--orange btn--block" type="button" onClick={() => setStep('checkout')}>
              Continuar
            </button>
          ) : canSend ? (
            <button className="btn btn--wa btn--block" type="button" onClick={send} disabled={sending} aria-busy={sending}>
              <WhatsAppIcon /> {sending ? 'Registrando pedido…' : 'Enviar pedido por WhatsApp'}
            </button>
          ) : (
            <p className="setup-warning">La tienda aún no configuró su número de WhatsApp.</p>
          )}
        </div>
      )}
    </Sheet>
  );
}
