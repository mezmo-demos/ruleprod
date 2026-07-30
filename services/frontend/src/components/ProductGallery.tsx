'use client';

import { useState } from 'react';
import Image from 'next/image';
import { resolveImage } from '@/lib/utils';
import styles from '@/app/product/[slug]/page.module.css';

interface Props {
  images: readonly string[];
  title: string;
}

/** The thumbnail strip actually swaps the main image now. */
export default function ProductGallery({ images, title }: Props) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <>
      <div className={styles.primaryImage}>
        <Image src={resolveImage(current)} alt={title} fill style={{ objectFit: 'cover' }} priority />
      </div>
      {images.length > 1 && (
        <div className={styles.thumbnailStrip}>
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              className={`${styles.thumbnail} ${i === active ? styles.thumbnailActive : ''}`}
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-pressed={i === active}
            >
              <Image
                src={resolveImage(img)}
                alt=""
                fill
                style={{ objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
