import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { getOrders } from "@/lib/orders";
import { listSavedCarts } from "@/lib/cart";
import { getPersona } from "@/lib/auth";
import { filterByRange, parseRange, rangeLabel } from "@/lib/orderFilters";
import { formatCents, resolveImage, shortDate } from "@/lib/utils";
import SignOutButton from "@/components/SignOutButton";
import OrderRangeFilter from "@/components/OrderRangeFilter";
import SavedCartControls from "@/components/SavedCartControls";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const persona = await getPersona();
  const range = parseRange((await searchParams).range);

  // Orders and saved carts are independent — one failing must not blank the
  // other, so each settles on its own.
  const [orderResult, savedCartResult] = await Promise.allSettled([
    getOrders(),
    listSavedCarts(),
  ]);

  if (orderResult.status === 'rejected') {
    console.error('account: orders fetch failed', orderResult.reason);
  }
  if (savedCartResult.status === 'rejected') {
    console.error('account: saved carts fetch failed', savedCartResult.reason);
  }

  const orderData = orderResult.status === 'fulfilled' ? orderResult.value : undefined;
  const savedCarts = savedCartResult.status === 'fulfilled' ? savedCartResult.value : [];

  const orders = orderData?.orders || [];
  const stats = orderData?.stats || { orderCount: 0, lifetimeCents: 0 };
  const visibleOrders = filterByRange(orders, range);
  const purchaseOrders = orders.filter((order) => order.paymentMethod === 'purchase_order');
  const exportHref = range === 'all' ? '/account/export' : `/account/export?range=${range}`;

  return (
    <main className={styles.main}>
      {persona ? (
        <div className={styles.identity}>
          <span className={styles.identityAvatar} aria-hidden="true">{persona.initials}</span>
          <div className={styles.identityText}>
            <h2 className={styles.identityName}>{persona.name}</h2>
            <p className={styles.identityMeta}>
              {persona.role} · {persona.company} · {persona.email}
            </p>
          </div>
          <div className={styles.identityActions}>
            <Link href="/signin" className={styles.outlinePill}>Switch persona</Link>
            <SignOutButton className={styles.outlinePill} />
          </div>
        </div>
      ) : (
        <div className={styles.guestBanner}>
          <div className={styles.identityText}>
            <h2 className={styles.identityName}>You&apos;re browsing as a guest</h2>
            <p className={styles.identityMeta}>
              Pick a persona to see a full order history — and to keep anything you
              order today.
            </p>
          </div>
          <Link href="/signin" className={styles.solidPill}>Pick a persona</Link>
        </div>
      )}

      <div className={styles.layout}>

        {/* Sidebar */}
        <aside className={styles.sidebarCol}>
          <nav className={styles.sidebar}>
            <a href="#orders" className={`${styles.navItem} ${styles.navItemActive}`}>Orders</a>
            <a href="#saved-carts" className={styles.navItem}>Saved carts</a>
            <a href="#purchase-orders" className={styles.navItem}>Purchase orders</a>
            <a href="#addresses" className={styles.navItem}>Addresses</a>
            <a href="#account-details" className={styles.navItem}>Account details</a>
          </nav>
        </aside>

        {/* Content */}
        <div className={styles.contentCol}>

          <section id="orders">
            <div className={styles.header}>
              <div className={styles.headerTitles}>
                <h1 className="page-h1">Orders</h1>
                <span className={styles.headerMeta}>
                  {stats.orderCount} orders · {formatCents(stats.lifetimeCents)} lifetime
                </span>
              </div>
              <div className={styles.headerActions}>
                <OrderRangeFilter value={range} className={styles.selectPill} />
                <a href={exportHref} className={styles.outlinePill} download>Export CSV</a>
              </div>
            </div>

            <div className={styles.orderList}>
              {visibleOrders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderRow}>
                    <div className={styles.orderThumb}>
                      <Image src={resolveImage(order.thumbs[0])} alt="" fill style={{ objectFit: 'cover' }} />
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
                    </div>
                  </div>
                </div>
              ))}
              {visibleOrders.length === 0 && (
                <p className={styles.emptyNote}>
                  {orders.length === 0
                    ? 'No orders yet.'
                    : `No orders in the ${rangeLabel(range).toLowerCase()}.`}
                </p>
              )}
            </div>
          </section>

          <section id="saved-carts" className={styles.savedCartsSection}>
            <div className={styles.savedCartsHeader}>
              <h2 className={styles.sectionH2}>Saved carts</h2>
              <Link href="/cart" className={styles.newCartBtn}>Save your current cart</Link>
            </div>

            {savedCarts.length === 0 ? (
              <p className={styles.emptyNote}>
                Nothing saved yet — build a cart and choose &ldquo;Save this cart&rdquo; to park it here.
              </p>
            ) : (
              <div className={styles.savedCartsGrid}>
                {savedCarts.map((saved) => (
                  <div key={saved.id} className={styles.savedCartCard}>
                    <h3 className={styles.savedCartTitle}>{saved.name}</h3>
                    <p className={styles.savedCartMeta}>
                      {saved.itemCount} {saved.itemCount === 1 ? 'item' : 'items'} ·{' '}
                      {formatCents(saved.totalCents)} · {shortDate(saved.savedAt)}
                    </p>
                    <div className={styles.savedCartActions}>
                      <SavedCartControls
                        savedCartId={saved.id}
                        name={saved.name}
                        restoreClassName={styles.restoreBtn}
                        deleteClassName={styles.deleteBtn}
                        errorClassName={styles.cardError}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="purchase-orders" className={styles.savedCartsSection}>
            <h2 className={styles.sectionH2}>Purchase orders</h2>
            <p className={styles.sectionLede}>
              Orders billed against a PO rather than an invoice.
            </p>
            {purchaseOrders.length === 0 ? (
              <p className={styles.emptyNote}>
                No purchase orders on this account. Choose &ldquo;Purchase order&rdquo; at checkout to
                bill one this way.
              </p>
            ) : (
              <ul className={styles.poList}>
                {purchaseOrders.map((order) => (
                  <li key={order.id} className={styles.poRow}>
                    <Link href={`/account/orders/${order.id}`} className={styles.poNumber}>
                      {order.orderNumber}
                    </Link>
                    <span className={styles.poMeta}>{order.summaryLine}</span>
                    <span className={styles.poTotal}>{formatCents(order.totalCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="addresses" className={styles.savedCartsSection}>
            <h2 className={styles.sectionH2}>Addresses</h2>
            {persona ? (
              <div className={styles.addressCard}>
                <span className={styles.addressTag}>Default shipping</span>
                <p className={styles.addressLine}>{persona.address.name}</p>
                <p className={styles.addressLine}>{persona.address.street1}</p>
                {persona.address.street2 && (
                  <p className={styles.addressLine}>{persona.address.street2}</p>
                )}
                <p className={styles.addressLine}>
                  {persona.address.city}, {persona.address.state} {persona.address.zip}
                </p>
                <p className={styles.addressNote}>
                  Prefilled at checkout — you can edit it on any order.
                </p>
              </div>
            ) : (
              <p className={styles.emptyNote}>
                Guests have no saved address. <Link href="/signin" className={styles.inlineLink}>Pick a persona</Link> to get one.
              </p>
            )}
          </section>

          <section id="account-details" className={styles.savedCartsSection}>
            <h2 className={styles.sectionH2}>Account details</h2>
            {persona ? (
              <>
                <dl className={styles.detailList}>
                  <div className={styles.detailRow}>
                    <dt>Name</dt>
                    <dd>{persona.name}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Company</dt>
                    <dd>{persona.company}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Role</dt>
                    <dd>{persona.role}</dd>
                  </div>
                  <div className={styles.detailRow}>
                    <dt>Email</dt>
                    <dd>{persona.email}</dd>
                  </div>
                </dl>
                <p className={styles.addressNote}>
                  Rule Prod is a demo store: personas are fixed, so there is nothing here
                  to edit. <Link href="/signin" className={styles.inlineLink}>Switch persona</Link> to
                  shop as someone else.
                </p>
              </>
            ) : (
              <p className={styles.emptyNote}>
                You&apos;re browsing as a guest. <Link href="/signin" className={styles.inlineLink}>Pick a persona</Link> to see account details.
              </p>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}
