import type { Cart } from '@ruleprod/contracts';
import { getUserKey } from './auth';

const CART_URL = process.env.CART_URL || 'http://localhost:4102';

export async function getCart(): Promise<Cart> {
  const key = await getUserKey();

  const res = await fetch(`${CART_URL}/api/carts/${encodeURIComponent(key)}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch cart: ${res.status} ${text}`);
  }

  return res.json();
}

export async function addToCart(sku: string, qty: number): Promise<Cart> {
  const key = await getUserKey();

  const res = await fetch(`${CART_URL}/api/carts/${encodeURIComponent(key)}/lines`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sku, qty }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`addToCart failed with ${res.status}:`, text);
    let msg = 'Failed to add item to cart';
    try {
      const errObj = JSON.parse(text);
      msg = errObj.error?.message || errObj.message || msg;
    } catch (e) {}
    throw new Error(msg);
  }

  return res.json();
}

export async function updateCartItem(lineId: string, qty: number): Promise<Cart> {
  const key = await getUserKey();

  const res = await fetch(`${CART_URL}/api/carts/${encodeURIComponent(key)}/lines/${lineId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ qty }),
  });

  if (!res.ok) {
    throw new Error('Failed to update cart item');
  }

  return res.json();
}

export async function removeFromCart(lineId: string): Promise<Cart> {
  const key = await getUserKey();

  const res = await fetch(`${CART_URL}/api/carts/${encodeURIComponent(key)}/lines/${lineId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to remove item from cart');
  }

  return res.json();
}
