import Link from 'next/link';
import styles from '@/styles/prose.module.css';

export const metadata = {
  title: 'Help — Rule Prod',
  description: 'Shipping, returns, bulk pricing and purchase orders at Rule Prod.',
};

export default function HelpPage() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Help</h1>
          <p className={styles.subtitle}>
            How shipping, returns, bulk pricing and purchase orders work at Rule Prod.
          </p>
        </div>

        <div className={styles.body}>
          <nav className={styles.tocNav} aria-label="On this page">
            <a href="#shipping" className={styles.tocLink}>Shipping</a>
            <a href="#returns" className={styles.tocLink}>Returns</a>
            <a href="#bulk-pricing" className={styles.tocLink}>Bulk pricing</a>
            <a href="#purchase-orders" className={styles.tocLink}>Purchase orders</a>
          </nav>

          <h2 id="shipping">Shipping</h2>
          <p>
            Two options, both quoted at checkout and both counted in business days
            from the day the order is placed.
          </p>
          <dl className={styles.table}>
            <div className={styles.row}>
              <dt>Standard</dt>
              <dd>$6.50 · 4 business days · free over $75</dd>
            </div>
            <div className={styles.row}>
              <dt>Expedited</dt>
              <dd>$18.00 · 2 business days</dd>
            </div>
          </dl>
          <p>
            The free-shipping threshold is measured against the subtotal after any
            bulk price breaks and before promotional codes, so a bulk order that
            crosses $75 ships free either way.
          </p>

          <h2 id="returns">Returns</h2>
          <p>
            Anything unused goes back within 30 days for a full refund of the
            purchase price. Measuring tools are precision instruments, so we ask
            that steel rules and straightedges come back in their sleeves — a
            dinged edge is no longer a straightedge.
          </p>
          <ul>
            <li>Vintage archive pieces are sold as described and are final sale.</li>
            <li>Classroom crate quantities can be returned in whole crates only.</li>
            <li>Return shipping on a faulty item is on us.</li>
          </ul>

          <h2 id="bulk-pricing">Bulk pricing</h2>
          <p>
            Price breaks apply automatically in the cart — there is no code to
            enter and no account required. Each variant carries its own ladder;
            the cart shows the next break and how many units away it is.
          </p>
          <p>
            A classroom ruler, for instance, drops at 30, 100 and 500 units. Order
            the whole district&apos;s worth and the 500-unit price applies to every
            unit in the line. See <Link href="/#bulk-pricing">how it works</Link> or
            browse <Link href="/catalog">the full catalog</Link>.
          </p>

          <h2 id="purchase-orders">Purchase orders</h2>
          <p>
            Schools, studios and trade accounts can bill against a purchase order
            instead of an invoice: choose <strong>Purchase order</strong> at the
            payment step. PO-billed orders are grouped on their own in{' '}
            <Link href="/account#purchase-orders">your account</Link>.
          </p>
          <p>
            Invoiced accounts are net 30 from the ship date. No card is ever
            required, and none is ever charged.
          </p>

          <div className={styles.callout}>
            <h3>A demonstration store</h3>
            <p>
              Rule Prod is a fictional storefront built to exercise a real
              observability stack. Orders, shipping quotes and price breaks all
              behave as described, but nothing physical is ever shipped and no
              payment is ever taken.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
