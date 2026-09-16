import { synthesizeSP14HorizontalPair } from '@/data/sp14-accelerograms';


// ─── Baikal seismic scenario catalog (СП 14.13330.2018 / SP-14) ──────────────
// Synthetic accelerograms: envelope × bandpass noise, normalised to target PGA.
// Parameters derived from attenuation relations for Baikal region.

export interface BaikalScenario {
  id: string;
  label: string;
  Mw: number;
  R_km: number;
  PGA_g: number;
  T_dom: number;
  duration_s: number;
  seismicIntensity: string;
  notes: string;
}

export const BAIKAL_CATALOG: BaikalScenario[] = [
  { id: 'mw50_100', label: 'Mw 5.0, R=100 км (фоновый уровень)',  Mw: 5.0, R_km: 100, PGA_g: 0.025, T_dom: 0.20, duration_s: 15, seismicIntensity: 'VI MSK-64',  notes: 'Типичное слабое землетрясение в зоне Байкальского рифта' },
  { id: 'mw60_200', label: 'Mw 6.0, R=200 км (Байкальский разлом)', Mw: 6.0, R_km: 200, PGA_g: 0.018, T_dom: 0.30, duration_s: 25, seismicIntensity: 'VI MSK-64',  notes: 'Умеренное землетрясение в зоне Байкальского разлома (Mw 6), г. Иркутск' },
  { id: 'mw65_50',  label: 'Mw 6.5, R=50 км (ближний сценарий)',  Mw: 6.5, R_km:  50, PGA_g: 0.090, T_dom: 0.12, duration_s: 20, seismicIntensity: 'VIII MSK-64', notes: 'Близкое землетрясение в 50 км — расчётный сценарий для проектирования' },
  { id: 'mw70_300', label: 'Mw 7.0, R=300 км (монгольский сценарий)', Mw: 7.0, R_km: 300, PGA_g: 0.022, T_dom: 0.40, duration_s: 40, seismicIntensity: 'VII MSK-64', notes: 'Крупное монгольское землетрясение: слабые длинно-периодные колебания' },
  { id: 'sp14_vii', label: 'СП 14 нормативный, I=VII (0.1g)', Mw: 6.0, R_km: 100, PGA_g: 0.100, T_dom: 0.20, duration_s: 20, seismicIntensity: 'VII MSK-64', notes: 'Нормативное воздействие по СП 14.13330.2018 для 7-балльной зоны (PGA=0.1g)' },
];

export function generateSyntheticAccelerogram(scenario: BaikalScenario, sr = 200, phaseTag = ''): Float64Array {
  const N = Math.round(scenario.duration_s * sr);
  const dt = 1 / sr;
  const arr = new Float64Array(N);

  // Deterministic "random" seed per scenario + phaseTag for reproducibility.
  // phaseTag allows generating statistically uncorrelated H1/H2 phase realisations.
  const seedKey = scenario.id + phaseTag;
  let seed = seedKey.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 12345);
  const rnd = () => { seed = (seed * 1664525 + 1013904223) | 0; return (seed >>> 0) / 0xFFFFFFFF; };

  // Phase 1: white noise
  for (let i = 0; i < N; i++) arr[i] = rnd() * 2 - 1;

  // Phase 2: simple bandpass via two-pass RC filter around T_dom
  const f_low  = Math.max(0.5 / scenario.T_dom, 0.1);
  const f_high = Math.min(3.0 / scenario.T_dom, sr / 2 - 1);
  const rc_hi = 1 / (2 * Math.PI * f_low  * dt);
  const rc_lo = 1 / (2 * Math.PI * f_high * dt);
  const a_hi = rc_hi / (rc_hi + 1);
  const a_lo = 1     / (rc_lo + 1);
  // High-pass (remove DC)
  let prev = arr[0], prevOut = arr[0];
  for (let i = 1; i < N; i++) { const out = a_hi * (prevOut + arr[i] - prev); prev = arr[i]; prevOut = out; arr[i] = out; }
  // Low-pass
  let lp = arr[0];
  for (let i = 1; i < N; i++) { lp = a_lo * arr[i] + (1 - a_lo) * lp; arr[i] = lp; }

  // Phase 3: trapezoidal envelope (ramp 15%, sustain 50%, decay 35%)
  const t_rise  = 0.15 * scenario.duration_s;
  const t_end   = 0.65 * scenario.duration_s;
  for (let i = 0; i < N; i++) {
    const t = i * dt;
    let env = 1;
    if (t < t_rise)           env = t / t_rise;
    else if (t > t_end) env = Math.exp(-3 * (t - t_end) / (scenario.duration_s - t_end));
    arr[i] *= env;
  }

  // Phase 4: normalise to target PGA (m/s²)
  const g = 9.80665;
  const peak = arr.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const targetPGA = scenario.PGA_g * g;
  if (peak > 0) for (let i = 0; i < N; i++) arr[i] = arr[i] / peak * targetPGA;

  return arr;
}

// Orthogonal H1/H2 pair for a Baikal scenario — same target PGA and spectral
// shape, but statistically uncorrelated phases (different phaseTag seeds).
// Mirrors synthesizeSP14HorizontalPair for direct code-comparable geomean.
export function generateSyntheticAccelerogramPair(
  scenario: BaikalScenario, sr = 200,
): { h1: Float64Array; h2: Float64Array; sampleRate: number; pga_ms2: number } {
  const g = 9.80665;
  const h1 = generateSyntheticAccelerogram(scenario, sr, 'H1');
  const h2 = generateSyntheticAccelerogram(scenario, sr, 'H2');
  return { h1, h2, sampleRate: sr, pga_ms2: scenario.PGA_g * g };
}

// ─── Response spectrum tab (Newmark-β SDOF) ──────────────────────────────────
