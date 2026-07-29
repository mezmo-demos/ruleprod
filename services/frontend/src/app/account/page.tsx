import Link from "next/link";
import styles from "./page.module.css";

export default function AccountPage() {
  return (
    <main className={styles.main}>
      <div className={styles.layout}>
        
        {/* Sidebar */}
        <aside className={styles.sidebarCol}>
          <nav className={styles.sidebar}>
            <Link href="/account" className={`${styles.navItem} ${styles.navItemActive}`}>Orders</Link>
            <Link href="#" className={styles.navItem}>Saved carts</Link>
            <Link href="#" className={styles.navItem}>Addresses</Link>
            <Link href="#" className={styles.navItem}>Purchase orders</Link>
            <Link href="#" className={styles.navItem}>Account details</Link>
          </nav>
        </aside>

        {/* Content */}
        <div className={styles.contentCol}>
          
          <div className={styles.header}>
            <div className={styles.headerTitles}>
              <h1 className="page-h1">Orders</h1>
              <span className={styles.headerMeta}>12 orders · $4,208.40 lifetime</span>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.outlinePill}>All time ▾</button>
              <button className={styles.outlinePill}>Export CSV</button>
            </div>
          </div>

          <div className={styles.orderList}>
            {/* Delivered Order */}
            <div className={styles.orderCard}>
              <div className={styles.orderRow}>
                <div className={styles.orderThumb}>
                   <span className={styles.imagePlaceholder}>[Thumb]</span>
                </div>
                <div className={styles.orderDetails}>
                  <div className={styles.orderTitleRow}>
                    <h3 className={styles.orderNumber}>RP-10515</h3>
                    <span className={styles.badgeSuccess}>Delivered</span>
                  </div>
                  <p className={styles.orderSummary}>3 items · Jul 12, 2026</p>
                </div>
                <div className={styles.orderTotal}>
                  $348.50
                </div>
                <div className={styles.orderActions}>
                  <button className={styles.outlinePillSmall}>Buy again</button>
                  <button className={styles.outlinePillSmall}>Return</button>
                </div>
              </div>
            </div>

            {/* Processing Order */}
            <div className={styles.orderCard}>
              <div className={styles.orderRow}>
                <div className={styles.orderThumb}>
                   <span className={styles.imagePlaceholder}>[Thumb]</span>
                </div>
                <div className={styles.orderDetails}>
                  <div className={styles.orderTitleRow}>
                    <h3 className={styles.orderNumber}>RP-10516</h3>
                    <span className={styles.badgeAccentSoft}>Processing</span>
                  </div>
                  <p className={styles.orderSummary}>1 item · Jul 28, 2026</p>
                </div>
                <div className={styles.orderTotal}>
                  $145.00
                </div>
                <div className={styles.orderActions}>
                  <button className={styles.outlinePillSmall}>View</button>
                  <button className={styles.outlinePillSmall}>Invoice</button>
                </div>
              </div>
            </div>

            {/* In Transit Order */}
            <div className={styles.orderCard}>
              <div className={styles.orderRow}>
                <div className={styles.orderThumb}>
                   <span className={styles.imagePlaceholder}>[Thumb]</span>
                </div>
                <div className={styles.orderDetails}>
                  <div className={styles.orderTitleRow}>
                    <h3 className={styles.orderNumber}>RP-10514</h3>
                    <span className={styles.badgeAccentSoft}>In transit</span>
                  </div>
                  <p className={styles.orderSummary}>12 items · Jul 26, 2026</p>
                </div>
                <div className={styles.orderTotal}>
                  $824.20
                </div>
                <div className={styles.orderActions}>
                  <button className={styles.outlinePillSmall}>Track</button>
                  <button className={styles.outlinePillSmall}>Invoice</button>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.savedCartsSection}>
            <div className={styles.savedCartsHeader}>
              <h2 className={styles.sectionH2}>Saved carts</h2>
              <button className={styles.newCartBtn}>New saved cart</button>
            </div>
            
            <div className={styles.savedCartsGrid}>
              <div className={styles.savedCartCard}>
                <h3 className={styles.savedCartTitle}>Workshop restock</h3>
                <p className={styles.savedCartMeta}>7 items · $412.00 · 14 Jul</p>
                <button className={styles.restoreBtn}>Restore</button>
              </div>
              <div className={styles.savedCartCard}>
                <h3 className={styles.savedCartTitle}>Drafting class kits</h3>
                <p className={styles.savedCartMeta}>32 items · $854.40 · 02 Jun</p>
                <button className={styles.restoreBtn}>Restore</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
