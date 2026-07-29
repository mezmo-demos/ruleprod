'use client';

import { useState } from 'react';
import type { Product, Variant } from '@ruleprod/contracts';
import { formatCents } from '@/lib/utils';
import { addToCartAction } from '@/app/actions';
import styles from './ProductPurchasing.module.css';

interface Props {
  product: Product;
}

export default function ProductPurchasing({ product }: Props) {
  const [selectedSku, setSelectedSku] = useState(product.defaultSku);
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const selectedVariant = product.variants.find(v => v.sku === selectedSku) || product.variants[0]!;
  
  // Calculate current unit price based on quantity and tiers
  let unitPrice = selectedVariant.priceCents;
  let activeTierIndex = -1;
  
  selectedVariant.tiers.forEach((tier, index) => {
    if (qty >= tier.minQty) {
      unitPrice = tier.unitPriceCents;
      activeTierIndex = index;
    }
  });

  const lineTotal = unitPrice * qty;
  const baseTotal = selectedVariant.priceCents * qty;
  const savings = baseTotal - lineTotal;

  const handleAddToCart = async () => {
    setIsAdding(true);
    const result = await addToCartAction(selectedSku, qty);
    setIsAdding(false);
    if (result.success) {
      alert('Added to cart!');
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.badgeRow}>
        {product.badge === 'best_seller' && <span className={styles.badgeAccentSoft}>Best seller</span>}
        <span className={styles.badgeSuccess}>{selectedVariant.stock} in stock</span>
      </div>

      <h1 className={styles.productH1}>{product.title}</h1>
      
      <div className={styles.priceRow}>
        <span className={styles.mainPrice}>{formatCents(unitPrice)}</span>
        <span className={styles.priceMeta}>{product.specs.graduation} graduation · SKU {selectedSku}</span>
      </div>
      
      <div className={styles.ratingLine}>
        ★★★★★ <span className={styles.ratingCount}>{product.rating.average} ({product.rating.count})</span>
      </div>

      <p className={styles.lede}>{product.description}</p>

      <div className={styles.sectionDivider} />

      <div className={styles.variants}>
        <h3 className={styles.variantLabel}>Variant</h3>
        <div className={styles.variantGroup}>
          {product.variants.map(v => (
            <button 
              key={v.sku} 
              className={`${styles.variantBtn} ${selectedSku === v.sku ? styles.variantBtnActive : ''} ${v.stock === 0 ? styles.variantBtnDisabled : ''}`}
              onClick={() => setSelectedSku(v.sku)}
              disabled={v.stock === 0}
            >
              {v.label} {selectedSku !== v.sku && `· ${formatCents(v.priceCents)}`}
            </button>
          ))}
        </div>
      </div>

      {selectedVariant.tiers.length > 0 && (
        <div className={styles.ladderCard}>
          <div className={styles.ladderHeader}>
            <span className={styles.ladderTitle}>Buy more, pay less</span>
            <span className={styles.ladderSavings}>Save up to 30%</span>
          </div>
          <div className={styles.ladderGrid}>
            <div className={`${styles.ladderCell} ${activeTierIndex === -1 ? styles.ladderCellActive : ''}`}>
              <span className={`${styles.tierLabel} ${activeTierIndex === -1 ? styles.tierLabelActive : ''}`}>1–{selectedVariant.tiers[0]!.minQty - 1}</span>
              <span className={styles.tierPrice}>{formatCents(selectedVariant.priceCents)}</span>
            </div>
            {selectedVariant.tiers.map((tier, i) => {
              const nextTier = selectedVariant.tiers[i + 1];
              const range = nextTier ? `${tier.minQty}–${nextTier.minQty - 1}` : `${tier.minQty}+`;
              const isActive = activeTierIndex === i;
              return (
                <div key={tier.minQty} className={`${styles.ladderCell} ${isActive ? styles.ladderCellActive : ''}`}>
                  <span className={`${styles.tierLabel} ${isActive ? styles.tierLabelActive : ''}`}>{range}</span>
                  <span className={styles.tierPrice}>{formatCents(tier.unitPriceCents)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.addToCartRow}>
        <div className={styles.stepper}>
          <button className={styles.stepperBtn} onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <span className={styles.stepperValue}>{qty}</span>
          <button className={styles.stepperBtn} onClick={() => setQty(qty + 1)}>+</button>
        </div>
        <button className={styles.ctaBtn} onClick={handleAddToCart} disabled={isAdding}>
          {isAdding ? 'Adding...' : `Add to cart · ${formatCents(lineTotal)}`}
        </button>
      </div>
      
      <div className={styles.savingsNote}>
        {savings > 0 ? (
          <span className={styles.savingsSuccess}>✓ Bulk price break applied — you save {formatCents(savings)}</span>
        ) : (
          <span></span>
        )}
        <span className={styles.shippingNote}>Free shipping over $75</span>
      </div>

      <div className={styles.fulfilment}>
        <p>Order within <strong>3 hrs 12 mins</strong> for same-day shipping.</p>
        <p>Purchase orders accepted at checkout for registered businesses.</p>
      </div>
    </div>
  );
}
