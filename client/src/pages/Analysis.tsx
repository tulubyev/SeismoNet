import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SP14_ACCELEROGRAMS,
  SP14_BY_INTENSITY,
  SP14_SOIL_K_TABLE4,
  SP14_PGA_TABLE3,
  SP14_K1_TABLE5,
  sp14DesignSpectrum,
  synthesizeSP14Accelerogram,
  type NormativeAccelerogram,
  type SeismicIntensity,
} from '@/data/sp14-accelerograms';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Activity, Plus, Trash2, Save, AlertTriangle, CheckCircle2, FlaskConical, Waves, BarChart3, Zap, Layers as LayersIcon, Building2, Download, BookOpen, TriangleAlert } from 'lucide-react';
import type { SensorInstallation, SeismogramRecord, CalibrationSession, CalibrationAfc, SoilProfile, SoilLayer, InfrastructureObject, SeismicCalculation } from '@shared/schema';

// Cooley-Tukey FFT, radix-2 DIT, in-place on Float64Arrays
function fftInPlace(re: Float64Array, im: Float64Array): void {
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

function nextPow2(n: number): number { let p = 1; while (p < n) p <<= 1; return p; }

interface SpectrumPoint { freq: number; amp: number }
interface HVPoint { freq: number; hv: number }
interface FftChartPoint { freq: number; Z: number; NS: number; EW: number }

function computeSpectrum(signal: number[], sampleRate: number): SpectrumPoint[] {
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

function computeHV(z: number[], ns: number[], ew: number[], sampleRate: number): HVPoint[] {
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
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function displayWaveform(rec: SeismogramRecord, component: 'Z' | 'NS' | 'EW'): number[] {
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

function hasRealData(rec: SeismogramRecord | null): boolean {
  if (!rec) return false;
  const ok = (v: unknown) => Array.isArray(v) && (v as unknown[]).length > 0 && typeof (v as unknown[])[0] === 'number';
  return ok(rec.dataZ) && ok(rec.dataNS) && ok(rec.dataEW);
}

function getRealArrays(rec: SeismogramRecord): { z: number[]; ns: number[]; ew: number[] } {
  return {
    z:  rec.dataZ  as number[],
    ns: rec.dataNS as number[],
    ew: rec.dataEW as number[],
  };
}

function decimateForChart(signal: number[], sampleRate: number, label: string): Record<string, number>[] {
  const step = Math.max(1, Math.floor(signal.length / 600));
  return signal.filter((_, i) => i % step === 0).map((v, i) => ({
    t: parseFloat(((i * step) / sampleRate).toFixed(2)),
    [label]: parseFloat(v.toFixed(5))
  }));
}

const DEFAULT_AFC = [
  { frequency: 0.1, amplitude: -40, phase: 160 }, { frequency: 0.3, amplitude: -22, phase: 140 },
  { frequency: 0.5, amplitude: -14, phase: 120 }, { frequency: 1.0, amplitude:  -4, phase:  90 },
  { frequency: 2.0, amplitude:   0, phase:   0 }, { frequency: 5.0, amplitude:  -1, phase: -10 },
  { frequency: 10.0, amplitude: -3, phase: -20 }, { frequency: 20.0, amplitude: -8, phase: -40 },
  { frequency: 50.0, amplitude: -20, phase: -90 },
];

function isExpired(d: string | Date): boolean {
  const ago = new Date(); ago.setMonth(ago.getMonth() - 6);
  return new Date(d) < ago;
}

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

interface AmpLayer { thickness: number; vs: number; density: number; damping: number; }
interface AmpPoint { freq: number; amp: number; }

// Complex helpers (re/im pairs)
const cMul = (ar: number, ai: number, br: number, bi: number): [number, number] =>
  [ar*br - ai*bi, ar*bi + ai*br];
const cDiv = (ar: number, ai: number, br: number, bi: number): [number, number] => {
  const d = br*br + bi*bi;
  return [(ar*br + ai*bi)/d, (ai*br - ar*bi)/d];
};
const cExp = (ar: number, ai: number): [number, number] => {
  const e = Math.exp(ar);
  return [e * Math.cos(ai), e * Math.sin(ai)];
};
const cSqrt = (ar: number, ai: number): [number, number] => {
  const r = Math.hypot(ar, ai);
  const re = Math.sqrt((r + ar)/2);
  const im = Math.sign(ai || 1) * Math.sqrt((r - ar)/2);
  return [re, im];
};

function computeAmplification(layers: AmpLayer[], freqs: number[]): AmpPoint[] {
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

interface SpecPoint { T: number; Sa: number; Sv: number; Sd: number; }

type RespComponent = 'Z' | 'NS' | 'EW' | 'AVG3' | 'GMH';

const RESP_COMPONENT_LABEL: Record<RespComponent, string> = {
  Z:    'Z (вертикальная)',
  NS:   'NS (С–Ю)',
  EW:   'EW (В–З)',
  GMH:  'NS⊕EW — геом. среднее горизонталей (СП 14)',
  AVG3: 'Все 3 — геом. среднее Z+NS+EW',
};

// Geometric mean of N spectra (point-by-point on Sa, Sv, Sd).
// Per SP 14.13330, the geomean of horizontal pair gives a single
// orientation-independent curve directly comparable to the design spectrum.
function combineSpectraGeomean(spectra: SpecPoint[][]): SpecPoint[] {
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

function responseSpectrum(ag: number[], dt: number, periods: number[], zeta = 0.05): SpecPoint[] {
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

const Analysis: FC = () => {
  const { toast } = useToast();

  const { data: installations = [] } = useQuery<SensorInstallation[]>({ queryKey: ['/api/sensor-installations'] });
  const { data: seismograms = [] }   = useQuery<SeismogramRecord[]>({ queryKey: ['/api/seismograms'] });
  const { data: objects = [] }       = useQuery<InfrastructureObject[]>({ queryKey: ['/api/infrastructure-objects'] });
  const { data: soilProfiles = [] }  = useQuery<SoilProfile[]>({ queryKey: ['/api/soil-profiles'] });

  const [selectedInstId,       setSelectedInstId]       = useState<number | null>(null);
  const [selectedSeismogramId, setSelectedSeismogramId] = useState<number | null>(null);
  const [selectedSessionId,    setSelectedSessionId]    = useState<number | null>(null);
  const [showNewSessionForm,   setShowNewSessionForm]   = useState(false);
  const [fftData,   setFftData]   = useState<FftChartPoint[] | null>(null);
  const [hvResult,  setHvResult]  = useState<HVPoint[] | null>(null);
  const [selectedSoilProfileId, setSelectedSoilProfileId] = useState<number | null>(null);
  const [bedrockVs,      setBedrockVs]      = useState<string>('1500');
  const [bedrockDensity, setBedrockDensity] = useState<string>('2400');
  const [bedrockDamping, setBedrockDamping] = useState<string>('0.005');
  const [ampResult,      setAmpResult]      = useState<AmpPoint[] | null>(null);
  const [respDamping,    setRespDamping]    = useState<string>('5');
  const [respComponent,  setRespComponent]  = useState<RespComponent>('NS');
  const [respResult,     setRespResult]     = useState<SpecPoint[] | null>(null);
  const [afcRows,   setAfcRows]   = useState(DEFAULT_AFC);
  const [thresholdZMmS,  setThresholdZMmS]  = useState<number | null>(null);
  const [thresholdHMmS,  setThresholdHMmS]  = useState<number | null>(null);
  const [showSynthetic,  setShowSynthetic]  = useState(false);
  const [form, setForm] = useState({
    sessionDate: new Date().toISOString().slice(0, 10), operator: '',
    sensitivityZ: '10.0', sensitivityNS: '10.0', sensitivityEW: '10.0',
    dampingRatio: '70', naturalFrequency: '2.0', status: 'complete', notes: ''
  });

  const { data: sessions = [] } = useQuery<CalibrationSession[]>({
    queryKey: ['/api/calibration-sessions', selectedInstId],
    queryFn: async () => {
      if (!selectedInstId) return [];
      const res = await fetch(`/api/calibration-sessions?installationId=${selectedInstId}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedInstId
  });

  const { data: afcData = [] } = useQuery<CalibrationAfc[]>({
    queryKey: ['/api/calibration-afc', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return [];
      const res = await fetch(`/api/calibration-afc?sessionId=${selectedSessionId}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedSessionId
  });

  useEffect(() => {
    // Always sync AFC table with fetched data. If session has no points, reset to default preset
    // to avoid carryover from a previously selected session.
    if (afcData.length > 0) {
      setAfcRows(afcData.map(p => ({ frequency: p.frequency, amplitude: p.amplitude, phase: p.phase ?? 0 })));
    } else if (selectedSessionId != null) {
      setAfcRows(DEFAULT_AFC);
    }
  }, [afcData, selectedSessionId]);

  const createSession = useMutation({
    mutationFn: (data: object) => apiRequest('POST', '/api/calibration-sessions', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/calibration-sessions', selectedInstId] }); setShowNewSessionForm(false); toast({ title: 'Сессия создана' }); }
  });
  const deleteSession = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/calibration-sessions/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/calibration-sessions', selectedInstId] }); setSelectedSessionId(null); toast({ title: 'Сессия удалена' }); }
  });
  const saveAfc = useMutation({
    mutationFn: (data: object) => apiRequest('PUT', '/api/calibration-afc', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/calibration-afc', selectedSessionId] }); toast({ title: 'АЧХ сохранена' }); }
  });
  const saveTriggerThresholds = useMutation({
    mutationFn: (data: object) => {
      if (!selectedInstId) throw new Error('No installation selected');
      return apiRequest('PATCH', `/api/sensor-installations/${selectedInstId}`, data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/sensor-installations'] }); toast({ title: 'Пороги сохранены' }); }
  });

  const selectedInst = installations.find(i => i.id === selectedInstId);
  const selectedSeismogram = seismograms.find(s => s.id === selectedSeismogramId) ?? null;

  useEffect(() => {
    if (selectedInst) {
      setThresholdZMmS(selectedInst.triggerThresholdZ ?? null);
      setThresholdHMmS(selectedInst.triggerThresholdH ?? null);
    }
  }, [selectedInst]);

  const mmSToDisplay = (v: number | null): string => v == null ? '' : v.toFixed(4);
  const displayToMmS = (s: string): number | null => { const v = parseFloat(s); return isNaN(v) ? null : v; };

  const afcChartData = [...afcRows].sort((a, b) => a.frequency - b.frequency).map(r => ({ freq: r.frequency, amp: r.amplitude, phase: r.phase }));

  const runFFT = useCallback(() => {
    if (!selectedSeismogram || !hasRealData(selectedSeismogram)) return;
    const { z, ns, ew } = getRealArrays(selectedSeismogram);
    const sr = selectedSeismogram.sampleRate || 100;
    const spZ = computeSpectrum(z, sr), spNS = computeSpectrum(ns, sr), spEW = computeSpectrum(ew, sr);
    setFftData(spZ.map((pt, i) => ({ freq: parseFloat(pt.freq.toFixed(3)), Z: parseFloat(pt.amp.toFixed(6)), NS: parseFloat(spNS[i].amp.toFixed(6)), EW: parseFloat(spEW[i].amp.toFixed(6)) })));
    setHvResult(null);
  }, [selectedSeismogram]);

  const runHV = useCallback(() => {
    if (!selectedSeismogram || !hasRealData(selectedSeismogram)) return;
    const { z, ns, ew } = getRealArrays(selectedSeismogram);
    const sr = selectedSeismogram.sampleRate || 100;
    setHvResult(computeHV(z, ns, ew, sr).filter(pt => pt.freq >= 0.1 && pt.freq <= 20).map(pt => ({ freq: parseFloat(pt.freq.toFixed(3)), hv: parseFloat(pt.hv.toFixed(4)) })));
  }, [selectedSeismogram]);

  const peakHv = hvResult ? hvResult.reduce((b, pt) => pt.hv > b.hv ? pt : b, { freq: 0, hv: 0 }) : null;

  const handleNewSession = () => {
    if (!selectedInstId) return;
    createSession.mutate({
      installationId: selectedInstId,
      sessionDate: form.sessionDate,
      operator: form.operator || 'ИЗК СО РАН',
      sensitivityZ: parseFloat(form.sensitivityZ), sensitivityNS: parseFloat(form.sensitivityNS), sensitivityEW: parseFloat(form.sensitivityEW),
      dampingRatio: parseFloat(form.dampingRatio), naturalFrequency: parseFloat(form.naturalFrequency),
      status: form.status, notes: form.notes
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <FlaskConical className="h-6 w-6 text-purple-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-800">Калибровка и спектральный анализ</h1>
          <p className="text-sm text-slate-500">АЧХ датчиков · FFT · метод H/V Накамуры</p>
        </div>
      </div>

      <Tabs defaultValue="calibration" className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full max-w-5xl">
          <TabsTrigger value="calibration"   className="text-xs gap-1"><FlaskConical className="h-3.5 w-3.5" />Калибровка</TabsTrigger>
          <TabsTrigger value="afc"           className="text-xs gap-1"><Activity className="h-3.5 w-3.5" />АЧХ</TabsTrigger>
          <TabsTrigger value="waveforms"     className="text-xs gap-1"><Waves className="h-3.5 w-3.5" />Волновые формы</TabsTrigger>
          <TabsTrigger value="spectrum"      className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" />FFT & H/V</TabsTrigger>
          <TabsTrigger value="amplification" className="text-xs gap-1"><LayersIcon className="h-3.5 w-3.5" />Усиление</TabsTrigger>
          <TabsTrigger value="response"      className="text-xs gap-1"><Building2 className="h-3.5 w-3.5" />Отклик</TabsTrigger>
          <TabsTrigger value="resonance"     className="text-xs gap-1"><TriangleAlert className="h-3.5 w-3.5" />Резонанс</TabsTrigger>
        </TabsList>

        <TabsContent value="calibration" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-slate-600">Датчик (инсталляция)</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <Select value={selectedInstId?.toString() ?? ''} onValueChange={v => { setSelectedInstId(parseInt(v)); setSelectedSessionId(null); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Выбрать датчик..." /></SelectTrigger>
                  <SelectContent>
                    {installations.map(i => (<SelectItem key={i.id} value={i.id.toString()} className="text-sm">{i.stationId} · {i.installationLocation ?? 'б/у'} · эт.{i.floor ?? '–'}</SelectItem>))}
                  </SelectContent>
                </Select>
                {selectedInst && (
                  <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                    <div>Тип: <span className="font-medium text-slate-700">{selectedInst.sensorType ?? '–'}</span></div>
                    <div>Чувств.: <span className="font-medium text-slate-700">{selectedInst.sensitivity ?? '–'} В/(м/с)</span></div>
                    <div>Диапазон: <span className="font-medium text-slate-700">{selectedInst.frequencyRange ?? '–'}</span></div>
                  </div>
                )}
                {selectedInst && (
                  <div className="pt-3 border-t space-y-2">
                    <p className="text-xs font-medium text-slate-600">Пороги срабатывания, мм/с</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Z (мм/с)</Label>
                        <Input type="number" step="0.001" value={mmSToDisplay(thresholdZMmS)}
                          onChange={e => setThresholdZMmS(displayToMmS(e.target.value))} className="h-7 text-xs font-mono" placeholder="0.005" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">NS/EW (мм/с)</Label>
                        <Input type="number" step="0.001" value={mmSToDisplay(thresholdHMmS)}
                          onChange={e => setThresholdHMmS(displayToMmS(e.target.value))} className="h-7 text-xs font-mono" placeholder="0.003" />
                      </div>
                    </div>
                    <Button size="sm" className="w-full h-7 text-xs" variant="outline"
                      onClick={() => saveTriggerThresholds.mutate({ triggerThresholdZ: thresholdZMmS, triggerThresholdH: thresholdHMmS })}
                      disabled={saveTriggerThresholds.isPending}>
                      <Save className="h-3 w-3 mr-1" /> Сохранить пороги
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
                <CardTitle className="text-sm text-slate-600">История калибровок</CardTitle>
                {selectedInstId && (
                  <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => setShowNewSessionForm(v => !v)}>
                    <Plus className="h-3 w-3" />{showNewSessionForm ? 'Отмена' : 'Новая сессия'}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {showNewSessionForm && (
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="pt-3 pb-3 px-3 space-y-3">
                      <p className="text-xs font-medium text-slate-700">Новая сессия калибровки</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ['Дата *', 'date', 'sessionDate', {}],
                          ['Оператор *', 'text', 'operator', { placeholder: 'ФИО / организация' }],
                          ['SZ В/(м/с)', 'number', 'sensitivityZ', { step: '0.1' }],
                          ['SNS В/(м/с)', 'number', 'sensitivityNS', { step: '0.1' }],
                          ['SEW В/(м/с)', 'number', 'sensitivityEW', { step: '0.1' }],
                          ['Затухание, %', 'number', 'dampingRatio', { step: '1' }],
                          ['Собств. частота, Гц', 'number', 'naturalFrequency', { step: '0.1' }],
                        ].map(([label, type, field, extra]) => (
                          <div key={field as string} className="space-y-1">
                            <Label className="text-[11px] text-slate-500">{label as string}</Label>
                            <Input type={type as string} value={form[field as keyof typeof form]} {...(extra as object)}
                              onChange={e => setForm(f => ({ ...f, [field as string]: e.target.value }))}
                              className="h-7 text-xs font-mono" />
                          </div>
                        ))}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500">Статус</Label>
                          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="complete">Выполнена</SelectItem>
                              <SelectItem value="pending">В процессе</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[11px] text-slate-500">Примечания</Label>
                          <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Доп. информация" className="h-7 text-xs" />
                        </div>
                      </div>
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={handleNewSession} disabled={createSession.isPending}>
                        <Save className="h-3 w-3" /> Сохранить сессию
                      </Button>
                    </CardContent>
                  </Card>
                )}
                {!selectedInstId && <p className="text-sm text-slate-400 py-4 text-center">Выберите инсталляцию датчика</p>}
                {selectedInstId && sessions.length === 0 && !showNewSessionForm && <p className="text-sm text-slate-400 py-4 text-center">Калибровок не найдено</p>}
                {sessions.map(s => {
                  const expired = isExpired(s.sessionDate);
                  const active  = selectedSessionId === s.id;
                  return (
                    <div key={s.id}
                      className={`rounded-lg border p-3 cursor-pointer transition-colors ${active ? 'border-purple-400 bg-purple-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                      onClick={() => setSelectedSessionId(s.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-800">{new Date(s.sessionDate).toLocaleDateString('ru-RU')}</span>
                            <Badge variant={s.status === 'complete' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                              {s.status === 'complete' ? 'Выполнена' : 'В процессе'}
                            </Badge>
                            {expired
                              ? <Badge variant="destructive" className="text-[10px] h-4 px-1.5 gap-0.5"><AlertTriangle className="h-2.5 w-2.5" /> Просрочена (&gt;6 мес)</Badge>
                              : s.status === 'complete' && <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-green-700 border-green-300 gap-0.5"><CheckCircle2 className="h-2.5 w-2.5" /> Актуальна</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Оператор: {s.operator}</p>
                          <div className="flex gap-3 text-xs text-slate-600 mt-1 font-mono">
                            <span>SZ={s.sensitivityZ ?? '–'}</span><span>SNS={s.sensitivityNS ?? '–'}</span><span>SEW={s.sensitivityEW ?? '–'} В/(м/с)</span>
                          </div>
                          {s.naturalFrequency && <p className="text-xs text-slate-500">f₀={s.naturalFrequency} Гц, D={s.dampingRatio ?? '–'}%</p>}
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-red-500 flex-shrink-0"
                          onClick={e => { e.stopPropagation(); deleteSession.mutate(s.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="afc" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
                <CardTitle className="text-sm text-slate-600">Таблица АЧХ</CardTitle>
                <Select value={selectedSessionId?.toString() ?? ''} onValueChange={v => setSelectedSessionId(parseInt(v))}>
                  <SelectTrigger className="h-7 w-52 text-xs"><SelectValue placeholder="Выберите сессию..." /></SelectTrigger>
                  <SelectContent>
                    {sessions.map(s => (<SelectItem key={s.id} value={s.id.toString()} className="text-xs">{new Date(s.sessionDate).toLocaleDateString('ru-RU')} – {s.operator}</SelectItem>))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {!selectedSessionId
                  ? <p className="text-sm text-slate-400 py-4 text-center">Выберите сессию</p>
                  : <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1.5 pr-3 text-slate-500 font-medium">Частота (Гц)</th>
                            <th className="text-left py-1.5 pr-3 text-slate-500 font-medium">Ампл. (дБ)</th>
                            <th className="text-left py-1.5 pr-3 text-slate-500 font-medium">Фаза (°)</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {afcRows.map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-1 pr-3"><Input type="number" step="0.01" value={row.frequency} onChange={e => setAfcRows(rows => rows.map((r, i) => i === idx ? { ...r, frequency: parseFloat(e.target.value) || 0 } : r))} className="h-6 w-20 text-xs font-mono" /></td>
                              <td className="py-1 pr-3"><Input type="number" step="0.1" value={row.amplitude} onChange={e => setAfcRows(rows => rows.map((r, i) => i === idx ? { ...r, amplitude: parseFloat(e.target.value) || 0 } : r))} className="h-6 w-20 text-xs font-mono" /></td>
                              <td className="py-1 pr-3"><Input type="number" step="1" value={row.phase} onChange={e => setAfcRows(rows => rows.map((r, i) => i === idx ? { ...r, phase: parseFloat(e.target.value) || 0 } : r))} className="h-6 w-20 text-xs font-mono" /></td>
                              <td className="py-1"><Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-red-500" onClick={() => setAfcRows(rows => rows.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></Button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAfcRows(rows => [...rows, { frequency: 1, amplitude: 0, phase: 0 }])}><Plus className="h-3 w-3" /> Точка</Button>
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1"
                        onClick={() => {
                          const bad = afcRows.filter(r => !isFinite(r.frequency) || r.frequency <= 0 || !isFinite(r.amplitude));
                          if (bad.length > 0) { toast({ title: 'Ошибка', description: 'Частота должна быть > 0 для всех строк', variant: 'destructive' }); return; }
                          saveAfc.mutate({ sessionId: selectedSessionId, points: afcRows });
                        }}
                        disabled={saveAfc.isPending}>
                        <Save className="h-3 w-3" /> Сохранить
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAfcRows(DEFAULT_AFC)}>Сброс (СМ-3КВ)</Button>
                    </div>
                  </>}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-slate-600">График АЧХ</CardTitle></CardHeader>
              <CardContent className="px-2 pb-4">
                {afcRows.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">Нет данных</p> : <>
                  <ResponsiveContainer width="100%" height={210}>
                    <LineChart data={afcChartData} margin={{ top: 5, right: 20, left: 0, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="freq" scale="log" type="number" domain={['dataMin', 'dataMax']}
                        label={{ value: 'Частота (Гц)', position: 'insideBottom', offset: -5, fontSize: 10 }}
                        tickFormatter={v => v < 1 ? v.toFixed(1) : v.toFixed(0)} tick={{ fontSize: 9 }} />
                      <YAxis label={{ value: 'Ампл. (дБ)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(1)} дБ`, 'Амплитуда']} labelFormatter={v => `f=${Number(v).toFixed(3)} Гц`} />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="amp" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} name="Амплитуда" />
                    </LineChart>
                  </ResponsiveContainer>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={afcChartData} margin={{ top: 5, right: 20, left: 0, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="freq" scale="log" type="number" domain={['dataMin', 'dataMax']}
                        tickFormatter={v => v < 1 ? v.toFixed(1) : v.toFixed(0)} tick={{ fontSize: 9 }} />
                      <YAxis label={{ value: 'Фаза (°)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(0)}°`, 'Фаза']} labelFormatter={v => `f=${Number(v).toFixed(3)} Гц`} />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="phase" stroke="#0891b2" strokeWidth={1.5} dot={{ r: 2 }} name="Фаза" />
                    </LineChart>
                  </ResponsiveContainer>
                </>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="waveforms" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm text-slate-600">Трёхкомпонентные волновые формы</CardTitle>
              <Select value={selectedSeismogramId?.toString() ?? ''} onValueChange={v => { setSelectedSeismogramId(parseInt(v)); setFftData(null); setHvResult(null); setShowSynthetic(false); }}>
                <SelectTrigger className="h-8 w-72 text-xs"><SelectValue placeholder="Выберите сейсмограмму..." /></SelectTrigger>
                <SelectContent>
                  {seismograms.map(s => (<SelectItem key={s.id} value={s.id.toString()} className="text-xs">{s.recordId} — {s.stationId} ({new Date(s.startTime).toLocaleDateString('ru-RU')})</SelectItem>))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              {!selectedSeismogram
                ? <p className="text-sm text-slate-400 py-8 text-center">Выберите запись из каталога</p>
                : (() => {
                  const real = hasRealData(selectedSeismogram);
                  const sr = selectedSeismogram.sampleRate || 100;
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4 text-xs text-slate-600 mb-1 px-2">
                        <div><span className="font-medium">Запись:</span> {selectedSeismogram.recordId}</div>
                        <div><span className="font-medium">M:</span> {selectedSeismogram.magnitude ?? '–'} {selectedSeismogram.magnitudeType ?? ''}</div>
                        <div><span className="font-medium">Станция:</span> {selectedSeismogram.stationId}</div>
                        <div><span className="font-medium">Длит.:</span> {selectedSeismogram.durationSec ?? '–'} с</div>
                        <div><span className="font-medium">Дискр.:</span> {sr} Гц</div>
                        <div><span className="font-medium">Доминир. f:</span> {selectedSeismogram.dominantFrequency ?? '–'} Гц</div>
                      </div>
                      {!real && (
                        <div className="mx-2 px-3 py-3 rounded border bg-amber-50 border-amber-300 text-xs text-amber-800 font-medium space-y-2">
                          <p>⚠ Компоненты (dataZ/NS/EW) для этой записи отсутствуют в базе данных.
                          Для точного анализа загрузите реальные данные. <strong>FFT и H/V недоступны.</strong></p>
                          <Button size="sm" variant="outline" className="h-6 text-xs border-amber-400 text-amber-800"
                            onClick={() => setShowSynthetic(v => !v)}>
                            {showSynthetic ? 'Скрыть' : 'Показать ориентировочный вид сигнала'}
                          </Button>
                        </div>
                      )}
                      {(real || showSynthetic) && (['Z', 'NS', 'EW'] as const).map(comp => {
                        const signal = displayWaveform(selectedSeismogram, comp);
                        const color = comp === 'Z' ? '#1d4ed8' : comp === 'NS' ? '#16a34a' : '#dc2626';
                        const threshold = comp === 'Z' ? thresholdZMmS : thresholdHMmS;
                        return (
                          <div key={comp}>
                            <p className="text-xs font-medium text-slate-600 mb-1 px-2">
                              {comp} компонента{!real ? <span className="ml-1 text-amber-600">(ориент.)</span> : null}
                            </p>
                            <ResponsiveContainer width="100%" height={120}>
                              <LineChart data={decimateForChart(signal, sr, comp)} margin={{ top: 2, right: 10, left: 30, bottom: 2 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="t" tick={{ fontSize: 9 }} tickFormatter={v => `${v}с`} minTickGap={30} />
                                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => v.toFixed(2)} />
                                <Tooltip formatter={(v: number) => [`${v.toFixed(5)} мм/с`, comp]} labelFormatter={v => `t=${v}с`} />
                                {threshold != null && <>
                                  <ReferenceLine y={threshold}  stroke="#ef4444" strokeDasharray="3 2" label={{ value: '+порог', fontSize: 8, fill: '#ef4444' }} />
                                  <ReferenceLine y={-threshold} stroke="#ef4444" strokeDasharray="3 2" label={{ value: '–порог', fontSize: 8, fill: '#ef4444' }} />
                                </>}
                                <Line type="monotone" dataKey={comp} stroke={color} strokeWidth={1} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spectrum" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={selectedSeismogramId?.toString() ?? ''} onValueChange={v => { setSelectedSeismogramId(parseInt(v)); setFftData(null); setHvResult(null); }}>
              <SelectTrigger className="h-8 w-72 text-xs"><SelectValue placeholder="Выберите сейсмограмму..." /></SelectTrigger>
              <SelectContent>
                {seismograms.map(s => (<SelectItem key={s.id} value={s.id.toString()} className="text-xs">{s.recordId} — {s.stationId} ({new Date(s.startTime).toLocaleDateString('ru-RU')})</SelectItem>))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="default" className="h-8 text-xs gap-1" onClick={runFFT} disabled={!selectedSeismogramId || !hasRealData(selectedSeismogram)}>
              <Zap className="h-3.5 w-3.5" /> Вычислить FFT
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={runHV} disabled={!selectedSeismogramId || !hasRealData(selectedSeismogram)}>
              <BarChart3 className="h-3.5 w-3.5" /> H/V (Накамура)
            </Button>
          </div>

          {selectedSeismogramId && !hasRealData(selectedSeismogram) && (
            <Card className="border-amber-300 bg-amber-50 shadow-sm">
              <CardContent className="py-4 px-4 text-sm text-amber-800 font-medium">
                ⚠ Запись не содержит реальных данных компонент (dataZ/NS/EW). Вычисление спектра и H/V невозможно.
                Загрузите запись с реальными данными для выполнения спектрального анализа.
              </CardContent>
            </Card>
          )}

          {fftData && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-slate-600">Амплитудный спектр Фурье (реальные данные)</CardTitle></CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={fftData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="freq" scale="log" type="number" domain={[0.1, 'dataMax']}
                      label={{ value: 'Частота (Гц)', position: 'insideBottom', offset: -5, fontSize: 10 }}
                      tickFormatter={v => v < 1 ? v.toFixed(1) : v.toFixed(0)} tick={{ fontSize: 9 }} />
                    <YAxis tickFormatter={v => v.toExponential(1)} tick={{ fontSize: 9 }} label={{ value: 'Амплитуда', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [v.toExponential(3), '']} labelFormatter={v => `f=${Number(v).toFixed(3)} Гц`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Z"  stroke="#1d4ed8" strokeWidth={1.2} dot={false} name="Z" />
                    <Line type="monotone" dataKey="NS" stroke="#16a34a" strokeWidth={1.2} dot={false} name="NS" />
                    <Line type="monotone" dataKey="EW" stroke="#dc2626" strokeWidth={1.2} dot={false} name="EW" />
                  </LineChart>
                </ResponsiveContainer>
                {selectedSeismogram?.dominantFrequency && (
                  <p className="text-xs text-slate-500 px-4">Доминирующая частота по каталогу: <strong>{selectedSeismogram.dominantFrequency} Гц</strong></p>
                )}
              </CardContent>
            </Card>
          )}

          {hvResult && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-slate-600">
                  Кривая H/V — метод Накамуры (реальные данные)
                  {peakHv && peakHv.freq > 0 && <span className="ml-2 text-purple-600 font-normal text-xs">f₀={peakHv.freq.toFixed(2)} Гц · H/V={peakHv.hv.toFixed(2)}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={hvResult} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="freq" scale="log" type="number" domain={[0.1, 20]}
                      label={{ value: 'Частота (Гц)', position: 'insideBottom', offset: -5, fontSize: 10 }}
                      tickFormatter={v => v < 1 ? v.toFixed(1) : v.toFixed(0)} tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} label={{ value: 'H/V', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [v.toFixed(3), 'H/V']} labelFormatter={v => `f=${Number(v).toFixed(3)} Гц`} />
                    <ReferenceLine y={2} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'H/V=2', fontSize: 9, fill: '#f59e0b' }} />
                    {peakHv && peakHv.freq > 0 && (
                      <ReferenceLine x={peakHv.freq} stroke="#7c3aed" strokeDasharray="4 2" label={{ value: `f₀=${peakHv.freq.toFixed(2)}Гц`, fontSize: 9, fill: '#7c3aed', position: 'top' }} />
                    )}
                    <Line type="monotone" dataKey="hv" stroke="#7c3aed" strokeWidth={2} dot={false} name="H/V" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="px-4 text-xs text-slate-500 space-y-0.5">
                  <p>H/V = √((NS²+EW²)/2) / Z — спектральное отношение по методу Накамуры.</p>
                  {peakHv && peakHv.freq > 0 && <p className="text-purple-600 font-medium">Резонансная частота f₀ ≈ {peakHv.freq.toFixed(2)} Гц → Tₛ ≈ {(1 / peakHv.freq).toFixed(2)} с</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {!fftData && !hvResult && selectedSeismogramId && hasRealData(selectedSeismogram) && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center text-slate-400">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Нажмите «Вычислить FFT» или «H/V (Накамура)»</p>
              </CardContent>
            </Card>
          )}

          {!selectedSeismogramId && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center text-slate-400">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Выберите сейсмограмму с реальными данными компонент</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="amplification" className="space-y-4">
          <AmplificationTab
            objects={objects}
            soilProfiles={soilProfiles}
            selectedSoilProfileId={selectedSoilProfileId}
            setSelectedSoilProfileId={setSelectedSoilProfileId}
            bedrockVs={bedrockVs} setBedrockVs={setBedrockVs}
            bedrockDensity={bedrockDensity} setBedrockDensity={setBedrockDensity}
            bedrockDamping={bedrockDamping} setBedrockDamping={setBedrockDamping}
            ampResult={ampResult} setAmpResult={setAmpResult}
            toast={toast}
          />
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          <ResponseTab
            seismograms={seismograms}
            selectedSeismogramId={selectedSeismogramId}
            setSelectedSeismogramId={setSelectedSeismogramId}
            respDamping={respDamping} setRespDamping={setRespDamping}
            respComponent={respComponent} setRespComponent={setRespComponent}
            respResult={respResult} setRespResult={setRespResult}
            toast={toast}
          />
        </TabsContent>

        <TabsContent value="resonance" className="space-y-4">
          <ResonanceTab
            objects={objects}
            soilProfiles={soilProfiles}
            toast={toast}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Amplification tab (МТСМ — 1D SH transfer function) ─────────────────────

interface AmpTabProps {
  objects: InfrastructureObject[];
  soilProfiles: SoilProfile[];
  selectedSoilProfileId: number | null;
  setSelectedSoilProfileId: (id: number | null) => void;
  bedrockVs: string;      setBedrockVs: (v: string) => void;
  bedrockDensity: string; setBedrockDensity: (v: string) => void;
  bedrockDamping: string; setBedrockDamping: (v: string) => void;
  ampResult: AmpPoint[] | null; setAmpResult: (v: AmpPoint[] | null) => void;
  toast: ReturnType<typeof useToast>['toast'];
}

const AmplificationTab: FC<AmpTabProps> = ({
  objects, soilProfiles, selectedSoilProfileId, setSelectedSoilProfileId,
  bedrockVs, setBedrockVs, bedrockDensity, setBedrockDensity,
  bedrockDamping, setBedrockDamping, ampResult, setAmpResult, toast
}) => {
  const { data: layers = [] } = useQuery<SoilLayer[]>({
    queryKey: ['/api/soil-profiles', selectedSoilProfileId, 'layers'],
    queryFn: async () => {
      if (!selectedSoilProfileId) return [];
      const res = await fetch(`/api/soil-profiles/${selectedSoilProfileId}/layers`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedSoilProfileId,
  });

  const profile = soilProfiles.find(p => p.id === selectedSoilProfileId) ?? null;
  const objectName = (id: number | null) => id == null ? '—' :
    (objects.find(o => o.id === id)?.name ?? `#${id}`);

  const sortedLayers = [...layers].sort((a, b) => a.layerNumber - b.layerNumber);
  const f0Estimate = profile?.dominantFrequency ??
    (sortedLayers.length > 0 && sortedLayers[0].shearVelocity > 0
      ? sortedLayers[0].shearVelocity / (4 * sortedLayers.reduce((s, l) => s + l.thickness, 0))
      : null);

  const handleCompute = useCallback(() => {
    if (sortedLayers.length === 0) {
      toast({ title: 'Нет слоёв грунта', description: 'У выбранного профиля нет инженерно-геологических слоёв.' });
      return;
    }
    const vsBR = parseFloat(bedrockVs); const rhoBR = parseFloat(bedrockDensity); const xiBR = parseFloat(bedrockDamping);
    if (!isFinite(vsBR) || vsBR <= 0 || !isFinite(rhoBR) || rhoBR <= 0) {
      toast({ title: 'Параметры скального основания некорректны', variant: 'destructive' });
      return;
    }
    const ampLayers: AmpLayer[] = sortedLayers.map(l => ({
      thickness: l.thickness,
      vs:        l.shearVelocity,
      density:   l.density ?? 1900,
      damping:   (l.dampingRatio ?? 3) / 100,  // % → decimal
    }));
    ampLayers.push({ thickness: 0, vs: vsBR, density: rhoBR, damping: xiBR });
    // Log-spaced frequency grid 0.1…25 Hz
    const fs: number[] = [];
    const NF = 200;
    for (let i = 0; i < NF; i++) fs.push(Math.pow(10, -1 + (Math.log10(25) + 1) * i / (NF - 1)));
    setAmpResult(computeAmplification(ampLayers, fs));
  }, [sortedLayers, bedrockVs, bedrockDensity, bedrockDamping, setAmpResult, toast]);

  const peakAmp = ampResult ? ampResult.reduce((b, p) => p.amp > b.amp ? p : b, { freq: 0, amp: 0 }) : null;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-slate-600">Профиль грунта</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <Select
              value={selectedSoilProfileId?.toString() ?? ''}
              onValueChange={v => { setSelectedSoilProfileId(parseInt(v)); setAmpResult(null); }}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Выбрать профиль..." /></SelectTrigger>
              <SelectContent>
                {soilProfiles.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()} className="text-xs">
                    {p.profileName} · {objectName(p.objectId)} · кат. {p.soilCategory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {profile && (
              <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                <div>Объект: <strong className="text-slate-700">{objectName(profile.objectId)}</strong></div>
                <div>Слоёв: <strong className="text-slate-700">{sortedLayers.length}</strong></div>
                {profile.boreholeDepth && <div>Глубина скважины: <strong className="text-slate-700">{profile.boreholeDepth} м</strong></div>}
                {f0Estimate && <div>Прогноз f₀ (1/4 длины волны): <strong className="text-purple-600">{f0Estimate.toFixed(2)} Гц</strong></div>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-slate-600">Скальное основание (полупространство)</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div>
              <Label className="text-xs">Vs, м/с</Label>
              <Input className="h-8 text-sm" value={bedrockVs} onChange={e => setBedrockVs(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Плотность ρ, кг/м³</Label>
              <Input className="h-8 text-sm" value={bedrockDensity} onChange={e => setBedrockDensity(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Затухание ξ (доли)</Label>
              <Input className="h-8 text-sm" value={bedrockDamping} onChange={e => setBedrockDamping(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-slate-600">Расчёт МТСМ</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <p className="text-xs text-slate-500 leading-snug">
              Метод Томсона–Хаскелла (1D SH-волна): передаточная функция
              «свободная поверхность / выход на коренные породы» с комплексным
              сдвиговым модулем (демпфирование).
            </p>
            <Button size="sm" className="w-full gap-1" onClick={handleCompute} disabled={!profile || sortedLayers.length === 0}>
              <Zap className="h-3.5 w-3.5" /> Вычислить |H(f)|
            </Button>
            {peakAmp && peakAmp.freq > 0 && (
              <div className="text-xs pt-1">
                <div>Резонанс: <strong className="text-purple-600">f = {peakAmp.freq.toFixed(2)} Гц</strong></div>
                <div>Макс. усиление: <strong className="text-purple-600">A = {peakAmp.amp.toFixed(2)}</strong></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {sortedLayers.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm text-slate-600">Стратиграфия профиля</CardTitle></CardHeader>
          <CardContent className="px-2 pb-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-2 py-1 text-left">№</th>
                  <th className="px-2 py-1 text-left">Тип</th>
                  <th className="px-2 py-1 text-right">h, м</th>
                  <th className="px-2 py-1 text-right">Vs, м/с</th>
                  <th className="px-2 py-1 text-right">ρ, кг/м³</th>
                  <th className="px-2 py-1 text-right">ξ, %</th>
                </tr>
              </thead>
              <tbody>
                {sortedLayers.map(l => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-2 py-1">{l.layerNumber}</td>
                    <td className="px-2 py-1">{l.soilType}</td>
                    <td className="px-2 py-1 text-right">{l.thickness.toFixed(1)}</td>
                    <td className="px-2 py-1 text-right">{l.shearVelocity.toFixed(0)}</td>
                    <td className="px-2 py-1 text-right">{l.density?.toFixed(0) ?? '—'}</td>
                    <td className="px-2 py-1 text-right">{l.dampingRatio?.toFixed(1) ?? '3.0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {ampResult && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm text-slate-600">
              Передаточная функция |H(f)| — амплитудно-частотная характеристика грунтовой толщи
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ampResult} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="freq" scale="log" type="number" domain={[0.1, 25]}
                  label={{ value: 'Частота (Гц)', position: 'insideBottom', offset: -5, fontSize: 10 }}
                  tickFormatter={v => v < 1 ? v.toFixed(1) : v.toFixed(0)} tick={{ fontSize: 9 }}
                />
                <YAxis
                  label={{ value: 'A = u_surf / u_bedr', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }}
                  tick={{ fontSize: 9 }}
                />
                <Tooltip formatter={(v: number) => [v.toFixed(3), 'A']} labelFormatter={v => `f=${Number(v).toFixed(3)} Гц`} />
                <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="3 3" />
                {peakAmp && peakAmp.freq > 0 && (
                  <ReferenceLine x={peakAmp.freq} stroke="#7c3aed" strokeDasharray="4 2"
                    label={{ value: `f₀=${peakAmp.freq.toFixed(2)} Гц`, fontSize: 9, fill: '#7c3aed', position: 'top' }} />
                )}
                <Line type="monotone" dataKey="amp" stroke="#0891b2" strokeWidth={1.8} dot={false} name="|H(f)|" />
              </LineChart>
            </ResponsiveContainer>
            <div className="px-4 text-xs text-slate-500 space-y-0.5">
              <p>Метод: 1D SH-волна, формализм Томсона–Хаскелла; демпфирование введено через комплексный модуль сдвига G* = ρVs²(1+2iξ).</p>
              {peakAmp && peakAmp.freq > 0 && (
                <p className="text-purple-600 font-medium">
                  f₀ ≈ {peakAmp.freq.toFixed(2)} Гц · A_max ≈ {peakAmp.amp.toFixed(2)} · Tₛ ≈ {(1/peakAmp.freq).toFixed(2)} с
                </p>
              )}
            </div>
            <div className="px-4 flex gap-2 pt-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={() => {
                  const rows = ['freq_hz,amplitude'].concat(ampResult!.map(p => `${p.freq.toFixed(4)},${p.amp.toFixed(6)}`));
                  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                  a.download = `mtsm_${profile?.profileName ?? 'result'}.csv`; a.click();
                }}>
                <Download className="h-3 w-3" /> CSV
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={async () => {
                  try {
                    const r = await fetch('/api/calculations', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ calcType: 'mtsm', soilProfileId: selectedSoilProfileId,
                        inputParams: { bedrockVs: parseFloat(bedrockVs), bedrockDensity: parseFloat(bedrockDensity), bedrockDamping: parseFloat(bedrockDamping) },
                        results: { points: ampResult, peakFreq: peakAmp?.freq, peakAmp: peakAmp?.amp } }) });
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    toast({ title: 'Результат сохранён в БД' });
                  } catch { toast({ title: 'Ошибка сохранения', variant: 'destructive' }); }
                }}>
                <Save className="h-3 w-3" /> Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!profile && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-10 text-center text-slate-400">
            <LayersIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Выберите профиль грунта для расчёта усиления</p>
          </CardContent>
        </Card>
      )}
    </>
  );
};

// ─── Baikal seismic scenario catalog (СП 14.13330.2018 / SP-14) ──────────────
// Synthetic accelerograms: envelope × bandpass noise, normalised to target PGA.
// Parameters derived from attenuation relations for Baikal region.

interface BaikalScenario {
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

const BAIKAL_CATALOG: BaikalScenario[] = [
  { id: 'mw50_100', label: 'Mw 5.0, R=100 км (фоновый уровень)',  Mw: 5.0, R_km: 100, PGA_g: 0.025, T_dom: 0.20, duration_s: 15, seismicIntensity: 'VI MSK-64',  notes: 'Типичное слабое землетрясение в зоне Байкальского рифта' },
  { id: 'mw60_200', label: 'Mw 6.0, R=200 км (Байкальский разлом)', Mw: 6.0, R_km: 200, PGA_g: 0.018, T_dom: 0.30, duration_s: 25, seismicIntensity: 'VI MSK-64',  notes: 'Умеренное землетрясение в зоне Байкальского разлома (Mw 6), г. Иркутск' },
  { id: 'mw65_50',  label: 'Mw 6.5, R=50 км (ближний сценарий)',  Mw: 6.5, R_km:  50, PGA_g: 0.090, T_dom: 0.12, duration_s: 20, seismicIntensity: 'VIII MSK-64', notes: 'Близкое землетрясение в 50 км — расчётный сценарий для проектирования' },
  { id: 'mw70_300', label: 'Mw 7.0, R=300 км (монгольский сценарий)', Mw: 7.0, R_km: 300, PGA_g: 0.022, T_dom: 0.40, duration_s: 40, seismicIntensity: 'VII MSK-64', notes: 'Крупное монгольское землетрясение: слабые длинно-периодные колебания' },
  { id: 'sp14_vii', label: 'СП 14 нормативный, I=VII (0.1g)', Mw: 6.0, R_km: 100, PGA_g: 0.100, T_dom: 0.20, duration_s: 20, seismicIntensity: 'VII MSK-64', notes: 'Нормативное воздействие по СП 14.13330.2018 для 7-балльной зоны (PGA=0.1g)' },
];

function generateSyntheticAccelerogram(scenario: BaikalScenario, sr = 200): Float64Array {
  const N = Math.round(scenario.duration_s * sr);
  const dt = 1 / sr;
  const arr = new Float64Array(N);

  // Deterministic "random" seed per scenario for reproducibility
  let seed = scenario.id.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 12345);
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

// ─── Response spectrum tab (Newmark-β SDOF) ──────────────────────────────────

interface RespTabProps {
  seismograms: SeismogramRecord[];
  selectedSeismogramId: number | null;
  setSelectedSeismogramId: (id: number | null) => void;
  respDamping: string;   setRespDamping: (v: string) => void;
  respComponent: RespComponent; setRespComponent: (v: RespComponent) => void;
  respResult: SpecPoint[] | null; setRespResult: (v: SpecPoint[] | null) => void;
  toast: ReturnType<typeof useToast>['toast'];
}

const ResponseTab: FC<RespTabProps> = ({
  seismograms, selectedSeismogramId, setSelectedSeismogramId,
  respDamping, setRespDamping, respComponent, setRespComponent,
  respResult, setRespResult, toast,
}) => {
  const [inputMode, setInputMode] = useState<'catalog' | 'sp14' | 'seismogram'>('sp14');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(BAIKAL_CATALOG[0].id);
  const [sp14Intensity, setSp14Intensity] = useState<SeismicIntensity>('VIII');
  const [sp14SoilCategory, setSp14SoilCategory] = useState<'I'|'II'|'III'>('II');
  const [sp14RecordId, setSp14RecordId] = useState<string>(SP14_BY_INTENSITY['VIII'][0].id);
  const [sp14K1Key, setSp14K1Key] = useState<keyof typeof SP14_K1_TABLE5>('elastic');
  const sp14K1 = SP14_K1_TABLE5[sp14K1Key];
  const SP14_K1_LABEL: Record<keyof typeof SP14_K1_TABLE5, string> = {
    elastic:     'Упругий — 1.00',
    critical:    'Критич. сооружения — 1.00',
    normal:      'Здания I уровня — 0.35',
    residential: 'Гражданские — 0.25',
  };

  const rec = seismograms.find(s => s.id === selectedSeismogramId) ?? null;
  const real = hasRealData(rec);
  const scenario = BAIKAL_CATALOG.find(s => s.id === selectedScenarioId) ?? BAIKAL_CATALOG[0];
  const sp14Record: NormativeAccelerogram =
    SP14_ACCELEROGRAMS.find(r => r.id === sp14RecordId) ?? SP14_BY_INTENSITY[sp14Intensity][0];

  const handleCompute = useCallback(() => {
    const NP = 60;
    const periods: number[] = [];
    for (let i = 0; i < NP; i++) {
      periods.push(Math.pow(10, Math.log10(0.05) + (Math.log10(3) - Math.log10(0.05)) * i / (NP - 1)));
    }
    const zeta = (parseFloat(respDamping) || 5) / 100;
    try {
      if (inputMode === 'catalog') {
        const sr = 200;
        const sig = generateSyntheticAccelerogram(scenario, sr);
        setRespResult(responseSpectrum(sig, 1 / sr, periods, zeta));
        toast({ title: 'Спектр отклика рассчитан', description: `Сценарий: ${scenario.label}, PGA=${(scenario.PGA_g * 1000).toFixed(0)} мг, ζ=${(zeta*100).toFixed(1)}%` });
      } else if (inputMode === 'sp14') {
        const { signal, sampleRate, pga_ms2 } = synthesizeSP14Accelerogram(sp14Record, { soilCategory: sp14SoilCategory });
        setRespResult(responseSpectrum(signal, 1 / sampleRate, periods, zeta));
        toast({
          title: 'Спектр отклика рассчитан',
          description: `СП 14: ${sp14Record.label}, грунт ${sp14SoilCategory} (K=${SP14_SOIL_K_TABLE4[sp14SoilCategory]}), PGA=${pga_ms2.toFixed(2)} м/с², ζ=${(zeta*100).toFixed(1)}%`,
        });
      } else {
        if (!rec || !real) return;
        const arrs = getRealArrays(rec);
        const dt = 1 / (rec.sampleRate || 100);
        if (respComponent === 'AVG3') {
          const specs = [arrs.z, arrs.ns, arrs.ew].map(s => responseSpectrum(s, dt, periods, zeta));
          setRespResult(combineSpectraGeomean(specs));
          toast({ title: 'Спектр отклика рассчитан', description: `Геом. среднее Z+NS+EW · ${NP} периодов · ζ=${(zeta*100).toFixed(1)}%` });
        } else if (respComponent === 'GMH') {
          const specs = [arrs.ns, arrs.ew].map(s => responseSpectrum(s, dt, periods, zeta));
          setRespResult(combineSpectraGeomean(specs));
          toast({ title: 'Спектр отклика рассчитан', description: `Геом. среднее NS+EW (СП 14) · ${NP} периодов · ζ=${(zeta*100).toFixed(1)}%` });
        } else {
          const sig = respComponent === 'Z' ? arrs.z : respComponent === 'NS' ? arrs.ns : arrs.ew;
          setRespResult(responseSpectrum(sig, dt, periods, zeta));
          toast({ title: 'Спектр отклика рассчитан', description: `Компонента ${respComponent} · ${NP} периодов · ζ=${(zeta*100).toFixed(1)}%` });
        }
      }
    } catch (e) {
      toast({ title: 'Ошибка расчёта', description: String(e), variant: 'destructive' });
    }
  }, [inputMode, scenario, sp14Record, sp14SoilCategory, rec, real, respComponent, respDamping, setRespResult, toast]);

  const peakSa = respResult ? respResult.reduce((b, p) => p.Sa > b.Sa ? p : b, { T: 0, Sa: 0, Sv: 0, Sd: 0 }) : null;

  // Нормативный проектный спектр β(T)·A0·g·K_грунт по СП 14.13330.2018 §5,
  // совмещённый с сеткой периодов вычисленного Sa(T) для прямого сравнения.
  const chartData = useMemo(() => {
    if (!respResult) return [];
    const periods = respResult.map(p => p.T);
    const design = sp14DesignSpectrum(periods, sp14Intensity, sp14SoilCategory, sp14K1);
    return respResult.map((p, i) => ({ ...p, Sa_design: design[i].Sa_design }));
  }, [respResult, sp14Intensity, sp14SoilCategory, sp14K1]);

  const designPeak = SP14_PGA_TABLE3[sp14Intensity] * SP14_SOIL_K_TABLE4[sp14SoilCategory] * sp14K1 * 9.80665 * 2.5;

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <Button size="sm" variant={inputMode === 'sp14' ? 'default' : 'outline'} className="h-7 text-xs"
              onClick={() => { setInputMode('sp14'); setRespResult(null); }}>
              📚 Библиотека акселерограмм СП 14.13330
            </Button>
            <Button size="sm" variant={inputMode === 'catalog' ? 'default' : 'outline'} className="h-7 text-xs"
              onClick={() => { setInputMode('catalog'); setRespResult(null); }}>
              📂 Байкальские сценарии
            </Button>
            <Button size="sm" variant={inputMode === 'seismogram' ? 'default' : 'outline'} className="h-7 text-xs"
              onClick={() => { setInputMode('seismogram'); setRespResult(null); }}>
              📡 Загруженная сейсмограмма
            </Button>
          </div>

          {inputMode === 'sp14' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Расчётная сейсмичность (MSK-64)</Label>
                  <Select value={sp14Intensity} onValueChange={v => {
                    const it = v as SeismicIntensity;
                    setSp14Intensity(it);
                    setSp14RecordId(SP14_BY_INTENSITY[it][0].id);
                    setRespResult(null);
                  }}>
                    <SelectTrigger className="h-9 w-44 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VII" className="text-xs">VII — PGA 0.10 g</SelectItem>
                      <SelectItem value="VIII" className="text-xs">VIII — PGA 0.20 g</SelectItem>
                      <SelectItem value="IX" className="text-xs">IX — PGA 0.40 g</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Категория грунта (Табл. 4)</Label>
                  <Select value={sp14SoilCategory} onValueChange={v => { setSp14SoilCategory(v as 'I'|'II'|'III'); setRespResult(null); }}>
                    <SelectTrigger className="h-9 w-56 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I" className="text-xs">I — скальные (K=0.8)</SelectItem>
                      <SelectItem value="II" className="text-xs">II — плотные/твёрдые (K=1.0)</SelectItem>
                      <SelectItem value="III" className="text-xs">III — рыхлые/мягкие (K=1.4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1 min-w-[18rem]">
                  <Label className="text-xs">Запись-прототип</Label>
                  <Select value={sp14RecordId} onValueChange={v => { setSp14RecordId(v); setRespResult(null); }}>
                    <SelectTrigger className="h-9 w-full text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-xs">Интенсивность {sp14Intensity}</SelectLabel>
                        {SP14_BY_INTENSITY[sp14Intensity].map(r => (
                          <SelectItem key={r.id} value={r.id} className="text-xs">{r.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-slate-50 rounded p-3 text-xs text-slate-600 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div><span className="text-slate-400">Прототип</span><div className="font-bold">{sp14Record.source}</div></div>
                <div><span className="text-slate-400">Магнитуда / R</span><div className="font-bold">Mw {sp14Record.Mw} · {sp14Record.R_km} км</div></div>
                <div><span className="text-slate-400">Целевой PGA</span><div className="font-bold">
                  {(sp14Record.PGA_g * 1000).toFixed(0)} мг × K={SP14_SOIL_K_TABLE4[sp14SoilCategory]} = {(sp14Record.PGA_g * SP14_SOIL_K_TABLE4[sp14SoilCategory] * 9.80665).toFixed(2)} м/с²
                </div></div>
                <div><span className="text-slate-400">T_dom / Длит.</span><div className="font-bold">{sp14Record.T_dom.toFixed(2)} с · {sp14Record.duration_s} с</div></div>
                <div className="col-span-2 md:col-span-4 text-slate-500">{sp14Record.notes}</div>
              </div>
            </div>
          )}

          {inputMode === 'catalog' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Расчётный сценарий (Байкальский регион)</Label>
                <Select value={selectedScenarioId} onValueChange={v => { setSelectedScenarioId(v); setRespResult(null); }}>
                  <SelectTrigger className="h-9 text-sm w-full max-w-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BAIKAL_CATALOG.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-slate-50 rounded p-3 text-xs text-slate-600 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div><span className="text-slate-400">Магнитуда</span><div className="font-bold">Mw {scenario.Mw}</div></div>
                <div><span className="text-slate-400">Эпицентр.</span><div className="font-bold">{scenario.R_km} км</div></div>
                <div><span className="text-slate-400">PGA</span><div className="font-bold">{(scenario.PGA_g * 1000).toFixed(0)} мг ({(scenario.PGA_g * 9.81).toFixed(2)} м/с²)</div></div>
                <div><span className="text-slate-400">Интенсивность</span><div className="font-bold">{scenario.seismicIntensity}</div></div>
                <div className="col-span-2 md:col-span-4 text-slate-500">{scenario.notes}</div>
              </div>
            </div>
          )}

          {inputMode === 'seismogram' && (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <Label className="text-xs">Сейсмограмма</Label>
                <Select value={selectedSeismogramId?.toString() ?? ''} onValueChange={v => { setSelectedSeismogramId(parseInt(v)); setRespResult(null); }}>
                  <SelectTrigger className="h-8 w-72 text-xs"><SelectValue placeholder="Выберите запись..." /></SelectTrigger>
                  <SelectContent>
                    {seismograms.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()} className="text-xs">
                        {s.recordId} — {s.stationId} ({new Date(s.startTime).toLocaleDateString('ru-RU')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Компонента</Label>
                <Select value={respComponent} onValueChange={v => { setRespComponent(v as RespComponent); setRespResult(null); }}>
                  <SelectTrigger className="h-8 w-72 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Z" className="text-xs">Z (вертикальная)</SelectItem>
                    <SelectItem value="NS" className="text-xs">NS (С–Ю)</SelectItem>
                    <SelectItem value="EW" className="text-xs">EW (В–З)</SelectItem>
                    <SelectItem value="GMH" className="text-xs">NS⊕EW — геом. среднее горизонталей (СП 14)</SelectItem>
                    <SelectItem value="AVG3" className="text-xs">Все 3 — геом. среднее Z+NS+EW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-end mt-3">
            <div>
              <Label className="text-xs">Затухание ζ, %</Label>
              <Input className="h-8 w-24 text-xs" value={respDamping} onChange={e => setRespDamping(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">K₁ — допуск. поврежд. (Табл. 5)</Label>
              <Select value={sp14K1Key} onValueChange={v => setSp14K1Key(v as keyof typeof SP14_K1_TABLE5)}>
                <SelectTrigger className="h-8 w-64 text-xs" data-testid="select-sp14-k1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="elastic" className="text-xs">Упругий — 1.00</SelectItem>
                  <SelectItem value="critical" className="text-xs">Критич. сооружения — 1.00</SelectItem>
                  <SelectItem value="normal" className="text-xs">Здания I уровня — 0.35</SelectItem>
                  <SelectItem value="residential" className="text-xs">Гражданские — 0.25</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-8 text-xs gap-1"
              onClick={handleCompute}
              disabled={inputMode === 'seismogram' && (!rec || !real)}>
              <Zap className="h-3.5 w-3.5" /> Рассчитать спектр отклика
            </Button>
          </div>
        </CardContent>
      </Card>

      {inputMode === 'seismogram' && selectedSeismogramId && !real && (
        <Card className="border-amber-300 bg-amber-50 shadow-sm">
          <CardContent className="py-4 px-4 text-sm text-amber-800 font-medium">
            ⚠ Запись не содержит реальных компонент (dataZ/NS/EW). Расчёт SDOF-отклика невозможен.
          </CardContent>
        </Card>
      )}

      {respResult && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm text-slate-600">
              Спектр отклика конструкций · SDOF · Newmark-β (β=¼, γ=½)
              {peakSa && peakSa.T > 0 && (
                <span className="ml-2 text-purple-600 font-normal text-xs">
                  Пик Sa @ T = {peakSa.T.toFixed(2)} с · Sa = {peakSa.Sa.toFixed(3)} м/с²
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="T" scale="log" type="number" domain={[0.05, 3]}
                  label={{ value: 'Период T (с)', position: 'insideBottom', offset: -5, fontSize: 10 }}
                  tickFormatter={v => v < 1 ? v.toFixed(2) : v.toFixed(1)} tick={{ fontSize: 9 }}
                />
                <YAxis
                  label={{ value: 'Sa (м/с²)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }}
                  tick={{ fontSize: 9 }} tickFormatter={v => v.toFixed(2)}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [Number(v).toFixed(4), name]}
                  labelFormatter={v => `T=${Number(v).toFixed(3)} с`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {peakSa && peakSa.T > 0 && (
                  <ReferenceLine x={peakSa.T} stroke="#7c3aed" strokeDasharray="4 2"
                    label={{ value: `T=${peakSa.T.toFixed(2)}с`, fontSize: 9, fill: '#7c3aed', position: 'top' }} />
                )}
                <Line type="monotone" dataKey="Sa" stroke="#dc2626" strokeWidth={1.8} dot={false} name={`Sa расч., ζ=${respDamping}%`} />
                <Line type="monotone" dataKey="Sa_design" stroke="#0369a1" strokeWidth={1.6} strokeDasharray="6 4" dot={false}
                  name={`Sa норм. СП 14 (I=${sp14Intensity}, грунт ${sp14SoilCategory}, K₁=${sp14K1.toFixed(2)})`} />
              </LineChart>
            </ResponsiveContainer>
            <div className="px-4 pt-1 text-[11px] text-sky-700 bg-sky-50 border border-sky-200 rounded-md mx-3 py-1.5">
              <strong>Норм. спектр СП 14.13330.2018 §5:</strong>{' '}
              Sa<sub>норм</sub>(T) = A<sub>0</sub>·g·K<sub>гр</sub>·K<sub>1</sub>·β(T) ={' '}
              {SP14_PGA_TABLE3[sp14Intensity].toFixed(2)}·9.81·{SP14_SOIL_K_TABLE4[sp14SoilCategory]}·{sp14K1.toFixed(2)}·β(T) ={' '}
              {(SP14_PGA_TABLE3[sp14Intensity] * SP14_SOIL_K_TABLE4[sp14SoilCategory] * sp14K1 * 9.80665).toFixed(2)}·β(T) м/с²
              {' · '}пик плато {designPeak.toFixed(2)} м/с² @ T ≤ {sp14SoilCategory === 'III' ? '0.8' : '0.4'} с
              {' · '}I={sp14Intensity}, грунт {sp14SoilCategory}, K<sub>1</sub>={sp14K1.toFixed(2)} ({SP14_K1_LABEL[sp14K1Key]})
            </div>
            <div className="px-4 text-xs text-slate-500 space-y-0.5">
              <p>SDOF-осциллятор: m ü + 2mζω u̇ + mω² u = −m a_g(t); численное интегрирование Newmark-β (безусловно устойчивая схема).</p>
              {inputMode === 'catalog' && (
                <p>Сценарий: <strong>{scenario.label}</strong> · PGA={( scenario.PGA_g * 9.81).toFixed(2)} м/с² · {scenario.seismicIntensity} · СП 14.13330.2018</p>
              )}
              {inputMode === 'sp14' && (
                <p>СП 14.13330: <strong>{sp14Record.label}</strong> · прототип: {sp14Record.source} · грунт {sp14SoilCategory} (K={SP14_SOIL_K_TABLE4[sp14SoilCategory]}) · PGA={(sp14Record.PGA_g * SP14_SOIL_K_TABLE4[sp14SoilCategory] * 9.80665).toFixed(2)} м/с²</p>
              )}
              {inputMode === 'seismogram' && (
                <p>Расчёт: <strong>{RESP_COMPONENT_LABEL[respComponent]}</strong>, выборка {rec?.sampleRate} Гц, длительность {rec?.durationSec?.toFixed(1)} с.
                {(respComponent === 'GMH' || respComponent === 'AVG3') && (
                  <span> Sa(T) = exp(⟨ln Sa<sub>i</sub>(T)⟩) — поточечное геом. среднее SDOF-спектров отдельных компонент.</span>
                )}</p>
              )}
            </div>
            <div className="px-4 flex gap-2 pt-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={() => {
                  const rows = ['period_s,Sa_m_s2,Sv_m_s,Sd_m'].concat(
                    respResult!.map(p => `${p.T.toFixed(4)},${p.Sa.toFixed(6)},${p.Sv.toFixed(6)},${p.Sd.toFixed(6)}`)
                  );
                  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                  const fname =
                    inputMode === 'catalog' ? scenario.id :
                    inputMode === 'sp14'    ? `${sp14Record.id}_soil${sp14SoilCategory}` :
                    (rec?.recordId ?? 'result');
                  a.download = `response_spectrum_${fname}.csv`; a.click();
                }}>
                <Download className="h-3 w-3" /> CSV
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={async () => {
                  try {
                    const r = await fetch('/api/calculations', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ calcType: 'response_spectrum',
                        inputParams:
                          inputMode === 'catalog'
                            ? { scenarioId: scenario.id, scenarioLabel: scenario.label, Mw: scenario.Mw, R_km: scenario.R_km, PGA_g: scenario.PGA_g, damping: parseFloat(respDamping), K1: sp14K1, K1_key: sp14K1Key }
                            : inputMode === 'sp14'
                              ? { sp14: true, recordId: sp14Record.id, recordLabel: sp14Record.label, source: sp14Record.source, intensity: sp14Record.intensity, soilCategory: sp14SoilCategory, K_soil: SP14_SOIL_K_TABLE4[sp14SoilCategory], K1: sp14K1, K1_key: sp14K1Key, PGA_g: sp14Record.PGA_g, PGA_eff_ms2: sp14Record.PGA_g * SP14_SOIL_K_TABLE4[sp14SoilCategory] * 9.80665, Mw: sp14Record.Mw, R_km: sp14Record.R_km, T_dom: sp14Record.T_dom, damping: parseFloat(respDamping) }
                              : { seismogramId: selectedSeismogramId, component: respComponent, damping: parseFloat(respDamping), K1: sp14K1, K1_key: sp14K1Key },
                        results: { points: respResult, peakT: peakSa?.T, peakSa: peakSa?.Sa, inputMode } }) });
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    toast({ title: 'Спектр отклика сохранён в БД' });
                  } catch { toast({ title: 'Ошибка сохранения', variant: 'destructive' }); }
                }}>
                <Save className="h-3 w-3" /> Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {inputMode === 'seismogram' && !selectedSeismogramId && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-10 text-center text-slate-400">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Выберите сейсмограмму для расчёта спектра отклика</p>
          </CardContent>
        </Card>
      )}
    </>
  );
};

// ─── Resonance Analysis Tab ───────────────────────────────────────────────────
// Compares building eigenperiod T≈0.1·N with:
//   1. H/V peak period — from profile.dominantFrequency (H/V Nakamura method)
//   2. МТСМ peak period — from actual saved МТСМ calculation results in DB
// Colour-coded risk per source independently; worst case drives overall verdict.

interface ResonanceTabProps {
  objects: InfrastructureObject[];
  soilProfiles: SoilProfile[];
  toast: ReturnType<typeof useToast>['toast'];
}

type RiskLevel = 'green' | 'yellow' | 'red';

function calcRisk(T_building: number, T_soil: number): { risk: RiskLevel; ratio: number; label: string; rec: string } {
  const ratio = Math.abs(T_soil - T_building) / Math.max(T_soil, T_building);
  if (ratio < 0.15) return { risk: 'red', ratio,
    label: `ВЫСОКИЙ РИСК (|ΔT|/T=${(ratio*100).toFixed(1)}% < 15%)`,
    rec: 'Детальное обследование; рассмотреть усиление или сейсмоизоляцию. Обязательна инструментальная проверка динамических параметров здания.' };
  if (ratio < 0.30) return { risk: 'yellow', ratio,
    label: `УМЕРЕННЫЙ РИСК (|ΔT|/T=${(ratio*100).toFixed(1)}%, 15–30%)`,
    rec: 'Рекомендуется инструментальный мониторинг и расчёт МКЭ. При проектировании — рассмотреть изменение этажности.' };
  return { risk: 'green', ratio,
    label: `РИСК НИЗКИЙ (|ΔT|/T=${(ratio*100).toFixed(1)}% > 30%)`,
    rec: 'Резонанс грунт–здание маловероятен при данных условиях.' };
}

const RISK_STYLE: Record<RiskLevel, { border: string; badge: string; icon: string }> = {
  red:    { border: 'border-red-400 bg-red-50',     badge: 'bg-red-600 text-white',     icon: '🔴' },
  yellow: { border: 'border-amber-400 bg-amber-50', badge: 'bg-amber-500 text-white',   icon: '🟡' },
  green:  { border: 'border-emerald-400 bg-emerald-50', badge: 'bg-emerald-600 text-white', icon: '🟢' },
};

const ResonanceTab: FC<ResonanceTabProps> = ({ objects, soilProfiles, toast }) => {
  const [selectedObjId,  setSelectedObjId]  = useState<number | null>(null);
  const [selectedProfId, setSelectedProfId] = useState<number | null>(null);
  const [mtsmCalcs, setMtsmCalcs] = useState<SeismicCalculation[]>([]);
  const [selectedMtsmCalcId, setSelectedMtsmCalcId] = useState<number | null>(null);
  const [savedCalcs, setSavedCalcs] = useState<SeismicCalculation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const obj     = objects.find(o => o.id === selectedObjId) ?? null;
  const profile = soilProfiles.find(p => p.id === selectedProfId) ?? null;

  const floors = obj?.floors ?? null;
  const T_building = floors != null ? 0.1 * floors : null;

  // H/V peak: sourced from profile.dominantFrequency (set from Nakamura H/V analysis)
  const f_hv = profile?.dominantFrequency ?? null;
  const T_hv = f_hv != null && f_hv > 0 ? 1 / f_hv : null;

  // Load МТСМ saved calculations when profile changes
  const loadMtsmCalcs = async (profId: number) => {
    try {
      const r = await fetch(`/api/calculations?type=mtsm&limit=50`);
      const all: SeismicCalculation[] = await r.json();
      const filtered = all.filter(c => c.soilProfileId === profId);
      setMtsmCalcs(filtered);
      setSelectedMtsmCalcId(filtered.length > 0 ? filtered[0].id : null);
    } catch { setMtsmCalcs([]); }
  };

  const handleProfileChange = (v: string) => {
    const id = parseInt(v);
    setSelectedProfId(id);
    loadMtsmCalcs(id);
  };

  // Selected МТСМ calculation: get peak frequency from results
  const mtsmCalc = mtsmCalcs.find(c => c.id === selectedMtsmCalcId) ?? (mtsmCalcs[0] ?? null);
  const mtsmResults = mtsmCalc?.results as { peakFreq?: number } | null;
  const f_mtsm = mtsmResults?.peakFreq ?? null;
  const T_mtsm = f_mtsm != null && f_mtsm > 0 ? 1 / f_mtsm : null;

  // Per-source risk
  const hvRisk   = (T_building != null && T_hv  != null) ? calcRisk(T_building, T_hv)  : null;
  const mtsmRisk = (T_building != null && T_mtsm != null) ? calcRisk(T_building, T_mtsm) : null;

  // Overall risk = worst case
  const rankRisk = (r: RiskLevel | undefined) => r === 'red' ? 2 : r === 'yellow' ? 1 : 0;
  const overallRisk: RiskLevel | null = hvRisk || mtsmRisk
    ? (rankRisk(hvRisk?.risk) >= rankRisk(mtsmRisk?.risk) ? hvRisk?.risk : mtsmRisk?.risk) ?? null
    : null;

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const r = await fetch('/api/calculations?type=resonance&limit=20');
      setSavedCalcs(await r.json());
    } catch { /* ignore */ }
    setLoadingHistory(false);
  };

  const saveResult = async () => {
    if (!overallRisk) return;
    try {
      const r = await fetch('/api/calculations', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calcType: 'resonance', soilProfileId: selectedProfId, objectId: selectedObjId,
          inputParams: { floors, T_building, f_hv, T_hv, f_mtsm, T_mtsm },
          results: { overallRisk, hvRisk: hvRisk?.risk ?? null, mtsmRisk: mtsmRisk?.risk ?? null,
            hvLabel: hvRisk?.label, mtsmLabel: mtsmRisk?.label } }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({ title: 'Анализ резонанса сохранён' });
      loadHistory();
    } catch { toast({ title: 'Ошибка сохранения', variant: 'destructive' }); }
  };

  const exportCsv = () => {
    const csv = [
      'parameter,value',
      `object,"${obj?.name ?? ''}"`,
      `floors,${floors ?? ''}`,
      `T_building_s,${T_building?.toFixed(3) ?? ''}`,
      `soil_profile,"${profile?.profileName ?? ''}"`,
      `soil_category,${profile?.soilCategory ?? ''}`,
      `f_hv_hz,${f_hv ?? ''}`,
      `T_hv_s,${T_hv?.toFixed(3) ?? ''}`,
      `hv_risk,${hvRisk?.risk ?? ''}`,
      `hv_delta_ratio_pct,${hvRisk != null ? (hvRisk.ratio * 100).toFixed(1) : ''}`,
      `f_mtsm_hz,${f_mtsm?.toFixed(3) ?? ''}`,
      `T_mtsm_s,${T_mtsm?.toFixed(3) ?? ''}`,
      `mtsm_risk,${mtsmRisk?.risk ?? ''}`,
      `mtsm_delta_ratio_pct,${mtsmRisk != null ? (mtsmRisk.ratio * 100).toFixed(1) : ''}`,
      `overall_risk,${overallRisk ?? ''}`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `resonance_${obj?.objectId ?? 'result'}.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm text-slate-600">Здание и профиль грунта</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Здание / сооружение</Label>
              <Select value={selectedObjId?.toString() ?? ''} onValueChange={v => setSelectedObjId(parseInt(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Выбрать объект..." /></SelectTrigger>
                <SelectContent>
                  {objects.map(o => (
                    <SelectItem key={o.id} value={o.id.toString()} className="text-xs">
                      {o.name} {o.floors ? `· ${o.floors} эт.` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Профиль грунта</Label>
              <Select value={selectedProfId?.toString() ?? ''} onValueChange={handleProfileChange}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Выбрать профиль..." /></SelectTrigger>
                <SelectContent>
                  {soilProfiles.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()} className="text-xs">
                      {p.profileName} · кат. {p.soilCategory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mtsmCalcs.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Результат МТСМ (для пика частоты)</Label>
                <Select value={selectedMtsmCalcId?.toString() ?? ''} onValueChange={v => setSelectedMtsmCalcId(parseInt(v))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Выбрать расчёт..." /></SelectTrigger>
                  <SelectContent>
                    {mtsmCalcs.map(c => {
                      const r = c.results as { peakFreq?: number } | null;
                      return (
                        <SelectItem key={c.id} value={c.id.toString()} className="text-xs">
                          {new Date(c.createdAt).toLocaleDateString('ru-RU')} · f₀={r?.peakFreq?.toFixed(2) ?? '?'} Гц
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedProfId != null && mtsmCalcs.length === 0 && (
              <p className="text-xs text-amber-600">Нет сохранённых результатов МТСМ для этого профиля. Сначала рассчитайте и сохраните МТСМ на вкладке «Усиление».</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm text-slate-600">Параметры колебаний</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3 text-xs text-slate-600">
            {obj && (
              <div className="bg-blue-50 rounded p-3 space-y-1">
                <div className="font-semibold text-blue-700">Здание</div>
                <div>{obj.name} · {floors != null ? `${floors} эт.` : 'этажность не указана'}</div>
                <div>T = 0.1 × N = <strong className="text-blue-700">{T_building?.toFixed(2) ?? '—'} с</strong></div>
              </div>
            )}
            {profile && (
              <>
                <div className="bg-purple-50 rounded p-3 space-y-1">
                  <div className="font-semibold text-purple-700">H/V (метод Накамуры)</div>
                  <div>{profile.profileName}</div>
                  <div>f₀(H/V) = <strong>{f_hv != null ? `${f_hv} Гц` : 'не задано в профиле'}</strong></div>
                  <div>T(H/V) = <strong className="text-purple-700">{T_hv?.toFixed(2) ?? '—'} с</strong></div>
                  {f_hv == null && <div className="text-amber-600 text-xs">Задайте доминирующую частоту в карточке профиля грунта</div>}
                </div>
                <div className="bg-cyan-50 rounded p-3 space-y-1">
                  <div className="font-semibold text-cyan-700">МТСМ (Томсон–Хаскелл)</div>
                  <div>f₀(МТСМ) = <strong>{f_mtsm != null ? `${f_mtsm.toFixed(3)} Гц` : 'нет сохранённых данных'}</strong></div>
                  <div>T(МТСМ) = <strong className="text-cyan-700">{T_mtsm?.toFixed(2) ?? '—'} с</strong></div>
                </div>
              </>
            )}
            {!obj && !profile && (
              <p className="text-slate-400 py-4 text-center">Выберите объект и профиль грунта</p>
            )}
          </CardContent>
        </Card>
      </div>

      {overallRisk && (
        <Card className={`border-2 shadow-sm ${RISK_STYLE[overallRisk].border}`}>
          <CardContent className="py-5 px-5 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{RISK_STYLE[overallRisk].icon}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${RISK_STYLE[overallRisk].badge}`}>
                ОБЩАЯ ОЦЕНКА: {overallRisk === 'red' ? 'ВЫСОКИЙ РИСК' : overallRisk === 'yellow' ? 'УМЕРЕННЫЙ РИСК' : 'НИЗКИЙ РИСК'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {hvRisk && (
                <div className={`rounded p-3 border ${RISK_STYLE[hvRisk.risk].border} bg-white/60`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span>{RISK_STYLE[hvRisk.risk].icon}</span>
                    <span className="font-semibold text-xs">Сравнение с H/V</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-1">
                    <div className="text-center"><div className="font-bold">{T_building?.toFixed(2)} с</div><div className="text-slate-400">Tздания</div></div>
                    <div className="text-center"><div className="font-bold">{T_hv?.toFixed(2)} с</div><div className="text-slate-400">T(H/V)</div></div>
                    <div className="text-center"><div className="font-bold">{(hvRisk.ratio*100).toFixed(1)}%</div><div className="text-slate-400">|ΔT|/T</div></div>
                  </div>
                  <div className="text-xs text-slate-600">{hvRisk.label}</div>
                </div>
              )}
              {mtsmRisk && (
                <div className={`rounded p-3 border ${RISK_STYLE[mtsmRisk.risk].border} bg-white/60`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span>{RISK_STYLE[mtsmRisk.risk].icon}</span>
                    <span className="font-semibold text-xs">Сравнение с МТСМ</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-1">
                    <div className="text-center"><div className="font-bold">{T_building?.toFixed(2)} с</div><div className="text-slate-400">Tздания</div></div>
                    <div className="text-center"><div className="font-bold">{T_mtsm?.toFixed(2)} с</div><div className="text-slate-400">T(МТСМ)</div></div>
                    <div className="text-center"><div className="font-bold">{(mtsmRisk.ratio*100).toFixed(1)}%</div><div className="text-slate-400">|ΔT|/T</div></div>
                  </div>
                  <div className="text-xs text-slate-600">{mtsmRisk.label}</div>
                </div>
              )}
            </div>

            <div className="bg-white/60 rounded p-3 text-xs text-slate-700 leading-relaxed">
              <BookOpen className="h-3 w-3 inline mr-1 text-slate-500" />
              <strong>Рекомендация:</strong>{' '}
              {overallRisk === 'red' ? 'Детальное обследование; рассмотреть усиление или сейсмоизоляцию. Обязательна инструментальная проверка динамических параметров здания.'
                : overallRisk === 'yellow' ? 'Рекомендуется инструментальный мониторинг и расчёт МКЭ. При проектировании — рассмотреть изменение этажности.'
                : 'Резонанс грунт–здание маловероятен при данных условиях.'}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-white" onClick={saveResult}>
                <Save className="h-3 w-3" /> Сохранить
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-white" onClick={exportCsv}>
                <Download className="h-3 w-3" /> CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(!obj || !profile) && !overallRisk && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-10 text-center text-slate-400">
            <TriangleAlert className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Выберите здание и профиль грунта для анализа резонанса</p>
            <p className="text-xs mt-1 opacity-60">Требуются: объект с этажностью, профиль грунта с доминирующей частотой (H/V) и/или сохранённый расчёт МТСМ</p>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
          <CardTitle className="text-sm text-slate-600">История сохранённых анализов</CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={loadHistory} disabled={loadingHistory}>
            Обновить
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {savedCalcs.length === 0
            ? <p className="text-sm text-slate-400 text-center py-4">Нажмите «Обновить» для загрузки истории</p>
            : <div className="space-y-2">
                {savedCalcs.map(c => {
                  const r = (c.results as { overallRisk?: string; hvLabel?: string; mtsmLabel?: string }) || {};
                  const inp = (c.inputParams as { floors?: number; T_building?: number; T_hv?: number; T_mtsm?: number }) || {};
                  const risk = r.overallRisk as RiskLevel | undefined;
                  const style = risk ? RISK_STYLE[risk] : null;
                  return (
                    <div key={c.id} className={`rounded border p-3 text-xs ${style ? style.border : 'border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        {style && <span>{style.icon}</span>}
                        <span className="font-semibold">{risk === 'red' ? 'Высокий риск' : risk === 'yellow' ? 'Умеренный риск' : 'Низкий риск'}</span>
                        <span className="text-slate-500 ml-auto">{new Date(c.createdAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                      <div className="text-slate-500 mt-1 space-y-0.5">
                        <div>Tз={inp.T_building?.toFixed(2) ?? '—'} с · T(H/V)={inp.T_hv?.toFixed(2) ?? '—'} с · T(МТСМ)={inp.T_mtsm?.toFixed(2) ?? '—'} с</div>
                        {r.hvLabel && <div>H/V: {r.hvLabel}</div>}
                        {r.mtsmLabel && <div>МТСМ: {r.mtsmLabel}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analysis;
