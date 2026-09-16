import { Input } from '@/components/ui/input';


// ─── SDOF response spectrum (Newmark-β, β=1/4, γ=1/2) ───────────────────────
// Input: ground-acceleration time history `ag` (m/s²), sample step `dt` (s).
// Output: Sa (m/s²), Sv (m/s), Sd (m) for each requested period T.
// Refs: Chopra A.K., "Dynamics of Structures", Table 5.7.2.

export interface SpecPoint { T: number; Sa: number; Sv: number; Sd: number; }

export type RespComponent = 'Z' | 'NS' | 'EW' | 'AVG3' | 'GMH';

export const RESP_COMPONENT_LABEL: Record<RespComponent, string> = {
  Z:    'Z (вертикальная)',
  NS:   'NS (С–Ю)',
  EW:   'EW (В–З)',
  GMH:  'NS⊕EW — геом. среднее горизонталей (СП 14)',
  AVG3: 'Все 3 — геом. среднее Z+NS+EW',
};

// Geometric mean of N spectra (point-by-point on Sa, Sv, Sd).
// Per SP 14.13330, the geomean of horizontal pair gives a single
// orientation-independent curve directly comparable to the design spectrum.
export function combineSpectraGeomean(spectra: SpecPoint[][]): SpecPoint[] {
  if (spectra.length === 0) return [];
  const n = spectra[0].length;
  const k = spectra.length;
  const out: SpecPoint[] = [];
  for (let i = 0; i < n; i++) {
    let sumLogSa = 0, sumLogSv = 0, sumLogSd = 0;
    for (const s of spectra) {
      sumLogSa += Math.log(Math.max(s[i].Sa, 1e-30));
      sumLogSv += Math.log(Math.max(s[i].Sv, 1e-30));
      sumLogSd += Math.log(Math.max(s[i].Sd, 1e-30));
    }
    out.push({
      T:  spectra[0][i].T,
      Sa: Math.exp(sumLogSa / k),
      Sv: Math.exp(sumLogSv / k),
      Sd: Math.exp(sumLogSd / k),
    });
  }
  return out;
}

export function responseSpectrum(ag: number[], dt: number, periods: number[], zeta = 0.05): SpecPoint[] {
  const out: SpecPoint[] = [];
  const beta = 0.25, gamma = 0.5;
  const n = ag.length;
  for (const T of periods) {
    const wn = 2 * Math.PI / T;
    const k = wn * wn;       // m=1 → k=ω²
    const c = 2 * zeta * wn; // m=1 → c=2ζω
    let u = 0, v = 0;
    let a = -ag[0] - c*v - k*u;
    const a1 = 1/(beta*dt*dt) + gamma*c/(beta*dt);
    const a2 = 1/(beta*dt) + (gamma/beta - 1)*c;
    const a3 = (1/(2*beta) - 1) + dt*(gamma/(2*beta) - 1)*c;
    const kHat = k + a1;
    let uMax = 0, vMax = 0, aTotMax = 0;
    for (let i = 1; i < n; i++) {
      const pHat = -ag[i] + a1*u + a2*v + a3*a;
      const uNew = pHat / kHat;
      const vNew = (gamma/(beta*dt))*(uNew - u) + (1 - gamma/beta)*v + dt*(1 - gamma/(2*beta))*a;
      const aNew = (1/(beta*dt*dt))*(uNew - u) - (1/(beta*dt))*v - (1/(2*beta) - 1)*a;
      u = uNew; v = vNew; a = aNew;
      const aTot = Math.abs(a + ag[i]);                 // total acceleration
      if (Math.abs(u) > uMax) uMax = Math.abs(u);
      if (Math.abs(v) > vMax) vMax = Math.abs(v);
      if (aTot > aTotMax) aTotMax = aTot;
    }
    out.push({ T, Sa: aTotMax, Sv: vMax, Sd: uMax });
  }
  return out;
}

// Thresholds are stored and displayed in mm/s (velocity). Ground acceleration (g)
// requires separate fields and integration steps — not convertible to velocity without
// knowing frequency, so no unit toggle is offered here.
