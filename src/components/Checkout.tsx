import { useState } from 'react';
import { useCatalog } from '../data/catalog';
import { money, parseMoney } from '../lib/format';
import { checkoutErrors, MODE_LABEL, type Checkout as CheckoutData, type DeliveryMode } from '../lib/whatsapp';

type Props = {
  data: CheckoutData;
  onChange: (patch: Partial<CheckoutData>) => void;
  total: number;
  showErrors: boolean;
};

const MODES: { id: DeliveryMode; icon: string }[] = [
  { id: 'domicilio', icon: '🛵' },
  { id: 'recoger', icon: '🏪' },
];

export function Field({ id, label, error, children, optional }: { id: string; label: string; error?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className={`fieldset ${error ? 'has-error' : ''}`}>
      <label htmlFor={id} className="fieldset__label">
        {label}
        {optional && <span> (opcional)</span>}
      </label>
      {children}
      {error && (
        <p className="fieldset__error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm({ data, onChange, total, showErrors }: Props) {
  const { settings } = useCatalog();
  // Un error se muestra si ya se intentó enviar o si el campo ya se visitó.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const all = checkoutErrors(data, total);
  const err = (k: keyof CheckoutData) => (showErrors || touched[k] ? all[k] : undefined);
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const aria = (k: keyof CheckoutData) => ({ 'aria-invalid': !!err(k), 'aria-describedby': err(k) ? `co-${k}-err` : undefined });
  const cash = parseMoney(data.cashWith);

  return (
    <div>
      <p className="group__label">¿Cómo lo recibes?</p>
      <div className="seg" role="radiogroup" aria-label="Tipo de entrega">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={data.mode === m.id} className={data.mode === m.id ? 'is-active' : ''} onClick={() => onChange({ mode: m.id })}>
            {MODE_LABEL[m.id]}
          </button>
        ))}
      </div>
      {data.mode === 'domicilio' && settings.deliveryNote && <p className="tier is-on">{settings.deliveryNote}</p>}

      <div className="field-row">
        <Field id="co-name" label="Tu nombre" error={err('name')}>
          <input id="co-name" className="field" value={data.name} onChange={(e) => onChange({ name: e.target.value })} onBlur={blur('name')} autoComplete="name" {...aria('name')} />
        </Field>
        <Field id="co-phone" label="Tu celular" error={err('phone')}>
          <input id="co-phone" className="field" type="tel" inputMode="tel" value={data.phone} onChange={(e) => onChange({ phone: e.target.value })} onBlur={blur('phone')} autoComplete="tel" placeholder="300 123 4567" {...aria('phone')} />
        </Field>
      </div>

      {data.mode === 'domicilio' && (
        <>
          <Field id="co-address" label="Dirección" error={err('address')}>
            <input id="co-address" className="field" value={data.address} onChange={(e) => onChange({ address: e.target.value })} onBlur={blur('address')} autoComplete="street-address" placeholder="Calle 10 # 5-20, casa 3" {...aria('address')} />
          </Field>
          <div className="field-row">
            <Field id="co-barrio" label="Barrio" error={err('barrio')}>
              <input id="co-barrio" className="field" value={data.barrio} onChange={(e) => onChange({ barrio: e.target.value })} onBlur={blur('barrio')} {...aria('barrio')} />
            </Field>
            <Field id="co-reference" label="Referencia" optional>
              <input id="co-reference" className="field" value={data.reference} onChange={(e) => onChange({ reference: e.target.value })} placeholder="Frente al parque…" />
            </Field>
          </div>
        </>
      )}

      <p className="group__label">¿Cómo pagas?</p>
      <div className="pick" role="radiogroup" aria-label="Forma de pago">
        {settings.paymentMethods.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={data.payment === p} className={data.payment === p ? 'is-active' : ''} onClick={() => onChange({ payment: p })}>
            {p}
          </button>
        ))}
      </div>

      {data.payment === 'Efectivo' && (
        <Field id="co-cashWith" label="¿Con cuánto pagas?" optional error={err('cashWith')}>
          <div className="field-money">
            <span aria-hidden="true">$</span>
            <input
              id="co-cashWith"
              className="field"
              inputMode="numeric"
              value={data.cashWith}
              onChange={(e) => {
                const n = parseMoney(e.target.value);
                onChange({ cashWith: n ? n.toLocaleString('es-CO') : '' });
              }}
              onBlur={blur('cashWith')}
              placeholder={total.toLocaleString('es-CO')}
              {...aria('cashWith')}
            />
          </div>
          {cash >= total && cash > 0 && <p className="fieldset__error" style={{ color: 'var(--green)' }}>Te devuelven {money(cash - total)}.</p>}
        </Field>
      )}

      <Field id="co-note" label="Nota para la tienda" optional>
        <textarea id="co-note" className="field" rows={2} maxLength={240} value={data.note} onChange={(e) => onChange({ note: e.target.value })} placeholder="Ej: llamar antes de llegar, sabor preferido…" />
      </Field>
    </div>
  );
}
