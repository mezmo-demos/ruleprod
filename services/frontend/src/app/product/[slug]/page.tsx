import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";

export default function ProductPage({ params }: { params: { slug: string } }) {
  return (
    <main className={styles.main}>
      <div className={styles.productLayout}>
        {/* Left Column: Media & Details */}
        <div className={styles.leftCol}>
          <div className={styles.primaryImage}>
            <Image src="/images/img-13.jpg" alt="Hero product shot, soft daylight" fill style={{ objectFit: 'cover' }} />
          </div>
          <div className={styles.thumbnailStrip}>
            <button className={`${styles.thumbnail} ${styles.thumbnailActive}`}>
              <Image src="/images/img-14.jpg" alt="Thumb" fill style={{ objectFit: 'cover' }} />
            </button>
            <button className={styles.thumbnail}>
              <Image src="/images/img-15.jpg" alt="Angle" fill style={{ objectFit: 'cover' }} />
            </button>
            <button className={styles.thumbnail}>
              <Image src="/images/img-16.jpg" alt="Macro" fill style={{ objectFit: 'cover' }} />
            </button>
            <button className={styles.thumbnail}>
              <Image src="/images/img-17.jpg" alt="In-hand" fill style={{ objectFit: 'cover' }} />
            </button>
            <button className={styles.thumbnail}>
              <Image src="/images/img-1.jpg" alt="Package" fill style={{ objectFit: 'cover' }} />
            </button>
          </div>
          
          <div className={styles.cardsRow}>
            <div className={styles.detailCard}>
              <h2 className="card-title">Specification</h2>
              <div className={styles.specList}>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Material</span>
                  <span className={styles.specValue}>Spring Tempered Steel</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Finish</span>
                  <span className={styles.specValue}>Satin Chrome</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Thickness</span>
                  <span className={styles.specValue}>3/64" (1.2mm)</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Graduation</span>
                  <span className={styles.specValue}>4R</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Tolerance</span>
                  <span className={styles.specValue}>±0.002"</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Made in</span>
                  <span className={styles.specValue}>USA</span>
                </div>
              </div>
            </div>

            <div className={styles.detailCard}>
              <div className={styles.reviewHeader}>
                <h2 className="card-title">Reviews</h2>
                <span className={styles.reviewSummary}>4.8 · 214 reviews</span>
              </div>
              <div className={styles.reviewList}>
                <div className={styles.reviewBlock}>
                  <h4 className={styles.reviewTitle}>The standard for a reason.</h4>
                  <p className={styles.reviewBody}>Clear markings, no glare under the shop lights. The edges are crisp enough to strike a line against.</p>
                  <p className={styles.reviewMeta}>J. Miller · verified</p>
                </div>
                <div className={styles.reviewBlock}>
                  <h4 className={styles.reviewTitle}>Perfect weight and flex.</h4>
                  <p className={styles.reviewBody}>Exactly what you expect from Starrett. The satin finish makes it easy to read even with older eyes.</p>
                  <p className={styles.reviewMeta}>A. Rodriguez · verified</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Purchasing */}
        <div className={styles.rightCol}>
          <div className={styles.badgeRow}>
            <span className={styles.badgeAccentSoft}>Best seller</span>
            <span className={styles.badgeSuccess}>412 in stock</span>
          </div>

          <h1 className={styles.productH1}>Starrett Spring Tempered Steel Rule</h1>
          
          <div className={styles.priceRow}>
            <span className={styles.mainPrice}>$34</span>
            <span className={styles.priceMeta}>4R graduation · SKU STARR-6R4</span>
          </div>
          
          <div className={styles.ratingLine}>
            ★★★★★ <span className={styles.ratingCount}>4.8 (214)</span>
          </div>

          <p className={styles.lede}>
            The definitive machinist's rule. Spring-tempered steel yields slightly but returns to perfectly true. Satin chrome finish prevents glare and resists rust.
          </p>

          <div className={styles.sectionDivider} />

          <div className={styles.variants}>
            <h3 className={styles.variantLabel}>Length</h3>
            <div className={styles.variantGroup}>
              <button className={`${styles.variantBtn} ${styles.variantBtnActive}`}>6 in</button>
              <button className={styles.variantBtn}>12 in · $42</button>
              <button className={styles.variantBtn}>18 in · $68</button>
              <button className={`${styles.variantBtn} ${styles.variantBtnDisabled}`}>24 in · Sold out</button>
            </div>
          </div>

          <div className={styles.ladderCard}>
            <div className={styles.ladderHeader}>
              <span className={styles.ladderTitle}>Buy more, pay less</span>
              <span className={styles.ladderSavings}>Save up to 30%</span>
            </div>
            <div className={styles.ladderGrid}>
              <div className={styles.ladderCell}>
                <span className={styles.tierLabel}>1–9</span>
                <span className={styles.tierPrice}>$34.00</span>
              </div>
              <div className={`${styles.ladderCell} ${styles.ladderCellActive}`}>
                <span className={`${styles.tierLabel} ${styles.tierLabelActive}`}>10–24</span>
                <span className={styles.tierPrice}>$30.60</span>
              </div>
              <div className={styles.ladderCell}>
                <span className={styles.tierLabel}>25–99</span>
                <span className={styles.tierPrice}>$27.20</span>
              </div>
              <div className={styles.ladderCell}>
                <span className={styles.tierLabel}>100+</span>
                <span className={styles.tierPrice}>$23.80</span>
              </div>
            </div>
          </div>

          <div className={styles.addToCartRow}>
            <div className={styles.stepper}>
              <button className={styles.stepperBtn}>−</button>
              <span className={styles.stepperValue}>12</span>
              <button className={styles.stepperBtn}>+</button>
            </div>
            <button className={styles.ctaBtn}>
              Add to cart · $367.20
            </button>
          </div>
          <div className={styles.savingsNote}>
            <span className={styles.savingsSuccess}>✓ 10+ price break applied — you save $40.80</span>
            <span className={styles.shippingNote}>Free shipping</span>
          </div>

          <div className={styles.fulfilment}>
            <p>Order within <strong>3 hrs 12 mins</strong> for same-day shipping.</p>
            <p>Purchase orders accepted at checkout for registered businesses.</p>
          </div>
        </div>
      </div>

      {/* Below the fold */}
      <div className={styles.boughtTogether}>
        <h2 className="section-h2">Often bought together</h2>
        <div className={styles.relatedGrid}>
          {[...Array(4)].map((_, i) => (
            <Link key={i} href="#" className={styles.relatedCard}>
              <div className={styles.relatedImage}>
                <Image src="/images/img-2.jpg" alt="Accessory" fill style={{ objectFit: 'cover' }} />
              </div>
              <div className={styles.relatedInfo}>
                <h3 className={styles.relatedTitle}>Starrett Center Gage</h3>
                <p className={styles.relatedPrice}>$24</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
