import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";

export default function ConfirmationPage() {
  return (
    <main className={styles.main}>
      
      <div className={styles.header}>
        <div className={styles.successCircle}>✓</div>
        <h1 className={styles.pageH1}>Order RP-10517 is placed</h1>
        <p className={styles.lede}>
          We've sent a confirmation email to <strong>j.miller@example.com</strong>. Since this is a net-30 account order, no payment was taken today.
        </p>
      </div>

      <div className={styles.receiptCard}>
        <div className={styles.receiptHeader}>
          <div className={styles.receiptCol}>
            <span className={styles.receiptLabel}>Order</span>
            <span className={styles.receiptValue}>RP-10517</span>
          </div>
          <div className={styles.receiptCol}>
            <span className={styles.receiptLabel}>Placed</span>
            <span className={styles.receiptValue}>Jul 29, 2026</span>
          </div>
          <div className={styles.receiptCol}>
            <span className={styles.receiptLabel}>Arrives</span>
            <span className={styles.receiptValue}>Jul 31, 2026</span>
          </div>
          <div className={styles.receiptCol}>
            <span className={styles.receiptLabel}>Total</span>
            <span className={styles.receiptValue}>$318.24</span>
          </div>
        </div>

        <div className={styles.receiptBody}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={styles.receiptItem}>
              <div className={styles.itemThumb}>
                <Image src="/images/img-8.jpg" alt="Thumb" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className={styles.itemDetails}>
                <h4 className={styles.itemTitle}>Starrett 6" Spring Tempered Steel Rule</h4>
                <p className={styles.itemSpec}>4R Graduation · Steel</p>
              </div>
              <div className={styles.itemPriceCol}>
                <span className={styles.itemPrice}>$30.60</span>
                <span className={styles.itemQty}>Qty: 12</span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.receiptFooter}>
          <div className={styles.footerBlock}>
            <h4 className={styles.footerLabel}>Shipping to</h4>
            <p className={styles.footerValue}>Jonathan Miller</p>
            <p className={styles.footerValue}>1204 Fabrication Way, Suite B</p>
            <p className={styles.footerValue}>Detroit, MI 48201</p>
          </div>
          <div className={styles.footerBlock}>
            <h4 className={styles.footerLabel}>Payment</h4>
            <p className={styles.footerValue}>Invoice — net 30</p>
            <p className={styles.footerNote}>No card was charged — demo store</p>
          </div>
        </div>
      </div>

      <div className={styles.upsellBand}>
        <div className={styles.upsellText}>
          <h3 className={styles.upsellTitle}>Keep this order in your history</h3>
          <p className={styles.upsellBody}>Create a free account to track this shipment, save carts, and speed through checkout next time.</p>
        </div>
        <button className={styles.upsellBtn}>Create account</button>
      </div>

      <div className={styles.actions}>
        <button className={styles.outlinePill}>Track this order</button>
        <Link href="/catalog" className={styles.outlinePill}>Continue shopping</Link>
      </div>

    </main>
  );
}
