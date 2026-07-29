import Link from "next/link";
import styles from "./page.module.css";

export default function CheckoutPage() {
  return (
    <main className={styles.main}>
      <h1 className="page-h1" style={{ marginBottom: "40px" }}>Checkout</h1>
      <div className={styles.layout}>
        
        {/* Left Column: Forms */}
        <div className={styles.formCol}>
          
          <div className={styles.numberedCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <span className={styles.stepNum}>1</span> Contact
              </h2>
              <Link href="/account" className={styles.signInLink}>Have an account? Sign in</Link>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Email</label>
                <input type="email" className={styles.inputField} defaultValue="j.miller@example.com" />
              </div>
              <label className={styles.checkboxRow}>
                <input type="checkbox" className={styles.checkbox} defaultChecked />
                <span>Create an account after checkout to keep order history and saved carts</span>
              </label>
            </div>
          </div>

          <div className={styles.numberedCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <span className={styles.stepNum}>2</span> Shipping address
              </h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.grid2Col}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>First name</label>
                  <input type="text" className={styles.inputField} defaultValue="Jonathan" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Last name</label>
                  <input type="text" className={styles.inputField} defaultValue="Miller" />
                </div>
                <div className={styles.fieldGroupSpan2}>
                  <label className={styles.label}>Street address</label>
                  <input type="text" className={styles.inputField} defaultValue="1204 Fabrication Way, Suite B" />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>City</label>
                  <input type="text" className={styles.inputField} defaultValue="Detroit" />
                </div>
                <div className={styles.grid2ColNested}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>State</label>
                    <input type="text" className={styles.inputField} defaultValue="MI" />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>ZIP code</label>
                    <input type="text" className={styles.inputField} defaultValue="48201" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.numberedCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <span className={styles.stepNum}>3</span> Delivery
              </h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.radioGroup}>
                <label className={`${styles.radioCard} ${styles.radioCardActive}`}>
                  <div className={styles.radioDotActive}></div>
                  <div className={styles.radioDetails}>
                    <span className={styles.radioTitle}>Standard Shipping</span>
                    <span className={styles.radioSub}>Arrives Wed, Jul 19 – Fri, Jul 21</span>
                  </div>
                  <span className={styles.radioPriceAccent}>Free</span>
                </label>
                
                <label className={styles.radioCard}>
                  <div className={styles.radioDot}></div>
                  <div className={styles.radioDetails}>
                    <span className={styles.radioTitle}>Next Day Air</span>
                    <span className={styles.radioSub}>Arrives Tomorrow, Jul 15</span>
                  </div>
                  <span className={styles.radioPrice}>$18.00</span>
                </label>
              </div>
            </div>
          </div>

          <div className={styles.numberedCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <span className={styles.stepNum}>4</span> Payment
              </h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.radioGroup}>
                <label className={`${styles.radioCard} ${styles.radioCardActive}`}>
                  <div className={styles.radioDotActive}></div>
                  <div className={styles.radioDetails}>
                    <span className={styles.radioTitle}>Invoice — net 30</span>
                    <span className={styles.radioSub}>This is a demonstration store. No card details are requested, transmitted, or stored at any point in this flow.</span>
                  </div>
                </label>
                
                <label className={`${styles.radioCard} ${styles.radioCardDisabled}`}>
                  <div className={styles.radioDot}></div>
                  <div className={styles.radioDetails}>
                    <span className={styles.radioTitle}>Pay against a purchase order</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Summary */}
        <div className={styles.summaryCol}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLines}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className={styles.summaryLine}>
                  <div className={styles.summaryLineThumb}>
                     <span className={styles.imagePlaceholder}>[Thumb]</span>
                  </div>
                  <div className={styles.summaryLineDetails}>
                    <h4 className={styles.summaryLineTitle}>Starrett 6" Spring Tempered...</h4>
                    <span className={styles.summaryLineQty}>Qty: 12</span>
                  </div>
                  <span className={styles.summaryLinePrice}>$367.20</span>
                </div>
              ))}
            </div>

            <div className={styles.summaryDivider} />

            <div className={styles.promoForm}>
              <div className={styles.promoInputRow}>
                <input type="text" className={styles.promoInput} defaultValue="SUMMER15" />
                <button className={styles.promoBtn}>Apply</button>
              </div>
              <div className={styles.promoSuccess}>
                ✓ SUMMER15 applied — 15% off your order
              </div>
            </div>

            <div className={styles.summaryTotals}>
              <div className={styles.summaryTotalRow}>
                <span className={styles.summaryLabel}>Subtotal</span>
                <span className={styles.summaryValue}>$415.20</span>
              </div>
              <div className={styles.summaryTotalRowAccent}>
                <span className={styles.summaryLabel}>Bulk savings</span>
                <span className={styles.summaryValue}>−$40.80</span>
              </div>
              <div className={styles.summaryTotalRowAccent}>
                <span className={styles.summaryLabel}>Promo (SUMMER15)</span>
                <span className={styles.summaryValue}>−$56.16</span>
              </div>
              <div className={styles.summaryTotalRow}>
                <span className={styles.summaryLabel}>Shipping</span>
                <span className={styles.summaryValue}>Free</span>
              </div>
              <div className={styles.summaryTotalRow}>
                <span className={styles.summaryLabel}>Tax</span>
                <span className={styles.summaryValue}>$0.00</span>
              </div>
            </div>

            <div className={styles.summaryDivider} />

            <div className={styles.finalTotalRow}>
              <span className={styles.finalTotalLabel}>Total</span>
              <span className={styles.finalTotalValue}>$318.24</span>
            </div>

            <Link href="/confirmation" className={styles.placeOrderBtn}>
              Place order
            </Link>
            
            <p className={styles.summaryDisclaimer}>
              By placing your order, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
