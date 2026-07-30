'use client';

import { useState } from 'react';
import type { CheckoutQuote, PlaceOrderRequest, DeliveryMethod, PaymentMethod } from '@ruleprod/contracts';
import { formatCents, resolveImage } from '@/lib/utils';
import { placeOrderAction } from '@/app/actions';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/app/checkout/page.module.css';

interface Props {
  initialQuote: CheckoutQuote;
}

export default function CheckoutForm({ initialQuote }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsAdding] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryMethod>('standard');
  const [payment, setPayment] = useState<PaymentMethod>('invoice_net30');

  // Local state for contact and shipping
  const [email, setEmail] = useState('j.miller@example.com');
  const [firstName, setFirstName] = useState('Jonathan');
  const [lastName, setLastName] = useState('Miller');
  const [streetAddress, setStreetAddress] = useState('1204 Fabrication Way, Suite B');
  const [city, setCity] = useState('Detroit');
  const [state, setState] = useState('MI');
  const [zip, setZip] = useState('48201');
  const [promoCode, setPromoCode] = useState(searchParams?.get('promoCode') || '');
  const [error, setError] = useState<string | null>(null);

  const handleApplyPromo = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (promoCode) {
      params.set('promoCode', promoCode);
    } else {
      params.delete('promoCode');
    }
    router.replace(`?${params.toString()}`);
  };

  const isFormValid = [email, firstName, lastName, streetAddress, city, state, zip]
    .every((field) => field.trim() !== '');

  const handlePlaceOrder = async () => {
    if (!isFormValid) return;

    setIsAdding(true);
    setError(null);

    const request: Omit<PlaceOrderRequest, 'cartKey'> = {
      idempotencyKey: crypto.randomUUID(),
      contact: { email },
      shippingAddress: {
        name: `${firstName} ${lastName}`.trim(),
        street1: streetAddress,
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
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
      setError(result.error ?? 'We could not place your order. Please try again.');
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
              <input 
                type="email" 
                className={styles.inputField} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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
                <input 
                  type="text" 
                  className={styles.inputField} 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Last name</label>
                <input 
                  type="text" 
                  className={styles.inputField} 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className={styles.fieldGroupSpan2}>
                <label className={styles.label}>Street address</label>
                <input
                  type="text"
                  className={styles.inputField}
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                />
              </div>
              <div className={styles.fieldGroupSpan2}>
                <label className={styles.label}>City</label>
                <input
                  type="text"
                  className={styles.inputField}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>State</label>
                <input
                  type="text"
                  className={styles.inputField}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>ZIP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.inputField}
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                />
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

          <div className={styles.promoForm}>
            <div className={styles.promoInputRow}>
              <input 
                type="text" 
                className={styles.promoInput} 
                placeholder="Promo code" 
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button className={styles.promoBtn} onClick={handleApplyPromo}>Apply</button>
            </div>
            {initialQuote.promo && (
              <div className={styles.promoSuccess}>
                Code {initialQuote.promo.code} applied!
              </div>
            )}
            {initialQuote.promoError && (
              <div className={styles.promoError}>
                {initialQuote.promoError.message}
              </div>
            )}
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
            {initialQuote.promo && (
              <div className={styles.summaryTotalRowAccent}>
                <span className={styles.summaryLabel}>Promo savings</span>
                <span className={styles.summaryValue}>−{formatCents(initialQuote.promo.discountCents)}</span>
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

          {error && <p className={styles.orderError} role="alert">{error}</p>}

          <button className={styles.placeOrderBtn} onClick={handlePlaceOrder} disabled={!isFormValid || isSubmitting}>
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
