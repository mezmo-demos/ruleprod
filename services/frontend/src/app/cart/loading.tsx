import styles from './page.module.css';

export default function CartLoading() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className="page-h1" style={{ color: 'transparent', backgroundColor: '#e9ebf1', borderRadius: '8px', width: '200px' }}>Loading...</h1>
      </div>
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <div className={styles.lineItemsCard} style={{ minHeight: '400px', backgroundColor: '#e9ebf1', border: 'none' }}></div>
        </div>
        <div className={styles.summaryCol}>
          <div className={styles.summaryCard} style={{ minHeight: '350px', backgroundColor: '#e9ebf1', border: 'none' }}></div>
        </div>
      </div>
    </main>
  );
}
