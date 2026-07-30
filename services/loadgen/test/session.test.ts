import { describe, expect, it } from 'vitest';
import { mintSession } from '../src/session.js';

describe('mintSession', () => {
  it('mints an anon key derived from the session id', () => {
    const session = mintSession(() => 0.5);
    expect(session.userKey).toBe(`anon:${session.sessionId}`);
    expect(session.cookie).toBe(`sessionId=${session.sessionId}`);
  });

  it('is unmistakably synthetic', () => {
    const session = mintSession(() => 0.5);
    expect(session.contact.email).toMatch(/@loadgen\.example$/);
    expect(session.address.country).toBe('US');
    expect(session.address.name).toBe(session.contact.name);
  });

  it('mints distinct sessions', () => {
    const a = mintSession(() => 0.1);
    const b = mintSession(() => 0.1);
    expect(a.sessionId).not.toBe(b.sessionId);
    expect(a.contact.email).not.toBe(b.contact.email);
  });
});
