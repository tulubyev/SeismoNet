import { describe, expect, it } from 'vitest';
import { computeAmplification } from './amplification';

const freqs = Array.from({ length: 200 }, (_, i) => 0.1 + i * 0.1);

describe('computeAmplification (1D SH transfer function)', () => {
  it('is exactly 1 for an undamped layer matching the half-space', () => {
    const same = { thickness: 20, vs: 400, density: 2000, damping: 0 };
    for (const p of computeAmplification([same, { ...same }], freqs)) expect(p.amp).toBeCloseTo(1, 6);
  });

  it('for a matched layer with damping equals the attenuation factor exp(ξ·ω·H/Vs)', () => {
    // Reference motion is the incident wave at depth H; with damping it exceeds the
    // surface motion by the material attenuation over the travel path.
    const same = { thickness: 20, vs: 400, density: 2000, damping: 0.02 };
    for (const p of computeAmplification([same, { ...same }], freqs)) {
      const expected = Math.exp(same.damping * 2 * Math.PI * p.freq * same.thickness / same.vs);
      expect(p.amp / expected).toBeCloseTo(1, 2);
    }
  });

  it('peaks near f0 = Vs / 4H for a soft layer over stiff rock', () => {
    const H = 25, vs = 200;
    const out = computeAmplification(
      [{ thickness: H, vs, density: 1800, damping: 0.05 }, { thickness: 0, vs: 1500, density: 2400, damping: 0.01 }],
      freqs,
    );
    const peak = out.reduce((a, b) => (b.amp > a.amp ? b : a));
    expect(peak.amp).toBeGreaterThan(3);
    expect(Math.abs(peak.freq - vs / (4 * H))).toBeLessThan(0.3);
  });

  it('needs at least two layers', () => {
    expect(computeAmplification([{ thickness: 10, vs: 300, density: 1900, damping: 0.05 }], freqs)).toEqual([]);
  });
});
