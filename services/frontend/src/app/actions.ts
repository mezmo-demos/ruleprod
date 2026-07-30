'use server';

import { addToCart as apiAddToCart, updateCartItem as apiUpdateCartItem, removeFromCart as apiRemoveFromCart } from '@/lib/cart';
import { placeOrder as apiPlaceOrder } from '@/lib/checkout';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { anonKey, findPersona, personaKey, type PlaceOrderRequest } from '@ruleprod/contracts';
import { PERSONA_COOKIE, getRawSessionId, getUserKey } from '@/lib/auth';

const CART_URL = process.env.CART_URL || 'http://localhost:4102';
const ORDERS_URL = process.env.ORDERS_URL || 'http://localhost:4104';

/** Every page that renders persona-scoped state (cart count, orders, header). */
function revalidateSession() {
  revalidatePath('/', 'layout');
  revalidatePath('/cart');
  revalidatePath('/checkout');
  revalidatePath('/account');
}

/**
 * Sign in as a seeded persona. There are no passwords by design — picking a
 * persona is the whole flow. Anything the guest built up first (a cart, an
 * order placed at checkout) is rekeyed onto the persona so signing in never
 * looks like it threw work away.
 */
export async function signInAction(personaId: string) {
  try {
    const persona = findPersona(personaId);
    if (!persona) {
      return { success: false, error: 'That persona is no longer available.' };
    }

    const newKey = personaKey(persona.id);
    const rawSessionId = await getRawSessionId();

    if (rawSessionId) {
      const oldKey = anonKey(rawSessionId);
      // Best-effort carry-over: a failure here must not block the sign-in,
      // so each call reports and moves on rather than throwing.
      await Promise.all([
        fetch(`${CART_URL}/api/carts/${encodeURIComponent(oldKey)}/rekey`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toKey: newKey }),
        }).catch(() => undefined),
        fetch(`${ORDERS_URL}/api/orders/rekey`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromUserKey: oldKey, toUserKey: newKey }),
        }).catch(() => undefined),
      ]);
    }

    const cookieStore = await cookies();
    cookieStore.set(PERSONA_COOKIE, persona.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    revalidateSession();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Sign out back to a guest session. The persona keeps its cart and orders —
 * they hang off the persona key, not the cookie — so signing back in restores
 * exactly what was there.
 */
export async function signOutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(PERSONA_COOKIE);
    revalidateSession();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function addToCartAction(sku: string, qty: number) {
  try {
    await apiAddToCart(sku, qty);
    revalidatePath('/cart');
    revalidatePath('/checkout');
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
    revalidatePath('/checkout');
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
    revalidatePath('/checkout');
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
    revalidatePath('/checkout');
    revalidatePath('/');
    revalidatePath('/account');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
