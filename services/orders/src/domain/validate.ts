import type {
  CheckoutTotals,
  DeliveryMethod,
  OrderLine,
  PaymentMethod,
  ShippingAddress,
} from '@ruleprod/contracts';

/** Inbound body of POST /api/orders (sent by checkout) per docs/CONTRACTS.md. */
export interface CreateOrderRequest {
  idempotencyKey: string;
  userKey: string;
  contact: { email: string; name?: string };
  shippingAddress: ShippingAddress;
  delivery: { method: DeliveryMethod; priceCents: number };
  payment: { method: PaymentMethod };
  promo: { code: string; discountCents: number } | null;
  lines: OrderLine[];
  totals: CheckoutTotals;
}

export interface RekeyRequest {
  fromUserKey: string;
  toUserKey: string;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

const DELIVERY_METHODS: readonly DeliveryMethod[] = ['standard', 'expedited'];
const PAYMENT_METHODS: readonly PaymentMethod[] = ['invoice_net30', 'purchase_order'];
const TOTAL_FIELDS: readonly (keyof CheckoutTotals)[] = [
  'subtotalCents',
  'bulkSavingsCents',
  'promoDiscountCents',
  'shippingCents',
  'taxCents',
  'totalCents',
];
const LINE_STRING_FIELDS = ['sku', 'slug', 'title', 'variantLabel', 'image'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function fail<T>(message: string): ValidationResult<T> {
  return { ok: false, message };
}

function validateShippingAddress(value: unknown): value is ShippingAddress {
  if (!isRecord(value)) return false;
  for (const field of ['name', 'street1', 'city', 'state', 'zip'] as const) {
    if (!isNonEmptyString(value[field])) return false;
  }
  if (value.street2 !== undefined && typeof value.street2 !== 'string') return false;
  return value.country === 'US';
}

function validateLine(value: unknown): value is OrderLine {
  if (!isRecord(value)) return false;
  for (const field of LINE_STRING_FIELDS) {
    if (!isNonEmptyString(value[field])) return false;
  }
  if (!isNonNegativeInt(value.qty) || (value.qty as number) < 1) return false;
  return isNonNegativeInt(value.unitPriceCents) && isNonNegativeInt(value.lineTotalCents);
}

function validateTotals(value: unknown): value is CheckoutTotals {
  if (!isRecord(value)) return false;
  return TOTAL_FIELDS.every((field) => isNonNegativeInt(value[field]));
}

/** Validate the create-order body. Failures map to HTTP 400 `invalid_request`. */
export function validateCreateOrder(body: unknown): ValidationResult<CreateOrderRequest> {
  if (!isRecord(body)) return fail('body must be a JSON object');
  if (!isNonEmptyString(body.idempotencyKey)) return fail('idempotencyKey is required');
  if (!isNonEmptyString(body.userKey)) return fail('userKey is required');

  const contact = body.contact;
  if (!isRecord(contact) || !isNonEmptyString(contact.email)) {
    return fail('contact.email is required');
  }
  if (contact.name !== undefined && typeof contact.name !== 'string') {
    return fail('contact.name must be a string');
  }

  if (!validateShippingAddress(body.shippingAddress)) {
    return fail('shippingAddress must include name, street1, city, state, zip and country "US"');
  }

  const delivery = body.delivery;
  if (
    !isRecord(delivery) ||
    !DELIVERY_METHODS.includes(delivery.method as DeliveryMethod) ||
    !isNonNegativeInt(delivery.priceCents)
  ) {
    return fail('delivery must be { method: standard | expedited, priceCents: int >= 0 }');
  }

  const payment = body.payment;
  if (!isRecord(payment) || !PAYMENT_METHODS.includes(payment.method as PaymentMethod)) {
    return fail('payment.method must be invoice_net30 or purchase_order');
  }

  const promo = body.promo ?? null;
  if (promo !== null && (!isRecord(promo) || !isNonEmptyString(promo.code) || !isNonNegativeInt(promo.discountCents))) {
    return fail('promo must be null or { code, discountCents }');
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return fail('lines must be a non-empty array');
  }
  for (const [index, line] of body.lines.entries()) {
    if (!validateLine(line)) return fail(`lines[${index}] is invalid`);
  }

  if (!validateTotals(body.totals)) {
    return fail('totals must include all six integer cent fields');
  }

  return {
    ok: true,
    value: {
      idempotencyKey: body.idempotencyKey,
      userKey: body.userKey,
      contact: {
        email: contact.email as string,
        ...(isNonEmptyString(contact.name) ? { name: contact.name } : {}),
      },
      shippingAddress: body.shippingAddress,
      delivery: {
        method: delivery.method as DeliveryMethod,
        priceCents: delivery.priceCents as number,
      },
      payment: { method: payment.method as PaymentMethod },
      promo: promo as CreateOrderRequest['promo'],
      lines: body.lines as OrderLine[],
      totals: body.totals as CheckoutTotals,
    },
  };
}

/** Validate the rekey body. */
export function validateRekey(body: unknown): ValidationResult<RekeyRequest> {
  if (!isRecord(body)) return fail('body must be a JSON object');
  if (!isNonEmptyString(body.fromUserKey)) return fail('fromUserKey is required');
  if (!isNonEmptyString(body.toUserKey)) return fail('toUserKey is required');
  if (body.fromUserKey === body.toUserKey) {
    return fail('fromUserKey and toUserKey must differ');
  }
  return { ok: true, value: { fromUserKey: body.fromUserKey, toUserKey: body.toUserKey } };
}
