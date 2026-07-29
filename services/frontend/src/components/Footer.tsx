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
            <Link href="#">Shipping</Link>
            <Link href="#">Returns</Link>
            <Link href="#">Bulk pricing</Link>
            <Link href="#">Purchase orders</Link>
          </div>
          <div className={styles.links}>
            <h3>Company</h3>
            <Link href="/about">About</Link>
            <Link href="#">Contact</Link>
          </div>
          <div className={styles.links}>
            <h3>Account</h3>
            <Link href="/account">Sign in</Link>
            <Link href="/account">Order history</Link>
            <Link href="/cart">Saved carts</Link>
          </div>
        </div>
        <div className={styles.bottomBar}>
          <p>© 2026 Rule Prod. A demonstration store — no payment is ever taken.</p>
          <div className={styles.legalLinks}>
            <Link href="#">Privacy</Link>
            <Link href="#">Terms</Link>
            <Link href="#">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
