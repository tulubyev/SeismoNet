import { FC, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, Plus, Trash2, Save, AlertTriangle, CheckCircle2, FlaskConical, Waves, BarChart3, Zap, Layers as LayersIcon, Building2, TriangleAlert } from 'lucide-react';
import type { SensorInstallation, SeismogramRecord, CalibrationSession, CalibrationAfc, SoilProfile, InfrastructureObject } from '@shared/schema';
import { HVPoint, FftChartPoint, computeSpectrum, computeHV } from '@/lib/numeric/fft';
import { displayWaveform, hasRealData, getRealArrays, decimateForChart } from '@/lib/numeric/waveform';
import { AmpPoint } from '@/lib/numeric/amplification';
import { SpecPoint, RespComponent } from '@/lib/numeric/responseSpectrum';
import { AmplificationTab } from '@/pages/analysis/AmplificationTab';
import { ResponseTab } from '@/pages/analysis/ResponseTab';
import { ResonanceTab } from '@/pages/analysis/ResonanceTab';


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



// Thresholds are stored and displayed in mm/s (velocity). Ground acceleration (g)
// requires separate fields and integration steps — not convertible to velocity without
// knowing frequency, so no unit toggle is offered here.

const Analysis: FC = () => {
  const { toast } = useToast();
  const { can } = usePermission();

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

      <Tabs defaultValue={can('calibration') ? 'calibration' : 'waveforms'} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max min-w-full">
            {can('calibration') && (<>
              <TabsTrigger value="calibration"   className="text-xs gap-1 flex-1 min-w-[7rem]"><FlaskConical className="h-3.5 w-3.5" />Калибровка</TabsTrigger>
              <TabsTrigger value="afc"           className="text-xs gap-1 flex-1 min-w-[5rem]"><Activity className="h-3.5 w-3.5" />АЧХ</TabsTrigger>
            </>)}
            <TabsTrigger value="waveforms"     className="text-xs gap-1 flex-1 min-w-[8rem]"><Waves className="h-3.5 w-3.5" />Волновые формы</TabsTrigger>
            <TabsTrigger value="spectrum"      className="text-xs gap-1 flex-1 min-w-[6rem]"><BarChart3 className="h-3.5 w-3.5" />FFT & H/V</TabsTrigger>
            {can('mtsm') && (<>
              <TabsTrigger value="amplification" className="text-xs gap-1 flex-1 min-w-[6rem]"><LayersIcon className="h-3.5 w-3.5" />Усиление</TabsTrigger>
              <TabsTrigger value="response"      className="text-xs gap-1 flex-1 min-w-[5rem]"><Building2 className="h-3.5 w-3.5" />Отклик</TabsTrigger>
              <TabsTrigger value="resonance"     className="text-xs gap-1 flex-1 min-w-[6rem]"><TriangleAlert className="h-3.5 w-3.5" />Резонанс</TabsTrigger>
            </>)}
          </TabsList>
        </div>

        {can('calibration') && (<>
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
        </>)}

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

        {can('mtsm') && (<>
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
            objects={objects}
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
        </>)}
      </Tabs>
    </div>
  );
};

// ─── Amplification tab (МТСМ — 1D SH transfer function) ─────────────────────



export default Analysis;
