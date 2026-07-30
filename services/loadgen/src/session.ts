import { randomUUID } from 'node:crypto';
import { anonKey, type ShippingAddress } from '@ruleprod/contracts';
import { pickOne, type Rng } from './pacing.js';

/**
 * One synthetic shopper. Sessions are anonymous-only, on purpose: the
 * frontend's proxy mints an unsigned crypto.randomUUID() sessionId cookie and
 * lib/auth.ts maps it straight to `anon:<uuid>`, so a self-minted cookie gives
 * a synthetic client the exact cart the frontend renders. Persona keys are
 * never used — sustained load must not bury the hand-curated persona order
 * histories under robot orders.
 */
export interface ShopperSession {
  sessionId: string;
  /** `anon:<sessionId>` — doubles as the cart key and the order userKey. */
  userKey: string;
  /** Cookie header for frontend page views, matching what proxy.ts would mint. */
  cookie: string;
  contact: { email: string; name: string };
  address: ShippingAddress;
}

const FIRST_NAMES = [
  'Alex',
  'Sam',
  'Jordan',
  'Casey',
  'Riley',
  'Morgan',
  'Quinn',
  'Avery',
  'Drew',
  'Reese',
] as const;

const LAST_NAMES = [
  'Hale',
  'Boone',
  'Mercer',
  'Ellis',
  'Frost',
  'Lang',
  'Pryor',
  'Whitt',
  'Sloane',
  'Ames',
] as const;

/** Synthetic-but-plausible US addresses; nothing here maps to a real person. */
const ADDRESSES: readonly Omit<ShippingAddress, 'name'>[] = [
  { street1: '118 Fairview Road', city: 'Portland', state: 'OR', zip: '97205', country: 'US' },
  { street1: '2204 Larkspur Lane', city: 'Austin', state: 'TX', zip: '78704', country: 'US' },
  { street1: '67 Commerce Street', city: 'Nashville', state: 'TN', zip: '37201', country: 'US' },
  { street1: '910 Halsey Avenue', city: 'Denver', state: 'CO', zip: '80211', country: 'US' },
  { street1: '35 Winslow Court', city: 'Madison', state: 'WI', zip: '53703', country: 'US' },
  { street1: '482 Beacon Street', city: 'Providence', state: 'RI', zip: '02903', country: 'US' },
] as const;

/** Mint a fresh anonymous shopper with a synthetic identity. */
export function mintSession(rng: Rng = Math.random): ShopperSession {
  const sessionId = randomUUID();
  const first = pickOne(FIRST_NAMES, rng);
  const last = pickOne(LAST_NAMES, rng);
  const name = `${first} ${last}`;
  return {
    sessionId,
    userKey: anonKey(sessionId),
    cookie: `sessionId=${sessionId}`,
    contact: {
      // .example TLD plus the uuid prefix: unmistakably synthetic, unique enough.
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${sessionId.slice(0, 8)}@loadgen.example`,
      name,
    },
    address: { name, ...pickOne(ADDRESSES, rng) },
  };
}
