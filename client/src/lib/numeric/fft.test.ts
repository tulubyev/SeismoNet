import { describe, expect, it } from 'vitest';
import { computeSpectrum, computeHV, nextPow2 } from './fft';

const sine = (f: number, sr: number, n: number, amp = 1) =>
  Array.from({ length: n }, (_, i) => amp * Math.sin(2 * Math.PI * f * i / sr));

describe('nextPow2', () => {
  it('rounds up to a power of two', () => {
    expect(nextPow2(1)).toBe(1);
    expect(nextPow2(1000)).toBe(1024);
    expect(nextPow2(1024)).toBe(1024);
  });
});

describe('computeSpectrum', () => {
  it('peaks at the frequency of a pure sine', () => {
    const sr = 100;
    const spec = computeSpectrum(sine(5, sr, 1024), sr);
    const peak = spec.reduce((a, b) => (b.amp > a.amp ? b : a));
    expect(Math.abs(peak.freq - 5)).toBeLessThan(sr / 1024); // within one bin
  });

  it('returns N/2 - 1 bins up to Nyquist', () => {
    const spec = computeSpectrum(sine(5, 100, 256), 100);
    expect(spec).toHaveLength(127);
    expect(spec[spec.length - 1].freq).toBeLessThan(50);
  });
});

describe('computeHV', () => {
  it('is ~1 when horizontal and vertical spectra match, larger when horizontals dominate', () => {
    const sr = 100, n = 1024;
    const z = sine(5, sr, n, 1), h = sine(5, sr, n, 1), h3 = sine(5, sr, n, 3);
    const peak = (pts: { freq: number; hv: number }[]) =>
      pts.reduce((a, b) => (Math.abs(b.freq - 5) < Math.abs(a.freq - 5) ? b : a));
    expect(peak(computeHV(z, h, h, sr)).hv).toBeCloseTo(1, 1);
    expect(peak(computeHV(z, h3, h3, sr)).hv).toBeCloseTo(3, 1);
  });
});
