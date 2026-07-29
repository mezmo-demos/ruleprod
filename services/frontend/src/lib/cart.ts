import type { Cart } from '@ruleprod/contracts';
import { cookies } from 'next/headers';

const CART_URL = process.env.CART_URL || 'http://localhost:4102';

async function getSessionId() {
  const cookieStore = await cookies();
  return cookieStore.get('sessionId')?.value;
}

export async function getCart(): Promise<Cart> {
  const sessionId = await getSessionId();
  if (!sessionId) {
    throw new Error('No session ID found');
  }

  const res = await fetch(`${CART_URL}/api/cart`, {
    headers: {
      'x-session-id': sessionId,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch cart');
  }

  return res.json();
}

export async function addToCart(sku: string, qty: number): Promise<Cart> {
  const sessionId = await getSessionId();
  if (!sessionId) {
    throw new Error('No session ID found');
  }

  const res = await fetch(`${CART_URL}/api/cart/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify({ sku, qty }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to add item to cart');
  }

  return res.json();
}

export async function updateCartItem(lineId: string, qty: number): Promise<Cart> {
  const sessionId = await getSessionId();
  if (!sessionId) {
    throw new Error('No session ID found');
  }

  const res = await fetch(`${CART_URL}/api/cart/items/${lineId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify({ qty }),
  });

  if (!res.ok) {
    throw new Error('Failed to update cart item');
  }

  return res.json();
}

export async function removeFromCart(lineId: string): Promise<Cart> {
  const sessionId = await getSessionId();
  if (!sessionId) {
    throw new Error('No session ID found');
  }

  const res = await fetch(`${CART_URL}/api/cart/items/${lineId}`, {
    method: 'DELETE',
    headers: {
      'x-session-id': sessionId,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to remove item from cart');
  }

  return res.json();
}
