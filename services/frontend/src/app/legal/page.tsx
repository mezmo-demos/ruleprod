import Link from 'next/link';
import styles from '@/styles/prose.module.css';

export const metadata = {
  title: 'Legal — Rule Prod',
  description: 'Privacy, terms and accessibility for the Rule Prod demo storefront.',
};

export default function LegalPage() {
  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Legal</h1>
          <p className={styles.subtitle}>
            Privacy, terms and accessibility — for a store that sells nothing.
          </p>
        </div>

        <div className={styles.body}>
          <nav className={styles.tocNav} aria-label="On this page">
            <a href="#privacy" className={styles.tocLink}>Privacy</a>
            <a href="#terms" className={styles.tocLink}>Terms</a>
            <a href="#accessibility" className={styles.tocLink}>Accessibility</a>
          </nav>

          <h2 id="privacy">Privacy</h2>
          <p>
            Rule Prod collects no personal information, because there is no one to
            collect it from. There is no signup and there are no passwords: you
            shop as a guest, or you{' '}
            <Link href="/signin">pick one of five fictional personas</Link>. Their
            names, addresses and order histories are seeded demo data.
          </p>
          <ul>
            <li>
              Two cookies, both first-party: a session id so a guest cart survives
              a page load, and the persona you picked. Neither is used for
              tracking and there are no third-party cookies.
            </li>
            <li>
              Anything you type at checkout is stored on the order it belongs to,
              in this demo environment, and nowhere else.
            </li>
            <li>
              Requests generate operational telemetry — traces, metrics and logs —
              which is the entire point of the site. It describes requests, not
              people.
            </li>
          </ul>

          <h2 id="terms">Terms</h2>
          <p>
            Rule Prod is a fictional storefront operated as a demonstration.
            Placing an order creates a record in the demo database and nothing
            else: no goods are dispatched, no invoice is issued, and{' '}
            <strong>no payment is ever taken</strong>. Card details are never
            requested, accepted, transmitted or stored.
          </p>
          <p>
            Prices, stock levels, delivery estimates and price breaks are seeded
            data and may change or reset without notice. Nothing on this site is
            an offer to sell.
          </p>

          <h2 id="accessibility">Accessibility</h2>
          <p>
            We build to WCAG 2.1 AA as a baseline: the storefront is navigable by
            keyboard, form controls carry labels, images that convey meaning carry
            alt text, and decorative imagery is hidden from screen readers.
            Filters, sort and pagination are ordinary links and form controls, so
            they work without JavaScript running.
          </p>
          <p>
            If something here is hard to use with assistive technology, that is a
            defect — tell us at <Link href="/contact">the contact page</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
