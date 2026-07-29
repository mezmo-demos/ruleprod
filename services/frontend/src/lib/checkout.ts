import type { CheckoutQuote, PlaceOrderRequest, PlaceOrderResponse } from '@ruleprod/contracts';
import { getUserKey } from './auth';

const CHECKOUT_URL = process.env.CHECKOUT_URL || 'http://localhost:4103';

export async function getCheckoutQuote(promoCode?: string, delivery: 'standard' | 'expedited' = 'standard'): Promise<CheckoutQuote> {
  const key = await getUserKey();
  console.log('getCheckoutQuote key:', key);

  const body: any = { cartKey: key, delivery };
  if (promoCode) body.promoCode = promoCode;
  
  const res = await fetch(`${CHECKOUT_URL}/api/checkout/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch checkout quote');
  }

  return res.json();
}

export async function placeOrder(request: Omit<PlaceOrderRequest, 'cartKey'>): Promise<PlaceOrderResponse> {
  const key = await getUserKey();

  const fullRequest: PlaceOrderRequest = {
    ...request,
    cartKey: key,
    userKey: key,
  };

  const res = await fetch(`${CHECKOUT_URL}/api/checkout/place-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fullRequest),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to place order');
  }

  return res.json();
}
