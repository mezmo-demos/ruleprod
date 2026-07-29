import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";

export default function Catalog() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link href="/">Home</Link> <span className={styles.breadcrumbSeparator}>/</span> <span className={styles.breadcrumbActive}>Straight edges</span>
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h1 className="page-h1">Straight edges</h1>
            <span className={styles.resultCount}>312 products · 148 with bulk pricing</span>
          </div>
          <div className={styles.controls}>
            <button className={styles.controlPill}>Sort: Popular ▾</button>
            <button className={styles.controlPill}>View: Grid ▾</button>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.filterRail}>
            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Material</h3>
              <label className={styles.checkboxRow}>
                <input type="checkbox" className={styles.checkbox} defaultChecked />
                <span>Stainless steel</span>
                <span className={styles.filterCount}>142</span>
              </label>
              <label className={styles.checkboxRow}>
                <input type="checkbox" className={styles.checkbox} />
                <span>Spring tempered</span>
                <span className={styles.filterCount}>84</span>
              </label>
              <label className={styles.checkboxRow}>
                <input type="checkbox" className={styles.checkbox} />
                <span>Aluminum</span>
                <span className={styles.filterCount}>61</span>
              </label>
              <label className={styles.checkboxRow}>
                <input type="checkbox" className={styles.checkbox} />
                <span>Boxwood</span>
                <span className={styles.filterCount}>25</span>
              </label>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Length</h3>
              <div className={styles.pillGroup}>
                <button className={styles.filterPill}>6"</button>
                <button className={`${styles.filterPill} ${styles.filterPillActive}`}>12"</button>
                <button className={styles.filterPill}>18"</button>
                <button className={styles.filterPill}>24"</button>
                <button className={styles.filterPill}>36"</button>
                <button className={styles.filterPill}>48"</button>
              </div>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Graduation</h3>
              <label className={styles.checkboxRow}>
                <input type="checkbox" className={styles.checkbox} />
                <span>4R (8ths, 16ths, 32nds, 64ths)</span>
              </label>
              <label className={styles.checkboxRow}>
                <input type="checkbox" className={styles.checkbox} defaultChecked />
                <span>5R (32nds, 64ths, 10ths, 100ths)</span>
              </label>
              <label className={styles.checkboxRow}>
                <input type="checkbox" className={styles.checkbox} />
                <span>Metric (mm, 0.5mm)</span>
              </label>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Price</h3>
              <div className={styles.priceSlider}>
                <div className={styles.sliderTrack}>
                  <div className={styles.sliderFill}></div>
                  <div className={styles.sliderThumbLeft}></div>
                  <div className={styles.sliderThumbRight}></div>
                </div>
              </div>
            </div>

            <div className={styles.filterSection}>
              <label className={styles.checkboxRow}>
                <input type="checkbox" className={styles.checkbox} />
                <span>In stock only</span>
              </label>
              <label className={styles.checkboxRow}>
                <input type="checkbox" className={styles.checkbox} />
                <span>Bulk pricing available</span>
              </label>
            </div>
          </div>
        </aside>

        <section className={styles.content}>
          <div className={styles.activeFilters}>
            <span className={styles.activeFiltersLabel}>Filters:</span>
            <button className={styles.activeFilterChip}>Stainless steel ✕</button>
            <button className={styles.activeFilterChip}>12" ✕</button>
            <button className={styles.activeFilterChip}>5R ✕</button>
            <button className={styles.clearFilters}>Clear all</button>
          </div>

          <div className={styles.productGrid}>
            {/* Repeated Product Card */}
            {[...Array(12)].map((_, i) => (
              <Link key={i} href="/product/starrett-6r" className={styles.productCard}>
                <div className={styles.productImage}>
                  {i === 0 && <span className={styles.productBadge}>Best seller</span>}
                  {i === 3 && <span className={`${styles.productBadge} ${styles.productBadgeAccent}`}>1 of 3 left</span>}
                  <Image src="/images/img-12.jpg" alt="Product" fill style={{ objectFit: 'cover' }} />
                </div>
                <div className={styles.productInfo}>
                  <h3 className={styles.productTitle}>Starrett 12" Steel Rule</h3>
                  <p className={styles.productSpec}>5R Graduation · SKU S12-5R</p>
                  <div className={styles.priceRow}>
                    <span className={styles.productPrice}>$34</span>
                    {i % 4 !== 0 ? (
                      <span className={styles.bulkPrice}>10+ · $30.60</span>
                    ) : (
                      <span className={styles.noBulk}>no bulk</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className={styles.pagination}>
            <button className={`${styles.pageCell} ${styles.pageCellActive}`}>1</button>
            <button className={styles.pageCell}>2</button>
            <button className={styles.pageCell}>3</button>
            <button className={styles.pageCell}>4</button>
            <span className={styles.pageEllipsis}>...</span>
            <button className={styles.pageCell}>12</button>
            <button className={styles.pageNext}>Next →</button>
          </div>
        </section>
      </div>
    </main>
  );
}
