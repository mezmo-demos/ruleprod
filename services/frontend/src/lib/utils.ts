export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function resolveImage(key: string | undefined): string {
  const map: Record<string, string> = {
    'hero-fanned': '/images/img-11.jpg',
    'cat-trades': '/images/img-1.jpg',
    'cat-studio': '/images/img-2.jpg',
    'cat-school': '/images/img-3.jpg',
    'cat-vintage': '/images/img-4.jpg',
    'prod-steel-rule': '/images/img-5.jpg',
    'prod-steel-rule-alt': '/images/img-7.jpg',
    'prod-folding-rule': '/images/img-8.jpg',
    'prod-framing-square': '/images/img-13.jpg',
    'prod-tape-measure': '/images/img-14.jpg',
    'prod-tailor-tape': '/images/img-15.jpg',
    'prod-school-ruler': '/images/img-16.jpg',
    'prod-drafting-triangle': '/images/img-17.jpg',
    'prod-architect-scale': '/images/img-6.jpg',
    'prod-slide-rule': '/images/img-9.jpg',
    'prod-wooden-ruler': '/images/img-12.jpg',
    'editorial-workbench': '/images/img-10.jpg',
  };
  return key ? map[key] || '/images/img-12.jpg' : '/images/img-12.jpg';
}
