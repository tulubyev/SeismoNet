import { describe, expect, it } from 'vitest';
import { hashPassword, comparePasswords, isHashed, dummyHash } from './password';

describe('password helpers', () => {
  it('round-trips and rejects wrong passwords', async () => {
    const h = await hashPassword('s3cret-pass');
    expect(isHashed(h)).toBe(true);
    expect(await comparePasswords('s3cret-pass', h)).toBe(true);
    expect(await comparePasswords('other', h)).toBe(false);
  });
  it('never matches plaintext or malformed stored values', async () => {
    expect(isHashed('plain')).toBe(false);
    expect(await comparePasswords('plain', 'plain')).toBe(false);
    expect(await comparePasswords('x', 'abc.def')).toBe(false);
  });
});

describe('dummyHash', () => {
  it('is a valid hash that never matches', async () => {
    const h = await dummyHash;
    expect(h).toMatch(/^[0-9a-f]{128}\.[0-9a-f]{32}$/);
    expect(await comparePasswords('anything', h)).toBe(false);
  });
});
