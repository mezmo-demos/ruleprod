import { describe, expect, it } from 'vitest';
import { validatePromo } from '../src/promo.js';

const NOW = new Date('2026-07-29T12:00:00Z');

describe('validatePromo', () => {
  it('accepts SUMMER15 while it is live', () => {
    const outcome = validatePromo('SUMMER15', 20000, NOW);
    expect(outcome).toEqual({ ok: true, code: 'SUMMER15', percentOff: 15, discountCents: 3000 });
  });

  it('normalises case and whitespace', () => {
    const outcome = validatePromo('  summer15 ', 20000, NOW);
    expect(outcome).toMatchObject({ ok: true, code: 'SUMMER15' });
  });

  it('rejects an unknown code as promo_invalid with a user-facing message', () => {
    const outcome = validatePromo('RULER50', 20000, NOW);
    expect(outcome).toEqual({
      ok: false,
      code: 'promo_invalid',
      message: "That code isn't recognised.",
    });
  });

  it('rejects WELCOME10 as promo_expired, naming the expiry date', () => {
    const outcome = validatePromo('WELCOME10', 20000, NOW);
    expect(outcome).toEqual({
      ok: false,
      code: 'promo_expired',
      message: 'WELCOME10 expired on 31 May 2026.',
    });
  });

  it('treats SUMMER15 as valid through the last instant of 31 August 2026 (UTC)', () => {
    const lastInstant = new Date('2026-08-31T23:59:59.999Z');
    expect(validatePromo('SUMMER15', 10000, lastInstant)).toMatchObject({ ok: true });
  });

  it('treats SUMMER15 as expired from midnight 1 September 2026 (UTC)', () => {
    const justAfter = new Date('2026-09-01T00:00:00.000Z');
    expect(validatePromo('SUMMER15', 10000, justAfter)).toEqual({
      ok: false,
      code: 'promo_expired',
      message: 'SUMMER15 expired on 31 August 2026.',
    });
  });

  it('rejects TRADE20 below the $500.00 minimum, naming the minimum', () => {
    const outcome = validatePromo('TRADE20', 49999, NOW);
    expect(outcome).toEqual({
      ok: false,
      code: 'promo_minimum_not_met',
      message: 'TRADE20 requires a minimum subtotal of $500.00.',
    });
  });

  it('accepts TRADE20 at exactly the $500.00 minimum', () => {
    const outcome = validatePromo('TRADE20', 50000, NOW);
    expect(outcome).toEqual({ ok: true, code: 'TRADE20', percentOff: 20, discountCents: 10000 });
  });

  it('rounds the discount half-up on real cent values', () => {
    // 15% of 30¢ = 4.5¢ → 5¢
    expect(validatePromo('SUMMER15', 30, NOW)).toMatchObject({ ok: true, discountCents: 5 });
    // 15% of 33¢ = 4.95¢ → 5¢
    expect(validatePromo('SUMMER15', 33, NOW)).toMatchObject({ ok: true, discountCents: 5 });
    // 15% of 20¢ = 3¢ exactly
    expect(validatePromo('SUMMER15', 20, NOW)).toMatchObject({ ok: true, discountCents: 3 });
    // 15% of 27¢ = 4.05¢ → 4¢ (fraction below .5 rounds down)
    expect(validatePromo('SUMMER15', 27, NOW)).toMatchObject({ ok: true, discountCents: 4 });
  });
});
