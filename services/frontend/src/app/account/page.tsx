import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { getOrders } from "@/lib/orders";
import { formatCents, resolveImage } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export default async function AccountPage() {
  let orderData;
  try {
    orderData = await getOrders();
  } catch (e) {
    console.error(e);
  }

  const orders = orderData?.orders || [];
  const stats = orderData?.stats || { orderCount: 0, lifetimeCents: 0 };

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
              <span className={styles.headerMeta}>{stats.orderCount} orders · {formatCents(stats.lifetimeCents)} lifetime</span>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.outlinePill} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                All time <ChevronDown size={14} strokeWidth={2} />
              </button>
              <button className={styles.outlinePill}>Export CSV</button>
            </div>
          </div>

          <div className={styles.orderList}>
            {orders.map((order) => (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderRow}>
                  <div className={styles.orderThumb}>
                    <Image src={resolveImage(order.thumbs[0])} alt="Thumb" fill style={{ objectFit: 'cover' }} />
                  </div>
                  <div className={styles.orderDetails}>
                    <div className={styles.orderTitleRow}>
                      <h3 className={styles.orderNumber}>{order.orderNumber}</h3>
                      <span className={order.status === 'delivered' ? styles.badgeSuccess : styles.badgeAccentSoft}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className={styles.orderSummary}>{order.summaryLine} · {new Date(order.placedAt).toLocaleDateString()}</p>
                  </div>
                  <div className={styles.orderTotal}>
                    {formatCents(order.totalCents)}
                  </div>
                  <div className={styles.orderActions}>
                    <Link href={`/account/orders/${order.id}`} className={styles.outlinePillSmall}>View</Link>
                    <button className={styles.outlinePillSmall}>Invoice</button>
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className={styles.headerMeta}>No orders yet.</p>}
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
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
