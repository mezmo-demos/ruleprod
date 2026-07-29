/**
 * Quote assembly: the priced cart comes from the cart service (which joins
 * catalog price-quotes); checkout layers order-level promo, shipping and tax
 * on top. Pure functions — no I/O — so every branch is unit-testable.
 */

import type { Cart, CheckoutQuote, DeliveryMethod, QuotedLine } from '@ruleprod/contracts';
import { SHIPPING } from './config.js';
import { taxCentsOn } from './money.js';
import { validatePromo, type PromoFailureCode } from './promo.js';

/** Shipping price for a delivery method, given the post-bulk (pre-promo) subtotal. */
export function shippingCentsFor(delivery: DeliveryMethod, postBulkSubtotalCents: number): number {
  const option = SHIPPING[delivery];
  if (option.freeOverCents !== undefined && postBulkSubtotalCents >= option.freeOverCents) {
    return 0;
  }
  return option.priceCents;
}

/** Strip cart-only fields (id, addedAt) so responses carry exactly the contract's QuotedLine. */
function toQuotedLine(line: QuotedLine): QuotedLine {
  const {
    sku,
    qty,
    stock,
    product,
    baseUnitPriceCents,
    unitPriceCents,
    lineTotalCents,
    appliedTier,
    nextTier,
  } = line;
  return {
    sku,
    qty,
    stock,
    product: { ...product },
    baseUnitPriceCents,
    unitPriceCents,
    lineTotalCents,
    appliedTier,
    nextTier,
  };
}

export function buildQuote(
  cart: Cart,
  delivery: DeliveryMethod,
  promoCode: string | undefined,
  now: Date,
): CheckoutQuote {
  const subtotalCents = cart.subtotalCents;

  let promo: CheckoutQuote['promo'] = null;
  let promoError: { code: PromoFailureCode; message: string } | undefined;
  if (promoCode !== undefined && promoCode !== '') {
    const outcome = validatePromo(promoCode, subtotalCents, now);
    if (outcome.ok) {
      promo = { code: outcome.code, discountCents: outcome.discountCents };
    } else {
      promoError = { code: outcome.code, message: outcome.message };
    }
  }

  const promoDiscountCents = promo?.discountCents ?? 0;
  const shippingCents = shippingCentsFor(delivery, subtotalCents);
  const taxCents = taxCentsOn(subtotalCents - promoDiscountCents);
  const totalCents = subtotalCents - promoDiscountCents + shippingCents + taxCents;

  const quote: CheckoutQuote = {
    lines: cart.lines.map(toQuotedLine),
    unitCount: cart.unitCount,
    subtotalCents,
    bulkSavingsCents: cart.bulkSavingsCents,
    promo,
    shippingCents,
    taxCents,
    totalCents,
  };
  if (promoError) {
    quote.promoError = promoError;
  }
  return quote;
}
