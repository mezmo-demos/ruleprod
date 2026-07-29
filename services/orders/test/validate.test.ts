import { describe, expect, it } from 'vitest';
import { validateCreateOrder, validateRekey } from '../src/domain/validate.js';

function validBody() {
  return {
    idempotencyKey: 'b3c1a1de-0000-4000-8000-000000000001',
    userKey: 'anon:2f9f2a1c-0000-4000-8000-000000000002',
    contact: { email: 'marcus@webbandsons.example', name: 'Marcus Webb' },
    shippingAddress: {
      name: 'Marcus Webb',
      street1: '48 Dock St',
      city: 'Brooklyn',
      state: 'NY',
      zip: '11201',
      country: 'US' as const,
    },
    delivery: { method: 'standard' as const, priceCents: 0 },
    payment: { method: 'invoice_net30' as const },
    promo: { code: 'SUMMER15', discountCents: 612 },
    lines: [
      {
        sku: 'RP-SR-6R4',
        slug: 'precision-steel-rule-6',
        title: 'Precision steel rule',
        variantLabel: '6 in',
        image: 'prod-steel-rule',
        qty: 12,
        unitPriceCents: 3060,
        lineTotalCents: 36720,
      },
    ],
    totals: {
      subtotalCents: 36720,
      bulkSavingsCents: 4080,
      promoDiscountCents: 612,
      shippingCents: 0,
      taxCents: 3204,
      totalCents: 39312,
    },
  };
}

describe('validateCreateOrder', () => {
  it('accepts a complete checkout payload', () => {
    const result = validateCreateOrder(validBody());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.contact).toEqual({
        email: 'marcus@webbandsons.example',
        name: 'Marcus Webb',
      });
      expect(result.value.promo).toEqual({ code: 'SUMMER15', discountCents: 612 });
    }
  });

  it('accepts promo null and omitted contact name', () => {
    const body = { ...validBody(), promo: null, contact: { email: 'a@b.example' } };
    const result = validateCreateOrder(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.promo).toBeNull();
      expect(result.value.contact).toEqual({ email: 'a@b.example' });
    }
  });

  it('treats a missing promo field as null', () => {
    const { promo: _promo, ...body } = validBody();
    const result = validateCreateOrder(body);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.promo).toBeNull();
  });

  it.each([
    ['idempotencyKey', { idempotencyKey: '' }],
    ['userKey', { userKey: '   ' }],
    ['contact', { contact: { email: '' } }],
    ['shippingAddress', { shippingAddress: { name: 'x' } }],
    ['country', { shippingAddress: { ...validBody().shippingAddress, country: 'CA' } }],
    ['delivery method', { delivery: { method: 'overnight', priceCents: 100 } }],
    ['delivery priceCents', { delivery: { method: 'standard', priceCents: 6.5 } }],
    ['payment method', { payment: { method: 'card' } }],
    ['promo shape', { promo: { code: 'X' } }],
    ['empty lines', { lines: [] }],
    ['line qty', { lines: [{ ...validBody().lines[0], qty: 0 }] }],
    ['line price', { lines: [{ ...validBody().lines[0], unitPriceCents: -1 }] }],
    ['line sku', { lines: [{ ...validBody().lines[0], sku: '' }] }],
    ['totals missing field', { totals: { subtotalCents: 100 } }],
    ['totals non-integer', { totals: { ...validBody().totals, taxCents: 32.04 } }],
  ])('rejects an invalid %s', (_label, patch) => {
    const result = validateCreateOrder({ ...validBody(), ...patch });
    expect(result.ok).toBe(false);
  });

  it('rejects non-object bodies', () => {
    expect(validateCreateOrder(null).ok).toBe(false);
    expect(validateCreateOrder('order').ok).toBe(false);
    expect(validateCreateOrder([validBody()]).ok).toBe(false);
  });
});

describe('validateRekey', () => {
  it('accepts distinct keys', () => {
    const result = validateRekey({ fromUserKey: 'anon:abc', toUserKey: 'persona:marcus' });
    expect(result).toEqual({
      ok: true,
      value: { fromUserKey: 'anon:abc', toUserKey: 'persona:marcus' },
    });
  });

  it('rejects missing or identical keys', () => {
    expect(validateRekey({ fromUserKey: 'anon:abc' }).ok).toBe(false);
    expect(validateRekey({ fromUserKey: '', toUserKey: 'persona:ava' }).ok).toBe(false);
    expect(validateRekey({ fromUserKey: 'anon:abc', toUserKey: 'anon:abc' }).ok).toBe(false);
  });
});
