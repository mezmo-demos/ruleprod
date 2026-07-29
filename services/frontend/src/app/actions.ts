'use server';

import { addToCart as apiAddToCart, updateCartItem as apiUpdateCartItem, removeFromCart as apiRemoveFromCart } from '@/lib/cart';
import { placeOrder as apiPlaceOrder } from '@/lib/checkout';
import { revalidatePath } from 'next/cache';
import type { PlaceOrderRequest } from '@ruleprod/contracts';

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
