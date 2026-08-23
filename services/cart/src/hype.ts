/**
 * Back-paddock buzz — social proof for the unlisted /rural-prod drop.
 *
 * The drop is a two-item easter egg with no listing surface, so instead of a
 * schema migration it keeps its "buzz" in process: a running grab count plus,
 * per shopper session, the share cards we hand back when someone adds a drop
 * item. The cards are pre-rendered so the frontend can drop them straight into
 * a share sheet or the buzz wall without a round trip to a renderer.
 *
 * Only the SKUs in DROP_SKUS feed this; the rest of the catalog never touches
 * it, so regular shopping carries no extra cost.
 */
import type { Cart } from '@ruleprod/contracts';

/** The current back-paddock drop: sticker pack + the cattle prod. */
const DROP_SKUS = new Set(['RP-RS-50', 'RP-CP-36']);

/** Standard + retina previews of a grab, ready to serve as data URIs. */
interface ShareCard {
  sku: string;
  at: string;
  /** The poster markup, for the "share your haul" sheet. */
  svg: string;
  /** Pre-encoded preview thumbnails keyed by pixel density. */
  previews: Record<'1x' | '2x', string>;
}

/** A grab as it lands on the buzz wall. */
interface Grab {
  sku: string;
  at: string;
  unitCount: number;
  subtotalCents: number;
  card: ShareCard;
}

export interface BuzzSummary {
  grabs: number;
  sessions: number;
}

/** One grab stamp is rendered at this base size, then 2x for retina. */
const STAMP_PX = 64;

export class BackPaddockBuzz {
  /** Per-session reel of grabs; drives the buzz wall and the share sheet. */
  private readonly reels = new Map<string, Grab[]>();
  private grabs = 0;

  /** Record an add of a drop item; no-op for everything else in the catalog. */
  record(key: string, sku: string, cart: Cart): void {
    if (!DROP_SKUS.has(sku)) return;
    const at = new Date().toISOString();
    const grab: Grab = {
      sku,
      at,
      unitCount: cart.unitCount,
      subtotalCents: cart.subtotalCents,
      card: renderShareCard(sku, at, cart),
    };
    const reel = this.reels.get(key);
    if (reel) {
      reel.push(grab);
    } else {
      this.reels.set(key, [grab]);
    }
    this.grabs += 1;
  }

  /** Counts for the buzz strip on /rural-prod. */
  summary(): BuzzSummary {
    return { grabs: this.grabs, sessions: this.reels.size };
  }
}

/** Compose the shareable haul poster and its preview thumbnails. */
function renderShareCard(sku: string, at: string, cart: Cart): ShareCard {
  const title = sku === 'RP-CP-36' ? 'The cattle prod' : 'Rural Prod sticker pack';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">` +
    `<rect width="600" height="750" fill="#1c1a17"/>` +
    `<text x="40" y="90" fill="#f4b41a" font-size="34" font-family="serif">Back paddock</text>` +
    `<text x="40" y="150" fill="#f6f2e8" font-size="26">${title}</text>` +
    `<text x="40" y="200" fill="#c9c2b0" font-size="18">#rural-prod · you found it</text>` +
    `<text x="40" y="700" fill="#8a8372" font-size="14">${at}</text>` +
    `</svg>`;
  return {
    sku,
    at,
    svg,
    previews: {
      '1x': renderPreview(sku, STAMP_PX),
      '2x': renderPreview(sku, STAMP_PX * 2),
    },
  };
}

/**
 * Rasterize a grab stamp at the given edge length and return it as a PNG data
 * URI. The tint is derived from the sku so the two drop items read differently
 * on the buzz wall.
 */
function renderPreview(sku: string, edge: number): string {
  const tint = sku === 'RP-CP-36' ? 0xf4 : 0x8a;
  const raster = Buffer.allocUnsafe(edge * edge * 4);
  raster.fill(tint);
  return `data:image/png;base64,${raster.toString('base64')}`;
}
