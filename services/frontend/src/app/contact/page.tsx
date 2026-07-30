import Link from 'next/link';
import styles from '@/styles/prose.module.css';

export const metadata = {
  title: 'Contact — Rule Prod',
  description: 'How to reach Rule Prod.',
};

export default function ContactPage() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Contact</h1>
          <p className={styles.subtitle}>
            Questions about an order, a bulk quote, or the archive.
          </p>
        </div>

        <div className={styles.body}>
          <dl className={styles.table}>
            <div className={styles.row}>
              <dt>Orders and returns</dt>
              <dd>orders@ruleprod.com</dd>
            </div>
            <div className={styles.row}>
              <dt>Trade and bulk quotes</dt>
              <dd>trade@ruleprod.com</dd>
            </div>
            <div className={styles.row}>
              <dt>Vintage archive</dt>
              <dd>archive@ruleprod.com</dd>
            </div>
            <div className={styles.row}>
              <dt>Post</dt>
              <dd>Rule Prod, 1 Straightedge Row, Portland OR 97209</dd>
            </div>
          </dl>

          <p>
            Have your order number to hand — it looks like <strong>RP-10517</strong>{' '}
            and is on the confirmation page and in{' '}
            <Link href="/account">your order history</Link>. For anything about
            shipping windows, returns or price breaks,{' '}
            <Link href="/help">the help page</Link> is usually faster.
          </p>

          <div className={styles.callout}>
            <h3>These addresses do not receive mail</h3>
            <p>
              Rule Prod is a fictional storefront built to demonstrate an
              observability stack. The contact details above are part of the
              demo — nothing sent to them reaches anyone.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
