import type { CheckoutQuote, PlaceOrderRequest, PlaceOrderResponse } from '@ruleprod/contracts';
import { cookies } from 'next/headers';

const CHECKOUT_URL = process.env.CHECKOUT_URL || 'http://localhost:4103';

async function getSessionId() {
  const cookieStore = await cookies();
  return cookieStore.get('sessionId')?.value;
}

export async function getCheckoutQuote(promoCode?: string): Promise<CheckoutQuote> {
  const sessionId = await getSessionId();
  if (!sessionId) {
    throw new Error('No session ID found');
  }

  const searchParams = new URLSearchParams();
  if (promoCode) searchParams.append('promoCode', promoCode);
  
  const res = await fetch(`${CHECKOUT_URL}/api/checkout/quote?cartKey=anon:${sessionId}${promoCode ? `&promoCode=${promoCode}` : ''}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch checkout quote');
  }

  return res.json();
}

export async function placeOrder(request: Omit<PlaceOrderRequest, 'cartKey'>): Promise<PlaceOrderResponse> {
  const sessionId = await getSessionId();
  if (!sessionId) {
    throw new Error('No session ID found');
  }

  const fullRequest: PlaceOrderRequest = {
    ...request,
    cartKey: `anon:${sessionId}`,
  };

  const res = await fetch(`${CHECKOUT_URL}/api/checkout/order`, {
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
