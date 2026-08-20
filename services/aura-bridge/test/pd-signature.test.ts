import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyPdSignature } from '../src/triggers/pagerduty.js';

const secret = 'test-secret';
const body = Buffer.from(JSON.stringify({ event: { data: { id: 'P1' } } }));
const sign = (s: string, b: Buffer) => createHmac('sha256', s).update(b).digest('hex');

describe('verifyPdSignature', () => {
  it('accepts a valid v1 signature', () => {
    expect(verifyPdSignature(body, `v1=${sign(secret, body)}`, secret)).toBe(true);
  });

  it('accepts when any of multiple signatures match (secret rotation)', () => {
    const header = `v1=${sign('old-secret', body)},v1=${sign(secret, body)}`;
    expect(verifyPdSignature(body, header, secret)).toBe(true);
  });

  it('rejects a bad signature, missing header, and tampered body', () => {
    expect(verifyPdSignature(body, `v1=${sign('wrong', body)}`, secret)).toBe(false);
    expect(verifyPdSignature(body, undefined, secret)).toBe(false);
    const tampered = Buffer.from(body.toString().replace('P1', 'P2'));
    expect(verifyPdSignature(tampered, `v1=${sign(secret, body)}`, secret)).toBe(false);
  });
});
