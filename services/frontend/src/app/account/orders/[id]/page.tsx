import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import styles from './page.module.css';
import { getOrder } from '@/lib/orders';
import { getUserKey } from '@/lib/auth';
import { formatCents, resolveImage } from '@/lib/utils';
import PrintButton from '@/components/PrintButton';

const STATUS_LABEL: Record<string, string> = {
  placed: 'Placed',
  processing: 'Processing',
  in_transit: 'In transit',
  delivered: 'Delivered',
};

const PAYMENT_LABEL: Record<string, string> = {
  invoice_net30: 'Invoice — net 30',
  purchase_order: 'Purchase order',
};

const DELIVERY_LABEL: Record<string, string> = {
  standard: 'Standard shipping',
  expedited: 'Expedited shipping',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let order;
  try {
    order = await getOrder(id);
  } catch {
    notFound();
  }

  // Orders are addressed by uuid, but the service has no notion of a session —
  // so the ownership check belongs here, or one persona could read another's.
  const userKey = await getUserKey();
  if (order.userKey !== userKey) {
    notFound();
  }

  const { totals } = order;

  return (
    <main className={styles.main}>
      <Link href="/account" className={styles.backLink}>
        <ChevronLeft size={16} strokeWidth={2} />
        Back to orders
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className="page-h1">Order {order.orderNumber}</h1>
          <p className={styles.headerMeta}>
            Placed {formatDate(order.placedAt)} · {order.unitCount}{' '}
            {order.unitCount === 1 ? 'unit' : 'units'}
          </p>
        </div>
        <div className={styles.headerRight}>
          <span
            className={order.status === 'delivered' ? styles.badgeSuccess : styles.badgeAccentSoft}
          >
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
          <PrintButton className={styles.outlinePill} label="Print invoice" />
        </div>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Items</h2>
        <ul className={styles.lineList}>
          {order.lines.map((line) => (
            <li key={line.sku} className={styles.line}>
              <div className={styles.lineThumb}>
                <Image
                  src={resolveImage(line.image)}
                  alt={line.title}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className={styles.lineDetails}>
                <Link href={`/product/${line.slug}`} className={styles.lineTitle}>
                  {line.title}
                </Link>
                <p className={styles.lineSpec}>
                  {line.variantLabel} · {line.sku}
                </p>
              </div>
              <div className={styles.lineQty}>
                {formatCents(line.unitPriceCents)} × {line.qty}
              </div>
              <div className={styles.lineTotal}>{formatCents(line.lineTotalCents)}</div>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.columns}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Shipping</h2>
          <p className={styles.blockValue}>{order.shippingAddress.name}</p>
          <p className={styles.blockValue}>{order.shippingAddress.street1}</p>
          {order.shippingAddress.street2 && (
            <p className={styles.blockValue}>{order.shippingAddress.street2}</p>
          )}
          <p className={styles.blockValue}>
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
          </p>
          <p className={styles.blockNote}>
            {DELIVERY_LABEL[order.delivery.method] ?? order.delivery.method} · arrives{' '}
            {formatDate(order.arrivesEstimate)}
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Payment</h2>
          <p className={styles.blockValue}>
            {PAYMENT_LABEL[order.payment.method] ?? order.payment.method}
          </p>
          <p className={styles.blockValue}>{order.contact.email}</p>
          <p className={styles.blockNote}>No card was charged — demo store</p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Totals</h2>
          <dl className={styles.totals}>
            <div className={styles.totalRow}>
              <dt>Subtotal</dt>
              <dd>{formatCents(totals.subtotalCents)}</dd>
            </div>
            {totals.bulkSavingsCents > 0 && (
              <div className={styles.totalRow}>
                <dt>Bulk savings</dt>
                <dd className={styles.savings}>−{formatCents(totals.bulkSavingsCents)}</dd>
              </div>
            )}
            {order.promo && (
              <div className={styles.totalRow}>
                <dt>Promo {order.promo.code}</dt>
                <dd className={styles.savings}>−{formatCents(order.promo.discountCents)}</dd>
              </div>
            )}
            <div className={styles.totalRow}>
              <dt>Shipping</dt>
              <dd>
                {totals.shippingCents === 0 ? 'Free' : formatCents(totals.shippingCents)}
              </dd>
            </div>
            <div className={styles.totalRow}>
              <dt>Tax</dt>
              <dd>{formatCents(totals.taxCents)}</dd>
            </div>
            <div className={styles.totalRowGrand}>
              <dt>Total</dt>
              <dd>{formatCents(totals.totalCents)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
