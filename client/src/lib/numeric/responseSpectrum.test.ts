import { describe, expect, it } from 'vitest';
import { responseSpectrum, combineSpectraGeomean } from './responseSpectrum';

describe('responseSpectrum (Newmark-β SDOF)', () => {
  const dt = 0.005;
  const ag = Array.from({ length: 4000 }, (_, i) => Math.sin(2 * Math.PI * 2 * i * dt)); // 2 Hz, PGA = 1

  it('is amplified at resonance and ~PGA for a very stiff oscillator', () => {
    const [res, stiff, soft] = responseSpectrum(ag, dt, [0.5, 0.02, 5.0], 0.05);
    expect(res.T).toBe(0.5);
    expect(res.Sa).toBeGreaterThan(5);            // 1/(2ζ) = 10 at steady state, transient shorter
    expect(stiff.Sa).toBeGreaterThan(0.85);       // rigid body follows the ground
    expect(stiff.Sa).toBeLessThan(1.3);
    expect(soft.Sa).toBeLessThan(res.Sa);         // far from resonance
    expect(res.Sd).toBeGreaterThan(0);
    expect(res.Sv).toBeGreaterThan(0);
  });

  it('returns one point per requested period, in order', () => {
    const out = responseSpectrum(ag, dt, [0.1, 0.2, 0.3]);
    expect(out.map(p => p.T)).toEqual([0.1, 0.2, 0.3]);
  });
});

describe('combineSpectraGeomean', () => {
  it('takes the geometric mean point-wise', () => {
    const a = [{ T: 1, Sa: 4, Sv: 4, Sd: 4 }], b = [{ T: 1, Sa: 1, Sv: 1, Sd: 1 }];
    const [m] = combineSpectraGeomean([a, b]);
    expect(m.T).toBe(1);
    expect(m.Sa).toBeCloseTo(2, 6);
  });
});
