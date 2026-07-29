import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { getCart } from "@/lib/cart";
import { formatCents, resolveImage } from "@/lib/utils";
import CartLineItem from "@/components/CartLineItem";

export default async function CartPage() {
  let cart;
  try {
    cart = await getCart();
  } catch (e) {
    console.error(e);
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <main className={styles.main}>
        <h1 className="page-h1">Your cart is empty</h1>
        <p style={{ marginTop: '16px' }}>
          <Link href="/catalog" style={{ color: 'var(--accent)', fontWeight: 600 }}>Explore our rulers →</Link>
        </p>
      </main>
    );
  }

  // Find the best bulk nudge
  const nudgeLine = cart.lines.find(l => l.nextTier !== null);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className="page-h1">Your cart</h1>
        <span className={styles.headerSubtitle}>{cart.lines.length} lines · {cart.unitCount} units</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          
          <div className={styles.lineItemsCard}>
            {cart.lines.map(line => (
              <CartLineItem key={line.id} line={line} />
            ))}
          </div>

          {nudgeLine && nudgeLine.nextTier && (
            <div className={styles.bulkNudge}>
              <div className={styles.bulkNudgeText}>
                <h3 className={styles.bulkNudgeTitle}>Add {nudgeLine.nextTier.unitsAway} more to reach the {nudgeLine.nextTier.minQty}+ price</h3>
                <p className={styles.bulkNudgeBody}>
                  You&apos;ll save an additional {formatCents(nudgeLine.unitPriceCents - nudgeLine.nextTier.unitPriceCents)} per unit on the {nudgeLine.product.title}.
                </p>
              </div>
              <button className={styles.bumpBtn}>Bump to {nudgeLine.nextTier.minQty}</button>
            </div>
          )}

          {cart.savedForLater.length > 0 && (
            <div className={styles.savedForLaterSection}>
              <h2 className={styles.sectionH2}>Saved for later</h2>
              <div className={styles.savedForLaterCard}>
                {cart.savedForLater.map(line => (
                  <div key={line.id} className={styles.savedLine}>
                    <div className={styles.savedThumb}>
                      <Image src={resolveImage(line.product.image)} alt={line.product.title} fill style={{ objectFit: 'cover' }} />
                    </div>
                    <div className={styles.savedDetails}>
                      <h3 className={styles.savedTitle}>{line.product.title}</h3>
                      <p className={styles.savedSpec}>{line.product.variantLabel} · {line.product.specLine}</p>
                      <p className={styles.savedPrice}>{formatCents(line.unitPriceCents)}</p>
                    </div>
                    <button className={styles.moveBtn}>Move to cart</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.savedCartsSection}>
            <div className={styles.savedCartsHeader}>
              <h2 className={styles.sectionH2}>Saved carts</h2>
              <button className={styles.saveCartBtn}>Save this cart</button>
            </div>
            <div className={styles.savedCartsGrid}>
              {/* This would come from a separate API call in a real app */}
              <div className={styles.savedCartCard}>
                <h3 className={styles.savedCartTitle}>Workshop restock</h3>
                <p className={styles.savedCartMeta}>7 items · $412.00 · 14 Jul</p>
                <button className={styles.restoreBtn}>Restore</button>
              </div>
            </div>
          </div>

        </div>

        <div className={styles.summaryCol}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Subtotal ({cart.unitCount} units)</span>
                <span className={styles.summaryValue}>{formatCents(cart.subtotalCents)}</span>
              </div>
              {cart.bulkSavingsCents > 0 && (
                <div className={styles.summaryRowAccent}>
                  <span className={styles.summaryLabel}>Bulk savings</span>
                  <span className={styles.summaryValue}>−{formatCents(cart.bulkSavingsCents)}</span>
                </div>
              )}
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Shipping</span>
                <span className={styles.summaryValue}>Calculated next</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Estimated tax</span>
                <span className={styles.summaryValue}>$0.00</span>
              </div>
            </div>
            
            <div className={styles.summaryDivider} />
            
            <div className={styles.summaryTotalRow}>
              <span className={styles.summaryTotalLabel}>Total</span>
              <span className={styles.summaryTotalValue}>{formatCents(cart.subtotalCents - cart.bulkSavingsCents)}</span>
            </div>

            <div className={styles.summaryActions}>
              <Link href="/checkout" className={styles.checkoutGuestBtn}>Checkout as guest</Link>
              <Link href="/checkout" className={styles.checkoutSignInBtn}>Sign in & checkout</Link>
              <button className={styles.saveForLaterLink}>Save cart for later</button>
            </div>

            <div className={styles.summaryDivider} />
            
            <p className={styles.summaryFinePrint}>
              Taxes and shipping are calculated at checkout. This is a demonstration store. No payment is required.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
