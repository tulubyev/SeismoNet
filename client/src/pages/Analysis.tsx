import { FC, useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Activity, Plus, Trash2, Save, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, FlaskConical, Waves, BarChart3, Zap
} from 'lucide-react';
import type { SensorInstallation, SeismogramRecord, CalibrationSession, CalibrationAfc } from '@shared/schema';

// ─── FFT implementation ───────────────────────────────────────────────────────

function fft(real: number[], imag: number[]): void {
  const n = real.length;
  if (n <= 1) return;
  const halfN = n >> 1;
  const rEven = new Array(halfN), iEven = new Array(halfN);
  const rOdd  = new Array(halfN), iOdd  = new Array(halfN);
  for (let i = 0; i < halfN; i++) {
    rEven[i] = real[2 * i]; iEven[i] = imag[2 * i];
    rOdd[i]  = real[2 * i + 1]; iOdd[i]  = imag[2 * i + 1];
  }
  fft(rEven, iEven); fft(rOdd, iOdd);
  for (let k = 0; k < halfN; k++) {
    const angle = -2 * Math.PI * k / n;
    const cos   = Math.cos(angle), sin = Math.sin(angle);
    const re = cos * rOdd[k] - sin * iOdd[k];
    const im = cos * iOdd[k] + sin * rOdd[k];
    real[k]         = rEven[k] + re; imag[k]         = iEven[k] + im;
    real[k + halfN] = rEven[k] - re; imag[k + halfN] = iEven[k] - im;
  }
}

function nextPow2(n: number): number {
  let p = 1; while (p < n) p <<= 1; return p;
}

function computeFFT(signal: number[], sampleRate: number): { freq: number; amp: number }[] {
  const N = nextPow2(Math.min(signal.length, 4096));
  const re = new Array(N).fill(0);
  const im = new Array(N).fill(0);
  const windowFn = (i: number) => 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
  for (let i = 0; i < N; i++) re[i] = (i < signal.length ? signal[i] : 0) * windowFn(i);
  fft(re, im);
  const result: { freq: number; amp: number }[] = [];
  const half = N / 2;
  for (let k = 1; k < half; k++) {
    const amp = 2 * Math.sqrt(re[k] * re[k] + im[k] * im[k]) / N;
    result.push({ freq: (k * sampleRate) / N, amp });
  }
  return result;
}

function computeHV(
  z: number[], ns: number[], ew: number[], sampleRate: number
): { freq: number; hv: number }[] {
  const fftZ  = computeFFT(z,  sampleRate);
  const fftNS = computeFFT(ns, sampleRate);
  const fftEW = computeFFT(ew, sampleRate);
  return fftZ.map((pt, i) => ({
    freq: pt.freq,
    hv: pt.amp > 0 ? Math.sqrt((fftNS[i].amp ** 2 + fftEW[i].amp ** 2) / 2) / pt.amp : 0
  }));
}

// ─── Synthetic waveform generator ─────────────────────────────────────────────

function syntheticWaveform(
  durationSec: number,
  sampleRate: number,
  dominantFreq: number,
  peakAmp: number
): number[] {
  const N = Math.min(Math.round(durationSec * sampleRate), 4096);
  const dt = 1 / sampleRate;
  const envelopePeak = 0.3 * durationSec;
  const result: number[] = [];
  for (let i = 0; i < N; i++) {
    const t = i * dt;
    const env = Math.exp(-Math.abs(t - envelopePeak) / (durationSec * 0.25));
    const wave = Math.sin(2 * Math.PI * dominantFreq * t)
               + 0.3 * Math.sin(2 * Math.PI * dominantFreq * 2.1 * t)
               + 0.15 * (Math.random() - 0.5);
    result.push(peakAmp * env * wave);
  }
  return result;
}

// ─── Default AFC points for SM-3KV seismometer ───────────────────────────────

const DEFAULT_AFC: { frequency: number; amplitude: number; phase: number }[] = [
  { frequency: 0.1,  amplitude: -40, phase: 160 },
  { frequency: 0.3,  amplitude: -22, phase: 140 },
  { frequency: 0.5,  amplitude: -14, phase: 120 },
  { frequency: 1.0,  amplitude:  -4, phase:  90 },
  { frequency: 2.0,  amplitude:   0, phase:   0 },
  { frequency: 5.0,  amplitude:  -1, phase: -10 },
  { frequency: 10.0, amplitude:  -3, phase: -20 },
  { frequency: 20.0, amplitude:  -8, phase: -40 },
  { frequency: 50.0, amplitude: -20, phase: -90 },
];

// ─── Six-month staleness check ────────────────────────────────────────────────

function isExpired(dateStr: string | Date): boolean {
  const d = new Date(dateStr);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return d < sixMonthsAgo;
}

// ─── Main page ────────────────────────────────────────────────────────────────

const Analysis: FC = () => {
  const { toast } = useToast();

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: installations = [] } = useQuery<SensorInstallation[]>({
    queryKey: ['/api/sensor-installations']
  });

  const { data: seismograms = [] } = useQuery<SeismogramRecord[]>({
    queryKey: ['/api/seismograms']
  });

  // ── State ─────────────────────────────────────────────────────────────────
  const [selectedInstId, setSelectedInstId] = useState<number | null>(null);
  const [selectedSeismogramId, setSelectedSeismogramId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [fftResult, setFftResult] = useState<{ freq: number; amp: number }[] | null>(null);
  const [hvResult, setHvResult] = useState<{ freq: number; hv: number }[] | null>(null);
  const [afcRows, setAfcRows] = useState<{ frequency: number; amplitude: number; phase: number }[]>(DEFAULT_AFC);
  const [thresholdZ, setThresholdZ] = useState('');
  const [thresholdH, setThresholdH] = useState('');

  const [form, setForm] = useState({
    sessionDate: new Date().toISOString().slice(0, 10),
    operator: '',
    sensitivityZ: '10.0',
    sensitivityNS: '10.0',
    sensitivityEW: '10.0',
    dampingRatio: '70',
    naturalFrequency: '2.0',
    status: 'complete',
    notes: ''
  });

  // ── Calibration sessions query ─────────────────────────────────────────────
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

  // ── AFC query ──────────────────────────────────────────────────────────────
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
    if (afcData.length > 0) {
      setAfcRows(afcData.map(p => ({
        frequency: p.frequency,
        amplitude: p.amplitude,
        phase: p.phase ?? 0
      })));
    }
  }, [afcData]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createSession = useMutation({
    mutationFn: (data: object) => apiRequest('POST', '/api/calibration-sessions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calibration-sessions', selectedInstId] });
      setShowNewSessionForm(false);
      toast({ title: 'Сессия создана' });
    }
  });

  const deleteSession = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/calibration-sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calibration-sessions', selectedInstId] });
      if (selectedSessionId !== null) setSelectedSessionId(null);
      toast({ title: 'Сессия удалена' });
    }
  });

  const saveAfc = useMutation({
    mutationFn: (data: object) => apiRequest('PUT', '/api/calibration-afc', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calibration-afc', selectedSessionId] });
      toast({ title: 'АЧХ сохранена' });
    }
  });

  const saveTriggerThresholds = useMutation({
    mutationFn: (data: object) => {
      const inst = installations.find(i => i.id === selectedInstId);
      if (!inst) throw new Error('No installation selected');
      return apiRequest('PATCH', `/api/sensor-installations/${inst.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sensor-installations'] });
      toast({ title: 'Пороги сохранены' });
    }
  });

  // ── Selected seismogram ────────────────────────────────────────────────────
  const selectedSeismogram = seismograms.find(s => s.id === selectedSeismogramId) ?? null;

  const getWaveformData = useCallback((rec: SeismogramRecord | null) => {
    if (!rec) return { z: [], ns: [], ew: [] };
    const sr   = rec.sampleRate || 100;
    const dur  = rec.durationSec || 60;
    const freq = rec.dominantFrequency || 3;
    const z  = syntheticWaveform(dur, sr, freq, rec.peakAmplitudeZ  ?? 1);
    const ns = syntheticWaveform(dur, sr, freq * 0.9, rec.peakAmplitudeNS ?? 0.8);
    const ew = syntheticWaveform(dur, sr, freq * 0.85, rec.peakAmplitudeEW ?? 0.75);
    return { z, ns, ew };
  }, []);

  const waveformSeries = useCallback((signal: number[], label: string, sampleRate: number) => {
    const step = Math.max(1, Math.floor(signal.length / 500));
    return signal
      .filter((_, i) => i % step === 0)
      .map((v, i) => ({ t: parseFloat(((i * step) / sampleRate).toFixed(2)), [label]: parseFloat(v.toFixed(4)) }));
  }, []);

  const runFFT = () => {
    if (!selectedSeismogram) return;
    const { z, ns, ew } = getWaveformData(selectedSeismogram);
    const sr = selectedSeismogram.sampleRate || 100;
    const fftZ  = computeFFT(z,  sr);
    const fftNS = computeFFT(ns, sr);
    const fftEW = computeFFT(ew, sr);
    const merged = fftZ.map((pt, i) => ({
      freq: parseFloat(pt.freq.toFixed(3)),
      Z:  parseFloat(pt.amp.toFixed(6)),
      NS: parseFloat(fftNS[i].amp.toFixed(6)),
      EW: parseFloat(fftEW[i].amp.toFixed(6))
    }));
    setFftResult(merged as unknown as { freq: number; amp: number }[]);
  };

  const runHV = () => {
    if (!selectedSeismogram) return;
    const { z, ns, ew } = getWaveformData(selectedSeismogram);
    const sr = selectedSeismogram.sampleRate || 100;
    const hv = computeHV(z, ns, ew, sr).filter(pt => pt.freq <= 20).map(pt => ({
      freq: parseFloat(pt.freq.toFixed(3)),
      hv:   parseFloat(pt.hv.toFixed(4))
    }));
    setHvResult(hv);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const selectedInst = installations.find(i => i.id === selectedInstId);

  const handleNewSession = () => {
    if (!selectedInstId) return;
    createSession.mutate({
      installationId: selectedInstId,
      sessionDate: new Date(form.sessionDate).toISOString(),
      operator: form.operator || 'ИЗК СО РАН',
      sensitivityZ:   parseFloat(form.sensitivityZ),
      sensitivityNS:  parseFloat(form.sensitivityNS),
      sensitivityEW:  parseFloat(form.sensitivityEW),
      dampingRatio:   parseFloat(form.dampingRatio),
      naturalFrequency: parseFloat(form.naturalFrequency),
      status:  form.status,
      notes:   form.notes
    });
  };

  const afcChartData = afcRows
    .slice()
    .sort((a, b) => a.frequency - b.frequency)
    .map(r => ({ freq: r.frequency, amp: r.amplitude, phase: r.phase }));

  const peakHvFreq = hvResult
    ? hvResult.reduce((best, pt) => (pt.hv > best.hv ? pt : best), { freq: 0, hv: 0 })
    : null;

  const fftData = fftResult as unknown as { freq: number; Z: number; NS: number; EW: number }[] | null;

  // Load trigger thresholds from selected installation
  useEffect(() => {
    if (selectedInst) {
      setThresholdZ(String(selectedInst.triggerThresholdZ ?? ''));
      setThresholdH(String(selectedInst.triggerThresholdH ?? ''));
    }
  }, [selectedInst]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <FlaskConical className="h-6 w-6 text-purple-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-800">Калибровка и спектральный анализ</h1>
          <p className="text-sm text-slate-500">АЧХ датчиков, FFT, метод H/V Накамуры</p>
        </div>
      </div>

      <Tabs defaultValue="calibration" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="calibration" className="text-xs gap-1">
            <FlaskConical className="h-3.5 w-3.5" />Калибровка
          </TabsTrigger>
          <TabsTrigger value="afc" className="text-xs gap-1">
            <Activity className="h-3.5 w-3.5" />АЧХ
          </TabsTrigger>
          <TabsTrigger value="waveforms" className="text-xs gap-1">
            <Waves className="h-3.5 w-3.5" />Волновые формы
          </TabsTrigger>
          <TabsTrigger value="spectrum" className="text-xs gap-1">
            <BarChart3 className="h-3.5 w-3.5" />FFT & H/V
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Calibration ──────────────────────────────────────────── */}
        <TabsContent value="calibration" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sensor installation selector */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-slate-600">Датчик (инсталляция)</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <Select value={selectedInstId?.toString() ?? ''} onValueChange={v => { setSelectedInstId(parseInt(v)); setSelectedSessionId(null); }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Выбрать датчик..." />
                  </SelectTrigger>
                  <SelectContent>
                    {installations.map(i => (
                      <SelectItem key={i.id} value={i.id.toString()} className="text-sm">
                        {i.stationId} · {i.installationLocation ?? 'б/у'} · эт.{i.floor ?? '–'}
                      </SelectItem>
                    ))}
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
                    <p className="text-xs font-medium text-slate-600">Пороги срабатывания</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Z (мм/с)</Label>
                        <Input type="number" step="0.001" value={thresholdZ} onChange={e => setThresholdZ(e.target.value)} className="h-7 text-xs" placeholder="0.005" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">NS/EW (мм/с)</Label>
                        <Input type="number" step="0.001" value={thresholdH} onChange={e => setThresholdH(e.target.value)} className="h-7 text-xs" placeholder="0.003" />
                      </div>
                    </div>
                    <Button size="sm" className="w-full h-7 text-xs" variant="outline"
                      onClick={() => saveTriggerThresholds.mutate({
                        triggerThresholdZ: parseFloat(thresholdZ) || null,
                        triggerThresholdH: parseFloat(thresholdH) || null
                      })}
                      disabled={saveTriggerThresholds.isPending}>
                      <Save className="h-3 w-3 mr-1" /> Сохранить пороги
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session list */}
            <Card className="lg:col-span-2 border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
                <CardTitle className="text-sm text-slate-600">История калибровок</CardTitle>
                {selectedInstId && (
                  <Button size="sm" variant="default" className="h-7 text-xs gap-1"
                    onClick={() => setShowNewSessionForm(v => !v)}>
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
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500">Дата *</Label>
                          <Input type="date" value={form.sessionDate} onChange={e => setForm(f => ({...f, sessionDate: e.target.value}))} className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500">Оператор *</Label>
                          <Input value={form.operator} onChange={e => setForm(f => ({...f, operator: e.target.value}))} placeholder="ФИО / организация" className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500">SZ В/(м/с)</Label>
                          <Input type="number" step="0.1" value={form.sensitivityZ} onChange={e => setForm(f => ({...f, sensitivityZ: e.target.value}))} className="h-7 text-xs font-mono" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500">SNS В/(м/с)</Label>
                          <Input type="number" step="0.1" value={form.sensitivityNS} onChange={e => setForm(f => ({...f, sensitivityNS: e.target.value}))} className="h-7 text-xs font-mono" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500">SEW В/(м/с)</Label>
                          <Input type="number" step="0.1" value={form.sensitivityEW} onChange={e => setForm(f => ({...f, sensitivityEW: e.target.value}))} className="h-7 text-xs font-mono" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500">Затухание, %</Label>
                          <Input type="number" step="1" value={form.dampingRatio} onChange={e => setForm(f => ({...f, dampingRatio: e.target.value}))} className="h-7 text-xs font-mono" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500">Собств. частота, Гц</Label>
                          <Input type="number" step="0.1" value={form.naturalFrequency} onChange={e => setForm(f => ({...f, naturalFrequency: e.target.value}))} className="h-7 text-xs font-mono" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500">Статус</Label>
                          <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="complete">Выполнена</SelectItem>
                              <SelectItem value="pending">В процессе</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[11px] text-slate-500">Примечания</Label>
                          <Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Дополнительная информация..." className="h-7 text-xs" />
                        </div>
                      </div>
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={handleNewSession} disabled={createSession.isPending}>
                        <Save className="h-3 w-3" /> Сохранить сессию
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {!selectedInstId && (
                  <p className="text-sm text-slate-400 py-4 text-center">Выберите инсталляцию датчика</p>
                )}

                {selectedInstId && sessions.length === 0 && !showNewSessionForm && (
                  <p className="text-sm text-slate-400 py-4 text-center">Калибровок не найдено</p>
                )}

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
                            <span className="text-sm font-medium text-slate-800">
                              {new Date(s.sessionDate).toLocaleDateString('ru-RU')}
                            </span>
                            <Badge variant={s.status === 'complete' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                              {s.status === 'complete' ? 'Выполнена' : 'В процессе'}
                            </Badge>
                            {expired && (
                              <Badge variant="destructive" className="text-[10px] h-4 px-1.5 gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> Просрочена
                              </Badge>
                            )}
                            {!expired && s.status === 'complete' && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-green-700 border-green-300 gap-0.5">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Актуальна
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Оператор: {s.operator}</p>
                          <div className="flex gap-3 text-xs text-slate-600 mt-1 font-mono">
                            <span>SZ={s.sensitivityZ ?? '–'}</span>
                            <span>SNS={s.sensitivityNS ?? '–'}</span>
                            <span>SEW={s.sensitivityEW ?? '–'} В/(м/с)</span>
                          </div>
                          {s.naturalFrequency && (
                            <p className="text-xs text-slate-500">f₀={s.naturalFrequency} Гц, D={s.dampingRatio ?? '–'}%</p>
                          )}
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

        {/* ─── Tab 2: AFC ──────────────────────────────────────────────────── */}
        <TabsContent value="afc" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* AFC table editor */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
                <CardTitle className="text-sm text-slate-600">Таблица АЧХ</CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedSessionId?.toString() ?? ''} onValueChange={v => setSelectedSessionId(parseInt(v))}>
                    <SelectTrigger className="h-7 w-52 text-xs"><SelectValue placeholder="Выберите сессию..." /></SelectTrigger>
                    <SelectContent>
                      {sessions.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()} className="text-xs">
                          {new Date(s.sessionDate).toLocaleDateString('ru-RU')} – {s.operator}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {!selectedSessionId && (
                  <p className="text-sm text-slate-400 py-4 text-center">
                    Выберите сессию или перейдите на вкладку «Калибровка»
                  </p>
                )}
                {selectedSessionId && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1.5 pr-3 text-slate-500 font-medium">Частота (Гц)</th>
                            <th className="text-left py-1.5 pr-3 text-slate-500 font-medium">Амплитуда (дБ)</th>
                            <th className="text-left py-1.5 pr-3 text-slate-500 font-medium">Фаза (°)</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {afcRows.map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-1 pr-3">
                                <Input type="number" step="0.01" value={row.frequency}
                                  onChange={e => setAfcRows(rows => rows.map((r, i) => i === idx ? {...r, frequency: parseFloat(e.target.value) || 0} : r))}
                                  className="h-6 w-20 text-xs font-mono" />
                              </td>
                              <td className="py-1 pr-3">
                                <Input type="number" step="0.1" value={row.amplitude}
                                  onChange={e => setAfcRows(rows => rows.map((r, i) => i === idx ? {...r, amplitude: parseFloat(e.target.value) || 0} : r))}
                                  className="h-6 w-20 text-xs font-mono" />
                              </td>
                              <td className="py-1 pr-3">
                                <Input type="number" step="1" value={row.phase}
                                  onChange={e => setAfcRows(rows => rows.map((r, i) => i === idx ? {...r, phase: parseFloat(e.target.value) || 0} : r))}
                                  className="h-6 w-20 text-xs font-mono" />
                              </td>
                              <td className="py-1">
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                                  onClick={() => setAfcRows(rows => rows.filter((_, i) => i !== idx))}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => setAfcRows(rows => [...rows, { frequency: 0.1, amplitude: 0, phase: 0 }])}>
                        <Plus className="h-3 w-3" /> Добавить точку
                      </Button>
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1"
                        onClick={() => saveAfc.mutate({ sessionId: selectedSessionId, points: afcRows })}
                        disabled={saveAfc.isPending}>
                        <Save className="h-3 w-3" /> Сохранить АЧХ
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                        onClick={() => setAfcRows(DEFAULT_AFC)}>
                        Сброс (СМ-3КВ)
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* AFC chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-slate-600">График АЧХ (амплитуда)</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                {afcRows.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">Нет данных АЧХ</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={afcChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="freq" scale="log" type="number" domain={['dataMin', 'dataMax']}
                        label={{ value: 'Частота (Гц)', position: 'insideBottom', offset: -3, fontSize: 11 }}
                        tickFormatter={v => v < 1 ? v.toFixed(2) : v.toFixed(1)} tick={{ fontSize: 10 }} />
                      <YAxis label={{ value: 'Ампл. (дБ)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
                        tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(1)} дБ`, 'Амплитуда']}
                        labelFormatter={v => `f = ${Number(v).toFixed(3)} Гц`} />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="amp" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} name="Амплитуда" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                {afcChartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={afcChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="freq" scale="log" type="number" domain={['dataMin', 'dataMax']}
                        tickFormatter={v => v < 1 ? v.toFixed(2) : v.toFixed(1)} tick={{ fontSize: 10 }} />
                      <YAxis label={{ value: 'Фаза (°)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
                        tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(0)}°`, 'Фаза']}
                        labelFormatter={v => `f = ${Number(v).toFixed(3)} Гц`} />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="phase" stroke="#0891b2" strokeWidth={1.5} dot={{ r: 2 }} name="Фаза" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Tab 3: Waveforms ─────────────────────────────────────────────── */}
        <TabsContent value="waveforms" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm text-slate-600">Трёхкомпонентные волновые формы</CardTitle>
              <Select value={selectedSeismogramId?.toString() ?? ''} onValueChange={v => { setSelectedSeismogramId(parseInt(v)); setFftResult(null); setHvResult(null); }}>
                <SelectTrigger className="h-8 w-72 text-xs"><SelectValue placeholder="Выберите сейсмограмму..." /></SelectTrigger>
                <SelectContent>
                  {seismograms.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()} className="text-xs">
                      {s.recordId} — {s.stationId} ({new Date(s.startTime).toLocaleDateString('ru-RU')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              {!selectedSeismogram && (
                <p className="text-sm text-slate-400 py-8 text-center">Выберите запись из каталога</p>
              )}
              {selectedSeismogram && (() => {
                const { z, ns, ew } = getWaveformData(selectedSeismogram);
                const sr = selectedSeismogram.sampleRate || 100;
                const zData  = waveformSeries(z,  'Z',  sr);
                const nsData = waveformSeries(ns, 'NS', sr);
                const ewData = waveformSeries(ew, 'EW', sr);
                const thZ = selectedInst?.triggerThresholdZ;
                const thH = selectedInst?.triggerThresholdH;
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-xs text-slate-600 mb-1 px-2">
                      <div><span className="font-medium">Запись:</span> {selectedSeismogram.recordId}</div>
                      <div><span className="font-medium">Магнитуда:</span> M{selectedSeismogram.magnitude ?? '–'} {selectedSeismogram.magnitudeType ?? ''}</div>
                      <div><span className="font-medium">Станция:</span> {selectedSeismogram.stationId}</div>
                      <div><span className="font-medium">Длительность:</span> {selectedSeismogram.durationSec ?? '–'} с</div>
                      <div><span className="font-medium">Дискр.:</span> {selectedSeismogram.sampleRate} Гц</div>
                      <div><span className="font-medium">Доминир. f:</span> {selectedSeismogram.dominantFrequency ?? '–'} Гц</div>
                    </div>

                    {/* Z component */}
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1 px-2">Z — вертикальная компонента</p>
                      <ResponsiveContainer width="100%" height={130}>
                        <LineChart data={zData} margin={{ top: 2, right: 10, left: 30, bottom: 2 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="t" tick={{ fontSize: 9 }} tickFormatter={v => `${v}с`} minTickGap={30} />
                          <YAxis tick={{ fontSize: 9 }} tickFormatter={v => v.toFixed(2)} />
                          <Tooltip formatter={(v: number) => [`${v.toFixed(4)} мм/с`, 'Z']} labelFormatter={v => `t = ${v}с`} />
                          {thZ && <ReferenceLine y={thZ} stroke="#ef4444" strokeDasharray="4 2" label={{ value: `порог Z`, fontSize: 9, fill: '#ef4444' }} />}
                          {thZ && <ReferenceLine y={-thZ} stroke="#ef4444" strokeDasharray="4 2" />}
                          <Line type="monotone" dataKey="Z" stroke="#1d4ed8" strokeWidth={1} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* NS component */}
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1 px-2">NS — горизонтальная (Север–Юг)</p>
                      <ResponsiveContainer width="100%" height={130}>
                        <LineChart data={nsData} margin={{ top: 2, right: 10, left: 30, bottom: 2 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="t" tick={{ fontSize: 9 }} tickFormatter={v => `${v}с`} minTickGap={30} />
                          <YAxis tick={{ fontSize: 9 }} tickFormatter={v => v.toFixed(2)} />
                          <Tooltip formatter={(v: number) => [`${v.toFixed(4)} мм/с`, 'NS']} labelFormatter={v => `t = ${v}с`} />
                          {thH && <ReferenceLine y={thH} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: `порог H`, fontSize: 9, fill: '#f59e0b' }} />}
                          {thH && <ReferenceLine y={-thH} stroke="#f59e0b" strokeDasharray="4 2" />}
                          <Line type="monotone" dataKey="NS" stroke="#16a34a" strokeWidth={1} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* EW component */}
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1 px-2">EW — горизонтальная (Восток–Запад)</p>
                      <ResponsiveContainer width="100%" height={130}>
                        <LineChart data={ewData} margin={{ top: 2, right: 10, left: 30, bottom: 2 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="t" tick={{ fontSize: 9 }} tickFormatter={v => `${v}с`} minTickGap={30} />
                          <YAxis tick={{ fontSize: 9 }} tickFormatter={v => v.toFixed(2)} />
                          <Tooltip formatter={(v: number) => [`${v.toFixed(4)} мм/с`, 'EW']} labelFormatter={v => `t = ${v}с`} />
                          {thH && <ReferenceLine y={thH} stroke="#f59e0b" strokeDasharray="4 2" />}
                          {thH && <ReferenceLine y={-thH} stroke="#f59e0b" strokeDasharray="4 2" />}
                          <Line type="monotone" dataKey="EW" stroke="#dc2626" strokeWidth={1} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 4: FFT & H/V ────────────────────────────────────────────── */}
        <TabsContent value="spectrum" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={selectedSeismogramId?.toString() ?? ''} onValueChange={v => { setSelectedSeismogramId(parseInt(v)); setFftResult(null); setHvResult(null); }}>
              <SelectTrigger className="h-8 w-72 text-xs"><SelectValue placeholder="Выберите сейсмограмму для анализа..." /></SelectTrigger>
              <SelectContent>
                {seismograms.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()} className="text-xs">
                    {s.recordId} — {s.stationId} ({new Date(s.startTime).toLocaleDateString('ru-RU')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="default" className="h-8 text-xs gap-1" onClick={runFFT} disabled={!selectedSeismogramId}>
              <Zap className="h-3.5 w-3.5" /> Вычислить FFT
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={runHV} disabled={!selectedSeismogramId}>
              <BarChart3 className="h-3.5 w-3.5" /> Рассчитать H/V
            </Button>
          </div>

          {/* FFT spectrum */}
          {fftData && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-slate-600">Амплитудный спектр Фурье (FFT)</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={fftData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="freq" scale="log" type="number" domain={[0.1, 'dataMax']}
                      label={{ value: 'Частота (Гц)', position: 'insideBottom', offset: -5, fontSize: 11 }}
                      tickFormatter={v => v < 1 ? v.toFixed(1) : v.toFixed(0)} tick={{ fontSize: 9 }} />
                    <YAxis label={{ value: 'Амплитуда', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
                      tick={{ fontSize: 9 }} tickFormatter={v => v.toExponential(1)} />
                    <Tooltip formatter={(v: number) => [v.toExponential(3), '']}
                      labelFormatter={v => `f = ${Number(v).toFixed(3)} Гц`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Z"  stroke="#1d4ed8" strokeWidth={1.2} dot={false} name="Z" />
                    <Line type="monotone" dataKey="NS" stroke="#16a34a" strokeWidth={1.2} dot={false} name="NS" />
                    <Line type="monotone" dataKey="EW" stroke="#dc2626" strokeWidth={1.2} dot={false} name="EW" />
                  </LineChart>
                </ResponsiveContainer>
                {selectedSeismogram?.dominantFrequency && (
                  <p className="text-xs text-slate-500 px-4">
                    Доминирующая частота по каталогу: <strong>{selectedSeismogram.dominantFrequency} Гц</strong>
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* H/V curve */}
          {hvResult && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-slate-600">
                  Кривая H/V (метод Накамуры)
                  {peakHvFreq && peakHvFreq.freq > 0 && (
                    <span className="ml-2 text-purple-600 font-normal text-xs">
                      — пик резонанса f₀ = {peakHvFreq.freq.toFixed(2)} Гц (H/V = {peakHvFreq.hv.toFixed(2)})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={hvResult} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="freq" scale="log" type="number" domain={[0.1, 20]}
                      label={{ value: 'Частота (Гц)', position: 'insideBottom', offset: -5, fontSize: 11 }}
                      tickFormatter={v => v < 1 ? v.toFixed(1) : v.toFixed(0)} tick={{ fontSize: 9 }} />
                    <YAxis label={{ value: 'H/V', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
                      tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(v: number) => [v.toFixed(3), 'H/V']}
                      labelFormatter={v => `f = ${Number(v).toFixed(3)} Гц`} />
                    <ReferenceLine y={2} stroke="#f59e0b" strokeDasharray="4 2"
                      label={{ value: 'порог H/V=2', fontSize: 9, fill: '#f59e0b' }} />
                    {peakHvFreq && peakHvFreq.freq > 0 && (
                      <ReferenceLine x={peakHvFreq.freq} stroke="#7c3aed" strokeDasharray="4 2"
                        label={{ value: `f₀=${peakHvFreq.freq.toFixed(2)}Гц`, fontSize: 9, fill: '#7c3aed', position: 'top' }} />
                    )}
                    <Line type="monotone" dataKey="hv" stroke="#7c3aed" strokeWidth={2} dot={false} name="H/V" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="px-4 text-xs text-slate-500 space-y-0.5">
                  <p>H/V = √((NS²+EW²)/2) / Z — безразмерное спектральное отношение по методу Накамуры.</p>
                  <p>Пик кривой соответствует резонансной частоте грунтового покрова (f₀).</p>
                  {peakHvFreq && peakHvFreq.freq > 0 && (
                    <p className="text-purple-600 font-medium mt-1">
                      Резонансная частота площадки f₀ ≈ {peakHvFreq.freq.toFixed(2)} Гц
                      {peakHvFreq.freq > 0 && ` → Tₛ ≈ ${(1 / peakHvFreq.freq).toFixed(2)} с`}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!fftData && !hvResult && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-slate-400">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Выберите сейсмограмму и нажмите «Вычислить FFT» или «Рассчитать H/V»</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analysis;
