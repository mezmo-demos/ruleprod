import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <span className={styles.badge}>New — the vintage archive</span>
              <h1 className="hero-h1">Measure twice.<br />Buy once.</h1>
              <p className="body-large">The world&apos;s finest collection of precision rules, from machinist steel to vintage boxwood.</p>
              <div className={styles.heroButtons}>
                <button className={styles.btnAccent}>Shop all rulers</button>
                <button className={styles.btnWhite}>How bulk pricing works</button>
              </div>
              <div className={styles.trustRow}>
                Free shipping over $75 · 60-day returns · Ships same day
              </div>
            </div>
            <div className={styles.heroImage}>
              {/* Image placeholder */}
              <div className={styles.imagePlaceholder}>
                [Rulers fanned across a pale backdrop]
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.categoryGrid}>
          {/* Category Cards */}
          <Link href="/catalog?category=trades" className={styles.categoryCard}>
            <div className={styles.categoryImage}>
              <span className={styles.imagePlaceholder}>[Trades group]</span>
            </div>
            <div className={styles.categoryBody}>
              <h3 className="card-title">Trades</h3>
              <p className={styles.categorySubtitle}>Machinist and carpentry</p>
            </div>
          </Link>
          <Link href="/catalog?category=studio" className={styles.categoryCard}>
            <div className={styles.categoryImage}>
              <span className={styles.imagePlaceholder}>[Studio group]</span>
            </div>
            <div className={styles.categoryBody}>
              <h3 className="card-title">Studio</h3>
              <p className={styles.categorySubtitle}>Drafting and architecture</p>
            </div>
          </Link>
          <Link href="/catalog?category=classroom" className={styles.categoryCard}>
            <div className={styles.categoryImage}>
              <span className={styles.imagePlaceholder}>[Classroom group]</span>
            </div>
            <div className={styles.categoryBody}>
              <h3 className="card-title">Classroom</h3>
              <p className={styles.categorySubtitle}>Plastic and shatterproof</p>
            </div>
          </Link>
          <Link href="/catalog?category=vintage" className={styles.categoryCard}>
            <div className={styles.categoryImage}>
              <span className={styles.imagePlaceholder}>[Vintage archive group]</span>
            </div>
            <div className={styles.categoryBody}>
              <h3 className="card-title">Vintage archive</h3>
              <p className={styles.categorySubtitle}>Curated antique pieces</p>
            </div>
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className="section-h2">Best sellers</h2>
          <Link href="/catalog?sort=popular" className={styles.sectionHeaderLink}>See everything →</Link>
        </div>
        <div className={styles.productGrid}>
          {/* Best Sellers Cards */}
          <Link href="/product/starrett-6r" className={styles.productCard}>
            <div className={styles.productImage}>
              <span className={styles.productBadge}>Best seller</span>
              <span className={styles.imagePlaceholder}>[Starrett 6R cutout]</span>
            </div>
            <div>
              <h3 className={styles.productTitle}>Starrett 6" Spring Tempered</h3>
              <p className={styles.productSpec}>4R Graduation · Steel</p>
              <p className={styles.productPrice}>$34</p>
            </div>
          </Link>
          <Link href="/product/alvin-architect" className={styles.productCard}>
            <div className={styles.productImage}>
              <span className={styles.imagePlaceholder}>[Alvin scale cutout]</span>
            </div>
            <div>
              <h3 className={styles.productTitle}>Alvin 12" Architect Scale</h3>
              <p className={styles.productSpec}>Triangular · Aluminum</p>
              <p className={styles.productPrice}>$18</p>
            </div>
          </Link>
          <Link href="/product/shinwa-machinist" className={styles.productCard}>
            <div className={styles.productImage}>
              <span className={styles.imagePlaceholder}>[Shinwa cutout]</span>
            </div>
            <div>
              <h3 className={styles.productTitle}>Shinwa 150mm Rigid Rule</h3>
              <p className={styles.productSpec}>Metric/Imperial · Stainless</p>
              <p className={styles.productPrice}>$12</p>
            </div>
          </Link>
          <Link href="/product/vintage-boxwood" className={styles.productCard}>
            <div className={styles.productImage}>
              <span className={`${styles.productBadge} ${styles.productBadgeAccent}`}>1 of 3 left</span>
              <span className={styles.imagePlaceholder}>[Boxwood folder cutout]</span>
            </div>
            <div>
              <h3 className={styles.productTitle}>Rabone 24" Folding Rule</h3>
              <p className={styles.productSpec}>4-fold · Boxwood & Brass</p>
              <p className={styles.productPrice}>$145</p>
            </div>
          </Link>
        </div>
      </section>

      <div className={styles.bulkBand}>
        <div className={styles.bulkBandLeft}>
          <span className={styles.bulkBandEyebrow}>Wholesale</span>
          <h2 className={styles.bulkBandTitle}>Buy ten, pay less. Automatically.</h2>
          <p className={styles.bulkBandBody}>Our price-break ladder applies in the cart. No account required.</p>
        </div>
        <button className={styles.btnDarkPill}>See how it works</button>
      </div>

      <section className={styles.section}>
        <h2 className="section-h2">From the archive</h2>
        <div className={styles.editorialGrid}>
          <div className={`${styles.editorialCard} ${styles.editorialLarge}`}>
            <div className={styles.editorialImage}>
               <span className={styles.imagePlaceholder}>[Slide rule macro]</span>
            </div>
            <div className={styles.editorialText}>
              <h3 className="card-title">The forgotten art of the slide rule</h3>
              <p className="body-main">Before the pocket calculator, precision engineering relied on the physical manipulation of logarithms. We've sourced a pristine collection of mid-century slide rules.</p>
            </div>
          </div>
          <div className={`${styles.editorialCard} ${styles.editorialSmall}`}>
            <div className={styles.editorialSmallImage}>
               <span className={styles.imagePlaceholder}>[Workbench lifestyle]</span>
            </div>
            <div className={styles.editorialText}>
              <h3 className="card-title">Equipping the modern shop</h3>
              <p className="body-main">Why we still recommend Starrett for every apprentice.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
