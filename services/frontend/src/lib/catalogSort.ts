import type { SortKey } from '@ruleprod/contracts';

/** The sort orders the catalog control offers, in display order. */
export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: 'popular', label: 'Popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A–Z' },
];

/** Anything unrecognised (or absent) reads as the default, "popular". */
export function parseSort(raw: string | string[] | undefined): SortKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return SORT_OPTIONS.some((option) => option.value === value) ? (value as SortKey) : 'popular';
}
