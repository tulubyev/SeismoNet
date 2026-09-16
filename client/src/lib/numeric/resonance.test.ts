import { describe, expect, it } from 'vitest';
import { calcRisk } from './resonance';

describe('calcRisk', () => {
  it('classifies by relative period difference', () => {
    expect(calcRisk(0.5, 0.52).risk).toBe('red');      // 3.8 %
    expect(calcRisk(0.5, 0.62).risk).toBe('yellow');   // 19 %
    expect(calcRisk(0.5, 1.0).risk).toBe('green');     // 50 %
  });
  it('is symmetric in its arguments', () => {
    expect(calcRisk(0.4, 0.8).ratio).toBeCloseTo(calcRisk(0.8, 0.4).ratio, 12);
  });
});
