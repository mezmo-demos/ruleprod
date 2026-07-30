import { describe, expect, it } from 'vitest';
import { configFromEnv, PROFILES } from '../src/config.js';

describe('configFromEnv', () => {
  it('defaults to the steady profile and cluster URLs', () => {
    const config = configFromEnv({});
    expect(config.profile).toEqual(PROFILES.steady);
    expect(config.frontendUrl).toBe('http://frontend.ruleprod-apps.svc.cluster.local');
    expect(config.urls.cart).toBe('http://cart.ruleprod-apps.svc.cluster.local');
    expect(config.requestTimeoutMs).toBe(10_000);
    expect(config.emailDomain).toBe('loadgen.example');
    expect(config.userAgent).toBe('ruleprod-loadgen/0.1');
  });

  it('lets stealth runs override the identity tells', () => {
    const config = configFromEnv({
      LOADGEN_EMAIL_DOMAIN: 'fastmail.example',
      LOADGEN_USER_AGENT: 'Mozilla/5.0',
    });
    expect(config.emailDomain).toBe('fastmail.example');
    expect(config.userAgent).toBe('Mozilla/5.0');
  });

  it('selects a profile by name', () => {
    const config = configFromEnv({ LOADGEN_PROFILE: 'rush' });
    expect(config.profile).toEqual(PROFILES.rush);
  });

  it('rejects an unknown profile', () => {
    expect(() => configFromEnv({ LOADGEN_PROFILE: 'ludicrous' })).toThrow(/LOADGEN_PROFILE/);
  });

  it('lets env override rate and concurrency independently', () => {
    const config = configFromEnv({
      LOADGEN_PROFILE: 'quiet',
      LOADGEN_JOURNEYS_PER_MINUTE: '7',
    });
    expect(config.profile.journeysPerMinute).toBe(7);
    expect(config.profile.maxConcurrent).toBe(PROFILES.quiet.maxConcurrent);
  });

  it('rejects non-positive overrides', () => {
    expect(() => configFromEnv({ LOADGEN_MAX_CONCURRENT: '0' })).toThrow(/LOADGEN_MAX_CONCURRENT/);
    expect(() => configFromEnv({ LOADGEN_JOURNEYS_PER_MINUTE: 'lots' })).toThrow(
      /LOADGEN_JOURNEYS_PER_MINUTE/,
    );
  });

  it('respects FRONTEND_URL and service URL overrides', () => {
    const config = configFromEnv({
      FRONTEND_URL: 'http://localhost:3000',
      CART_URL: 'http://localhost:4102',
    });
    expect(config.frontendUrl).toBe('http://localhost:3000');
    expect(config.urls.cart).toBe('http://localhost:4102');
  });
});
