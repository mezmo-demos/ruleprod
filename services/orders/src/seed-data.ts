/**
 * Deterministic order history for the demo personas.
 *
 * The storefront has no signup and no passwords: a visitor picks a persona and
 * gets that persona's account. For the account page to be worth looking at from
 * the first second of a recording, each persona needs history that predates the
 * demo — that history is this file.
 *
 * Seeded orders are historical records, so they carry their totals rather than
 * being repriced. `deriveTotals` reproduces the arithmetic checkout published at
 * the time (see services/checkout/src/config.ts); test/seed-data.test.ts pins
 * the two files together so a rate change here is a deliberate one.
 *
 * Order numbers RP-10001..RP-10099 are reserved for this seed. The live
 * sequence starts at 10517 (db.ts), so seeded and placed orders never collide.
 */

import type { DeliveryMethod, PaymentMethod } from '@ruleprod/contracts';

/** Checkout's published rates, mirrored for the historical arithmetic. */
export const SEED_RATES = {
  taxNumerator: 8875,
  taxDenominator: 100_000,
  standardShippingCents: 650,
  standardFreeOverCents: 7500,
  expeditedShippingCents: 1800,
} as const;

export interface SeedOrderLine {
  sku: string;
  slug: string;
  title: string;
  variantLabel: string;
  image: string;
  qty: number;
  /** Unit price actually paid — the bulk-tier price where a tier applied. */
  unitPriceCents: number;
  /** List price, when a bulk tier beat it. Omitted means no tier applied. */
  baseUnitPriceCents?: number;
}

export interface SeedOrder {
  orderNumber: string;
  personaId: string;
  /** Whole days before seed time; the placed_at the account page renders. */
  daysAgo: number;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  promo?: { code: string; percentOff: number };
  lines: SeedOrderLine[];
}

/**
 * Round-half-up integer division — the same shape as checkout's money.ts, so
 * seeded totals land on the cent checkout would have charged.
 */
function divRoundHalfUp(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

export interface DerivedTotals {
  subtotalCents: number;
  bulkSavingsCents: number;
  promoDiscountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

/** Line totals, then order-level promo → shipping → tax, exactly as checkout layers them. */
export function deriveTotals(order: SeedOrder): DerivedTotals {
  let subtotalCents = 0;
  let bulkSavingsCents = 0;
  for (const line of order.lines) {
    subtotalCents += line.unitPriceCents * line.qty;
    if (line.baseUnitPriceCents !== undefined) {
      bulkSavingsCents += (line.baseUnitPriceCents - line.unitPriceCents) * line.qty;
    }
  }

  const promoDiscountCents = order.promo
    ? divRoundHalfUp(subtotalCents * order.promo.percentOff, 100)
    : 0;

  const shippingCents =
    order.delivery === 'expedited'
      ? SEED_RATES.expeditedShippingCents
      : subtotalCents >= SEED_RATES.standardFreeOverCents
        ? 0
        : SEED_RATES.standardShippingCents;

  const taxCents = divRoundHalfUp(
    (subtotalCents - promoDiscountCents) * SEED_RATES.taxNumerator,
    SEED_RATES.taxDenominator,
  );

  return {
    subtotalCents,
    bulkSavingsCents,
    promoDiscountCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents - promoDiscountCents + shippingCents + taxCents,
  };
}

/**
 * Stable uuid for a seeded order, derived from its reserved number so the
 * insert is idempotent without a table of literals to keep in step.
 */
export function seedOrderId(orderNumber: string): string {
  const digits = orderNumber.slice(3);
  return `5eed0000-0000-4000-8000-${'0'.repeat(12 - digits.length)}${digits}`;
}

/** Every seeded order's idempotency key is its number — replays are no-ops. */
export function seedIdempotencyKey(orderNumber: string): string {
  return `seed:${orderNumber}`;
}

export const SEED_ORDERS: readonly SeedOrder[] = [
  // ---- Marcus Webb — Webb & Sons, general contractor ----
  {
    orderNumber: 'RP-10001',
    personaId: 'marcus',
    daysAgo: 172,
    delivery: 'standard',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-TM-25',
        slug: 'auto-lock-tape-25',
        title: 'Auto-lock tape measure',
        variantLabel: 'Tape · 25 ft',
        image: 'prod-tape-measure',
        qty: 6,
        unitPriceCents: 2400,
      },
      {
        sku: 'RP-FQ-24',
        slug: 'framing-square-16x24',
        title: 'Framing square 16 × 24',
        variantLabel: '24 in',
        image: 'prod-framing-square',
        qty: 1,
        unitPriceCents: 3200,
      },
    ],
  },
  {
    orderNumber: 'RP-10002',
    personaId: 'marcus',
    daysAgo: 96,
    delivery: 'standard',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-SR-24R4',
        slug: 'precision-steel-rule-6',
        title: 'Precision steel rule',
        variantLabel: '24 in',
        image: 'prod-steel-rule',
        qty: 2,
        unitPriceCents: 6800,
      },
      {
        sku: 'RP-CF-18',
        slug: 'center-finding-rule-18',
        title: 'Centre-finding rule',
        variantLabel: '18 in',
        image: 'prod-steel-rule-alt',
        qty: 1,
        unitPriceCents: 3150,
      },
    ],
  },
  {
    orderNumber: 'RP-10003',
    personaId: 'marcus',
    daysAgo: 34,
    delivery: 'standard',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-DT-48',
        slug: 'drywall-t-square-48',
        title: 'Drywall T-square',
        variantLabel: '48 in',
        image: 'prod-framing-square',
        qty: 2,
        unitPriceCents: 3800,
      },
      {
        sku: 'RP-BW-36',
        slug: 'folding-boxwood-rule-36',
        title: 'Folding boxwood rule',
        variantLabel: '36 in',
        image: 'prod-folding-rule',
        qty: 1,
        unitPriceCents: 4600,
      },
    ],
  },
  {
    orderNumber: 'RP-10004',
    personaId: 'marcus',
    daysAgo: 9,
    delivery: 'expedited',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-TM-16',
        slug: 'auto-lock-tape-25',
        title: 'Auto-lock tape measure',
        variantLabel: 'Tape · 16 ft',
        image: 'prod-tape-measure',
        qty: 4,
        unitPriceCents: 1750,
      },
    ],
  },

  // ---- Ava Chen — Studio 41, set designer ----
  {
    orderNumber: 'RP-10005',
    personaId: 'ava',
    daysAgo: 210,
    delivery: 'standard',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-SE-48',
        slug: 'steel-straightedge-24',
        title: 'Bevelled steel straightedge',
        variantLabel: '48 in',
        image: 'prod-steel-rule',
        qty: 1,
        unitPriceCents: 10400,
      },
      {
        sku: 'RP-SE-24',
        slug: 'steel-straightedge-24',
        title: 'Bevelled steel straightedge',
        variantLabel: '24 in',
        image: 'prod-steel-rule',
        qty: 2,
        unitPriceCents: 5400,
      },
    ],
  },
  {
    orderNumber: 'RP-10006',
    personaId: 'ava',
    daysAgo: 118,
    delivery: 'standard',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-AS-12',
        slug: 'architect-scale-12',
        title: 'Architect triangular scale',
        variantLabel: '12 in',
        image: 'prod-architect-scale',
        qty: 4,
        unitPriceCents: 2200,
      },
      {
        sku: 'RP-DT30-12',
        slug: 'drafting-triangle-30-60',
        title: 'Drafting triangle 30/60',
        variantLabel: '12 in',
        image: 'prod-drafting-triangle',
        qty: 2,
        unitPriceCents: 1400,
      },
      {
        sku: 'RP-DT45-12',
        slug: 'drafting-triangle-45',
        title: 'Drafting triangle 45',
        variantLabel: '12 in',
        image: 'prod-drafting-triangle',
        qty: 2,
        unitPriceCents: 1400,
      },
    ],
  },
  {
    orderNumber: 'RP-10007',
    personaId: 'ava',
    daysAgo: 47,
    delivery: 'standard',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-RP-12',
        slug: 'rolling-parallel-rule-12',
        title: 'Rolling parallel rule',
        variantLabel: '12 in',
        image: 'prod-drafting-triangle',
        qty: 1,
        unitPriceCents: 2700,
      },
      {
        sku: 'RP-CB-36',
        slug: 'cork-back-safety-rule-24',
        title: 'Cork-back safety rule',
        variantLabel: '36 in',
        image: 'prod-steel-rule-alt',
        qty: 2,
        unitPriceCents: 2600,
      },
    ],
  },
  {
    orderNumber: 'RP-10008',
    personaId: 'ava',
    daysAgo: 12,
    delivery: 'standard',
    payment: 'invoice_net30',
    promo: { code: 'SUMMER15', percentOff: 15 },
    lines: [
      {
        sku: 'RP-SE-36',
        slug: 'steel-straightedge-24',
        title: 'Bevelled steel straightedge',
        variantLabel: '36 in',
        image: 'prod-steel-rule',
        qty: 1,
        unitPriceCents: 7800,
      },
    ],
  },

  // ---- Priya Natarajan — Maplewood Elementary, buys for the district ----
  {
    orderNumber: 'RP-10009',
    personaId: 'priya',
    daysAgo: 240,
    delivery: 'standard',
    payment: 'purchase_order',
    lines: [
      {
        sku: 'RP-CR-12',
        slug: 'classroom-ruler-12',
        title: 'Classroom ruler',
        variantLabel: '12 in',
        image: 'prod-school-ruler',
        qty: 500,
        unitPriceCents: 156,
        baseUnitPriceCents: 240,
      },
    ],
  },
  {
    orderNumber: 'RP-10010',
    personaId: 'priya',
    daysAgo: 150,
    delivery: 'standard',
    payment: 'purchase_order',
    lines: [
      {
        sku: 'RP-MS-100',
        slug: 'meter-stick-hardwood',
        title: 'Hardwood metre stick',
        variantLabel: '36 in',
        image: 'prod-wooden-ruler',
        qty: 12,
        unitPriceCents: 765,
        baseUnitPriceCents: 850,
      },
      {
        sku: 'RP-PC-6',
        slug: 'protractor-combo-6',
        title: 'Protractor combo ruler',
        variantLabel: '6 in',
        image: 'prod-drafting-triangle',
        qty: 30,
        unitPriceCents: 391,
        baseUnitPriceCents: 460,
      },
    ],
  },
  {
    orderNumber: 'RP-10011',
    personaId: 'priya',
    daysAgo: 63,
    delivery: 'standard',
    payment: 'purchase_order',
    lines: [
      {
        sku: 'RP-SF-12',
        slug: 'shatter-resistant-ruler-6',
        title: 'Shatter-resistant ruler',
        variantLabel: '12 in',
        image: 'prod-school-ruler',
        qty: 100,
        unitPriceCents: 195,
        baseUnitPriceCents: 260,
      },
    ],
  },
  {
    orderNumber: 'RP-10012',
    personaId: 'priya',
    daysAgo: 5,
    delivery: 'standard',
    payment: 'purchase_order',
    lines: [
      {
        sku: 'RP-BR-12',
        slug: 'bamboo-ruler-12',
        title: 'Bamboo ruler',
        variantLabel: '12 in',
        image: 'prod-wooden-ruler',
        qty: 30,
        unitPriceCents: 380,
      },
    ],
  },

  // ---- June Park — Park Alterations, two-chair tailoring shop ----
  {
    orderNumber: 'RP-10013',
    personaId: 'june',
    daysAgo: 195,
    delivery: 'standard',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-TT-60',
        slug: 'tailors-tape-60',
        title: 'Tailor’s tape',
        variantLabel: 'Tape · 60 in',
        image: 'prod-tailor-tape',
        qty: 10,
        unitPriceCents: 585,
        baseUnitPriceCents: 650,
      },
      {
        sku: 'RP-HG-6',
        slug: 'sliding-hem-gauge-6',
        title: 'Sliding hem gauge',
        variantLabel: '6 in',
        image: 'prod-steel-rule-alt',
        qty: 2,
        unitPriceCents: 750,
      },
    ],
  },
  {
    orderNumber: 'RP-10014',
    personaId: 'june',
    daysAgo: 88,
    delivery: 'standard',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-QR-24',
        slug: 'quilters-acrylic-rule-24',
        title: 'Quilter’s acrylic rule',
        variantLabel: '24 in',
        image: 'prod-school-ruler',
        qty: 1,
        unitPriceCents: 2800,
      },
      {
        sku: 'RP-QR-12',
        slug: 'quilters-acrylic-rule-24',
        title: 'Quilter’s acrylic rule',
        variantLabel: '12 in',
        image: 'prod-school-ruler',
        qty: 1,
        unitPriceCents: 1900,
      },
      {
        sku: 'RP-DS-24',
        slug: 'dressmakers-square-24',
        title: 'Dressmaker’s L-square',
        variantLabel: '24 in',
        image: 'prod-framing-square',
        qty: 1,
        unitPriceCents: 2100,
      },
    ],
  },
  {
    orderNumber: 'RP-10015',
    personaId: 'june',
    daysAgo: 21,
    delivery: 'standard',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-TT-60',
        slug: 'tailors-tape-60',
        title: 'Tailor’s tape',
        variantLabel: 'Tape · 60 in',
        image: 'prod-tailor-tape',
        qty: 10,
        unitPriceCents: 585,
        baseUnitPriceCents: 650,
      },
      {
        sku: 'RP-RT-200',
        slug: 'retractable-seam-tape',
        title: 'Retractable seam tape',
        variantLabel: 'Tape · 79 in',
        image: 'prod-tailor-tape',
        qty: 3,
        unitPriceCents: 800,
      },
    ],
  },

  // ---- Walter Mead — The Mead Archive, one careful purchase a quarter ----
  {
    orderNumber: 'RP-10016',
    personaId: 'walter',
    daysAgo: 260,
    delivery: 'expedited',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-VS-HEM',
        slug: 'vintage-hemmi-slide-rule',
        title: 'Hemmi bamboo slide rule, 1962',
        variantLabel: '12 in',
        image: 'prod-slide-rule',
        qty: 1,
        unitPriceCents: 14800,
      },
    ],
  },
  {
    orderNumber: 'RP-10017',
    personaId: 'walter',
    daysAgo: 140,
    delivery: 'standard',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-VB-24',
        slug: 'vintage-boxwood-two-fold',
        title: 'Boxwood two-fold rule, c. 1900',
        variantLabel: '24 in',
        image: 'prod-folding-rule',
        qty: 1,
        unitPriceCents: 12400,
      },
    ],
  },
  {
    orderNumber: 'RP-10018',
    personaId: 'walter',
    daysAgo: 55,
    delivery: 'standard',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-VE-12',
        slug: 'vintage-boxwood-engineer-scale',
        title: 'Boxwood engineer scale, c. 1920',
        variantLabel: '12 in',
        image: 'prod-architect-scale',
        qty: 1,
        unitPriceCents: 13200,
      },
    ],
  },
  {
    orderNumber: 'RP-10019',
    personaId: 'walter',
    daysAgo: 16,
    delivery: 'standard',
    payment: 'invoice_net30',
    lines: [
      {
        sku: 'RP-VS-PKT',
        slug: 'vintage-pocket-slide-rule',
        title: 'Pocket slide rule, 1958',
        variantLabel: '6 in',
        image: 'prod-slide-rule',
        qty: 1,
        unitPriceCents: 8600,
      },
    ],
  },
] as const;
