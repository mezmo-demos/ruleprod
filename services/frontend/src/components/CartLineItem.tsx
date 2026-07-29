'use client';

import type { CartLine } from '@ruleprod/contracts';
import Image from 'next/image';
import { formatCents, resolveImage } from '@/lib/utils';
import { updateCartItemAction, removeFromCartAction } from '@/app/actions';
import styles from '@/app/cart/page.module.css';
import { Minus, Plus } from 'lucide-react';

interface Props {
  line: CartLine;
}

export default function CartLineItem({ line }: Props) {
  const handleUpdateQty = async (newQty: number) => {
    if (newQty < 1) return;
    await updateCartItemAction(line.id, newQty);
  };

  const handleRemove = async () => {
    await removeFromCartAction(line.id);
  };

  return (
    <div className={styles.lineItem}>
      <div className={styles.lineThumb}>
        <Image src={resolveImage(line.product.image)} alt={line.product.title} fill style={{ objectFit: 'cover' }} />
      </div>
      <div className={styles.lineDetails}>
        <h3 className={styles.lineTitle}>{line.product.title}</h3>
        <p className={styles.lineSpec}>{line.product.variantLabel} · {line.product.specLine}</p>
        {line.appliedTier && (
          <p className={styles.lineBulkAccent}>Bulk price applied — {formatCents(line.unitPriceCents)} each</p>
        )}
      </div>
      <div className={styles.stepper}>
        <button className={styles.stepperBtn} onClick={() => handleUpdateQty(line.qty - 1)}><Minus size={14} strokeWidth={2} /></button>
        <span className={styles.stepperValue}>{line.qty}</span>
        <button className={styles.stepperBtn} onClick={() => handleUpdateQty(line.qty + 1)}><Plus size={14} strokeWidth={2} /></button>
      </div>
      <div className={styles.linePriceCol}>
        <span className={styles.lineTotal}>{formatCents(line.lineTotalCents)}</span>
        <button className={styles.saveForLaterBtn} onClick={handleRemove}>Remove</button>
      </div>
    </div>
  );
}
