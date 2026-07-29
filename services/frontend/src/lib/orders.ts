import type { Order, OrderListResponse } from '@ruleprod/contracts';
import { getUserKey } from './auth';

const ORDERS_URL = process.env.ORDERS_URL || 'http://localhost:4104';

export async function getOrders(): Promise<OrderListResponse> {
  const key = await getUserKey();

  const res = await fetch(`${ORDERS_URL}/api/orders?userKey=${key}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch orders');
  }

  return res.json();
}

export async function getOrder(orderId: string): Promise<Order> {
  const res = await fetch(`${ORDERS_URL}/api/orders/${orderId}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch order');
  }

  return res.json();
}
