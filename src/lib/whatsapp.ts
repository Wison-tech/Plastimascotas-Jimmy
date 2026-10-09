import type { CartLine } from '../hooks/useCart';
import { money, parseMoney } from './format';

export type DeliveryMode = 'domicilio' | 'recoger';

export type Checkout = {
  mode: DeliveryMode;
  name: string;
  phone: string;
  address: string;
  barrio: string;
  reference: string;
  payment: string;
  cashWith: string;
  note: string;
};

export const EMPTY_CHECKOUT: Checkout = {
  mode: 'domicilio',
  name: '',
  phone: '',
  address: '',
  barrio: '',
  reference: '',
  payment: 'Efectivo',
  cashWith: '',
  note: '',
};

export const MODE_LABEL: Record<DeliveryMode, string> = {
  domicilio: 'Domicilio',
  recoger: 'Recoger en la tienda',
};

/** Campos obligatorios que faltan, en el orden en que aparecen en el formulario. */
export function checkoutErrors(c: Checkout, total: number): Partial<Record<keyof Checkout, string>> {
  const e: Partial<Record<keyof Checkout, string>> = {};
  if (!c.name.trim()) e.name = 'Escribe tu nombre';
  const digits = c.phone.replace(/\D/g, '');
  if (!digits) e.phone = 'Escribe tu celular';
  else if (digits.length < 7 || digits.length > 15) e.phone = 'Revisa el número';
  if (c.mode === 'domicilio') {
    if (!c.address.trim()) e.address = 'Escribe la dirección';
    if (!c.barrio.trim()) e.barrio = 'Escribe el barrio';
  }
  if (c.payment === 'Efectivo' && c.cashWith && parseMoney(c.cashWith) < total) {
    e.cashWith = `Debe ser al menos ${money(total)}`;
  }
  return e;
}

/** Una línea del mensaje, venga del servidor o del carrito. */
export type TicketLine = { qty: number; name: string; brand: string; variant: string; unit: number; line: number; wholesale: boolean };

export const ticketFromCart = (lines: CartLine[]): TicketLine[] =>
  lines.map((l) => ({
    qty: l.qty,
    name: l.product.name,
    brand: l.product.brand ?? '',
    variant: l.variant.label,
    unit: l.unit,
    line: l.unit * l.qty,
    wholesale: l.wholesale,
  }));

type ServerItem = { qty: number; name: string; brand: string; variant: string; unit: number; line: number; wholesale: boolean };
export const ticketFromServer = (items: ServerItem[]): TicketLine[] => items.map((it) => ({ ...it }));

const LINE = '━━━━━━━━━━━━━━';

export function buildMessage(code: string, lines: TicketLine[], total: number, savings: number, c: Checkout, deliveryNote: string): string {
  // Sin emojis: WhatsApp (sobre todo el de PC) los convierte en "�" al llegar por wa.me.
  const out: string[] = [];
  out.push('*NUEVO PEDIDO · PLASTIMASCOTAS*', `Pedido: *${code}*`, LINE);

  for (const l of lines) {
    const name = `${l.name}${l.variant ? ` (${l.variant})` : ''}`;
    out.push(`*${l.qty}× ${name}* — ${money(l.line)}`);
    if (l.qty > 1 || l.wholesale) out.push(`   ${money(l.unit)} c/u${l.wholesale ? ' · precio por mayor' : ''}`);
  }

  out.push(LINE);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  out.push(`Unidades: ${count}`);
  if (savings > 0) out.push(`Ahorro por mayor: ${money(savings)}`);
  out.push(`*TOTAL: ${money(total)}*`);
  out.push(LINE);

  out.push(`*Cliente:* ${c.name.trim()}`);
  out.push(`*Celular:* ${c.phone.trim()}`);
  if (c.mode === 'domicilio') {
    out.push('*Entrega:* Domicilio');
    out.push(`*Dirección:* ${c.address.trim()}, ${c.barrio.trim()}`);
    if (c.reference.trim()) out.push(`*Referencia:* ${c.reference.trim()}`);
  } else {
    out.push('*Entrega:* Paso a recogerlo a la tienda');
  }

  let pay = `*Pago:* ${c.payment}`;
  if (c.payment === 'Efectivo' && parseMoney(c.cashWith) > 0) {
    const cash = parseMoney(c.cashWith);
    pay += ` · pago con ${money(cash)} (cambio ${money(cash - total)})`;
  }
  out.push(pay);
  if (c.note.trim()) out.push(`*Nota:* ${c.note.trim()}`);
  if (c.mode === 'domicilio' && deliveryNote.trim()) out.push('', `_${deliveryNote.trim()}_`);

  return out.join('\n');
}

export type SpaRequest = {
  pet: 'Perro' | 'Gato';
  petName: string;
  size: string;
  services: string[];
  day: string;
  owner: string;
  note: string;
};

export function buildSpaMessage(r: SpaRequest): string {
  const out = ['*CITA SPA CANINO Y FELINO*', LINE];
  out.push(`*Mascota:* ${r.pet}${r.petName.trim() ? ` · ${r.petName.trim()}` : ''}`);
  if (r.size) out.push(`*Tamaño:* ${r.size}`);
  out.push(`*Servicios:* ${r.services.join(', ')}`);
  if (r.day) out.push(`*Día preferido:* ${r.day}`);
  out.push(`*Nombre:* ${r.owner.trim()}`);
  if (r.note.trim()) out.push(`*Nota:* ${r.note.trim()}`);
  out.push(LINE, '¿Qué disponibilidad y precio tienen?');
  return out.join('\n');
}

export const whatsappUrl = (number: string, text: string) =>
  `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

/** Abre WhatsApp. Si el navegador bloquea la ventana nueva, navega en la misma pestaña. */
export function openWhatsApp(url: string) {
  const w = window.open(url, '_blank');
  if (w) {
    try {
      w.opener = null;
    } catch {
      /* algunos navegadores no lo permiten; no pasa nada */
    }
  } else {
    window.location.href = url;
  }
}
