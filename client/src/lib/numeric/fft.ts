

// Cooley-Tukey FFT, radix-2 DIT, in-place on Float64Arrays
export function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k], uIm = im[i + k];
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = uRe + vRe; im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe; im[i + k + len / 2] = uIm - vIm;
        const nRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nRe;
      }
    }
  }
}

export function nextPow2(n: number): number { let p = 1; while (p < n) p <<= 1; return p; }

export interface SpectrumPoint { freq: number; amp: number }
export interface HVPoint { freq: number; hv: number }
export interface FftChartPoint { freq: number; Z: number; NS: number; EW: number }

export function computeSpectrum(signal: number[], sampleRate: number): SpectrumPoint[] {
  const N = nextPow2(Math.min(signal.length, 8192));
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    re[i] = (signal[i] ?? 0) * 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
  }
  fftInPlace(re, im);
  const half = N / 2;
  const result: SpectrumPoint[] = [];
  for (let k = 1; k < half; k++) {
    result.push({ freq: (k * sampleRate) / N, amp: 2 * Math.sqrt(re[k] ** 2 + im[k] ** 2) / N });
  }
  return result;
}

export function computeHV(z: number[], ns: number[], ew: number[], sampleRate: number): HVPoint[] {
  const fZ = computeSpectrum(z, sampleRate);
  const fNS = computeSpectrum(ns, sampleRate);
  const fEW = computeSpectrum(ew, sampleRate);
  return fZ.map((pt, i) => ({
    freq: pt.freq,
    hv: pt.amp > 1e-12 ? Math.sqrt((fNS[i].amp ** 2 + fEW[i].amp ** 2) / 2) / pt.amp : 0
  }));
}

// Seeded PRNG used ONLY for the waveform chart (orientation display, not analysis).
// FFT/HV computations require real dataZ/dataNS/dataEW from the record.
