import type { Cart, SavedCartSummary } from '@ruleprod/contracts';
import { getUserKey } from './auth';

const CART_URL = process.env.CART_URL || 'http://localhost:4102';

/** Pull the service's error message out of a failed response, or fall back. */
async function messageFrom(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  try {
    const body = JSON.parse(text);
    return body.error?.message || body.message || fallback;
  } catch {
    return fallback;
  }
}

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

export interface BackPaddockBuzz {
  grabs: number;
  sessions: number;
}

/** Buzz counts for the unlisted /rural-prod drop; best-effort. */
export async function getBackPaddockBuzz(): Promise<BackPaddockBuzz> {
  const res = await fetch(`${CART_URL}/api/back-paddock/buzz`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch buzz: ${res.status}`);
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

/** Park a line in "saved for later" — it leaves the totals but stays on the page. */
export async function saveLineForLater(lineId: string): Promise<Cart> {
  const key = await getUserKey();

  const res = await fetch(
    `${CART_URL}/api/carts/${encodeURIComponent(key)}/lines/${lineId}/save-for-later`,
    { method: 'POST' },
  );

  if (!res.ok) {
    throw new Error(await messageFrom(res, 'Failed to save that item for later'));
  }

  return res.json();
}

export async function moveLineToCart(lineId: string): Promise<Cart> {
  const key = await getUserKey();

  const res = await fetch(
    `${CART_URL}/api/carts/${encodeURIComponent(key)}/lines/${lineId}/move-to-cart`,
    { method: 'POST' },
  );

  if (!res.ok) {
    throw new Error(await messageFrom(res, 'Failed to move that item back to your cart'));
  }

  return res.json();
}

export async function listSavedCarts(): Promise<SavedCartSummary[]> {
  const key = await getUserKey();

  const res = await fetch(`${CART_URL}/api/carts/${encodeURIComponent(key)}/saved-carts`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(await messageFrom(res, 'Failed to load saved carts'));
  }

  const body = await res.json();
  return body.savedCarts ?? [];
}

/** Snapshot the current cart under a name. The live cart is left alone. */
export async function saveCart(name: string): Promise<SavedCartSummary> {
  const key = await getUserKey();

  const res = await fetch(`${CART_URL}/api/carts/${encodeURIComponent(key)}/saved-carts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error(await messageFrom(res, 'Failed to save this cart'));
  }

  return res.json();
}

/** 'merge' adds the snapshot to what's there; 'replace' swaps the cart for it. */
export async function restoreSavedCart(
  savedCartId: string,
  mode: 'merge' | 'replace',
): Promise<Cart> {
  const key = await getUserKey();

  const res = await fetch(
    `${CART_URL}/api/carts/${encodeURIComponent(key)}/saved-carts/${savedCartId}/restore`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    },
  );

  if (!res.ok) {
    throw new Error(await messageFrom(res, 'Failed to restore that cart'));
  }

  return res.json();
}

export async function deleteSavedCart(savedCartId: string): Promise<void> {
  const key = await getUserKey();

  const res = await fetch(
    `${CART_URL}/api/carts/${encodeURIComponent(key)}/saved-carts/${savedCartId}`,
    { method: 'DELETE' },
  );

  if (!res.ok) {
    throw new Error(await messageFrom(res, 'Failed to delete that saved cart'));
  }
}
