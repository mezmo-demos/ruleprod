import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type {
  CheckoutTotals,
  DeliveryMethod,
  Order,
  OrderLine,
  OrderStatus,
  OrderSummary,
  PaymentMethod,
  ShippingAddress,
} from '@ruleprod/contracts';
import { arrivesEstimate } from './domain/businessDays.js';
import { summaryLine, thumbs } from './domain/format.js';
import type { CreateOrderRequest } from './domain/validate.js';

interface OrderRow {
  id: string;
  order_number: string;
  user_key: string;
  status: OrderStatus;
  placed_at: Date;
  arrives_estimate: Date;
  contact: { email: string; name?: string };
  shipping_address: ShippingAddress;
  delivery: { method: DeliveryMethod; priceCents: number };
  payment: { method: PaymentMethod };
  promo: { code: string; discountCents: number } | null;
  totals: CheckoutTotals;
  idempotency_key: string;
  unit_count: number;
}

interface LineRow {
  position: number;
  sku: string;
  slug: string;
  title: string;
  variant_label: string;
  image: string;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
}

const ORDER_COLUMN_NAMES = [
  'id',
  'order_number',
  'user_key',
  'status',
  'placed_at',
  'arrives_estimate',
  'contact',
  'shipping_address',
  'delivery',
  'payment',
  'promo',
  'totals',
  'idempotency_key',
  'unit_count',
] as const;

const ORDER_COLUMNS = ORDER_COLUMN_NAMES.join(', ');
const ORDER_COLUMNS_O = ORDER_COLUMN_NAMES.map((c) => `o.${c}`).join(', ');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_NUMBER_RE = /^rp-\d+$/i;

function toSummary(row: OrderRow, images: readonly string[]): OrderSummary {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    placedAt: row.placed_at.toISOString(),
    arrivesEstimate: row.arrives_estimate.toISOString(),
    totalCents: row.totals.totalCents,
    unitCount: row.unit_count,
    summaryLine: summaryLine(row.unit_count, row.placed_at),
    thumbs: thumbs(images),
  };
}

function toOrder(row: OrderRow, lineRows: readonly LineRow[]): Order {
  const lines: OrderLine[] = lineRows.map((line) => ({
    sku: line.sku,
    slug: line.slug,
    title: line.title,
    variantLabel: line.variant_label,
    image: line.image,
    qty: line.qty,
    unitPriceCents: line.unit_price_cents,
    lineTotalCents: line.line_total_cents,
  }));
  return {
    ...toSummary(
      row,
      lineRows.map((line) => line.image),
    ),
    userKey: row.user_key,
    contact: row.contact,
    shippingAddress: row.shipping_address,
    delivery: row.delivery,
    payment: row.payment,
    promo: row.promo,
    lines,
    totals: row.totals,
  };
}

async function fetchLines(
  client: pg.Pool | pg.PoolClient,
  orderId: string,
): Promise<LineRow[]> {
  const result = await client.query<LineRow>(
    `SELECT position, sku, slug, title, variant_label, image, qty,
            unit_price_cents, line_total_cents
       FROM orders.order_lines
      WHERE order_id = $1
      ORDER BY position`,
    [orderId],
  );
  return result.rows;
}

async function fetchByIdempotencyKey(pool: pg.Pool, key: string): Promise<Order | null> {
  const result = await pool.query<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders.orders WHERE idempotency_key = $1`,
    [key],
  );
  const row = result.rows[0];
  if (!row) return null;
  return toOrder(row, await fetchLines(pool, row.id));
}

export interface CreateOrderResult {
  order: Order;
  created: boolean;
}

/**
 * Insert the order idempotently. The unique constraint on idempotency_key +
 * ON CONFLICT DO NOTHING is the arbiter (no pre-check race): a concurrent
 * duplicate blocks on the winner's transaction, then reads the committed
 * order back and reports created=false so the route can answer 200.
 */
export async function createOrder(
  pool: pg.Pool,
  req: CreateOrderRequest,
  now: Date = new Date(),
): Promise<CreateOrderResult> {
  const id = randomUUID();
  const placedAt = now;
  const arrives = arrivesEstimate(placedAt, req.delivery.method);
  const unitCount = req.lines.reduce((sum, line) => sum + line.qty, 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query<OrderRow>(
      `INSERT INTO orders.orders
         (id, order_number, user_key, status, placed_at, arrives_estimate,
          contact, shipping_address, delivery, payment, promo, totals,
          idempotency_key, unit_count)
       VALUES
         ($1, 'RP-' || nextval('orders.order_number_seq'), $2, 'placed', $3, $4,
          $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb,
          $11, $12)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING ${ORDER_COLUMNS}`,
      [
        id,
        req.userKey,
        placedAt.toISOString(),
        arrives.toISOString(),
        JSON.stringify(req.contact),
        JSON.stringify(req.shippingAddress),
        JSON.stringify(req.delivery),
        JSON.stringify(req.payment),
        req.promo === null ? null : JSON.stringify(req.promo),
        JSON.stringify(req.totals),
        req.idempotencyKey,
        unitCount,
      ],
    );

    const row = inserted.rows[0];
    if (!row) {
      // Idempotent replay: the key already won. Nothing to write.
      await client.query('ROLLBACK');
      const existing = await fetchByIdempotencyKey(pool, req.idempotencyKey);
      if (!existing) {
        throw new Error(`idempotency conflict for key ${req.idempotencyKey} but no order found`);
      }
      return { order: existing, created: false };
    }

    const values: unknown[] = [row.id];
    const tuples = req.lines.map((line, index) => {
      const base = values.length;
      values.push(
        index + 1,
        line.sku,
        line.slug,
        line.title,
        line.variantLabel,
        line.image,
        line.qty,
        line.unitPriceCents,
        line.lineTotalCents,
      );
      return `($1, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
    });
    await client.query(
      `INSERT INTO orders.order_lines
         (order_id, position, sku, slug, title, variant_label, image, qty,
          unit_price_cents, line_total_cents)
       VALUES ${tuples.join(', ')}`,
      values,
    );
    await client.query('COMMIT');
    return { order: toOrder(row, await fetchLines(pool, row.id)), created: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export interface ListOrdersResult {
  orders: OrderSummary[];
  stats: { orderCount: number; lifetimeCents: number };
}

/** All orders for a userKey, newest first, with lifetime aggregates. */
export async function listOrders(pool: pg.Pool, userKey: string): Promise<ListOrdersResult> {
  const result = await pool.query<OrderRow & { images: string[] }>(
    `SELECT ${ORDER_COLUMNS_O},
            coalesce(
              json_agg(l.image ORDER BY l.position) FILTER (WHERE l.image IS NOT NULL),
              '[]'
            ) AS images
       FROM orders.orders o
       LEFT JOIN orders.order_lines l ON l.order_id = o.id
      WHERE o.user_key = $1
      GROUP BY o.id
      ORDER BY o.placed_at DESC, o.order_number DESC`,
    [userKey],
  );
  const orders = result.rows.map((row) => toSummary(row, row.images));
  const lifetimeCents = result.rows.reduce((sum, row) => sum + row.totals.totalCents, 0);
  return { orders, stats: { orderCount: orders.length, lifetimeCents } };
}

/** Fetch a full order by uuid or RP-number; null when absent or unparseable. */
export async function getOrder(pool: pg.Pool, idOrNumber: string): Promise<Order | null> {
  let where: string;
  let value: string;
  if (UUID_RE.test(idOrNumber)) {
    where = 'id = $1';
    value = idOrNumber.toLowerCase();
  } else if (ORDER_NUMBER_RE.test(idOrNumber)) {
    where = 'order_number = $1';
    value = idOrNumber.toUpperCase();
  } else {
    return null;
  }
  const result = await pool.query<OrderRow>(
    `SELECT ${ORDER_COLUMNS} FROM orders.orders WHERE ${where}`,
    [value],
  );
  const row = result.rows[0];
  if (!row) return null;
  return toOrder(row, await fetchLines(pool, row.id));
}

/** Move every order from one userKey to another (guest → persona backfill). */
export async function rekeyOrders(
  pool: pg.Pool,
  fromUserKey: string,
  toUserKey: string,
): Promise<number> {
  const result = await pool.query(
    'UPDATE orders.orders SET user_key = $2 WHERE user_key = $1',
    [fromUserKey, toUserKey],
  );
  return result.rowCount ?? 0;
}
