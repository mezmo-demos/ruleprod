'use client';

import { useRouter } from 'next/navigation';
import styles from '@/app/catalog/page.module.css';
import type { Facets } from '@ruleprod/contracts';

interface Props {
  facets: Facets;
  params: Record<string, string | string[]>;
  categorySlug?: string;
}

export default function FilterSidebar({ facets, params, categorySlug }: Props) {
  const router = useRouter();

  const handleChange = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const searchParams = new URLSearchParams();

    // Params that live outside this form have to be carried across by hand, or
    // changing a filter would drop the shopper's search terms and sort order.
    // `page` is deliberately not carried: a new filter set starts at page 1.
    for (const key of ['q', 'sort'] as const) {
      const raw = params[key];
      const value = Array.isArray(raw) ? raw[0] : raw;
      if (value) searchParams.append(key, value);
    }

    formData.forEach((value, key) => {
      searchParams.append(key, value.toString());
    });

    router.push(`/catalog?${searchParams.toString()}`);
  };

  return (
    <form className={styles.filterRail} onChange={handleChange}>
      {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
      
      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}>Material</h3>
        {facets.materials.map(mat => {
          const isActive = Array.isArray(params.material) 
            ? params.material.includes(mat.value) 
            : params.material === mat.value;
          return (
            <label key={mat.value} className={styles.checkboxRow}>
              <input type="checkbox" name="material" value={mat.value} className={styles.checkbox} defaultChecked={isActive} />
              <span>{mat.value}</span>
              <span className={styles.filterCount}>{mat.count}</span>
            </label>
          );
        })}
      </div>

      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}>Graduation</h3>
        {facets.graduations.map(grad => {
          const isActive = Array.isArray(params.graduation) 
            ? params.graduation.includes(grad.value) 
            : params.graduation === grad.value;
          return (
            <label key={grad.value} className={styles.checkboxRow}>
              <input type="checkbox" name="graduation" value={grad.value} className={styles.checkbox} defaultChecked={isActive} />
              <span>{grad.value}</span>
              <span className={styles.filterCount}>{grad.count}</span>
            </label>
          );
        })}
      </div>

      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}>Length</h3>
        <div className={styles.pillGroup}>
          {facets.lengths.map(len => {
            const isActive = Array.isArray(params.length) 
              ? params.length.includes(len.value) 
              : params.length === len.value;
            return (
              <label key={len.value} style={{ cursor: 'pointer' }}>
                <input type="checkbox" name="length" value={len.value} defaultChecked={isActive} style={{ display: 'none' }} />
                <div className={`${styles.filterPill} ${isActive ? styles.filterPillActive : ''}`}>
                  {len.value}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className={styles.filterSection}>
        <label className={styles.checkboxRow}>
          <input type="checkbox" name="in_stock" value="true" className={styles.checkbox} defaultChecked={params.in_stock === 'true'} />
          <span>In stock only</span>
        </label>
        <label className={styles.checkboxRow}>
          <input type="checkbox" name="bulk_only" value="true" className={styles.checkbox} defaultChecked={params.bulk_only === 'true'} />
          <span>Bulk pricing available</span>
        </label>
      </div>
      
    </form>
  );
}
