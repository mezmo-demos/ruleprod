import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { getProducts, getCategories } from "@/lib/catalog";
import { resolveImage, formatCents } from "@/lib/utils";
import FilterSidebar from "@/components/FilterSidebar";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";

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
            <button className={styles.controlPill} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              Sort: {params.sort || 'Popular'} <ChevronDown size={14} strokeWidth={2} />
            </button>
            <button className={styles.controlPill} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              View: Grid <ChevronDown size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <FilterSidebar facets={facets} params={params} categorySlug={categorySlug} />
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
