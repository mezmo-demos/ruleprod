'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { SortKey } from '@ruleprod/contracts';
import styles from '@/app/catalog/page.module.css';

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: 'popular', label: 'Popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A–Z' },
];

export function parseSort(raw: string | string[] | undefined): SortKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return SORT_OPTIONS.some((option) => option.value === value) ? (value as SortKey) : 'popular';
}

interface Props {
  value: SortKey;
}

/**
 * Sort is a querystring param the catalog service already understands, so it
 * has to survive alongside the active filters — hence editing the current
 * params rather than building a fresh URL. Changing it returns to page 1.
 */
export default function CatalogSort({ value }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (next: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('page');
    if (next === 'popular') {
      params.delete('sort');
    } else {
      params.set('sort', next);
    }
    const query = params.toString();
    router.push(query ? `/catalog?${query}` : '/catalog');
  };

  return (
    <label className={styles.controlPill}>
      <span className="sr-only">Sort products</span>
      <select value={value} onChange={(e) => handleChange(e.target.value)} aria-label="Sort products">
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            Sort: {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
