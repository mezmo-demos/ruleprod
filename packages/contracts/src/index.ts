/**
 * Shared types and constants for the Rule Prod services.
 * The prose version of this contract is docs/CONTRACTS.md — keep them in sync.
 */

// ---------- Errors ----------

export type ErrorCode =
  | 'not_found'
  | 'invalid_request'
  | 'conflict'
  | 'promo_invalid'
  | 'promo_expired'
  | 'promo_minimum_not_met'
  | 'inventory_drift'
  | 'upstream_timeout'
  | 'upstream_error';

export interface ApiError {
  error: { code: ErrorCode; message: string };
}

// ---------- Personas ----------

export interface Persona {
  id: string;
  name: string;
  role: string;
  email: string;
  /** Trading name shown on the sign-in card. */
  company: string;
  /** One line of flavour for the sign-in picker. */
  blurb: string;
  /** Two initials for the avatar chip — no image assets involved. */
  initials: string;
  /** The category this persona shops; the picker links straight to it. */
  homeCategory: CategorySlug;
  /** Default shipping address, used to prefill checkout and seed order history. */
  address: ShippingAddress;
}

export const PERSONAS: readonly Persona[] = [
  {
    id: 'ava',
    name: 'Ava Chen',
    role: 'Set designer',
    email: 'ava@studio41.example',
    company: 'Studio 41',
    blurb: 'Buys straightedges by the metre and expects them dead flat.',
    initials: 'AC',
    homeCategory: 'studio',
    address: {
      name: 'Ava Chen',
      street1: '41 Kearny Street',
      street2: 'Studio 3',
      city: 'San Francisco',
      state: 'CA',
      zip: '94108',
      country: 'US',
    },
  },
  {
    id: 'marcus',
    name: 'Marcus Webb',
    role: 'General contractor',
    email: 'marcus@webbandsons.example',
    company: 'Webb & Sons',
    blurb: 'Replaces tape measures faster than anyone should have to.',
    initials: 'MW',
    homeCategory: 'trades',
    address: {
      name: 'Marcus Webb',
      street1: '812 Delancey Avenue',
      city: 'Philadelphia',
      state: 'PA',
      zip: '19147',
      country: 'US',
    },
  },
  {
    id: 'priya',
    name: 'Priya Natarajan',
    role: 'Grade 4 teacher',
    email: 'priya@maplewood.example',
    company: 'Maplewood Elementary',
    blurb: 'Orders for the whole district, always at the 500 tier.',
    initials: 'PN',
    homeCategory: 'school',
    address: {
      name: 'Priya Natarajan',
      street1: '1200 Maplewood Drive',
      street2: 'Attn: Purchasing',
      city: 'Columbus',
      state: 'OH',
      zip: '43215',
      country: 'US',
    },
  },
  {
    id: 'june',
    name: 'June Park',
    role: 'Tailor',
    email: 'june@parkalterations.example',
    company: 'Park Alterations',
    blurb: 'Runs a two-chair shop and wears out a tape every season.',
    initials: 'JP',
    homeCategory: 'textile',
    address: {
      name: 'June Park',
      street1: '77 Bergen Street',
      city: 'Brooklyn',
      state: 'NY',
      zip: '11201',
      country: 'US',
    },
  },
  {
    id: 'walter',
    name: 'Walter Mead',
    role: 'Slide-rule collector',
    email: 'walter@meadarchive.example',
    company: 'The Mead Archive',
    blurb: 'One careful purchase a quarter, always from the vintage case.',
    initials: 'WM',
    homeCategory: 'vintage',
    address: {
      name: 'Walter Mead',
      street1: '9 Chestnut Lane',
      city: 'Concord',
      state: 'MA',
      zip: '01742',
      country: 'US',
    },
  },
] as const;

/** The persona with this id, or undefined — the guard for an untrusted cookie. */
export const findPersona = (id: string | undefined): Persona | undefined =>
  id === undefined ? undefined : PERSONAS.find((persona) => persona.id === id);

/** userKey for a signed-in persona. */
export const personaKey = (id: string): string => `persona:${id}`;
/** userKey for an anonymous session. */
export const anonKey = (sessionId: string): string => `anon:${sessionId}`;

// ---------- Catalog vocabulary ----------

export const CATEGORY_SLUGS = ['trades', 'studio', 'school', 'textile', 'vintage'] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const MATERIALS = [
  'Stainless steel',
  'Spring steel',
  'Boxwood',
  'Aluminium',
  'Fibreglass',
  'Plastic',
  'Bamboo',
  'Brass',
] as const;

export const LENGTHS = ['6 in', '12 in', '18 in', '24 in', '36 in', '48 in', 'Tape'] as const;

export const GRADUATIONS = [
  'Metric',
  'Imperial',
  'Dual',
  '4R',
  '8ths & 16ths',
  'Engineer',
] as const;

export type SortKey = 'popular' | 'price_asc' | 'price_desc' | 'newest' | 'name';

// ---------- Images ----------

/** Opaque image keys; frontend resolves /img/<key>.jpg or a striped placeholder. */
export const IMAGE_KEYS = [
  'hero-fanned',
  'cat-trades',
  'cat-studio',
  'cat-school',
  'cat-vintage',
  'prod-steel-rule',
  'prod-steel-rule-alt',
  'prod-folding-rule',
  'prod-framing-square',
  'prod-tape-measure',
  'prod-tailor-tape',
  'prod-school-ruler',
  'prod-drafting-triangle',
  'prod-architect-scale',
  'prod-slide-rule',
  'prod-wooden-ruler',
  'editorial-workbench',
] as const;
export type ImageKey = (typeof IMAGE_KEYS)[number];

// ---------- Catalog ----------

export interface Category {
  slug: CategorySlug;
  name: string;
  subtitle: string;
  image: string;
}

export type Badge = 'best_seller' | 'low_stock';

export interface BulkTier {
  minQty: number;
  unitPriceCents: number;
}

/**
 * An active sale on a product. Sales are per-product, so every variant is
 * discounted by the same percentage.
 */
export interface SaleInfo {
  percentOff: number;
  /** Pre-sale price of whatever `priceCents` sits beside — the struck-through "was". */
  basePriceCents: number;
}

export interface ProductCard {
  slug: string;
  title: string;
  specLine: string;
  image: string;
  /**
   * What one unit costs today — already sale-adjusted. When `sale` is set this
   * is below `sale.basePriceCents`; the two are equal only when nothing is on
   * offer. Matches `baseUnitPriceCents` on a quoted line, so the browse price
   * and the checkout price can never disagree.
   */
  priceCents: number;
  badge?: Badge;
  stock: number;
  /** Lowest tier teaser; null renders as "no bulk". */
  bulk: BulkTier | null;
  /** Null when no sale window is currently open. */
  sale: SaleInfo | null;
}

export interface ProductSpecs {
  material: string;
  finish: string;
  thickness: string;
  graduation: string;
  tolerance: string;
  madeIn: string;
}

export interface Review {
  headline: string;
  body: string;
  author: string;
  verified: boolean;
}

export interface Variant {
  sku: string;
  label: string;
  /** Sale-adjusted, like `ProductCard.priceCents`. */
  priceCents: number;
  /** Pre-sale price; equal to `priceCents` when no sale is running. */
  basePriceCents: number;
  stock: number;
  tiers: BulkTier[];
}

export interface Product extends ProductCard {
  category: CategorySlug;
  description: string;
  images: string[];
  specs: ProductSpecs;
  rating: { average: number; count: number };
  reviews: Review[];
  variants: Variant[];
  defaultSku: string;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facets {
  materials: FacetValue[];
  lengths: FacetValue[];
  graduations: FacetValue[];
  price: { minCents: number; maxCents: number };
}

export interface ProductListResponse {
  products: ProductCard[];
  total: number;
  page: number;
  perPage: number;
  facets: Facets;
}

export interface SkuInfo {
  sku: string;
  slug: string;
  title: string;
  variantLabel: string;
  specLine: string;
  image: string;
  priceCents: number;
  stock: number;
}

export interface QuotedLine {
  sku: string;
  qty: number;
  stock: number;
  product: { slug: string; title: string; variantLabel: string; specLine: string; image: string };
  baseUnitPriceCents: number;
  unitPriceCents: number;
  lineTotalCents: number;
  appliedTier: BulkTier | null;
  nextTier: (BulkTier & { unitsAway: number }) | null;
}

export interface PriceQuote {
  lines: QuotedLine[];
  subtotalCents: number;
  bulkSavingsCents: number;
  unitCount: number;
}

// ---------- Cart ----------

export interface CartLine extends QuotedLine {
  id: string;
  addedAt: string;
}

export interface Cart {
  key: string;
  lines: CartLine[];
  savedForLater: CartLine[];
  unitCount: number;
  subtotalCents: number;
  bulkSavingsCents: number;
}

export interface SavedCartSummary {
  id: string;
  name: string;
  itemCount: number;
  totalCents: number;
  savedAt: string;
}

// ---------- Checkout ----------

export type DeliveryMethod = 'standard' | 'expedited';
export type PaymentMethod = 'invoice_net30' | 'purchase_order';

export interface PromoResult {
  valid: true;
  code: string;
  percentOff: number;
  discountCents: number;
}

export interface CheckoutTotals {
  subtotalCents: number;
  bulkSavingsCents: number;
  promoDiscountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export interface CheckoutQuote {
  lines: QuotedLine[];
  unitCount: number;
  subtotalCents: number;
  bulkSavingsCents: number;
  promo: { code: string; discountCents: number } | null;
  promoError?: { code: ErrorCode; message: string } | null;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: 'US';
}

export interface PlaceOrderRequest {
  idempotencyKey: string;
  cartKey: string;
  userKey?: string;
  contact: { email: string; name?: string };
  shippingAddress: ShippingAddress;
  delivery: DeliveryMethod;
  payment: { method: PaymentMethod };
  promoCode?: string;
}

export interface PlaceOrderResponse {
  orderId: string;
  orderNumber: string;
  placedAt: string;
  arrivesEstimate: string;
  totals: CheckoutTotals;
}

// ---------- Orders ----------

export type OrderStatus = 'placed' | 'processing' | 'in_transit' | 'delivered';

export interface OrderLine {
  sku: string;
  slug: string;
  title: string;
  variantLabel: string;
  image: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  placedAt: string;
  arrivesEstimate: string;
  totalCents: number;
  unitCount: number;
  summaryLine: string;
  thumbs: string[];
}

export interface Order extends OrderSummary {
  userKey: string;
  contact: { email: string; name?: string };
  shippingAddress: ShippingAddress;
  delivery: { method: DeliveryMethod; priceCents: number };
  payment: { method: PaymentMethod };
  promo: { code: string; discountCents: number } | null;
  lines: OrderLine[];
  totals: CheckoutTotals;
}

export interface OrderListResponse {
  orders: OrderSummary[];
  stats: { orderCount: number; lifetimeCents: number };
}
