import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.brand}>
            <div className={styles.wordmark}>Rule Prod</div>
            <p className={styles.description}>Measure twice.<br/>Buy once.</p>
          </div>
          <div className={styles.links}>
            <h3>Shop</h3>
            <Link href="/catalog">All rulers</Link>
            <Link href="/catalog?category=trades">Trades</Link>
            <Link href="/catalog?category=studio">Studio</Link>
            <Link href="/catalog?category=school">School</Link>
            <Link href="/catalog?category=textile">Textile</Link>
            <Link href="/catalog?category=vintage">Vintage archive</Link>
          </div>
          <div className={styles.links}>
            <h3>Support</h3>
            <Link href="/help#shipping">Shipping</Link>
            <Link href="/help#returns">Returns</Link>
            <Link href="/help#bulk-pricing">Bulk pricing</Link>
            <Link href="/help#purchase-orders">Purchase orders</Link>
          </div>
          <div className={styles.links}>
            <h3>Company</h3>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div className={styles.links}>
            <h3>Account</h3>
            <Link href="/signin">Sign in</Link>
            <Link href="/account#orders">Order history</Link>
            <Link href="/account#saved-carts">Saved carts</Link>
          </div>
        </div>
        <div className={styles.bottomBar}>
          <p>© 2026 Rule Prod. A demonstration store — no payment is ever taken.</p>
          <div className={styles.legalLinks}>
            <Link href="/legal#privacy">Privacy</Link>
            <Link href="/legal#terms">Terms</Link>
            <Link href="/legal#accessibility">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
