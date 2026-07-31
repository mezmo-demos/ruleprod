export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** '2026-07-14T…' → '14 Jul'. Matches the orders service's summary lines. */
export function shortDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${SHORT_MONTHS[date.getUTCMonth()]}`;
}

export function resolveImage(key: string | undefined): string {
  const map: Record<string, string> = {
    'hero-fanned': '/images/img-1.jpg',
    'cat-trades': '/images/img-2.jpg',
    'cat-studio': '/images/img-3.jpg',
    'cat-school': '/images/img-4.jpg',
    'cat-vintage': '/images/img-5.jpg',
    'prod-steel-rule': '/images/img-6.jpg',
    'prod-steel-rule-alt': '/images/img-7.jpg',
    'prod-folding-rule': '/images/img-8.jpg',
    'prod-framing-square': '/images/img-9.jpg',
    'prod-tape-measure': '/images/img-10.jpg',
    'prod-tailor-tape': '/images/img-11.jpg',
    'prod-school-ruler': '/images/img-12.jpg',
    'prod-drafting-triangle': '/images/img-13.jpg',
    'prod-architect-scale': '/images/img-14.jpg',
    'prod-slide-rule': '/images/img-15.jpg',
    'prod-wooden-ruler': '/images/img-16.jpg',
    'editorial-workbench': '/images/img-17.jpg',
    'prod-cattle-prod': '/images/img-18.jpg',
    'sticker-rural-prod': '/images/img-19.png',
    'sticker-support-local': '/images/img-20.png',
  };
  return key ? map[key] || '/images/img-12.jpg' : '/images/img-12.jpg';
}
