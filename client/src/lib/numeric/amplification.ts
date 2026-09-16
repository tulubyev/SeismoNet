import { Input } from '@/components/ui/input';


// ─── МТСМ — 1D SH-wave transfer function (Thomson-Haskell propagator) ────────
// Computes |H(f)| = surface motion / 2× incident bedrock motion for vertically
// propagating SH waves through a stack of horizontal layers above an elastic
// halfspace. Damping is included via complex shear modulus.
//
// Layers ordered top → bottom; the deepest entry is treated as half-space
// (its `thickness` is ignored).
//
// Refs: Kramer S.L., "Geotechnical Earthquake Engineering" (1996), §7.5.2.
//       Haskell N.A. (1953), Bull. Seism. Soc. Am.

export interface AmpLayer { thickness: number; vs: number; density: number; damping: number; }
export interface AmpPoint { freq: number; amp: number; }

// Complex helpers (re/im pairs)
export const cMul = (ar: number, ai: number, br: number, bi: number): [number, number] =>
  [ar*br - ai*bi, ar*bi + ai*br];
export const cDiv = (ar: number, ai: number, br: number, bi: number): [number, number] => {
  const d = br*br + bi*bi;
  return [(ar*br + ai*bi)/d, (ai*br - ar*bi)/d];
};
export const cExp = (ar: number, ai: number): [number, number] => {
  const e = Math.exp(ar);
  return [e * Math.cos(ai), e * Math.sin(ai)];
};
export const cSqrt = (ar: number, ai: number): [number, number] => {
  const r = Math.hypot(ar, ai);
  const re = Math.sqrt((r + ar)/2);
  const im = Math.sign(ai || 1) * Math.sqrt((r - ar)/2);
  return [re, im];
};

export function computeAmplification(layers: AmpLayer[], freqs: number[]): AmpPoint[] {
  if (layers.length < 2) return [];
  const N = layers.length;
  const result: AmpPoint[] = [];

  for (const f of freqs) {
    if (f <= 0) { result.push({ freq: f, amp: 1 }); continue; }
    const omega = 2 * Math.PI * f;

    // Free-surface BC: A_1 = B_1 = 1 (down + up wave amplitudes equal)
    let Ar = 1, Ai = 0, Br = 1, Bi = 0;

    for (let i = 0; i < N - 1; i++) {
      const L = layers[i], M = layers[i+1];
      // Complex shear-wave velocity Vs* = Vs √(1 + 2iξ)
      const [vs1r, vs1i] = cSqrt(L.vs*L.vs, 2 * L.vs*L.vs * L.damping);
      const [vs2r, vs2i] = cSqrt(M.vs*M.vs, 2 * M.vs*M.vs * M.damping);
      // k_i = ω / Vs*
      const [k1r, k1i] = cDiv(omega, 0, vs1r, vs1i);
      const [k2r, k2i] = cDiv(omega, 0, vs2r, vs2i);
      // Impedance ratio α* = (ρ1 Vs1*) / (ρ2 Vs2*)  — Kramer (1996), Eq. 7.21
      const [alphaR, alphaI] = cDiv(L.density * vs1r, L.density * vs1i,
                                    M.density * vs2r, M.density * vs2i);
      // (k2 unused after this — kept its computation only as documentation)
      void k2r; void k2i;
      // Phase ψ = i k_i h_i
      const [psiR, psiI] = [-k1i * L.thickness, k1r * L.thickness];
      const [eP_r, eP_i] = cExp(psiR, psiI);
      const [eN_r, eN_i] = cExp(-psiR, -psiI);
      // A_{i+1} = 0.5 A_i (1+α*) e^{+iψ} + 0.5 B_i (1-α*) e^{-iψ}
      // B_{i+1} = 0.5 A_i (1-α*) e^{+iψ} + 0.5 B_i (1+α*) e^{-iψ}
      const [pR, pI] = [1 + alphaR, alphaI];
      const [mR, mI] = [1 - alphaR, -alphaI];
      const [t1r, t1i] = cMul(...cMul(Ar, Ai, pR, pI), eP_r, eP_i);
      const [t2r, t2i] = cMul(...cMul(Br, Bi, mR, mI), eN_r, eN_i);
      const [t3r, t3i] = cMul(...cMul(Ar, Ai, mR, mI), eP_r, eP_i);
      const [t4r, t4i] = cMul(...cMul(Br, Bi, pR, pI), eN_r, eN_i);
      Ar = 0.5*(t1r + t2r); Ai = 0.5*(t1i + t2i);
      Br = 0.5*(t3r + t4r); Bi = 0.5*(t3i + t4i);
    }
    // Surface motion = 2·A_1 = 2; bedrock incident motion = B_N → amp = 1/|B_N|
    const amp = 1 / Math.hypot(Br, Bi);
    result.push({ freq: f, amp });
  }
  return result;
}

// ─── SDOF response spectrum (Newmark-β, β=1/4, γ=1/2) ───────────────────────
// Input: ground-acceleration time history `ag` (m/s²), sample step `dt` (s).
// Output: Sa (m/s²), Sv (m/s), Sd (m) for each requested period T.
// Refs: Chopra A.K., "Dynamics of Structures", Table 5.7.2.
