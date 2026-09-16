import type { SeismogramRecord } from '@shared/schema';


// Seeded PRNG used ONLY for the waveform chart (orientation display, not analysis).
// FFT/HV computations require real dataZ/dataNS/dataEW from the record.
export function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function displayWaveform(rec: SeismogramRecord, component: 'Z' | 'NS' | 'EW'): number[] {
  const field = component === 'Z' ? rec.dataZ : component === 'NS' ? rec.dataNS : rec.dataEW;
  const arr = field as unknown;
  if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'number') return arr as number[];
  const sr = rec.sampleRate || 100;
  const dur = rec.durationSec || 60;
  const freq = rec.dominantFrequency || 3;
  const amp = component === 'Z' ? (rec.peakAmplitudeZ ?? 1) : component === 'NS' ? (rec.peakAmplitudeNS ?? 0.8) : (rec.peakAmplitudeEW ?? 0.75);
  const freqMult = component === 'Z' ? 1 : component === 'NS' ? 0.9 : 0.85;
  const seed = rec.id * 100 + (component === 'Z' ? 1 : component === 'NS' ? 2 : 3);
  const rand = mulberry32(seed);
  const N = Math.min(Math.round(dur * sr), 8192);
  const dt = 1 / sr;
  const envPeak = 0.3 * dur;
  const result: number[] = [];
  for (let i = 0; i < N; i++) {
    const t = i * dt;
    const env = Math.exp(-Math.abs(t - envPeak) / (dur * 0.25));
    result.push(amp * env * (Math.sin(2 * Math.PI * freq * freqMult * t) + 0.3 * Math.sin(2 * Math.PI * freq * freqMult * 2.1 * t) + 0.15 * (rand() - 0.5)));
  }
  return result;
}

export function hasRealData(rec: SeismogramRecord | null): boolean {
  if (!rec) return false;
  const ok = (v: unknown) => Array.isArray(v) && (v as unknown[]).length > 0 && typeof (v as unknown[])[0] === 'number';
  return ok(rec.dataZ) && ok(rec.dataNS) && ok(rec.dataEW);
}

export function getRealArrays(rec: SeismogramRecord): { z: number[]; ns: number[]; ew: number[] } {
  return {
    z:  rec.dataZ  as number[],
    ns: rec.dataNS as number[],
    ew: rec.dataEW as number[],
  };
}

export function decimateForChart(signal: number[], sampleRate: number, label: string): Record<string, number>[] {
  const step = Math.max(1, Math.floor(signal.length / 600));
  return signal.filter((_, i) => i % step === 0).map((v, i) => ({
    t: parseFloat(((i * step) / sampleRate).toFixed(2)),
    [label]: parseFloat(v.toFixed(5))
  }));
}
