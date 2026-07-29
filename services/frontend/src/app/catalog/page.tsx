import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { getProducts, getCategories } from "@/lib/catalog";
import { resolveImage, formatCents } from "@/lib/utils";

// Next.js 15+ searchParams is a Promise
export default async function Catalog({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const params = await searchParams;
  
  // Fetch products and categories in parallel
  const [data, catData] = await Promise.all([
    getProducts(params),
    getCategories()
  ]);

  const { products, facets, total, page, perPage } = data;
  
  // Determine page title
  const categorySlug = params.category as string | undefined;
  const currentCategory = categorySlug 
    ? catData.categories.find(c => c.slug === categorySlug) 
    : null;
  const pageTitle = currentCategory ? currentCategory.name : "All rulers";

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link href="/">Home</Link> <span className={styles.breadcrumbSeparator}>/</span> <span className={styles.breadcrumbActive}>{pageTitle}</span>
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h1 className="page-h1">{pageTitle}</h1>
            <span className={styles.resultCount}>{total} products</span>
          </div>
          <div className={styles.controls}>
            <button className={styles.controlPill}>Sort: {params.sort || 'Popular'} ▾</button>
            <button className={styles.controlPill}>View: Grid ▾</button>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <form method="GET" action="/catalog" className={styles.filterRail}>
            {/* Preserve category search param if present */}
            {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
            
            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Material</h3>
              {facets.materials.map(mat => {
                const isActive = Array.isArray(params.material) 
                  ? params.material.includes(mat.value) 
                  : params.material === mat.value;
                return (
                  <label key={mat.value} className={styles.checkboxRow}>
                    <input type="checkbox" name="material" value={mat.value} className={styles.checkbox} defaultChecked={isActive} />
                    <span>{mat.value}</span>
                    <span className={styles.filterCount}>{mat.count}</span>
                  </label>
                );
              })}
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Graduation</h3>
              {facets.graduations.map(grad => {
                const isActive = Array.isArray(params.graduation) 
                  ? params.graduation.includes(grad.value) 
                  : params.graduation === grad.value;
                return (
                  <label key={grad.value} className={styles.checkboxRow}>
                    <input type="checkbox" name="graduation" value={grad.value} className={styles.checkbox} defaultChecked={isActive} />
                    <span>{grad.value}</span>
                    <span className={styles.filterCount}>{grad.count}</span>
                  </label>
                );
              })}
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Length</h3>
              <div className={styles.pillGroup}>
                {facets.lengths.map(len => {
                  const isActive = Array.isArray(params.length) 
                    ? params.length.includes(len.value) 
                    : params.length === len.value;
                  return (
                    <label key={len.value} style={{ cursor: 'pointer' }}>
                      <input type="checkbox" name="length" value={len.value} defaultChecked={isActive} style={{ display: 'none' }} />
                      <div className={`${styles.filterPill} ${isActive ? styles.filterPillActive : ''}`}>
                        {len.value}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className={styles.filterSection}>
              <label className={styles.checkboxRow}>
                <input type="checkbox" name="in_stock" value="true" className={styles.checkbox} defaultChecked={params.in_stock === 'true'} />
                <span>In stock only</span>
              </label>
              <label className={styles.checkboxRow}>
                <input type="checkbox" name="bulk_only" value="true" className={styles.checkbox} defaultChecked={params.bulk_only === 'true'} />
                <span>Bulk pricing available</span>
              </label>
            </div>
            
            {/* Temporary submit button until we wire up client-side auto-submit */}
            <button type="submit" className={styles.controlPill} style={{ marginTop: '16px', width: '100%' }}>Apply Filters</button>
          </form>
        </aside>

        <section className={styles.content}>
          <div className={styles.productGrid}>
            {products.map((prod) => (
              <Link key={prod.slug} href={`/product/${prod.slug}`} className={styles.productCard}>
                <div className={styles.productImage}>
                  {prod.badge === 'best_seller' && <span className={styles.productBadge}>Best seller</span>}
                  {prod.badge === 'low_stock' && <span className={`${styles.productBadge} ${styles.productBadgeAccent}`}>Low stock</span>}
                  <Image src={resolveImage(prod.image)} alt={prod.title} fill style={{ objectFit: 'cover' }} />
                </div>
                <div className={styles.productInfo}>
                  <h3 className={styles.productTitle}>{prod.title}</h3>
                  <p className={styles.productSpec}>{prod.specLine}</p>
                  <div className={styles.priceRow}>
                    <span className={styles.productPrice}>{formatCents(prod.priceCents)}</span>
                    {prod.bulk ? (
                      <span className={styles.bulkPrice}>{prod.bulk.minQty}+ · {formatCents(prod.bulk.unitPriceCents)}</span>
                    ) : (
                      <span className={styles.noBulk}>no bulk</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className={styles.pagination}>
            {/* Simple pagination display based on total/perPage */}
            {Array.from({ length: Math.ceil(total / perPage) }).map((_, i) => (
              <Link key={i} href={`/catalog?page=${i + 1}`} className={`${styles.pageCell} ${page === i + 1 ? styles.pageCellActive : ''}`}>
                {i + 1}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
