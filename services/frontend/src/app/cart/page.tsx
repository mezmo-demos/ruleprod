import Link from "next/link";
import styles from "./page.module.css";

export default function CartPage() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className="page-h1">Your cart</h1>
        <span className={styles.headerSubtitle}>3 lines · 15 units</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          
          <div className={styles.lineItemsCard}>
            <div className={styles.lineItem}>
              <div className={styles.lineThumb}>
                <span className={styles.imagePlaceholder}>[Thumb]</span>
              </div>
              <div className={styles.lineDetails}>
                <h3 className={styles.lineTitle}>Starrett 6" Spring Tempered Steel Rule</h3>
                <p className={styles.lineSpec}>4R Graduation · Steel</p>
                <p className={styles.lineBulkAccent}>Bulk price applied — $30.60 each</p>
              </div>
              <div className={styles.stepper}>
                <button className={styles.stepperBtn}>−</button>
                <span className={styles.stepperValue}>12</span>
                <button className={styles.stepperBtn}>+</button>
              </div>
              <div className={styles.linePriceCol}>
                <span className={styles.lineTotal}>$367.20</span>
                <button className={styles.saveForLaterBtn}>Save for later</button>
              </div>
            </div>

            <div className={styles.lineItem}>
              <div className={styles.lineThumb}>
                <span className={styles.imagePlaceholder}>[Thumb]</span>
              </div>
              <div className={styles.lineDetails}>
                <h3 className={styles.lineTitle}>Alvin 12" Architect Scale</h3>
                <p className={styles.lineSpec}>Triangular · Aluminum</p>
              </div>
              <div className={styles.stepper}>
                <button className={styles.stepperBtn}>−</button>
                <span className={styles.stepperValue}>2</span>
                <button className={styles.stepperBtn}>+</button>
              </div>
              <div className={styles.linePriceCol}>
                <span className={styles.lineTotal}>$36.00</span>
                <button className={styles.saveForLaterBtn}>Save for later</button>
              </div>
            </div>
            
            <div className={styles.lineItem}>
              <div className={styles.lineThumb}>
                <span className={styles.imagePlaceholder}>[Thumb]</span>
              </div>
              <div className={styles.lineDetails}>
                <h3 className={styles.lineTitle}>Shinwa 150mm Rigid Rule</h3>
                <p className={styles.lineSpec}>Metric/Imperial · Stainless</p>
              </div>
              <div className={styles.stepper}>
                <button className={styles.stepperBtn}>−</button>
                <span className={styles.stepperValue}>1</span>
                <button className={styles.stepperBtn}>+</button>
              </div>
              <div className={styles.linePriceCol}>
                <span className={styles.lineTotal}>$12.00</span>
                <button className={styles.saveForLaterBtn}>Save for later</button>
              </div>
            </div>
          </div>

          <div className={styles.bulkNudge}>
            <div className={styles.bulkNudgeText}>
              <h3 className={styles.bulkNudgeTitle}>Add 13 more steel rules to reach the 25+ price</h3>
              <p className={styles.bulkNudgeBody}>You'll save an additional $3.40 per unit on the Starrett 6".</p>
            </div>
            <button className={styles.bumpBtn}>Bump to 25</button>
          </div>

          <div className={styles.savedForLaterSection}>
            <h2 className={styles.sectionH2}>Saved for later</h2>
            <div className={styles.savedForLaterCard}>
              <div className={styles.savedLine}>
                <div className={styles.savedThumb}>
                  <span className={styles.imagePlaceholder}>[Thumb]</span>
                </div>
                <div className={styles.savedDetails}>
                  <h3 className={styles.savedTitle}>Rabone 24" Folding Rule</h3>
                  <p className={styles.savedSpec}>4-fold · Boxwood & Brass</p>
                  <p className={styles.savedPrice}>$145.00</p>
                </div>
                <button className={styles.moveBtn}>Move to cart</button>
              </div>
            </div>
          </div>

          <div className={styles.savedCartsSection}>
            <div className={styles.savedCartsHeader}>
              <h2 className={styles.sectionH2}>Saved carts</h2>
              <button className={styles.saveCartBtn}>Save this cart</button>
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

        <div className={styles.summaryCol}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Subtotal (15 units)</span>
                <span className={styles.summaryValue}>$415.20</span>
              </div>
              <div className={styles.summaryRowAccent}>
                <span className={styles.summaryLabel}>Bulk savings</span>
                <span className={styles.summaryValue}>−$40.80</span>
              </div>
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
              <span className={styles.summaryTotalValue}>$415.20</span>
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
