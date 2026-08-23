import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import type { Product } from '@ruleprod/contracts';
import styles from './page.module.css';
import { getProduct } from '@/lib/catalog';
import { getBackPaddockBuzz } from '@/lib/cart';
import { resolveImage, formatCents } from '@/lib/utils';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'The back paddock — Rule Prod',
  description: 'An unlisted corner of the store. If you know, you know.',
  robots: { index: false, follow: false },
};

export default async function RuralProdPage() {
  let stickers: Product;
  let prod: Product;
  try {
    [stickers, prod] = await Promise.all([
      getProduct('rural-prod-sticker-pack'),
      getProduct('cattle-prod-36'),
    ]);
  } catch (e) {
    console.error(e);
    notFound();
  }

  let buzz: { grabs: number; sessions: number } | null = null;
  try {
    buzz = await getBackPaddockBuzz();
  } catch (e) {
    console.error(e);
  }

  return (
    <main className={styles.main}>
      <section className={styles.banner}>
        <span className={styles.eyebrow}>Unlisted · not on the shelves</span>
        <h1 className="hero-h1">Welcome to the back paddock</h1>
        <p className="body-large">
          Two items we sell but never mention. No links, no category, no search results — you either
          heard about this page from someone you trust, or you are the kind of person who types
          hashtags into address bars. Either way, you belong here.
        </p>
        {buzz && buzz.grabs > 0 && (
          <p className={styles.hashtags}>
            {buzz.grabs} grabbed the drop · {buzz.sessions} in on the secret
          </p>
        )}
        <p className={styles.hashtags}>#rural-prod · #cattle-not-pets</p>
      </section>

      <section className={styles.grid}>
        <Link href={`/product/${stickers.slug}`} className={styles.card}>
          <div className={styles.mediaSplit}>
            <div className={styles.mediaHalf}>
              <Image
                src={resolveImage(stickers.images[0])}
                alt="#rural-prod barn crest sticker"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div className={styles.mediaHalf}>
              <Image
                src={resolveImage(stickers.images[1])}
                alt="#rural-prod Support Local badge sticker"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
          <div className={styles.cardBody}>
            <h2 className={styles.cardTitle}>{stickers.title}</h2>
            <p className={styles.cardSpec}>{stickers.specLine}</p>
            <p className={styles.cardCopy}>{stickers.description}</p>
            <div className={styles.priceRow}>
              <span className={styles.price}>{formatCents(stickers.priceCents)}</span>
              {stickers.bulk && (
                <span className={styles.bulkChip}>
                  {stickers.bulk.minQty}+ · {formatCents(stickers.bulk.unitPriceCents)} each
                </span>
              )}
            </div>
            <span className={styles.cta}>See the pack →</span>
          </div>
        </Link>

        <Link href={`/product/${prod.slug}`} className={styles.card}>
          <div className={styles.media}>
            <Image
              src={resolveImage(prod.images[0])}
              alt="Rule Prod cattle prod on a workbench"
              fill
              style={{ objectFit: 'cover' }}
            />
          </div>
          <div className={styles.cardBody}>
            <h2 className={styles.cardTitle}>{prod.title}</h2>
            <p className={styles.cardSpec}>{prod.specLine}</p>
            <p className={styles.cardCopy}>{prod.description}</p>
            <div className={styles.priceRow}>
              <span className={styles.price}>{formatCents(prod.priceCents)}</span>
              {prod.bulk && (
                <span className={styles.bulkChip}>
                  {prod.bulk.minQty}+ · {formatCents(prod.bulk.unitPriceCents)} each
                </span>
              )}
            </div>
            <span className={styles.cta}>See the prod →</span>
          </div>
        </Link>
      </section>

      <p className={styles.footnote}>Tell a friend. Quietly. Preferably one with a barn.</p>
    </main>
  );
}
