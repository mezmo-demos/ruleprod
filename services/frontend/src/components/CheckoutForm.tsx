'use client';

import { useState } from 'react';
import type { CheckoutQuote, PlaceOrderRequest, DeliveryMethod, PaymentMethod } from '@ruleprod/contracts';
import { formatCents, resolveImage } from '@/lib/utils';
import { placeOrderAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/app/checkout/page.module.css';

interface Props {
  initialQuote: CheckoutQuote;
}

export default function CheckoutForm({ initialQuote }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsAdding] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryMethod>('standard');
  const [payment, setPayment] = useState<PaymentMethod>('invoice_net30');

  const handlePlaceOrder = async () => {
    setIsAdding(true);
    
    // In a real app, these values would come from form state
    const request: Omit<PlaceOrderRequest, 'cartKey'> = {
      idempotencyKey: crypto.randomUUID(),
      contact: { email: 'j.miller@example.com' },
      shippingAddress: {
        name: 'Jonathan Miller',
        street1: '1204 Fabrication Way, Suite B',
        city: 'Detroit',
        state: 'MI',
        zip: '48201',
        country: 'US',
      },
      delivery,
      payment: { method: payment },
    };

    const result = await placeOrderAction(request);
    setIsAdding(false);
    
    if (result.success && result.data) {
      router.push(`/confirmation?orderId=${result.data.orderId}`);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <div className={styles.layout}>
      {/* Left Column: Forms */}
      <div className={styles.formCol}>
        
        <div className={styles.numberedCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <span className={styles.stepNum}>1</span> Contact
            </h2>
            <Link href="/account" className={styles.signInLink}>Have an account? Sign in</Link>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email</label>
              <input type="email" className={styles.inputField} defaultValue="j.miller@example.com" disabled />
            </div>
          </div>
        </div>

        <div className={styles.numberedCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <span className={styles.stepNum}>2</span> Shipping address
            </h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.grid2Col}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>First name</label>
                <input type="text" className={styles.inputField} defaultValue="Jonathan" disabled />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Last name</label>
                <input type="text" className={styles.inputField} defaultValue="Miller" disabled />
              </div>
              <div className={styles.fieldGroupSpan2}>
                <label className={styles.label}>Street address</label>
                <input type="text" className={styles.inputField} defaultValue="1204 Fabrication Way, Suite B" disabled />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.numberedCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <span className={styles.stepNum}>3</span> Delivery
            </h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.radioGroup}>
              <label 
                className={`${styles.radioCard} ${delivery === 'standard' ? styles.radioCardActive : ''}`}
                onClick={() => setDelivery('standard')}
              >
                <div className={delivery === 'standard' ? styles.radioDotActive : styles.radioDot}></div>
                <div className={styles.radioDetails}>
                  <span className={styles.radioTitle}>Standard Shipping</span>
                  <span className={styles.radioSub}>Arrives in 3-5 business days</span>
                </div>
                <span className={styles.radioPriceAccent}>Free</span>
              </label>
              
              <label 
                className={`${styles.radioCard} ${delivery === 'expedited' ? styles.radioCardActive : ''}`}
                onClick={() => setDelivery('expedited')}
              >
                <div className={delivery === 'expedited' ? styles.radioDotActive : styles.radioDot}></div>
                <div className={styles.radioDetails}>
                  <span className={styles.radioTitle}>Next Day Air</span>
                  <span className={styles.radioSub}>Arrives Tomorrow</span>
                </div>
                <span className={styles.radioPrice}>$18.00</span>
              </label>
            </div>
          </div>
        </div>

        <div className={styles.numberedCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <span className={styles.stepNum}>4</span> Payment
            </h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.radioGroup}>
              <label 
                className={`${styles.radioCard} ${payment === 'invoice_net30' ? styles.radioCardActive : ''}`}
                onClick={() => setPayment('invoice_net30')}
              >
                <div className={payment === 'invoice_net30' ? styles.radioDotActive : styles.radioDot}></div>
                <div className={styles.radioDetails}>
                  <span className={styles.radioTitle}>Invoice — net 30</span>
                  <span className={styles.radioSub}>This is a demonstration store. No card details are requested.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

      </div>

      {/* Right Column: Summary */}
      <div className={styles.summaryCol}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLines}>
            {initialQuote.lines.map((line, i) => (
              <div key={i} className={styles.summaryLine}>
                <div className={styles.summaryLineThumb}>
                  <Image src={resolveImage(line.product.image)} alt="Thumb" fill style={{ objectFit: 'cover' }} />
                </div>
                <div className={styles.summaryLineDetails}>
                  <h4 className={styles.summaryLineTitle}>{line.product.title}</h4>
                  <span className={styles.summaryLineQty}>Qty: {line.qty}</span>
                </div>
                <span className={styles.summaryLinePrice}>{formatCents(line.lineTotalCents)}</span>
              </div>
            ))}
          </div>

          <div className={styles.summaryDivider} />

          <div className={styles.summaryTotals}>
            <div className={styles.summaryTotalRow}>
              <span className={styles.summaryLabel}>Subtotal</span>
              <span className={styles.summaryValue}>{formatCents(initialQuote.subtotalCents)}</span>
            </div>
            {initialQuote.bulkSavingsCents > 0 && (
              <div className={styles.summaryTotalRowAccent}>
                <span className={styles.summaryLabel}>Bulk savings</span>
                <span className={styles.summaryValue}>−{formatCents(initialQuote.bulkSavingsCents)}</span>
              </div>
            )}
            <div className={styles.summaryTotalRow}>
              <span className={styles.summaryLabel}>Shipping</span>
              <span className={styles.summaryValue}>{initialQuote.shippingCents === 0 ? 'Free' : formatCents(initialQuote.shippingCents)}</span>
            </div>
          </div>

          <div className={styles.summaryDivider} />

          <div className={styles.finalTotalRow}>
            <span className={styles.finalTotalLabel}>Total</span>
            <span className={styles.finalTotalValue}>{formatCents(initialQuote.totalCents)}</span>
          </div>

          <button className={styles.placeOrderBtn} onClick={handlePlaceOrder} disabled={isSubmitting}>
            {isSubmitting ? 'Placing order...' : 'Place order'}
          </button>
          
          <p className={styles.summaryDisclaimer}>
            By placing your order, you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
