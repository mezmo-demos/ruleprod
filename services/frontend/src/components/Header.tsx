import Link from "next/link";
import styles from "./Header.module.css";
import { getCart } from "@/lib/cart";
import { Search, ShoppingCart } from "lucide-react";

export default async function Header() {
  let cart;
  try {
    cart = await getCart();
  } catch (e) {
    // Ignore error for now, cart will just show 0 or not show
    console.error('Header cart fetch failed:', e);
  }

  const lineCount = cart?.lines.length || 0;

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
            {/* A plain GET form: submitting lands on /catalog?q=… , which the
                catalog service already understands. No client JS involved. */}
            <form className={styles.search} action="/catalog">
              <Search size={16} strokeWidth={1.5} className={styles.searchIcon} />
              <input type="search" name="q" placeholder="Search rulers" aria-label="Search rulers" />
            </form>
            <Link href="/account" className={styles.btnOutline}>Sign in</Link>
            <Link href="/cart" className={styles.btnDark}>
              <ShoppingCart size={16} strokeWidth={1.5} style={{ marginRight: '6px' }} />
              Cart · {lineCount}
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
