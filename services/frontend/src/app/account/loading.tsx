import styles from './page.module.css';

export default function AccountLoading() {
  return (
    <main className={styles.main}>
      <div className={styles.layout}>
        <aside className={styles.sidebarCol}>
          <nav className={styles.sidebar}>
            <div style={{ height: '40px', backgroundColor: '#e9ebf1', borderRadius: '12px', marginBottom: '4px' }}></div>
            <div style={{ height: '40px', backgroundColor: '#e9ebf1', borderRadius: '12px', marginBottom: '4px' }}></div>
            <div style={{ height: '40px', backgroundColor: '#e9ebf1', borderRadius: '12px', marginBottom: '4px' }}></div>
          </nav>
        </aside>
        <div className={styles.contentCol}>
          <div className={styles.header}>
            <div className={styles.headerTitles}>
              <h1 className="page-h1" style={{ color: 'transparent', backgroundColor: '#e9ebf1', borderRadius: '8px', width: '200px' }}>Loading...</h1>
            </div>
          </div>
          <div className={styles.orderList}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={styles.orderCard} style={{ minHeight: '120px', backgroundColor: '#e9ebf1', border: 'none' }}></div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
