import styles from './page.module.css';

export default function ProductLoading() {
  return (
    <main className={styles.main}>
      <div className={styles.productLayout}>
        <div className={styles.leftCol}>
          <div className={styles.primaryImage} style={{ backgroundColor: '#e9ebf1' }}></div>
          <div className={styles.thumbnailStrip}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={styles.thumbnail} style={{ backgroundColor: '#e9ebf1', border: 'none' }}></div>
            ))}
          </div>
          <div className={styles.cardsRow}>
            <div className={styles.detailCard} style={{ minHeight: '300px', backgroundColor: '#e9ebf1' }}></div>
            <div className={styles.detailCard} style={{ minHeight: '300px', backgroundColor: '#e9ebf1' }}></div>
          </div>
        </div>
        <div className={styles.rightCol}>
          <div style={{ width: '80%', height: '48px', backgroundColor: '#e9ebf1', borderRadius: '8px', marginBottom: '24px' }}></div>
          <div style={{ width: '40%', height: '32px', backgroundColor: '#e9ebf1', borderRadius: '8px', marginBottom: '24px' }}></div>
          <div style={{ width: '100%', height: '120px', backgroundColor: '#e9ebf1', borderRadius: '8px', marginBottom: '32px' }}></div>
          <div style={{ width: '100%', height: '200px', backgroundColor: '#e9ebf1', borderRadius: '18px', marginBottom: '32px' }}></div>
        </div>
      </div>
    </main>
  );
}
