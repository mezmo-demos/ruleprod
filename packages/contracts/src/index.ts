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
}

export const PERSONAS: readonly Persona[] = [
  { id: 'ava', name: 'Ava Chen', role: 'Set designer — Studio', email: 'ava@studio41.example' },
  {
    id: 'marcus',
    name: 'Marcus Webb',
    role: 'General contractor — Trades',
    email: 'marcus@webbandsons.example',
  },
  {
    id: 'priya',
    name: 'Priya Natarajan',
    role: 'Grade 4 teacher — School',
    email: 'priya@maplewood.example',
  },
  { id: 'june', name: 'June Park', role: 'Tailor — Textile', email: 'june@parkalterations.example' },
  {
    id: 'walter',
    name: 'Walter Mead',
    role: 'Slide-rule collector — Vintage',
    email: 'walter@meadarchive.example',
  },
] as const;

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

export interface ProductCard {
  slug: string;
  title: string;
  specLine: string;
  image: string;
  priceCents: number;
  badge?: Badge;
  stock: number;
  /** Lowest tier teaser; null renders as "no bulk". */
  bulk: BulkTier | null;
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
  priceCents: number;
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
