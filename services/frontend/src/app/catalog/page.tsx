import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { getProducts, getCategories } from "@/lib/catalog";
import { resolveImage, formatCents } from "@/lib/utils";
import FilterSidebar from "@/components/FilterSidebar";
import CatalogSort, { parseSort } from "@/components/CatalogSort";
import { ChevronRight, MoreHorizontal } from "lucide-react";

/**
 * A link to another page of the same result set: every active param survives,
 * only `page` is replaced. Building these from scratch is what silently threw
 * away the category and facet filters.
 */
function pageHref(params: Record<string, string | string[]>, page: number): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'page') continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v !== undefined && v !== '') next.append(key, v);
    }
  }
  if (page > 1) next.set('page', String(page));
  const query = next.toString();
  return query ? `/catalog?${query}` : '/catalog';
}

// Next.js 15+ searchParams is a Promise
export default async function Catalog({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const params = await searchParams;
  
  // Fetch products and categories in parallel
  const [data, catData] = await Promise.all([
    getProducts(params),
    getCategories()
  ]);

  const { products, facets, total, page, perPage } = data;
  const pageCount = Math.ceil(total / perPage);

  // Determine page title
  const categorySlug = params.category as string | undefined;
  const currentCategory = categorySlug 
    ? catData.categories.find(c => c.slug === categorySlug) 
    : null;
  const searchTerm = typeof params.q === 'string' ? params.q : undefined;
  const pageTitle = searchTerm
    ? `Results for “${searchTerm}”`
    : currentCategory
      ? currentCategory.name
      : "All rulers";

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
            <CatalogSort value={parseSort(params.sort)} />
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <FilterSidebar facets={facets} params={params} categorySlug={categorySlug} />
        </aside>

        <section className={styles.content}>
          {products.length === 0 && (
            <p className={styles.emptyState}>
              Nothing matched{searchTerm ? ` “${searchTerm}”` : ' those filters'}.{' '}
              <Link href="/catalog">Browse all rulers →</Link>
            </p>
          )}
          <div className={styles.productGrid}>
            {products.map((prod) => (
              <Link key={prod.slug} href={`/product/${prod.slug}`} className={styles.productCard}>
                <div className={styles.productImage}>
                  {/* A live sale outranks the merchandising badge — it is the more
                      useful thing to know at a glance, and they share the corner.
                      Accent, because savings read as accent everywhere in this
                      design (bulk savings, promo, "Save up to 30%"). */}
                  {prod.sale ? (
                    <span className={`${styles.productBadge} ${styles.productBadgeAccent}`}>
                      {Math.round(prod.sale.percentOff)}% off
                    </span>
                  ) : (
                    <>
                      {prod.badge === 'best_seller' && <span className={styles.productBadge}>Best seller</span>}
                      {prod.badge === 'low_stock' && <span className={`${styles.productBadge} ${styles.productBadgeAccent}`}>Low stock</span>}
                    </>
                  )}
                  <Image src={resolveImage(prod.image)} alt={prod.title} fill style={{ objectFit: 'cover' }} />
                </div>
                <div className={styles.productInfo}>
                  <h3 className={styles.productTitle}>{prod.title}</h3>
                  <p className={styles.productSpec}>{prod.specLine}</p>
                  <div className={styles.priceRow}>
                    <span className={styles.productPrice}>
                      {formatCents(prod.priceCents)}
                      {prod.sale && (
                        <s className={styles.wasPrice}>{formatCents(prod.sale.basePriceCents)}</s>
                      )}
                    </span>
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

          {pageCount > 1 && (
            <div className={styles.pagination}>
              {Array.from({ length: pageCount }).map((_, i) => (
                <Link key={i} href={pageHref(params, i + 1)} className={`${styles.pageCell} ${page === i + 1 ? styles.pageCellActive : ''}`}>
                  {i + 1}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
