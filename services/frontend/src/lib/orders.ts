import type { Order, OrderListResponse } from '@ruleprod/contracts';
import { cookies } from 'next/headers';

const ORDERS_URL = process.env.ORDERS_URL || 'http://localhost:4104';

async function getSessionId() {
  const cookieStore = await cookies();
  return cookieStore.get('sessionId')?.value;
}

export async function getOrders(): Promise<OrderListResponse> {
  const sessionId = await getSessionId();
  if (!sessionId) {
    throw new Error('No session ID found');
  }

  const res = await fetch(`${ORDERS_URL}/api/orders?userKey=anon:${sessionId}`, {
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
