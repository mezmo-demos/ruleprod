import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import { getProduct, getRelatedProducts } from "@/lib/catalog";
import { resolveImage, formatCents } from "@/lib/utils";
import ProductPurchasing from "@/components/ProductPurchasing";
import { notFound } from "next/navigation";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  let product;
  let related;
  try {
    [product, related] = await Promise.all([
      getProduct(slug),
      getRelatedProducts(slug),
    ]);
  } catch (e) {
    console.error(e);
    notFound();
  }

  return (
    <main className={styles.main}>
      <div className={styles.productLayout}>
        {/* Left Column: Media & Details */}
        <div className={styles.leftCol}>
          <div className={styles.primaryImage}>
            <Image src={resolveImage(product.images[0])} alt={product.title} fill style={{ objectFit: 'cover' }} />
          </div>
          <div className={styles.thumbnailStrip}>
            {product.images.map((img, i) => (
              <button key={i} className={`${styles.thumbnail} ${i === 0 ? styles.thumbnailActive : ''}`}>
                <Image src={resolveImage(img)} alt={`Thumbnail ${i + 1}`} fill style={{ objectFit: 'cover' }} />
              </button>
            ))}
          </div>
          
          <div className={styles.cardsRow}>
            <div className={styles.detailCard}>
              <h2 className="card-title">Specification</h2>
              <div className={styles.specList}>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Material</span>
                  <span className={styles.specValue}>{product.specs.material}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Finish</span>
                  <span className={styles.specValue}>{product.specs.finish}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Thickness</span>
                  <span className={styles.specValue}>{product.specs.thickness}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Graduation</span>
                  <span className={styles.specValue}>{product.specs.graduation}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Tolerance</span>
                  <span className={styles.specValue}>{product.specs.tolerance}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Made in</span>
                  <span className={styles.specValue}>{product.specs.madeIn}</span>
                </div>
              </div>
            </div>

            <div className={styles.detailCard}>
              <div className={styles.reviewHeader}>
                <h2 className="card-title">Reviews</h2>
                <span className={styles.reviewSummary}>{product.rating.average} · {product.rating.count} reviews</span>
              </div>
              <div className={styles.reviewList}>
                {product.reviews.map((review, i) => (
                  <div key={i} className={styles.reviewBlock}>
                    <h4 className={styles.reviewTitle}>{review.headline}</h4>
                    <p className={styles.reviewBody}>{review.body}</p>
                    <p className={styles.reviewMeta}>{review.author} · {review.verified ? 'verified' : ''}</p>
                  </div>
                ))}
                {product.reviews.length === 0 && <p className={styles.reviewMeta}>No reviews yet.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Purchasing (Client Component) */}
        <div className={styles.rightCol}>
          <ProductPurchasing product={product} />
        </div>
      </div>

      {/* Below the fold */}
      <div className={styles.boughtTogether}>
        <h2 className="section-h2">Often bought together</h2>
        <div className={styles.relatedGrid}>
          {related.products.map((prod) => (
            <Link key={prod.slug} href={`/product/${prod.slug}`} className={styles.relatedCard}>
              <div className={styles.relatedImage}>
                <Image src={resolveImage(prod.image)} alt={prod.title} fill style={{ objectFit: 'cover' }} />
              </div>
              <div className={styles.relatedInfo}>
                <h3 className={styles.relatedTitle}>{prod.title}</h3>
                <p className={styles.relatedPrice}>{formatCents(prod.priceCents)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
