import styles from './page.module.css';

export default function CatalogLoading() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className="page-h1" style={{ color: 'transparent', backgroundColor: '#e9ebf1', borderRadius: '8px', width: '300px' }}>Loading...</h1>
        </div>
      </div>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.filterRail} style={{ minHeight: '600px', backgroundColor: '#e9ebf1', border: 'none' }}></div>
        </aside>
        <section className={styles.content}>
          <div className={styles.productGrid}>
            {[...Array(12)].map((_, i) => (
              <div key={i} className={styles.productCard}>
                <div className={styles.productImage} style={{ backgroundColor: '#e9ebf1' }}></div>
                <div className={styles.productInfo}>
                  <div style={{ height: '20px', backgroundColor: '#e9ebf1', borderRadius: '4px', width: '80%', marginBottom: '8px' }}></div>
                  <div style={{ height: '16px', backgroundColor: '#e9ebf1', borderRadius: '4px', width: '60%', marginBottom: '8px' }}></div>
                  <div style={{ height: '24px', backgroundColor: '#e9ebf1', borderRadius: '4px', width: '40%' }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
