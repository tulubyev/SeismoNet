import { FC, useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Activity, Radio, Clock, Download, RefreshCw, Search,
  Filter, ChevronRight, Layers, BarChart3, TrendingUp,
  Calculator, X, History, Wifi, AlertCircle, Database
} from 'lucide-react';
import type { SeismogramRecord, Station } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOIL_LABELS: Record<string, string> = {
  I: 'I — Скальные/полускальные',
  II: 'II — Твёрдые дисперсные',
  III: 'III — Мягкие/водонасыщ.',
  IV: 'IV — Рыхлые/насыпные',
};

const SOURCE_LABELS: Record<string, string> = {
  local: 'Местная сеть ИЗК СО РАН',
  historical: 'Исторический архив',
  cesmd: 'CESMD (США)',
  iris: 'IRIS / FDSN',
  seismological_institute: 'Сейсмологический институт',
};

const STATUS_COLORS: Record<string, string> = {
  raw: 'bg-slate-100 text-slate-600',
  filtered: 'bg-blue-50 text-blue-700',
  processed: 'bg-emerald-50 text-emerald-700',
};

const MAG_COLOR = (m: number | null) => {
  if (!m) return '#94a3b8';
  if (m >= 6) return '#ef4444';
  if (m >= 4.5) return '#f97316';
  if (m >= 3) return '#eab308';
  if (m >= 1.5) return '#6366f1';
  return '#94a3b8';
};

function formatDur(sec: number | null) {
  if (!sec) return '—';
  if (sec < 60) return `${sec.toFixed(1)} с`;
  return `${Math.floor(sec / 60)} м ${(sec % 60).toFixed(0)} с`;
}

// ─── Synthetic waveform generator ─────────────────────────────────────────────

function genWave(n: number, pga: number, freq: number, seed: number): number[] {
  const pts: number[] = [];
  let rng = seed;
  const next = () => { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng / 0x80000000) - 1; };
  const taper = (i: number) => {
    const t = i / n;
    if (t < 0.05) return t / 0.05;
    if (t > 0.8) return (1 - t) / 0.2;
    return 1;
  };
  for (let i = 0; i < n; i++) {
    const t = i / n * 30;
    const signal = Math.sin(2 * Math.PI * freq * t)
      + 0.5 * Math.sin(2 * Math.PI * freq * 1.7 * t + 1.2)
      + 0.3 * Math.sin(2 * Math.PI * freq * 0.4 * t + 2.1)
      + 0.15 * next();
    pts.push(signal * taper(i) * pga * 100);
  }
  return pts;
}

// ─── Waveform canvas ──────────────────────────────────────────────────────────

const WaveCanvas: FC<{ pts: number[]; color: string; label: string; height?: number }> = ({
  pts, color, label, height = 64
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c || pts.length < 2) return;
    const ctx = c.getContext('2d')!;
    const W = c.width, H = c.height;
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]); ctx.beginPath();
    ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.setLineDash([]);
    const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
    const pad = 4;
    ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.beginPath();
    pts.forEach((v, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = pad + ((max - v) / range) * (H - pad * 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = color; ctx.font = 'bold 9px monospace';
    ctx.fillText(label, 4, 11);
  }, [pts, color, label]);
  return <canvas ref={ref} width={600} height={height} className="w-full rounded-sm" style={{ imageRendering: 'pixelated' }} />;
};

// ─── Response spectrum chart ───────────────────────────────────────────────────

function computeResponseSpectrum(pga: number, f0: number): { T: number[]; Sa: number[] } {
  const T: number[] = []; const Sa: number[] = [];
  const T0 = 1 / f0;
  for (let i = 0; i <= 80; i++) {
    const t = 0.05 + i * 0.05;
    T.push(t);
    let sa: number;
    if (t < 0.1) sa = pga * (1 + 6.5 * t);
    else if (t <= T0 * 1.2) sa = pga * 2.5;
    else sa = pga * 2.5 * Math.pow(T0 / t, 0.9);
    Sa.push(sa * 9.81 * 100);
  }
  return { T, Sa };
}

const SpectrumChart: FC<{ T: number[]; Sa: number[]; color: string; xlabel: string; ylabel: string }> = ({
  T, Sa, color, xlabel, ylabel
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c || T.length < 2) return;
    const ctx = c.getContext('2d')!;
    const W = c.width, H = c.height;
    const pad = { l: 40, r: 10, t: 8, b: 28 };
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
    const minT = Math.min(...T), maxT = Math.max(...T);
    const minS = 0, maxS = Math.max(...Sa) * 1.1 || 1;
    const toX = (t: number) => pad.l + (t - minT) / (maxT - minT) * (W - pad.l - pad.r);
    const toY = (s: number) => H - pad.b - (s - minS) / (maxS - minS) * (H - pad.t - pad.b);
    // Grid
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = pad.t + i * (H - pad.t - pad.b) / 5;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      const v = maxS - i * maxS / 5;
      ctx.fillStyle = '#64748b'; ctx.font = '8px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(v.toFixed(0), pad.l - 3, y + 3);
    }
    ctx.textAlign = 'center';
    [0.5, 1, 1.5, 2, 2.5, 3].forEach(t => {
      const x = toX(t);
      ctx.beginPath(); ctx.strokeStyle = '#1e293b'; ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke();
      ctx.fillStyle = '#64748b'; ctx.font = '8px sans-serif';
      ctx.fillText(t.toString(), x, H - 2);
    });
    // Axes labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(xlabel, pad.l + (W - pad.l - pad.r) / 2, H);
    // Spectrum line
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
    T.forEach((t, i) => {
      const x = toX(t), y = toY(Sa[i]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Area fill
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = color;
    ctx.lineTo(toX(T[T.length - 1]), H - pad.b);
    ctx.lineTo(toX(T[0]), H - pad.b);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }, [T, Sa, color, xlabel, ylabel]);
  return <canvas ref={ref} width={480} height={140} className="w-full rounded" style={{ imageRendering: 'pixelated' }} />;
};

// ─── Filter sidebar ────────────────────────────────────────────────────────────

interface Filters {
  search: string;
  type: 'all' | 'historical' | 'current';
  magMin: number; magMax: number;
  pgaMin: number; pgaMax: number;
  soilCategory: string;
  dataSource: string;
  station: string;
  distMax: number;
}

const DEFAULT_FILTERS: Filters = {
  search: '', type: 'all',
  magMin: 0, magMax: 9,
  pgaMin: 0, pgaMax: 100,
  soilCategory: 'all', dataSource: 'all', station: 'all',
  distMax: 500,
};

// ─── Record card ───────────────────────────────────────────────────────────────

const RecordCard: FC<{
  rec: SeismogramRecord & { isHistorical?: boolean; magnitude?: number | null; locationName?: string | null; soilCategory?: string | null; epicentralDistanceKm?: number | null; dataSource?: string | null; magnitudeType?: string | null };
  selected: boolean;
  onSelect: () => void;
}> = ({ rec, selected, onSelect }) => {
  const pga = rec.peakGroundAcceleration ?? 0;
  const freq = rec.dominantFrequency ?? 2;
  const mag = rec.magnitude ?? null;
  const pts = useMemo(() => genWave(120, Math.max(pga, 0.001), freq, rec.id * 1337), [pga, freq, rec.id]);

  return (
    <div
      onClick={onSelect}
      className={`group border rounded-lg cursor-pointer transition-all overflow-hidden ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/40'
          : 'border-slate-200 hover:border-blue-300 hover:shadow-md bg-white'
      }`}
    >
      {/* Top row */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-slate-700">{rec.stationId}</span>
            {mag !== null && (
              <span className="inline-flex items-center gap-0.5 text-xs font-bold"
                style={{ color: MAG_COLOR(mag) }}>
                M{rec.magnitudeType ?? 'w'} {mag.toFixed(1)}
              </span>
            )}
            {rec.isHistorical && (
              <Badge variant="outline" className="text-[10px] h-4 gap-0.5 border-amber-200 text-amber-700 bg-amber-50">
                <History className="h-2.5 w-2.5" />Историческая
              </Badge>
            )}
            <Badge className={`text-[10px] h-4 ${STATUS_COLORS[rec.processingStatus] ?? 'bg-slate-100 text-slate-600'}`}>
              {rec.processingStatus}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {rec.locationName ?? rec.stationId} · {new Date(rec.startTime).toLocaleDateString('ru-RU', { day:'2-digit', month:'short', year:'numeric' })}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-slate-800">
            {pga > 0 ? `${pga.toFixed(4)} g` : '—'}
          </p>
          <p className="text-[10px] text-slate-400">PGA</p>
        </div>
      </div>

      {/* Mini waveform */}
      <div className="bg-slate-900 mx-4 rounded overflow-hidden mb-2">
        <WaveCanvas pts={pts} color="#3b82f6" label="Z" height={36} />
      </div>

      {/* Bottom row */}
      <div className="px-4 pb-3 flex items-center gap-3 text-[10px] text-slate-400">
        {rec.soilCategory && (
          <span className="flex items-center gap-0.5">
            <Layers className="h-3 w-3" /> Гр.{rec.soilCategory}
          </span>
        )}
        {rec.epicentralDistanceKm != null && (
          <span>{rec.epicentralDistanceKm.toFixed(0)} км</span>
        )}
        {rec.dominantFrequency != null && (
          <span>{rec.dominantFrequency.toFixed(1)} Гц</span>
        )}
        {rec.durationSec != null && (
          <span>{formatDur(rec.durationSec)}</span>
        )}
        <span className="ml-auto">
          {SOURCE_LABELS[rec.dataSource ?? ''] ?? rec.dataSource ?? '—'}
        </span>
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${selected ? 'rotate-90 text-blue-500' : ''}`} />
      </div>
    </div>
  );
};

// ─── Detail panel ──────────────────────────────────────────────────────────────

const DetailPanel: FC<{ rec: SeismogramRecord & any; onSendToAnalysis: () => void }> = ({
  rec, onSendToAnalysis
}) => {
  const pga = rec.peakGroundAcceleration ?? 0.005;
  const freq = rec.dominantFrequency ?? 2;
  const seed = rec.id * 1337;
  const ptsZ  = useMemo(() => genWave(600, pga, freq, seed),         [pga, freq, seed]);
  const ptsNS = useMemo(() => genWave(600, pga * 0.82, freq, seed+1), [pga, freq, seed]);
  const ptsEW = useMemo(() => genWave(600, pga * 0.71, freq, seed+2), [pga, freq, seed]);
  const spectrum = useMemo(() => computeResponseSpectrum(pga, freq),  [pga, freq]);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => apiRequest('PATCH', `/api/seismograms/${rec.id}/use-for-modeling`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/seismograms'] }); },
  });

  const handleSendToAnalysis = () => {
    mutation.mutate();
    localStorage.setItem('seismo_selected_record', JSON.stringify({
      recordId: rec.recordId,
      magnitude: rec.magnitude,
      pga: pga,
      dominantFrequency: freq,
      soilCategory: rec.soilCategory,
      locationName: rec.locationName,
      epicentralDistanceKm: rec.epicentralDistanceKm,
      spectrum: spectrum,
    }));
    toast({ title: 'Запись отправлена', description: 'Параметры загружены в модуль расчётов.' });
    onSendToAnalysis();
  };

  return (
    <div className="space-y-4">
      {/* Key parameters */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          { label: 'Магнитуда', value: rec.magnitude != null ? `M${rec.magnitudeType ?? 'w'} ${rec.magnitude.toFixed(1)}` : '—' },
          { label: 'PGA', value: pga > 0 ? `${pga.toFixed(5)} g` : '—' },
          { label: 'Дом. частота', value: rec.dominantFrequency != null ? `${rec.dominantFrequency.toFixed(2)} Гц` : '—' },
          { label: 'Расстояние', value: rec.epicentralDistanceKm != null ? `${rec.epicentralDistanceKm.toFixed(1)} км` : '—' },
          { label: 'Глубина', value: rec.focalDepthKm != null ? `${rec.focalDepthKm.toFixed(0)} км` : '—' },
          { label: 'Категория грунта', value: rec.soilCategory ? `Кат. ${rec.soilCategory}` : '—' },
          { label: 'Длительность', value: formatDur(rec.durationSec) },
          { label: 'Частота дискр.', value: rec.sampleRate ? `${rec.sampleRate} Гц` : '—' },
          { label: 'Источник', value: SOURCE_LABELS[rec.dataSource ?? ''] ?? rec.dataSource ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 rounded p-2">
            <p className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="font-medium text-slate-700 mt-0.5 text-xs">{value}</p>
          </div>
        ))}
      </div>

      {/* 3-component waveform */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-1.5">Трёхкомпонентная запись</p>
        <div className="bg-slate-900 rounded-lg p-2 space-y-1">
          <WaveCanvas pts={ptsZ}  color="#ef4444" label="Z  (вертикальная)" height={56} />
          <WaveCanvas pts={ptsNS} color="#3b82f6" label="N-S (горизонт.)"   height={56} />
          <WaveCanvas pts={ptsEW} color="#10b981" label="E-W (горизонт.)"   height={56} />
        </div>
        <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-400 px-1">
          <span>t = 0 с</span>
          <div className="flex-1 flex justify-center gap-4">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-red-500 inline-block"/>Z</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-blue-500 inline-block"/>N-S</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-emerald-500 inline-block"/>E-W</span>
          </div>
          <span>t = {formatDur(rec.durationSec)}</span>
        </div>
      </div>

      {/* Response spectrum */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
          Спектр отклика Sa(T) — демпфирование 5%
        </p>
        <div className="bg-slate-900 rounded-lg p-2">
          <SpectrumChart T={spectrum.T} Sa={spectrum.Sa} color="#f97316" xlabel="Период T, с" ylabel="Sa, см/с²" />
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 px-1">
          <span>T = 0 с</span>
          <span className="text-orange-400 font-medium">Sa макс: {Math.max(...spectrum.Sa).toFixed(0)} см/с²</span>
          <span>T = 4 с</span>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleSendToAnalysis} disabled={mutation.isPending}
          className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm h-9">
          <Calculator className="h-4 w-4" />
          Использовать для расчёта
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          MiniSEED
        </Button>
      </div>
      {(rec.usedForModelingCount ?? 0) > 0 && (
        <p className="text-[10px] text-slate-400 text-center">
          Использована в расчётах: {rec.usedForModelingCount} раз
        </p>
      )}
    </div>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const SeismogramCatalog: FC = () => {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: stations = [] } = useQuery<Station[]>({ queryKey: ['/api/stations'] });
  const { data: records = [], isLoading, refetch } = useQuery<SeismogramRecord[]>({
    queryKey: ['/api/seismograms'],
  });

  const irkStations = stations.filter(s => s.stationId.startsWith('IRK-'));

  const filtered = useMemo(() => {
    return records.filter(r => {
      const rec = r as any;
      if (filters.type === 'historical' && !rec.isHistorical) return false;
      if (filters.type === 'current' && rec.isHistorical) return false;
      if (rec.magnitude != null && (rec.magnitude < filters.magMin || rec.magnitude > filters.magMax)) return false;
      const pga = (rec.peakGroundAcceleration ?? 0) * 1000;
      if (pga < filters.pgaMin || pga > filters.pgaMax) return false;
      if (filters.soilCategory !== 'all' && rec.soilCategory !== filters.soilCategory) return false;
      if (filters.dataSource !== 'all' && rec.dataSource !== filters.dataSource) return false;
      if (filters.station !== 'all' && rec.stationId !== filters.station) return false;
      if (rec.epicentralDistanceKm != null && rec.epicentralDistanceKm > filters.distMax) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!rec.stationId.toLowerCase().includes(q) &&
            !(rec.locationName ?? '').toLowerCase().includes(q) &&
            !(rec.recordId ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [records, filters]);

  const selectedRec = filtered.find(r => r.id === selectedId) ?? null;

  const setF = (k: keyof Filters, v: any) => setFilters(p => ({ ...p, [k]: v }));
  const resetFilters = () => { setFilters(DEFAULT_FILTERS); };

  const stats = useMemo(() => ({
    total: records.length,
    historical: records.filter((r: any) => r.isHistorical).length,
    current: records.filter((r: any) => !r.isHistorical).length,
    processed: records.filter((r: any) => r.processingStatus === 'processed').length,
  }), [records]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Каталог сейсмограмм
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Оцифрованные записи Байкальского региона · Исторические и текущие · для расчёта реакции конструкций
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />Обновить
          </Button>
          <Button variant={showFilters ? 'default' : 'outline'} size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowFilters(v => !v)}>
            <Filter className="h-3.5 w-3.5" />Фильтры
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Всего записей', value: stats.total, icon: Database, color: 'text-slate-700' },
          { label: 'Исторические', value: stats.historical, icon: History, color: 'text-amber-600' },
          { label: 'Актуальные', value: stats.current, icon: Wifi, color: 'text-blue-600' },
          { label: 'Обработанных', value: stats.processed, icon: BarChart3, color: 'text-emerald-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-7 w-7 ${color} flex-shrink-0`} />
              <div>
                <p className="text-xl font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-5 items-start">
        {/* Filter sidebar */}
        {showFilters && (
          <aside className="w-64 flex-shrink-0 space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-700">Параметры поиска</CardTitle>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] text-slate-400 hover:text-slate-600"
                    onClick={resetFilters}>
                    <X className="h-3 w-3 mr-0.5" />Сбросить
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Поиск</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input className="pl-8 h-8 text-xs" placeholder="ID, место, станция..."
                      value={filters.search} onChange={e => setF('search', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Тип записей</Label>
                  <Select value={filters.type} onValueChange={v => setF('type', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="historical">Исторические</SelectItem>
                      <SelectItem value="current">Актуальные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs text-slate-500">Магнитуда</Label>
                    <span className="text-xs text-slate-400">{filters.magMin} – {filters.magMax}</span>
                  </div>
                  <Slider
                    min={0} max={9} step={0.5}
                    value={[filters.magMin, filters.magMax]}
                    onValueChange={([a, b]) => setFilters(p => ({ ...p, magMin: a, magMax: b }))}
                    className="mt-1"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs text-slate-500">PGA (×10⁻³ g)</Label>
                    <span className="text-xs text-slate-400">{filters.pgaMin} – {filters.pgaMax}</span>
                  </div>
                  <Slider
                    min={0} max={100} step={1}
                    value={[filters.pgaMin, filters.pgaMax]}
                    onValueChange={([a, b]) => setFilters(p => ({ ...p, pgaMin: a, pgaMax: b }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs text-slate-500">Расст. до эпицентра (км)</Label>
                    <span className="text-xs text-slate-400">≤ {filters.distMax}</span>
                  </div>
                  <Slider
                    min={0} max={500} step={10}
                    value={[filters.distMax]}
                    onValueChange={([v]) => setF('distMax', v)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Категория грунта (СП 14)</Label>
                  <Select value={filters.soilCategory} onValueChange={v => setF('soilCategory', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      {Object.entries(SOIL_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Источник данных</Label>
                  <Select value={filters.dataSource} onValueChange={v => setF('dataSource', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все источники</SelectItem>
                      {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Станция</Label>
                  <Select value={filters.station} onValueChange={v => setF('station', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все станции</SelectItem>
                      {irkStations.map(s => (
                        <SelectItem key={s.stationId} value={s.stationId}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-blue-50/60 border-blue-100">
              <CardContent className="p-4 text-xs text-blue-700 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5" />
                  Для моделирования
                </p>
                <p className="text-blue-600 leading-relaxed">
                  Выберите запись и нажмите «Использовать для расчёта» — параметры и спектр отклика загрузятся в модуль расчётов МКЭ / МТСМ.
                </p>
              </CardContent>
            </Card>
          </aside>
        )}

        {/* Catalog + detail */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Results bar */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Найдено: <strong className="text-slate-700">{filtered.length}</strong> из {records.length}</span>
            <div className="flex items-center gap-2">
              {selectedRec && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400 hover:text-slate-600 gap-1"
                  onClick={() => setSelectedId(null)}>
                  <X className="h-3 w-3" />Снять выбор
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-slate-400 text-sm">
                <RefreshCw className="h-6 w-6 mx-auto mb-3 animate-spin text-slate-300" />
                Загрузка каталога...
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-14 text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-500 mb-1">Записей не найдено</p>
                <p className="text-xs text-slate-400">Измените параметры фильтрации или сбросьте фильтры</p>
                <Button variant="outline" size="sm" className="mt-3 text-xs h-8" onClick={resetFilters}>
                  Сбросить фильтры
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className={`grid gap-3 ${selectedRec ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
              {filtered.map(rec => (
                <RecordCard
                  key={rec.id}
                  rec={rec as any}
                  selected={rec.id === selectedId}
                  onSelect={() => setSelectedId(rec.id === selectedId ? null : rec.id)}
                />
              ))}
            </div>
          )}

          {/* Detail panel */}
          {selectedRec && (
            <Card className="border-0 shadow-sm mt-4">
              <CardHeader className="pb-3 pt-4 px-5 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    {(selectedRec as any).locationName ?? selectedRec.stationId}
                    <span className="text-slate-400 font-mono font-normal text-xs">
                      {new Date(selectedRec.startTime).toLocaleDateString('ru-RU', { day:'2-digit', month:'long', year:'numeric' })}
                    </span>
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-slate-400" onClick={() => setSelectedId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <DetailPanel
                  rec={selectedRec}
                  onSendToAnalysis={() => setLocation('/analysis')}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeismogramCatalog;
