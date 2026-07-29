import type { Cart } from '@ruleprod/contracts';
import { getUserKey } from './auth';

const CART_URL = process.env.CART_URL || 'http://localhost:4102';

export async function getCart(): Promise<Cart> {
  const key = await getUserKey();

  const res = await fetch(`${CART_URL}/api/carts/${key}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch cart');
  }

  return res.json();
}

export async function addToCart(sku: string, qty: number): Promise<Cart> {
  const key = await getUserKey();

  const res = await fetch(`${CART_URL}/api/carts/${key}/lines`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
  const key = await getUserKey();

  const res = await fetch(`${CART_URL}/api/carts/${key}/lines/${lineId}`, {
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

  const res = await fetch(`${CART_URL}/api/carts/${key}/lines/${lineId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to remove item from cart');
  }

  return res.json();
}
