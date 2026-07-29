import Link from "next/link";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.promoBar}>
        Summer clear-out — code <strong>SUMMER15</strong> for 15% off, through 31 August
      </div>
      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.wordmark}>Rule Prod</Link>
          <div className={styles.navLinks}>
            <Link href="/catalog">Shop all</Link>
            <Link href="/catalog?category=trades">Trades</Link>
            <Link href="/catalog?category=studio">Studio</Link>
            <Link href="/catalog?category=school">School</Link>
            <Link href="/catalog?category=textile">Textile</Link>
            <Link href="/catalog?category=vintage">Vintage</Link>
          </div>
          <div className={styles.navActions}>
            <div className={styles.search}>
              <input type="text" placeholder="Search 1,240 rulers" />
            </div>
            <Link href="/account" className={styles.btnOutline}>Sign in</Link>
            <Link href="/cart" className={styles.btnDark}>Cart · 2</Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
