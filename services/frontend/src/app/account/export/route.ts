import { getOrders } from '@/lib/orders';
import { getPersona } from '@/lib/auth';
import { filterByRange, parseRange } from '@/lib/orderFilters';

/** RFC 4180: quote every field, double any embedded quote. */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

const HEADERS = [
  'order_number',
  'status',
  'placed_at',
  'arrives_estimate',
  'units',
  'total_cents',
  'total_usd',
] as const;

/**
 * The account page's "Export CSV" — the same orders the page is showing,
 * honouring the active range filter, as a file the browser downloads.
 */
export async function GET(request: Request) {
  const persona = await getPersona();
  const range = parseRange(new URL(request.url).searchParams.get('range'));

  let orders;
  try {
    orders = (await getOrders()).orders;
  } catch {
    return new Response('Could not load your orders. Please try again.', { status: 502 });
  }

  const rows = filterByRange(orders, range).map((order) =>
    [
      order.orderNumber,
      order.status,
      order.placedAt,
      order.arrivesEstimate,
      order.unitCount,
      order.totalCents,
      (order.totalCents / 100).toFixed(2),
    ]
      .map(csvCell)
      .join(','),
  );

  const csv = [HEADERS.join(','), ...rows].join('\r\n');
  const who = persona ? persona.id : 'guest';

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ruleprod-orders-${who}-${range}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
