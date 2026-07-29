import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.promoBar}>
          Summer clear-out — code <strong>SUMMER15</strong> for 15% off, through 31 August
        </div>
        <nav className={styles.nav}>
          <div className={styles.navContainer}>
            <div className={styles.wordmark}>Rule Prod</div>
            <div className={styles.navLinks}>
              <a href="#">Shop all</a>
              <a href="#">Trades</a>
              <a href="#">Studio</a>
              <a href="#">School</a>
              <a href="#">Textile</a>
              <a href="#">Vintage</a>
            </div>
            <div className={styles.navActions}>
              <div className={styles.search}>
                <input type="text" placeholder="Search 1,240 rulers" />
              </div>
              <button className={styles.btnOutline}>Sign in</button>
              <button className={styles.btnDark}>Cart · 2</button>
            </div>
          </div>
        </nav>
      </header>

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
    </main>
  );
}
