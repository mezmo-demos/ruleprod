/**
 * Deterministic seed for the catalog schema. Applied idempotently on every
 * boot via upserts (see migrate.ts), so edits here roll out with a deploy.
 *
 * Constraints (checked by test/seed-data.test.ts):
 *  - vocabulary strictly from @ruleprod/contracts (categories, materials,
 *    lengths, graduations, image keys);
 *  - the design's hero product exactly as CONTRACTS.md pins it;
 *  - one vintage item with stock 3 and badge low_stock;
 *  - at most one active sale (plus one expired window to exercise the code).
 */

import type {
  Badge,
  BulkTier,
  CategorySlug,
  ImageKey,
  Review,
  GRADUATIONS,
  LENGTHS,
  MATERIALS,
} from '@ruleprod/contracts';

export type Material = (typeof MATERIALS)[number];
export type Length = (typeof LENGTHS)[number];
export type Graduation = (typeof GRADUATIONS)[number];

export interface SeedCategory {
  slug: CategorySlug;
  name: string;
  subtitle: string;
  image: ImageKey;
  sortOrder: number;
}

export interface SeedVariant {
  sku: string;
  label: string;
  /** Facet vocabulary value; label is the display string. */
  length: Length;
  priceCents: number;
  stock: number;
  tiers: BulkTier[];
}

export interface SeedSale {
  percentOff: number;
  startsAt: string;
  endsAt: string;
}

export interface SeedProduct {
  slug: string;
  category: CategorySlug;
  title: string;
  specLine: string;
  description: string;
  material: Material;
  graduation: Graduation;
  finish: string;
  thickness: string;
  tolerance: string;
  madeIn: string;
  images: ImageKey[];
  badge?: Badge;
  popularity: number;
  createdAt: string;
  ratingAverage: number;
  ratingCount: number;
  reviews: Review[];
  /** First variant is the default. */
  variants: SeedVariant[];
  sales?: SeedSale[];
  /** Unlisted: reachable by slug/sku only — never in listings, search or facets. */
  hidden?: boolean;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    slug: 'trades',
    name: 'Trades',
    subtitle: 'Machinist rules, squares and site tapes that hold their zero',
    image: 'cat-trades',
    sortOrder: 1,
  },
  {
    slug: 'studio',
    name: 'Studio',
    subtitle: 'Scales, straightedges and triangles for drawing boards',
    image: 'cat-studio',
    sortOrder: 2,
  },
  {
    slug: 'school',
    name: 'Classroom',
    subtitle: 'Shatter-resistant rulers and metre sticks by the crate',
    image: 'cat-school',
    sortOrder: 3,
  },
  {
    slug: 'textile',
    name: 'Textile',
    subtitle: 'Tapes, squares and gauges for the cutting table',
    // No cat-textile key exists in the canonical image list; the tailor's
    // tape product shot is the representative stand-in.
    image: 'prod-tailor-tape',
    sortOrder: 4,
  },
  {
    slug: 'vintage',
    name: 'Vintage archive',
    subtitle: 'Slide rules and boxwood folders from the pre-digital shop',
    image: 'cat-vintage',
    sortOrder: 5,
  },
];

/** 10/20/30% off, matching the hero ladder shape. */
const heroTiers = (baseCents: number): BulkTier[] => [
  { minQty: 10, unitPriceCents: Math.round(baseCents * 0.9) },
  { minQty: 25, unitPriceCents: Math.round(baseCents * 0.8) },
  { minQty: 100, unitPriceCents: Math.round(baseCents * 0.7) },
];

export const SEED_PRODUCTS: SeedProduct[] = [
  // ---------------------------------------------------------------- trades
  {
    slug: 'precision-steel-rule-6',
    category: 'trades',
    title: 'Precision steel rule',
    specLine: 'Stainless steel · 4R graduation · satin chrome',
    description:
      'The rule the rest of the catalogue is measured against. Photo-etched 4R graduations on hardened stainless with a glare-free satin chrome finish, ground square on all four edges so it reads true from either end.',
    material: 'Stainless steel',
    graduation: '4R',
    finish: 'Satin chrome',
    thickness: '3/64 in',
    tolerance: '±0.004 in',
    madeIn: 'USA',
    images: ['prod-steel-rule', 'prod-steel-rule-alt', 'editorial-workbench'],
    badge: 'best_seller',
    popularity: 980,
    createdAt: '2025-06-12T00:00:00Z',
    ratingAverage: 4.8,
    ratingCount: 214,
    reviews: [
      {
        headline: 'Bought one, then bought ten',
        body: 'Etching is crisp under a loupe and the satin finish kills the glare under shop lights. Ordered a box for the apprentices at the 10+ price.',
        author: 'Marcus W.',
        verified: true,
      },
      {
        headline: 'Reads true against my gauge blocks',
        body: 'Checked it against a calibrated set out of curiosity — dead on across the full length. The corners come properly deburred too.',
        author: 'Elena R.',
        verified: true,
      },
      {
        headline: 'The 4R grad is the right call',
        body: '8ths and 16ths on one edge, 32nds and 64ths on the other. It is the only rule that leaves my apron pocket.',
        author: 'Dan H.',
        verified: false,
      },
    ],
    variants: [
      {
        sku: 'RP-SR-6R4',
        label: '6 in',
        length: '6 in',
        priceCents: 3400,
        stock: 412,
        tiers: [
          { minQty: 10, unitPriceCents: 3060 },
          { minQty: 25, unitPriceCents: 2720 },
          { minQty: 100, unitPriceCents: 2380 },
        ],
      },
      {
        sku: 'RP-SR-12R4',
        label: '12 in',
        length: '12 in',
        priceCents: 4200,
        stock: 268,
        tiers: heroTiers(4200),
      },
      {
        sku: 'RP-SR-18R4',
        label: '18 in',
        length: '18 in',
        priceCents: 5600,
        stock: 84,
        tiers: heroTiers(5600),
      },
      {
        sku: 'RP-SR-24R4',
        label: '24 in',
        length: '24 in',
        priceCents: 6800,
        stock: 0,
        tiers: heroTiers(6800),
      },
    ],
  },
  {
    slug: 'flexible-steel-rule-12',
    category: 'trades',
    title: 'Flexible spring-steel rule',
    specLine: 'Spring steel · 8ths & 16ths · flexes to curves',
    description:
      'Thin tempered spring steel that wraps a pipe or a fender without taking a set. Graduated in 8ths and 16ths with a hang hole for the pegboard.',
    material: 'Spring steel',
    graduation: '8ths & 16ths',
    finish: 'Matte zinc',
    thickness: '1/64 in',
    tolerance: '±0.008 in',
    madeIn: 'USA',
    images: ['prod-steel-rule-alt', 'prod-steel-rule'],
    popularity: 720,
    createdAt: '2025-04-03T00:00:00Z',
    ratingAverage: 4.6,
    ratingCount: 98,
    reviews: [
      {
        headline: 'Lays flat, wraps round',
        body: 'Springs back straight every time. I keep the 12 in the toolbox lid and the 36 on the bench rail.',
        author: 'Pete G.',
        verified: true,
      },
      {
        headline: 'Good markings for the money',
        body: 'Not photo-etched like the premium rule but perfectly legible, and it survives being sat on.',
        author: 'Ines M.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-FS-12',
        label: '12 in',
        length: '12 in',
        priceCents: 1850,
        stock: 320,
        tiers: [
          { minQty: 10, unitPriceCents: 1665 },
          { minQty: 50, unitPriceCents: 1480 },
        ],
      },
      {
        sku: 'RP-FS-24',
        label: '24 in',
        length: '24 in',
        priceCents: 2600,
        stock: 145,
        tiers: [{ minQty: 10, unitPriceCents: 2340 }],
      },
      {
        sku: 'RP-FS-36',
        label: '36 in',
        length: '36 in',
        priceCents: 3450,
        stock: 61,
        tiers: [],
      },
    ],
  },
  {
    slug: 'framing-square-16x24',
    category: 'trades',
    title: 'Framing square 16 × 24',
    specLine: 'Aluminium · 8ths & 16ths · rafter tables',
    description:
      'One-piece aluminium framing square with stamped rafter and Essex board tables. Squared to a fine tolerance at the heel so your first cut is your finish cut.',
    material: 'Aluminium',
    graduation: '8ths & 16ths',
    finish: 'Anodised silver',
    thickness: '1/8 in',
    tolerance: '±0.010 in over 24 in',
    madeIn: 'USA',
    images: ['prod-framing-square'],
    popularity: 840,
    createdAt: '2025-02-20T00:00:00Z',
    ratingAverage: 4.7,
    ratingCount: 156,
    reviews: [
      {
        headline: 'Checked square out of the box',
        body: 'Flipped it against a jointed edge — no light either way. The stamped tables are deep enough to survive a season in the truck.',
        author: 'Ray T.',
        verified: true,
      },
      {
        headline: 'Light but not flimsy',
        body: 'Aluminium means it hangs off the belt without pulling my pants down. Numbers read well in low light.',
        author: 'Sam K.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-FQ-24',
        label: '24 in',
        length: '24 in',
        priceCents: 3200,
        stock: 187,
        tiers: [
          { minQty: 10, unitPriceCents: 2880 },
          { minQty: 25, unitPriceCents: 2560 },
        ],
      },
    ],
  },
  {
    slug: 'folding-boxwood-rule-36',
    category: 'trades',
    title: 'Folding boxwood rule',
    specLine: 'Boxwood · brass hinges · four-fold 36 in',
    description:
      'A four-fold carpenter’s rule in seasoned boxwood with solid brass hinges and tips, the pattern joiners carried for a century. Folds to nine inches and rides flat in a bib pocket.',
    material: 'Boxwood',
    graduation: 'Imperial',
    finish: 'Oiled boxwood, polished brass',
    thickness: '5/32 in',
    tolerance: '±1/64 in',
    madeIn: 'England',
    images: ['prod-folding-rule', 'editorial-workbench'],
    popularity: 610,
    createdAt: '2025-08-01T00:00:00Z',
    ratingAverage: 4.9,
    ratingCount: 67,
    reviews: [
      {
        headline: 'Joints are silky',
        body: 'Opens with two hands and stays put at any angle. Modern manufacture but it feels like my grandfather’s.',
        author: 'Colm B.',
        verified: true,
      },
      {
        headline: 'Not a museum piece — I use it daily',
        body: 'Marks trim faster than a tape because it holds itself straight. The brass has already taken a nice colour.',
        author: 'Ava C.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-BW-36',
        label: '36 in',
        length: '36 in',
        priceCents: 4600,
        stock: 92,
        tiers: [{ minQty: 10, unitPriceCents: 4140 }],
      },
    ],
  },
  {
    slug: 'auto-lock-tape-25',
    category: 'trades',
    title: 'Auto-lock tape measure',
    specLine: 'Spring steel blade · 8ths & 16ths · nylon coated',
    description:
      'Self-locking tape with a nylon-coated spring-steel blade and a 9-foot standout. Blade holds where you pull it and rewinds on the release — no thumb lever to fumble on a ladder.',
    material: 'Spring steel',
    graduation: '8ths & 16ths',
    finish: 'Nylon-coated blade, rubber overmould case',
    thickness: '0.13 mm blade',
    tolerance: 'EC Class II',
    madeIn: 'Taiwan',
    images: ['prod-tape-measure'],
    badge: 'best_seller',
    popularity: 900,
    createdAt: '2025-05-15T00:00:00Z',
    ratingAverage: 4.5,
    ratingCount: 312,
    reviews: [
      {
        headline: 'The auto-lock converts you',
        body: 'Went back to a lever tape for a week and hated every minute. Standout is honest — nine feet before it folds.',
        author: 'Jorge V.',
        verified: true,
      },
      {
        headline: 'Case survived a second-storey drop',
        body: 'Bounced off scaffold onto slab. Case scuffed, blade fine, lock still crisp.',
        author: 'Bill N.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-TM-25',
        label: 'Tape · 25 ft',
        length: 'Tape',
        priceCents: 2400,
        stock: 402,
        tiers: [
          { minQty: 10, unitPriceCents: 2160 },
          { minQty: 50, unitPriceCents: 1920 },
        ],
      },
      {
        sku: 'RP-TM-16',
        label: 'Tape · 16 ft',
        length: 'Tape',
        priceCents: 1750,
        stock: 519,
        tiers: [{ minQty: 10, unitPriceCents: 1575 }],
      },
    ],
  },
  {
    slug: 'drywall-t-square-48',
    category: 'trades',
    title: 'Drywall T-square',
    specLine: 'Aluminium · 8ths & 16ths · 48 in blade',
    description:
      'Full-sheet T-square with a rigid extruded head and a 48-inch blade graduated both edges. Score a sheet in one pull; the head hooks the factory edge square every time.',
    material: 'Aluminium',
    graduation: '8ths & 16ths',
    finish: 'Anodised silver',
    thickness: '1/8 in blade',
    tolerance: '±1/32 in over 48 in',
    madeIn: 'USA',
    images: ['prod-framing-square'],
    popularity: 480,
    createdAt: '2025-03-11T00:00:00Z',
    ratingAverage: 4.4,
    ratingCount: 89,
    reviews: [
      {
        headline: 'Stiffer than the orange-store one',
        body: 'Blade does not chatter when the knife rides it. Rivets in the head are tight after a year.',
        author: 'Denny F.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-DT-48',
        label: '48 in',
        length: '48 in',
        priceCents: 3800,
        stock: 74,
        tiers: [],
      },
    ],
  },
  {
    slug: 'machinist-rule-metric-150',
    category: 'trades',
    title: 'Machinist rule, metric',
    specLine: 'Stainless steel · metric mm/0.5 mm · satin chrome',
    description:
      'Hardened stainless rule graduated in millimetres and half-millimetres, photo-etched and filled for contrast. The metric twin of our 4R shop rule, ground square on all edges.',
    material: 'Stainless steel',
    graduation: 'Metric',
    finish: 'Satin chrome',
    thickness: '1 mm',
    tolerance: '±0.1 mm',
    madeIn: 'USA',
    images: ['prod-steel-rule', 'prod-steel-rule-alt'],
    popularity: 700,
    createdAt: '2025-07-08T00:00:00Z',
    ratingAverage: 4.7,
    ratingCount: 143,
    reviews: [
      {
        headline: 'Half-mill grads you can actually read',
        body: 'The etch-and-fill contrast makes 0.5 mm usable without squinting. Matches my caliper on every check.',
        author: 'Priya N.',
        verified: true,
      },
      {
        headline: 'Finally, proper metric in the shop',
        body: 'No more converting. Bought the 300 mm for the mill and the 150 for the pocket.',
        author: 'Lars E.',
        verified: false,
      },
    ],
    variants: [
      {
        sku: 'RP-MR-150',
        label: '6 in',
        length: '6 in',
        priceCents: 2800,
        stock: 233,
        tiers: [
          { minQty: 10, unitPriceCents: 2520 },
          { minQty: 25, unitPriceCents: 2240 },
        ],
      },
      {
        sku: 'RP-MR-300',
        label: '12 in',
        length: '12 in',
        priceCents: 3600,
        stock: 118,
        tiers: [{ minQty: 10, unitPriceCents: 3240 }],
      },
    ],
  },
  {
    slug: 'center-finding-rule-18',
    category: 'trades',
    title: 'Centre-finding rule',
    specLine: 'Stainless steel · imperial, zero at centre',
    description:
      'Zero sits at the middle and counts outward both ways, so the centre of any board is wherever the same number lines up twice. Saves a division and an argument.',
    material: 'Stainless steel',
    graduation: 'Imperial',
    finish: 'Satin chrome',
    thickness: '3/64 in',
    tolerance: '±0.008 in',
    madeIn: 'USA',
    images: ['prod-steel-rule-alt'],
    popularity: 350,
    createdAt: '2025-09-19T00:00:00Z',
    ratingAverage: 4.6,
    ratingCount: 41,
    reviews: [
      {
        headline: 'Stupidly useful',
        body: 'Finding centre on stock that is 11-13/16 wide used to involve maths. Now it involves sliding a rule.',
        author: 'Ken O.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-CF-18',
        label: '18 in',
        length: '18 in',
        priceCents: 3150,
        stock: 66,
        tiers: [],
      },
    ],
  },

  // ---------------------------------------------------------------- studio
  {
    slug: 'architect-scale-12',
    category: 'studio',
    title: 'Architect triangular scale',
    specLine: 'Aluminium · imperial · 11 scales',
    description:
      'Triangular architect scale in anodised aluminium with 11 imperial scales, laser-engraved so the graduations survive years of drafting-table slide. Colour-coded flutes find the right face by feel.',
    material: 'Aluminium',
    graduation: 'Imperial',
    finish: 'Anodised, colour-coded flutes',
    thickness: 'Triangular section',
    tolerance: '±0.012 in over 12 in',
    madeIn: 'Germany',
    images: ['prod-architect-scale'],
    badge: 'best_seller',
    popularity: 860,
    createdAt: '2025-01-28T00:00:00Z',
    ratingAverage: 4.8,
    ratingCount: 201,
    reviews: [
      {
        headline: 'Engraving beats printing',
        body: 'My last scale went blank at the quarter-inch face from thumb wear. This one is engraved — two years in, still crisp.',
        author: 'Ava C.',
        verified: true,
      },
      {
        headline: 'Studio standard',
        body: 'We hand these to every intern. The colour coding genuinely speeds up scale changes.',
        author: 'Studio 41',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-AS-12',
        label: '12 in',
        length: '12 in',
        priceCents: 2200,
        stock: 289,
        tiers: [
          { minQty: 10, unitPriceCents: 1980 },
          { minQty: 30, unitPriceCents: 1760 },
        ],
      },
      {
        sku: 'RP-AS-6',
        label: '6 in',
        length: '6 in',
        priceCents: 1600,
        stock: 154,
        tiers: [{ minQty: 10, unitPriceCents: 1440 }],
      },
    ],
  },
  {
    slug: 'engineer-scale-12',
    category: 'studio',
    title: 'Engineer triangular scale',
    specLine: 'Aluminium · engineer, decimal 10–60',
    description:
      'Civil engineer’s triangular scale, decimal graduations from 10 to 60 parts per inch. Anodised aluminium with engraved markings and colour-coded flutes.',
    material: 'Aluminium',
    graduation: 'Engineer',
    finish: 'Anodised, colour-coded flutes',
    thickness: 'Triangular section',
    tolerance: '±0.012 in over 12 in',
    madeIn: 'Germany',
    images: ['prod-architect-scale'],
    popularity: 640,
    createdAt: '2025-02-14T00:00:00Z',
    ratingAverage: 4.7,
    ratingCount: 118,
    reviews: [
      {
        headline: 'The 50 scale is my whole job',
        body: 'Site plans at 1"=50′ all day. Graduations are fine and true; no ink pickup off the anodising.',
        author: 'Omar S.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-ES-12',
        label: '12 in',
        length: '12 in',
        priceCents: 2200,
        stock: 197,
        tiers: [
          { minQty: 10, unitPriceCents: 1980 },
          { minQty: 30, unitPriceCents: 1760 },
        ],
      },
    ],
  },
  {
    slug: 'drafting-triangle-30-60',
    category: 'studio',
    title: 'Drafting triangle 30/60',
    specLine: 'Acrylic · metric edge · inking lip',
    description:
      'Clear cast acrylic 30/60/90 triangle with a metric-graduated edge and a recessed inking lip so fineliners don’t bleed under the edge. Polished hypotenuse for clean pencil pulls.',
    material: 'Plastic',
    graduation: 'Metric',
    finish: 'Polished clear acrylic',
    thickness: '2.5 mm',
    tolerance: '±0.1 mm edge straightness',
    madeIn: 'Japan',
    images: ['prod-drafting-triangle'],
    popularity: 520,
    createdAt: '2025-03-30T00:00:00Z',
    ratingAverage: 4.5,
    ratingCount: 77,
    reviews: [
      {
        headline: 'The inking lip earns its keep',
        body: 'Zero bleed with a 0.3 fineliner. Edges came polished, no flash to scrape.',
        author: 'Mina T.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-DT30-12',
        label: '12 in',
        length: '12 in',
        priceCents: 1400,
        stock: 340,
        tiers: [
          { minQty: 12, unitPriceCents: 1260 },
          { minQty: 48, unitPriceCents: 1120 },
        ],
      },
      {
        sku: 'RP-DT30-6',
        label: '6 in',
        length: '6 in',
        priceCents: 950,
        stock: 415,
        tiers: [{ minQty: 12, unitPriceCents: 855 }],
      },
    ],
  },
  {
    slug: 'drafting-triangle-45',
    category: 'studio',
    title: 'Drafting triangle 45',
    specLine: 'Acrylic · metric edge · inking lip',
    description:
      'The 45/90 companion to our 30/60 triangle — same clear cast acrylic, metric edge and recessed inking lip. Buy the pair and cover every standard angle.',
    material: 'Plastic',
    graduation: 'Metric',
    finish: 'Polished clear acrylic',
    thickness: '2.5 mm',
    tolerance: '±0.1 mm edge straightness',
    madeIn: 'Japan',
    images: ['prod-drafting-triangle'],
    popularity: 505,
    createdAt: '2025-03-30T00:00:00Z',
    ratingAverage: 4.6,
    ratingCount: 64,
    reviews: [
      {
        headline: 'Matches the 30/60 perfectly',
        body: 'Same thickness, same lip height, so they stack and slide against each other for parallel lines.',
        author: 'Hana L.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-DT45-12',
        label: '12 in',
        length: '12 in',
        priceCents: 1400,
        stock: 298,
        tiers: [
          { minQty: 12, unitPriceCents: 1260 },
          { minQty: 48, unitPriceCents: 1120 },
        ],
      },
      {
        sku: 'RP-DT45-6',
        label: '6 in',
        length: '6 in',
        priceCents: 950,
        stock: 377,
        tiers: [{ minQty: 12, unitPriceCents: 855 }],
      },
    ],
  },
  {
    slug: 'steel-straightedge-24',
    category: 'studio',
    title: 'Bevelled steel straightedge',
    specLine: 'Stainless steel · imperial · bevelled cutting edge',
    description:
      'Heavy stainless straightedge with one bevelled edge for knife work and one square edge graduated in inches. The mass keeps it planted while you cut mat board or veneer.',
    material: 'Stainless steel',
    graduation: 'Imperial',
    finish: 'Brushed stainless',
    thickness: '1/8 in',
    tolerance: '±0.002 in per foot straightness',
    madeIn: 'USA',
    images: ['prod-steel-rule'],
    popularity: 590,
    createdAt: '2025-05-02T00:00:00Z',
    ratingAverage: 4.9,
    ratingCount: 88,
    reviews: [
      {
        headline: 'Does not walk under the blade',
        body: 'The weight is the feature. Forty-eight-inch cuts through 8-ply mat in two passes, dead straight.',
        author: 'Gil P.',
        verified: true,
      },
      {
        headline: 'Checked with a feeler gauge',
        body: 'Could not slide 0.002 under it against my surface plate anywhere along the length. For this money that is remarkable.',
        author: 'Andrea Q.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-SE-24',
        label: '24 in',
        length: '24 in',
        priceCents: 5400,
        stock: 58,
        tiers: [],
      },
      {
        sku: 'RP-SE-36',
        label: '36 in',
        length: '36 in',
        priceCents: 7800,
        stock: 22,
        tiers: [],
      },
      {
        sku: 'RP-SE-48',
        label: '48 in',
        length: '48 in',
        priceCents: 10400,
        stock: 9,
        tiers: [],
      },
    ],
  },
  {
    slug: 'cork-back-safety-rule-24',
    category: 'studio',
    title: 'Cork-back safety rule',
    specLine: 'Aluminium · dual scale · non-slip cork back',
    description:
      'Aluminium rule with dual inch/millimetre scales and a full-length cork backing that grips the sheet and lifts the edge off the work — no ink smears, no slips into your fingers.',
    material: 'Aluminium',
    graduation: 'Dual',
    finish: 'Anodised silver, cork back',
    thickness: '1/16 in plus cork',
    tolerance: '±0.015 in over 24 in',
    madeIn: 'Taiwan',
    images: ['prod-steel-rule-alt'],
    popularity: 780,
    createdAt: '2025-06-25T00:00:00Z',
    ratingAverage: 4.7,
    ratingCount: 174,
    reviews: [
      {
        headline: 'Print-shop workhorse',
        body: 'We tear book cloth against these all day. Cork keeps it planted and the dual scale saves flipping.',
        author: 'Bindery 9',
        verified: true,
      },
      {
        headline: 'Cheap insurance for fingertips',
        body: 'The lifted edge changed how my students cut. Nobody has ridden a blade onto the rule since we switched.',
        author: 'Prof. Adler',
        verified: false,
      },
    ],
    variants: [
      {
        sku: 'RP-CB-24',
        label: '24 in',
        length: '24 in',
        priceCents: 1900,
        stock: 261,
        tiers: [
          { minQty: 10, unitPriceCents: 1710 },
          { minQty: 25, unitPriceCents: 1520 },
        ],
      },
      {
        sku: 'RP-CB-36',
        label: '36 in',
        length: '36 in',
        priceCents: 2600,
        stock: 133,
        tiers: [{ minQty: 10, unitPriceCents: 2340 }],
      },
      {
        sku: 'RP-CB-48',
        label: '48 in',
        length: '48 in',
        priceCents: 3400,
        stock: 47,
        tiers: [],
      },
    ],
  },
  {
    slug: 'rolling-parallel-rule-12',
    category: 'studio',
    title: 'Rolling parallel rule',
    specLine: 'Acrylic · metric · rolls true for hatching',
    description:
      'A drafting classic: the full-width roller carries the edge across the sheet in perfect parallel, for hatching, ruled borders and quick perspective grids. Metric edge, clear body.',
    material: 'Plastic',
    graduation: 'Metric',
    finish: 'Clear acrylic, knurled roller',
    thickness: '3 mm',
    tolerance: '±0.2 mm parallelism per pass',
    madeIn: 'Japan',
    images: ['prod-drafting-triangle'],
    popularity: 300,
    createdAt: '2025-10-07T00:00:00Z',
    ratingAverage: 4.3,
    ratingCount: 52,
    reviews: [
      {
        headline: 'Hatching machine',
        body: 'Once you trust the roller you stop measuring line spacing entirely. Slight learning curve on ink — let it dry.',
        author: 'Theo B.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-RP-12',
        label: '12 in',
        length: '12 in',
        priceCents: 2700,
        stock: 84,
        tiers: [],
      },
    ],
  },

  // ---------------------------------------------------------------- school
  {
    slug: 'classroom-ruler-12',
    category: 'school',
    title: 'Classroom ruler',
    specLine: 'Plastic · dual inch/cm · crate-friendly',
    description:
      'The straightforward dual-scale school ruler, moulded in tough polystyrene with bevelled edges and deep-stamped graduations that survive being used as a catapult. Sold singly; priced for crates.',
    material: 'Plastic',
    graduation: 'Dual',
    finish: 'Smooth moulded, assorted colours',
    thickness: '2 mm',
    tolerance: '±0.5 mm',
    madeIn: 'Canada',
    images: ['prod-school-ruler'],
    popularity: 880,
    createdAt: '2025-01-10T00:00:00Z',
    ratingAverage: 4.4,
    ratingCount: 230,
    reviews: [
      {
        headline: 'Ordered 500 for the district',
        body: 'The 500-tier price made these cheaper than the flimsy ones we used to lose. A full year in and breakage is way down.',
        author: 'Priya N.',
        verified: true,
      },
      {
        headline: 'Survives fourth grade',
        body: 'That is the entire review. It survives fourth grade.',
        author: 'Mr. Dominguez',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-CR-12',
        label: '12 in',
        length: '12 in',
        priceCents: 240,
        stock: 1840,
        tiers: [
          { minQty: 30, unitPriceCents: 204 },
          { minQty: 100, unitPriceCents: 180 },
          { minQty: 500, unitPriceCents: 156 },
        ],
      },
    ],
  },
  {
    slug: 'bamboo-ruler-12',
    category: 'school',
    title: 'Bamboo ruler',
    specLine: 'Bamboo · dual inch/cm · single brass edge',
    description:
      'Laminated bamboo ruler with printed dual graduations and a brass-bound drawing edge. Warm in the hand, quiet on the desk, and compostable at end of life — the sustainable classroom pick.',
    material: 'Bamboo',
    graduation: 'Dual',
    finish: 'Clear lacquer, brass edge',
    thickness: '3 mm',
    tolerance: '±0.5 mm',
    madeIn: 'Vietnam',
    images: ['prod-wooden-ruler'],
    popularity: 560,
    createdAt: '2025-11-18T00:00:00Z',
    ratingAverage: 4.6,
    ratingCount: 141,
    reviews: [
      {
        headline: 'Feels nicer than plastic',
        body: 'Kids fight over the bamboo ones. The brass edge keeps pencil lines clean after months of use.',
        author: 'Ms. Okafor',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-BR-12',
        label: '12 in',
        length: '12 in',
        priceCents: 380,
        stock: 960,
        tiers: [],
      },
    ],
    // The catalogue's one active sale window (summer clear-out).
    sales: [{ percentOff: 15, startsAt: '2026-07-01T00:00:00Z', endsAt: '2026-09-01T00:00:00Z' }],
  },
  {
    slug: 'shatter-resistant-ruler-6',
    category: 'school',
    title: 'Shatter-resistant ruler',
    specLine: 'Flexible plastic · metric · bends, does not snap',
    description:
      'Semi-flexible polypropylene ruler that folds in half and springs back flat. No shards, no sharp edges, no trips to the nurse — specified by school boards for the youngest grades.',
    material: 'Plastic',
    graduation: 'Metric',
    finish: 'Matte, rounded corners',
    thickness: '1.5 mm',
    tolerance: '±0.5 mm',
    madeIn: 'Canada',
    images: ['prod-school-ruler'],
    popularity: 450,
    createdAt: '2025-08-22T00:00:00Z',
    ratingAverage: 4.2,
    ratingCount: 96,
    reviews: [
      {
        headline: 'Tested by a six-year-old',
        body: 'He tried very hard. It is still a ruler.',
        author: 'Kate M.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-SF-6',
        label: '6 in',
        length: '6 in',
        priceCents: 180,
        stock: 2200,
        tiers: [
          { minQty: 30, unitPriceCents: 153 },
          { minQty: 100, unitPriceCents: 135 },
        ],
      },
      {
        sku: 'RP-SF-12',
        label: '12 in',
        length: '12 in',
        priceCents: 260,
        stock: 1500,
        tiers: [
          { minQty: 30, unitPriceCents: 221 },
          { minQty: 100, unitPriceCents: 195 },
        ],
      },
    ],
  },
  {
    slug: 'meter-stick-hardwood',
    category: 'school',
    title: 'Hardwood metre stick',
    specLine: 'Bamboo laminate · metric · lacquered',
    description:
      'Full-metre demonstration stick in laminated bamboo with bold centimetre numerals readable from the back row. Lacquered against chalk dust and hand oil; hang hole at the zero end.',
    material: 'Bamboo',
    graduation: 'Metric',
    finish: 'Clear lacquer',
    thickness: '5 mm',
    tolerance: '±1 mm over 1 m',
    madeIn: 'Vietnam',
    images: ['prod-wooden-ruler'],
    popularity: 530,
    createdAt: '2025-02-05T00:00:00Z',
    ratingAverage: 4.5,
    ratingCount: 118,
    reviews: [
      {
        headline: 'Replaced our splintery old ones',
        body: 'Ordered a classroom set at the 30 price. Smooth edges, and the big numerals help from the whiteboard.',
        author: 'J. Whitfield',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-MS-100',
        label: '36 in',
        length: '36 in',
        priceCents: 850,
        stock: 240,
        tiers: [
          { minQty: 10, unitPriceCents: 765 },
          { minQty: 30, unitPriceCents: 680 },
        ],
      },
    ],
  },
  {
    slug: 'flexible-school-ruler-12',
    category: 'school',
    title: 'Flexible twist ruler',
    specLine: 'Soft plastic · dual · ties in a knot',
    description:
      'The famously untearable soft-PVC ruler that twists, rolls and knots, then measures straight. A dual scale and a fidget outlet in one — teachers report fewer broken rulers and calmer desks.',
    material: 'Plastic',
    graduation: 'Dual',
    finish: 'Soft matte, assorted colours',
    thickness: '2 mm',
    tolerance: '±1 mm',
    madeIn: 'Taiwan',
    images: ['prod-school-ruler'],
    popularity: 410,
    createdAt: '2025-09-01T00:00:00Z',
    ratingAverage: 4.3,
    ratingCount: 74,
    reviews: [
      {
        headline: 'The fidget ruler',
        body: 'It gets twisted all lesson and still draws a straight line when asked. Genius bit of design.',
        author: 'Ms. Harper',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-FX-12',
        label: '12 in',
        length: '12 in',
        priceCents: 320,
        stock: 1120,
        tiers: [{ minQty: 30, unitPriceCents: 272 }],
      },
    ],
  },
  {
    slug: 'protractor-combo-6',
    category: 'school',
    title: 'Protractor combo ruler',
    specLine: 'Plastic · metric edge · 180° protractor',
    description:
      'Six-inch ruler with a 180-degree protractor cut into the body — one tool for the whole geometry unit. Clear polycarbonate with engraved graduations that won’t rub off by June.',
    material: 'Plastic',
    graduation: 'Metric',
    finish: 'Clear polycarbonate',
    thickness: '2 mm',
    tolerance: '±0.5 mm / ±0.5°',
    madeIn: 'Canada',
    images: ['prod-drafting-triangle'],
    popularity: 380,
    createdAt: '2025-12-02T00:00:00Z',
    ratingAverage: 4.4,
    ratingCount: 59,
    reviews: [
      {
        headline: 'One tool instead of two lost tools',
        body: 'Half the pencil cases in my class are missing either a ruler or a protractor. This halves the problem.',
        author: 'Mr. Chan',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-PC-6',
        label: '6 in',
        length: '6 in',
        priceCents: 460,
        stock: 640,
        tiers: [{ minQty: 30, unitPriceCents: 391 }],
      },
    ],
  },

  // ---------------------------------------------------------------- textile
  {
    slug: 'tailors-tape-60',
    category: 'textile',
    title: 'Tailor’s tape',
    specLine: 'Fibreglass · dual cm/inch · no-stretch',
    description:
      'Fibreglass-core tailor’s tape that will not stretch with years of use, printed both sides in centimetres and inches with brass end tabs. The 120-inch length covers bridal and upholstery work.',
    material: 'Fibreglass',
    graduation: 'Dual',
    finish: 'Matte coated, brass tips',
    thickness: '0.5 mm',
    tolerance: '±1 mm over 60 in',
    madeIn: 'Portugal',
    images: ['prod-tailor-tape'],
    popularity: 810,
    createdAt: '2025-04-17T00:00:00Z',
    ratingAverage: 4.7,
    ratingCount: 188,
    reviews: [
      {
        headline: 'Checked against a steel rule',
        body: 'Dead on at 36 in even after two years of daily fittings. Cheap tapes drift; this one has not.',
        author: 'June P.',
        verified: true,
      },
      {
        headline: 'The 120 is the sleeper hit',
        body: 'Measuring sofas and wedding trains without holding two tapes together. Should have bought it years ago.',
        author: 'R. Delgado',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-TT-60',
        label: 'Tape · 60 in',
        length: 'Tape',
        priceCents: 650,
        stock: 780,
        tiers: [
          { minQty: 10, unitPriceCents: 585 },
          { minQty: 50, unitPriceCents: 520 },
        ],
      },
      {
        sku: 'RP-TT-120',
        label: 'Tape · 120 in',
        length: 'Tape',
        priceCents: 900,
        stock: 310,
        tiers: [{ minQty: 10, unitPriceCents: 810 }],
      },
    ],
  },
  {
    slug: 'dressmakers-square-24',
    category: 'textile',
    title: 'Dressmaker’s L-square',
    specLine: 'Aluminium · dual scale · pattern drafting',
    description:
      'Lightweight aluminium L-square marked in both inches and centimetres, with common pattern-drafting fractions called out along the short arm. Squares a grainline in one placement.',
    material: 'Aluminium',
    graduation: 'Dual',
    finish: 'Anodised silver',
    thickness: '1/16 in',
    tolerance: '±0.02 in over 24 in',
    madeIn: 'Portugal',
    images: ['prod-framing-square'],
    popularity: 440,
    createdAt: '2025-06-09T00:00:00Z',
    ratingAverage: 4.6,
    ratingCount: 72,
    reviews: [
      {
        headline: 'Pattern blocks square first time',
        body: 'The fraction callouts on the short arm are exactly the ones you use grading between sizes.',
        author: 'Noor A.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-DS-24',
        label: '24 in',
        length: '24 in',
        priceCents: 2100,
        stock: 96,
        tiers: [],
      },
    ],
  },
  {
    slug: 'sliding-hem-gauge-6',
    category: 'textile',
    title: 'Sliding hem gauge',
    specLine: 'Aluminium · imperial · locking slide',
    description:
      'Six-inch seam and hem gauge with a locking slide pointer. Set your hem depth once and press, pin and iron against the same setting all the way around the garment.',
    material: 'Aluminium',
    graduation: 'Imperial',
    finish: 'Anodised silver',
    thickness: '1/32 in',
    tolerance: '±1/64 in',
    madeIn: 'Portugal',
    images: ['prod-steel-rule-alt'],
    popularity: 390,
    createdAt: '2025-07-21T00:00:00Z',
    ratingAverage: 4.5,
    ratingCount: 63,
    reviews: [
      {
        headline: 'The slide actually locks',
        body: 'Unlike every plastic one I have owned, the pointer stays put when it touches the ironing board.',
        author: 'June P.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-HG-6',
        label: '6 in',
        length: '6 in',
        priceCents: 750,
        stock: 430,
        tiers: [{ minQty: 10, unitPriceCents: 675 }],
      },
    ],
  },
  {
    slug: 'quilters-acrylic-rule-24',
    category: 'textile',
    title: 'Quilter’s acrylic rule',
    specLine: 'Acrylic · imperial grid · rotary-cutter safe',
    description:
      'Thick cast acrylic rule with a full imperial grid, 30/45/60-degree angle lines and a gripper-dot underside that holds fabric still under a rotary cutter. Edges are milled, not cast, for a clean blade track.',
    material: 'Plastic',
    graduation: 'Imperial',
    finish: 'Clear acrylic, printed grid',
    thickness: '3 mm',
    tolerance: '±0.5 mm over 24 in',
    madeIn: 'USA',
    images: ['prod-school-ruler'],
    popularity: 690,
    createdAt: '2025-05-27T00:00:00Z',
    ratingAverage: 4.8,
    ratingCount: 167,
    reviews: [
      {
        headline: 'Grid lines up with itself',
        body: 'Cut, rotate, cut again — the strips match. The gripper dots mean no more creeping fat quarters.',
        author: 'Barb S.',
        verified: true,
      },
      {
        headline: 'Guild bulk order went smoothly',
        body: 'Twelve of us went in together for the 10+ price. Every rule arrived unscratched in its own sleeve.',
        author: 'Pinetree Quilters',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-QR-24',
        label: '24 in',
        length: '24 in',
        priceCents: 2800,
        stock: 152,
        tiers: [{ minQty: 10, unitPriceCents: 2520 }],
      },
      {
        sku: 'RP-QR-12',
        label: '12 in',
        length: '12 in',
        priceCents: 1900,
        stock: 208,
        tiers: [{ minQty: 10, unitPriceCents: 1710 }],
      },
    ],
  },
  {
    slug: 'retractable-seam-tape',
    category: 'textile',
    title: 'Retractable seam tape',
    specLine: 'Fibreglass · metric · push-button rewind',
    description:
      'Pocket seam tape in a slim case with push-button rewind — two metres of no-stretch fibreglass tape marked in millimetres. Lives in an apron pocket without snagging thread.',
    material: 'Fibreglass',
    graduation: 'Metric',
    finish: 'Matte case, coated tape',
    thickness: '0.4 mm tape',
    tolerance: '±1 mm over 2 m',
    madeIn: 'Portugal',
    images: ['prod-tailor-tape'],
    popularity: 330,
    createdAt: '2025-10-14T00:00:00Z',
    ratingAverage: 4.4,
    ratingCount: 47,
    reviews: [
      {
        headline: 'Handbag essential',
        body: 'Fabric shopping without the crumpled paper tape of shame. Rewind is satisfying.',
        author: 'C. Weiss',
        verified: false,
      },
    ],
    variants: [
      {
        sku: 'RP-RT-200',
        label: 'Tape · 79 in',
        length: 'Tape',
        priceCents: 800,
        stock: 265,
        tiers: [],
      },
    ],
    // Expired window — exercises sale-window logic without changing prices.
    sales: [{ percentOff: 20, startsAt: '2026-03-01T00:00:00Z', endsAt: '2026-04-01T00:00:00Z' }],
  },

  // ---------------------------------------------------------------- vintage
  {
    slug: 'vintage-hemmi-slide-rule',
    category: 'vintage',
    title: 'Hemmi bamboo slide rule, 1962',
    specLine: 'Bamboo · engineer scales · celluloid faces',
    description:
      'A Japanese Hemmi duplex slide rule from the early 1960s — laminated bamboo core, celluloid faces, and the buttery slide action bamboo is famous for. Complete with original leather case; scales crisp, cursor unclouded.',
    material: 'Bamboo',
    graduation: 'Engineer',
    finish: 'Celluloid on bamboo, leather case',
    thickness: '5 mm',
    tolerance: 'As found — collector grade',
    madeIn: 'Japan',
    images: ['prod-slide-rule', 'editorial-workbench'],
    badge: 'low_stock',
    popularity: 460,
    createdAt: '2026-07-05T00:00:00Z',
    ratingAverage: 4.9,
    ratingCount: 23,
    reviews: [
      {
        headline: 'Better than the photos',
        body: 'The slide action on bamboo has to be felt. Mine arrived with the original box insert — clearly stored well for sixty years.',
        author: 'Walter M.',
        verified: true,
      },
      {
        headline: 'My father trained on one of these',
        body: 'Bought it for his eightieth. He had the decimal point of a cube root before I could unlock my phone.',
        author: 'S. Ito',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-VS-HEM',
        label: '12 in',
        length: '12 in',
        priceCents: 14800,
        stock: 3,
        tiers: [],
      },
    ],
  },
  {
    slug: 'vintage-pocket-slide-rule',
    category: 'vintage',
    title: 'Pocket slide rule, 1958',
    specLine: 'Celluloid · engineer scales · five-inch',
    description:
      'A five-inch pocket slide rule from the late 1950s in white celluloid, the kind that lived in a shirt pocket on every drawing office floor. Scales clean, slide smooth, hairline intact.',
    material: 'Plastic',
    graduation: 'Engineer',
    finish: 'White celluloid',
    thickness: '4 mm',
    tolerance: 'As found — collector grade',
    madeIn: 'USA',
    images: ['prod-slide-rule'],
    popularity: 310,
    createdAt: '2026-05-20T00:00:00Z',
    ratingAverage: 4.7,
    ratingCount: 18,
    reviews: [
      {
        headline: 'Desk candy that computes',
        body: 'Sits on my monitor stand and gets used for quick ratios more than I expected. Conversation starter on every call.',
        author: 'D. Fromm',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-VS-PKT',
        label: '6 in',
        length: '6 in',
        priceCents: 8600,
        stock: 7,
        tiers: [],
      },
    ],
  },
  {
    slug: 'vintage-boxwood-two-fold',
    category: 'vintage',
    title: 'Boxwood two-fold rule, c. 1900',
    specLine: 'Boxwood · imperial · brass arch joint',
    description:
      'A two-fold, twenty-four-inch boxwood carpenter’s rule from around the turn of the last century, with a brass arch joint and hand-stamped graduations gone honey-brown. Honest wear, no cracks, joint firm.',
    material: 'Boxwood',
    graduation: 'Imperial',
    finish: 'Patinated boxwood and brass',
    thickness: '3/16 in',
    tolerance: 'As found — collector grade',
    madeIn: 'England',
    images: ['prod-folding-rule', 'editorial-workbench'],
    popularity: 400,
    createdAt: '2026-06-11T00:00:00Z',
    ratingAverage: 4.8,
    ratingCount: 31,
    reviews: [
      {
        headline: 'The patina cannot be faked',
        body: 'A century of pockets rounded these edges. Displayed open on the shop wall; taken down more often than I admit.',
        author: 'Colm B.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-VB-24',
        label: '24 in',
        length: '24 in',
        priceCents: 12400,
        stock: 5,
        tiers: [],
      },
    ],
  },
  {
    slug: 'vintage-brass-desk-rule',
    category: 'vintage',
    title: 'Brass desk rule, c. 1935',
    specLine: 'Solid brass · imperial · bevelled edge',
    description:
      'A heavy solid-brass desk rule from the 1930s, bevelled on one edge, with engine-engraved imperial graduations. The kind of object that ends arguments about whether they make things like they used to.',
    material: 'Brass',
    graduation: 'Imperial',
    finish: 'Aged brass, engraved',
    thickness: '3/32 in',
    tolerance: 'As found — collector grade',
    madeIn: 'England',
    images: ['prod-steel-rule-alt'],
    popularity: 290,
    createdAt: '2026-04-02T00:00:00Z',
    ratingAverage: 5.0,
    ratingCount: 12,
    reviews: [
      {
        headline: 'Paperweight, straightedge, heirloom',
        body: 'The heft is absurd in the best way. Polished one face, left the other in patina — best of both.',
        author: 'H. Grant',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-VBR-12',
        label: '12 in',
        length: '12 in',
        priceCents: 16400,
        stock: 4,
        tiers: [],
      },
    ],
  },
  {
    slug: 'vintage-boxwood-engineer-scale',
    category: 'vintage',
    title: 'Boxwood engineer scale, c. 1920',
    specLine: 'Boxwood · engineer scales · oval section',
    description:
      'An oval-section boxwood engineer’s scale from the 1920s, divisions hand-stamped and ink-filled, with the maker’s mark still legible at the zero end. A drawing-office survivor in remarkable condition.',
    material: 'Boxwood',
    graduation: 'Engineer',
    finish: 'Waxed boxwood',
    thickness: 'Oval section',
    tolerance: 'As found — collector grade',
    madeIn: 'Scotland',
    images: ['prod-architect-scale', 'prod-wooden-ruler'],
    popularity: 270,
    createdAt: '2026-03-18T00:00:00Z',
    ratingAverage: 4.9,
    ratingCount: 14,
    reviews: [
      {
        headline: 'Museum quality',
        body: 'The stamping is finer than anything printed today. Sits in a shadow box above my desk with its provenance card.',
        author: 'Walter M.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-VE-12',
        label: '12 in',
        length: '12 in',
        priceCents: 13200,
        stock: 6,
        tiers: [],
      },
    ],
  },

  // ------------------------------------------------- unlisted (/rural-prod)
  // The back-paddock items. Hidden from every listing surface; the only way
  // in is the frontend's /rural-prod route.
  {
    slug: 'rural-prod-sticker-pack',
    category: 'trades',
    title: 'Rural Prod sticker pack',
    specLine: 'Vinyl · 25 + 25 · weatherproof matte',
    description:
      'Fifty die-cut vinyl stickers, sold as one bundle: twenty-five of the #rural-prod barn crest and twenty-five of the Support Local badge. Printed on 3.5-mil vinyl under a weatherproof matte laminate that shrugs off pressure washers, diesel spills and a prairie winter, because a sticker that peels off the grain bin by spring is just litter with extra steps. Toolbox lids, stock trailers, laptop shells, the co-op notice board — anywhere a hashtag needs to hold its zero. You found this page; you have clearly earned the right to tell people about it quietly.',
    material: 'Plastic',
    graduation: 'Dual',
    finish: 'Weatherproof matte laminate',
    thickness: '3.5 mil',
    tolerance: 'Die-cut ±1/32 in',
    madeIn: 'USA',
    images: ['sticker-rural-prod', 'sticker-support-local'],
    popularity: 120,
    createdAt: '2026-07-25T00:00:00Z',
    ratingAverage: 4.9,
    ratingCount: 41,
    reviews: [
      {
        headline: 'Survived the pressure washer',
        body: 'One on the stock trailer, one on the skid steer, one on my thermos. Eight months of weather between them and the matte finish still looks fresh off the roll.',
        author: 'Denny F.',
        verified: true,
      },
      {
        headline: 'The 4-H kids cleaned me out',
        body: 'Left a pack open on the co-op counter as a joke. Gone by Thursday. Ordering at the ten-pack price and hiding a sleeve for myself this time.',
        author: 'J. Whitfield',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-RS-50',
        label: 'Pack of 50',
        length: '6 in',
        priceCents: 2400,
        stock: 340,
        tiers: [{ minQty: 10, unitPriceCents: 2160 }],
      },
    ],
    hidden: true,
  },
  {
    slug: 'cattle-prod-36',
    category: 'trades',
    title: 'The cattle prod',
    specLine: 'Fibreglass · 36 in · #cattle-not-pets',
    description:
      'The item the hashtag was always about. A genuine ranch-duty stock prod on a 36-inch fibreglass shaft with a rubber overmoulded grip and a weather-sealed switch, built to move a twelve-hundred-pound animal that has decided the gate is a suggestion. In twenty years of selling instruments that measure, this is our first that motivates — and we hold it to the same standard: the shaft is dead straight, it is exactly thirty-six inches, and it arrives with the switch guard on. Treat your herd like cattle, your servers like cattle, and this page like the well-kept secret it is.',
    material: 'Fibreglass',
    graduation: 'Imperial',
    finish: 'Safety orange, rubber overmould grip',
    thickness: '7/8 in shaft',
    tolerance: '±0 excuses at the gate',
    madeIn: 'USA',
    images: ['prod-cattle-prod'],
    popularity: 140,
    createdAt: '2026-07-25T00:00:00Z',
    ratingAverage: 4.8,
    ratingCount: 27,
    reviews: [
      {
        headline: 'Moves cattle. Ends meetings.',
        body: 'Bought it for the paddock. It has since attended two budget reviews as a visual aid. Effective in both settings, and nobody has run long since.',
        author: 'Ray T.',
        verified: true,
      },
      {
        headline: 'Checked it against my bench rule',
        body: 'Thirty-six inches on the nose and straighter than my drywall square. The cows do not appreciate the tolerance work. I do.',
        author: 'Marcus W.',
        verified: true,
      },
    ],
    variants: [
      {
        sku: 'RP-CP-36',
        label: '36 in',
        length: '36 in',
        priceCents: 8900,
        stock: 48,
        tiers: [{ minQty: 10, unitPriceCents: 8010 }],
      },
    ],
    hidden: true,
  },
];
