'use client';

import type { CartLine } from '@ruleprod/contracts';
import Image from 'next/image';
import { formatCents, resolveImage } from '@/lib/utils';
import { useState } from 'react';
import { updateCartItemAction, removeFromCartAction, saveForLaterAction } from '@/app/actions';
import styles from '@/app/cart/page.module.css';
import { Minus, Plus } from 'lucide-react';

interface Props {
  line: CartLine;
}

export default function CartLineItem({ line }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    setBusy(true);
    setError(null);
    const result = await action();
    if (!result.success) {
      setError(result.error ?? 'That did not work. Please try again.');
    }
    setBusy(false);
  };

  const handleUpdateQty = async (newQty: number) => {
    if (newQty < 1) return;
    await run(() => updateCartItemAction(line.id, newQty));
  };

  const handleRemove = () => run(() => removeFromCartAction(line.id));
  const handleSaveForLater = () => run(() => saveForLaterAction(line.id));

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
        <button className={styles.stepperBtn} onClick={() => handleUpdateQty(line.qty - 1)} disabled={busy} aria-label="Decrease quantity"><Minus size={14} strokeWidth={2} /></button>
        <span className={styles.stepperValue}>{line.qty}</span>
        <button className={styles.stepperBtn} onClick={() => handleUpdateQty(line.qty + 1)} disabled={busy} aria-label="Increase quantity"><Plus size={14} strokeWidth={2} /></button>
      </div>
      <div className={styles.linePriceCol}>
        <span className={styles.lineTotal}>{formatCents(line.lineTotalCents)}</span>
        <div className={styles.lineActions}>
          <button className={styles.saveForLaterBtn} onClick={handleSaveForLater} disabled={busy}>Save for later</button>
          <button className={styles.saveForLaterBtn} onClick={handleRemove} disabled={busy}>Remove</button>
        </div>
        {error && <p className={styles.lineError} role="alert">{error}</p>}
      </div>
    </div>
  );
}
