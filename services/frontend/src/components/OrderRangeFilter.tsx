'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ORDER_RANGES, type OrderRange } from '@/lib/orderFilters';

interface Props {
  value: OrderRange;
  className?: string;
}

/**
 * The date filter is a querystring, not component state — so it survives a
 * refresh, can be linked to, and the CSV export can read the same value.
 */
export default function OrderRangeFilter({ value, className }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (next: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (next === 'all') {
      params.delete('range');
    } else {
      params.set('range', next);
    }
    const query = params.toString();
    router.replace(`/account${query ? `?${query}` : ''}#orders`);
  };

  return (
    <label className={className}>
      <span className="sr-only">Filter orders by date</span>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Filter orders by date"
      >
        {ORDER_RANGES.map((range) => (
          <option key={range.value} value={range.value}>
            {range.label}
          </option>
        ))}
      </select>
    </label>
  );
}
