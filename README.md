# Plastimascotas Jimmys · Tienda para mascotas

Tienda web para **Plastimascotas Jimmys** (Funza): catálogo con filtros por mascota, categoría y marca, carrito con **precio por mayor automático**, pedidos que llegan por **WhatsApp**, citas para el **spa canino y felino** y un **panel de administración** con productos, inventario, pedidos y métricas.

- **Tienda:** `/`
- **Panel:** `/admin`

## Cómo funciona

1. El cliente arma su carrito. Cada presentación (1 kg, bulto, talla…) tiene su precio, su stock y, si se quiere, un **precio por mayor** que se aplica solo al llegar a la cantidad mínima.
2. Al enviar, el pedido se registra en Supabase con `create_order()`. El servidor recalcula los precios, revisa que haya stock y devuelve un código (`PJ-XXXXX`). Después se abre WhatsApp con el pedido escrito.
3. En el panel, el pedido aparece **en vivo**:
   - Al **confirmarlo** se descuenta el inventario.
   - Si se **cancela**, se devuelve solo.
   - Cada movimiento queda en el historial: venta, entrada, ajuste, devolución.
4. El cliente ve el estado de su pedido en la página de inicio: confirmado, alistando, en camino, entregado.

Si Supabase no responde, la tienda sigue mostrando la última copia del catálogo y los pedidos igual salen por WhatsApp, aunque sin quedar registrados.

## Panel `/admin`

| Sección | Para qué |
|---|---|
| Pedidos | Pedidos en vivo con alerta sonora. Confirmar, alistar, despachar, entregar o cancelar. |
| Métricas | Ventas, ticket promedio, lo más y lo menos vendido, horas pico, ventas por marca y categoría, estado del inventario. |
| Productos | Crear y editar productos: fotos, marca, mascota, presentaciones, precios, oferta, precio por mayor y stock. |
| Inventario | Existencias, productos por agotarse y agotados. Registrar **entradas de mercancía** y **conteos**, y ver el historial de movimientos. |
| Categorías y marcas | Ordenar, crear, ocultar. |
| Ajustes | WhatsApp, teléfonos, dirección, horario, medios de pago, nota de domicilio, aviso de stock bajo, pausar pedidos. |
| Equipo | Dar acceso a otras personas. |

**Primer ingreso:**
1. Entra a `/admin`.
2. Elige **Crear cuenta** y confirma el correo.
3. Inicia sesión. La primera cuenta se vuelve la administradora principal.

**Catálogo de ejemplo:** viene cargado con productos de ejemplo. Cuando se editan dejan de ser ejemplo, y también se pueden borrar todos con **Productos → Borrar ejemplos**.

## Desarrollo

Requiere Node 22 o más reciente (ver `.nvmrc`).

```bash
npm ci
cp .env.example .env.local   # URL y llave pública de Supabase
npm run dev
npm run build                # tsc + vite build → dist/
```

## Supabase

- Proyecto: `PLASTIMASCOTAS` (ref `pxnmhhwzswqbxsvzjvst`).
- Esquema y funciones: `supabase/migrations/`.
- Catálogo de ejemplo: `supabase/seed.sql`. Se genera desde `src/data/seed.ts` con `node scripts/gen-seed.ts > supabase/seed.sql`.
- Seguridad:
  - RLS en todas las tablas.
  - Los visitantes solo leen el catálogo activo.
  - Pedidos, movimientos y métricas solo los ven administradores.
  - Las funciones públicas (`create_order`, `track_orders`, `customer_signal`, `admin_setup_needed`) validan todo en el servidor.

## Publicación

Es un sitio estático (`dist/`) con fallback SPA. `wrangler.jsonc` ya está listo para Cloudflare Workers, y también funciona en Cloudflare Pages.

En Supabase → Authentication → URL Configuration, pon como Site URL y Redirect URL el dominio final, con `/admin`.

## Créditos de imágenes

Las fotos de mascotas son de dominio público (CC0), tomadas de Wikimedia Commons (originalmente de Unsplash):
- *Golden Retriever, Birmingham*
- *Jack Russell puppy*
- *Sunday Kitty*
- *Blue, red and green parrot*
- *Brown rabbit green grass*
- *Princess*
- *Puppy playing with a toy*
- *Ginger long-haired cat*
