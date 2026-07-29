'use server';

import { addToCart as apiAddToCart, updateCartItem as apiUpdateCartItem, removeFromCart as apiRemoveFromCart } from '@/lib/cart';
import { placeOrder as apiPlaceOrder } from '@/lib/checkout';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { PlaceOrderRequest } from '@ruleprod/contracts';
import { getRawSessionId, getUserKey } from '@/lib/auth';

const CART_URL = process.env.CART_URL || 'http://localhost:4102';
const ORDERS_URL = process.env.ORDERS_URL || 'http://localhost:4104';

export async function createAccountAction(personaId: string) {
  try {
    const rawSessionId = await getRawSessionId();
    const oldKey = `anon:${rawSessionId}`;
    const newKey = `persona:${personaId}`;

    // Update cart
    await fetch(`${CART_URL}/api/carts/${encodeURIComponent(oldKey)}/rekey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toKey: newKey })
    });

    // Update orders
    await fetch(`${ORDERS_URL}/api/orders/rekey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUserKey: oldKey, toUserKey: newKey })
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('personaId', personaId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function addToCartAction(sku: string, qty: number) {
  try {
    await apiAddToCart(sku, qty);
    revalidatePath('/cart');
    revalidatePath('/'); // Global header cart count
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateCartItemAction(lineId: string, qty: number) {
  try {
    await apiUpdateCartItem(lineId, qty);
    revalidatePath('/cart');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function removeFromCartAction(lineId: string) {
  try {
    await apiRemoveFromCart(lineId);
    revalidatePath('/cart');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function placeOrderAction(request: Omit<PlaceOrderRequest, 'cartKey'>) {
  try {
    const result = await apiPlaceOrder(request);
    revalidatePath('/cart');
    revalidatePath('/');
    revalidatePath('/account');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
