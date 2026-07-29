import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { getCategories, getProducts } from "@/lib/catalog";
import { resolveImage, formatCents } from "@/lib/utils";

export default async function Home() {
  const [catData, prodData] = await Promise.all([
    getCategories(),
    getProducts({ sort: 'popular', per_page: '4' }),
  ]);

  const categories = catData.categories;
  const bestSellers = prodData.products;

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
                <Link href="/catalog" className={styles.btnAccent}>Shop all rulers</Link>
                <button className={styles.btnWhite}>How bulk pricing works</button>
              </div>
              <div className={styles.trustRow}>
                Free shipping over $75 · 60-day returns · Ships same day
              </div>
            </div>
            <div className={styles.heroImage}>
              <Image src="/images/img-1.jpg" alt="Rulers fanned across a pale backdrop" fill style={{ objectFit: 'cover' }} />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.categoryGrid}>
          <Link href="/catalog?category=trades" className={styles.categoryCard}>
            <div className={styles.categoryImage}>
              <Image src="/images/img-2.jpg" alt="For the trades" fill style={{ objectFit: 'cover' }} />
            </div>
            <div className={styles.categoryBody}>
              <h3 className="card-title">For the trades</h3>
              <p className={styles.categorySubtitle}>Framing squares, folding rules, tapes</p>
            </div>
          </Link>
          <Link href="/catalog?category=studio" className={styles.categoryCard}>
            <div className={styles.categoryImage}>
              <Image src="/images/img-3.jpg" alt="For the studio" fill style={{ objectFit: 'cover' }} />
            </div>
            <div className={styles.categoryBody}>
              <h3 className="card-title">For the studio</h3>
              <p className={styles.categorySubtitle}>Scales, triangles, cutting rules</p>
            </div>
          </Link>
          <Link href="/catalog?category=classroom" className={styles.categoryCard}>
            <div className={styles.categoryImage}>
              <Image src="/images/img-4.jpg" alt="For the classroom" fill style={{ objectFit: 'cover' }} />
            </div>
            <div className={styles.categoryBody}>
              <h3 className="card-title">For the classroom</h3>
              <p className={styles.categorySubtitle}>Bulk packs, shatterproof, metric</p>
            </div>
          </Link>
          <Link href="/catalog?category=vintage" className={styles.categoryCard}>
            <div className={styles.categoryImage}>
              <Image src="/images/img-5.jpg" alt="The vintage archive" fill style={{ objectFit: 'cover' }} />
            </div>
            <div className={styles.categoryBody}>
              <h3 className="card-title">The vintage archive</h3>
              <p className={styles.categorySubtitle}>Slide rules, boxwood, brass</p>
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
          {bestSellers.map((prod) => (
            <Link key={prod.slug} href={`/product/${prod.slug}`} className={styles.productCard}>
              <div className={styles.productImage}>
                {prod.badge === 'best_seller' && <span className={styles.productBadge}>Best seller</span>}
                {prod.badge === 'low_stock' && <span className={`${styles.productBadge} ${styles.productBadgeAccent}`}>Low stock</span>}
                <Image src={resolveImage(prod.image)} alt={prod.title} fill style={{ objectFit: 'cover' }} />
              </div>
              <div>
                <h3 className={styles.productTitle}>{prod.title}</h3>
                <p className={styles.productSpec}>{prod.specLine}</p>
                <p className={styles.productPrice}>{formatCents(prod.priceCents)}</p>
              </div>
            </Link>
          ))}
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
               <Image src="/images/img-9.jpg" alt="Slide rule macro" fill style={{ objectFit: 'cover' }} />
            </div>
            <div className={styles.editorialText}>
              <h3 className="card-title">The forgotten art of the slide rule</h3>
              <p className="body-main">Before the pocket calculator, precision engineering relied on the physical manipulation of logarithms. We've sourced a pristine collection of mid-century slide rules.</p>
            </div>
          </div>
          <div className={`${styles.editorialCard} ${styles.editorialSmall}`}>
            <div className={styles.editorialSmallImage}>
               <Image src="/images/img-10.jpg" alt="Workbench lifestyle" fill style={{ objectFit: 'cover' }} />
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
