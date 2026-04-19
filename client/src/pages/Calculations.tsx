import { FC, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import {
  Layers as LayersIcon, Building2, TriangleAlert, Trash2, Download,
  Eye, Search, Database, FileBarChart, History,
} from 'lucide-react';
import type { SeismicCalculation, SoilProfile, InfrastructureObject } from '@shared/schema';

type CalcType = 'mtsm' | 'response_spectrum' | 'resonance';

const TYPE_META: Record<CalcType, { label: string; icon: JSX.Element; color: string }> = {
  mtsm:              { label: 'МТСМ — усиление грунта',     icon: <LayersIcon className="h-3.5 w-3.5" />,    color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  response_spectrum: { label: 'Спектр отклика SDOF',         icon: <Building2 className="h-3.5 w-3.5" />,    color: 'bg-rose-100 text-rose-700 border-rose-300' },
  resonance:         { label: 'Анализ резонанса',            icon: <TriangleAlert className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700 border-amber-300' },
};

interface MtsmResults  { points?: { freq: number; amp: number }[]; peakFreq?: number; peakAmp?: number }
interface RespResults  { points?: { T: number; Sa: number; Sv: number; Sd: number }[]; peakT?: number; peakSa?: number; inputMode?: string }
interface ResoResults  { overallRisk?: 'red'|'yellow'|'green'; hvLabel?: string; mtsmLabel?: string; hvRisk?: string; mtsmRisk?: string }

const RISK_BADGE: Record<string, string> = {
  red: 'bg-red-600 text-white',
  yellow: 'bg-amber-500 text-white',
  green: 'bg-emerald-600 text-white',
};

function summary(c: SeismicCalculation): string {
  const inp = (c.inputParams ?? {}) as Record<string, unknown>;
  const res = (c.results ?? {}) as Record<string, unknown>;
  if (c.calcType === 'mtsm') {
    const r = res as MtsmResults;
    return `f₀ ≈ ${r.peakFreq?.toFixed(2) ?? '?'} Гц · A_max ≈ ${r.peakAmp?.toFixed(2) ?? '?'} · Vs_bedr=${(inp.bedrockVs as number) ?? '?'} м/с`;
  }
  if (c.calcType === 'response_spectrum') {
    const r = res as RespResults;
    const mode = r.inputMode ?? '—';
    const lbl  = (inp.recordLabel ?? inp.scenarioLabel ?? `seismogram #${inp.seismogramId ?? '—'}`) as string;
    return `T_peak=${r.peakT?.toFixed(2) ?? '?'} с · Sa_peak=${r.peakSa?.toFixed(3) ?? '?'} м/с² · ${mode}: ${lbl} · ζ=${inp.damping ?? '?'}%`;
  }
  if (c.calcType === 'resonance') {
    const r = res as ResoResults;
    return `Tздания=${(inp.T_building as number)?.toFixed(2) ?? '—'} с · T(H/V)=${(inp.T_hv as number)?.toFixed(2) ?? '—'} с · T(МТСМ)=${(inp.T_mtsm as number)?.toFixed(2) ?? '—'} с · ${r.overallRisk?.toUpperCase() ?? '—'}`;
  }
  return '';
}

function paramsToCsv(c: SeismicCalculation): string {
  const flat = (obj: Record<string, unknown>, prefix = ''): string[] => {
    const out: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v == null || typeof v === 'function') continue;
      if (typeof v === 'object' && !Array.isArray(v)) {
        out.push(...flat(v as Record<string, unknown>, prefix + k + '.'));
      } else if (Array.isArray(v)) {
        out.push(`"${prefix + k}",<array len=${v.length}>`);
      } else {
        out.push(`"${prefix + k}","${String(v).replace(/"/g, '""')}"`);
      }
    }
    return out;
  };
  return flat({
    id: c.id,
    type: c.calcType,
    createdAt: c.createdAt,
    soilProfileId: c.soilProfileId,
    objectId: c.objectId,
    notes: c.notes,
    ...(c.inputParams as Record<string, unknown>),
    ...Object.fromEntries(
      Object.entries((c.results ?? {}) as Record<string, unknown>).filter(([k]) => k !== 'points'),
    ),
  }).join('\n');
}

function downloadCsv(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

function listToCsv(rows: SeismicCalculation[],
                   profiles: SoilProfile[],
                   objects: InfrastructureObject[]): string {
  const header = 'id,type,createdAt,soilProfile,object,summary,notes';
  const profMap = new Map(profiles.map(p => [p.id, p.profileName]));
  const objMap  = new Map(objects.map(o => [o.id, o.name]));
  const lines = rows.map(c => {
    const prof = c.soilProfileId ? profMap.get(c.soilProfileId) ?? `#${c.soilProfileId}` : '';
    const obj  = c.objectId      ? objMap.get(c.objectId)       ?? `#${c.objectId}`      : '';
    const s = summary(c).replace(/"/g, '""');
    const notes = (c.notes ?? '').replace(/"/g, '""');
    return `${c.id},${c.calcType},${new Date(c.createdAt).toISOString()},"${prof}","${obj}","${s}","${notes}"`;
  });
  return [header, ...lines].join('\n');
}

const Calculations: FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | CalcType>('all');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<SeismicCalculation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SeismicCalculation | null>(null);

  const { data: calcs = [], isLoading } = useQuery<SeismicCalculation[]>({
    queryKey: ['/api/calculations', { limit: 500 }],
    queryFn: async () => {
      const r = await fetch('/api/calculations?limit=500');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });
  const { data: profiles = [] } = useQuery<SoilProfile[]>({ queryKey: ['/api/soil-profiles'] });
  const { data: objects  = [] } = useQuery<InfrastructureObject[]>({ queryKey: ['/api/infrastructure-objects'] });

  const profMap = useMemo(() => new Map(profiles.map(p => [p.id, p])), [profiles]);
  const objMap  = useMemo(() => new Map(objects.map(o => [o.id, o])), [objects]);

  const counts = useMemo(() => ({
    all: calcs.length,
    mtsm: calcs.filter(c => c.calcType === 'mtsm').length,
    response_spectrum: calcs.filter(c => c.calcType === 'response_spectrum').length,
    resonance: calcs.filter(c => c.calcType === 'resonance').length,
  }), [calcs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return calcs.filter(c => {
      if (activeTab !== 'all' && c.calcType !== activeTab) return false;
      if (!q) return true;
      const prof = c.soilProfileId ? profMap.get(c.soilProfileId)?.profileName ?? '' : '';
      const obj  = c.objectId      ? objMap.get(c.objectId)?.name              ?? '' : '';
      const typeLabel = TYPE_META[c.calcType as CalcType]?.label ?? '';
      const hay = [c.calcType, typeLabel, prof, obj, summary(c), c.notes ?? '', String(c.id)].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [calcs, activeTab, search, profMap, objMap]);

  const grouped = useMemo(() => {
    const map: Record<CalcType, SeismicCalculation[]> = { mtsm: [], response_spectrum: [], resonance: [] };
    for (const c of filtered) {
      const t = c.calcType as CalcType;
      if (map[t]) map[t].push(c);
    }
    return map;
  }, [filtered]);

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/calculations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calculations', { limit: 500 }] });
      toast({ title: 'Расчёт удалён' });
      setConfirmDelete(null);
    },
    onError: () => toast({ title: 'Ошибка удаления', description: 'Удаление доступно только администраторам', variant: 'destructive' }),
  });

  const renderRow = (c: SeismicCalculation) => {
    const prof = c.soilProfileId ? profMap.get(c.soilProfileId)?.profileName : null;
    const obj  = c.objectId      ? objMap.get(c.objectId)?.name              : null;
    const meta = TYPE_META[c.calcType as CalcType];
    return (
      <div key={c.id}
        className="grid grid-cols-12 gap-2 items-center border rounded px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
        data-testid={`calc-row-${c.id}`}>
        <div className="col-span-12 md:col-span-2 flex items-center gap-2">
          <Badge variant="outline" className={`${meta?.color ?? ''} gap-1 text-[10px] font-medium`}>
            {meta?.icon}{meta?.label.split(' — ')[0] ?? c.calcType}
          </Badge>
          <span className="text-slate-400">#{c.id}</span>
        </div>
        <div className="col-span-12 md:col-span-2 text-slate-600">
          {new Date(c.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
        </div>
        <div className="col-span-12 md:col-span-2 truncate">
          {prof && <div className="text-cyan-700">📍 {prof}</div>}
          {obj  && <div className="text-blue-700 truncate">🏢 {obj}</div>}
          {!prof && !obj && <span className="text-slate-300">—</span>}
        </div>
        <div className="col-span-12 md:col-span-4 text-slate-600 font-mono text-[11px] truncate" title={summary(c)}>
          {summary(c)}
        </div>
        <div className="col-span-12 md:col-span-2 flex justify-end gap-1">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => setViewing(c)} data-testid={`btn-view-${c.id}`}>
            <Eye className="h-3 w-3" /> График
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => downloadCsv(`calc_${c.calcType}_${c.id}.csv`, paramsToCsv(c))}
            data-testid={`btn-csv-${c.id}`}>
            <Download className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-600 hover:bg-red-50"
            onClick={() => setConfirmDelete(c)} data-testid={`btn-delete-${c.id}`}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  const renderGroup = (t: CalcType) => {
    const rows = grouped[t];
    if (rows.length === 0) return null;
    const meta = TYPE_META[t];
    return (
      <Card key={t} className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4 flex-row items-center gap-2">
          {meta.icon}
          <CardTitle className="text-sm text-slate-700">{meta.label}</CardTitle>
          <Badge variant="secondary" className="ml-2">{rows.length}</Badge>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1.5">
          {rows.map(renderRow)}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-4" data-testid="page-calculations">
      <div className="flex items-center gap-3 mb-2">
        <History className="h-6 w-6 text-indigo-600" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">История расчётов</h1>
          <p className="text-sm text-slate-500">
            Все сохранённые анализы: МТСМ-усиление, спектр отклика и резонанс грунт–здание
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1"
          disabled={filtered.length === 0}
          onClick={() => downloadCsv(`calculations_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`,
                                     listToCsv(filtered, profiles, objects))}
          data-testid="btn-export-list">
          <Download className="h-3.5 w-3.5" /> Экспорт списка (CSV)
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[14rem]">
              <Search className="h-4 w-4 text-slate-400" />
              <Input
                placeholder="Поиск по типу, профилю, зданию, заметкам…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-sm"
                data-testid="input-search"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Всего: <strong>{counts.all}</strong></span>
              <span>МТСМ: <strong>{counts.mtsm}</strong></span>
              <span>Отклик: <strong>{counts.response_spectrum}</strong></span>
              <span>Резонанс: <strong>{counts.resonance}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'all' | CalcType)}>
        <TabsList className="grid grid-cols-4 max-w-2xl">
          <TabsTrigger value="all" className="text-xs gap-1" data-testid="tab-all">
            <FileBarChart className="h-3.5 w-3.5" /> Все ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="mtsm" className="text-xs gap-1" data-testid="tab-mtsm">
            <LayersIcon className="h-3.5 w-3.5" /> МТСМ ({counts.mtsm})
          </TabsTrigger>
          <TabsTrigger value="response_spectrum" className="text-xs gap-1" data-testid="tab-response">
            <Building2 className="h-3.5 w-3.5" /> Отклик ({counts.response_spectrum})
          </TabsTrigger>
          <TabsTrigger value="resonance" className="text-xs gap-1" data-testid="tab-resonance">
            <TriangleAlert className="h-3.5 w-3.5" /> Резонанс ({counts.resonance})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {isLoading && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center text-slate-400 text-sm">
                Загрузка…
              </CardContent>
            </Card>
          )}
          {!isLoading && filtered.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-slate-400">
                <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {calcs.length === 0
                    ? 'Сохранённых расчётов пока нет. Перейдите в раздел «Расчёты» и сохраните результаты МТСМ, спектра отклика или анализа резонанса.'
                    : 'По заданному фильтру ничего не найдено'}
                </p>
              </CardContent>
            </Card>
          )}
          {!isLoading && filtered.length > 0 && (
            activeTab === 'all'
              ? <>{(['mtsm','response_spectrum','resonance'] as CalcType[]).map(renderGroup)}</>
              : renderGroup(activeTab as CalcType)
          )}
        </TabsContent>
      </Tabs>

      <CalcDetailDialog
        calc={viewing}
        profile={viewing?.soilProfileId ? profMap.get(viewing.soilProfileId) ?? null : null}
        object={viewing?.objectId ? objMap.get(viewing.objectId) ?? null : null}
        onClose={() => setViewing(null)}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить расчёт #{confirmDelete?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && TYPE_META[confirmDelete.calcType as CalcType]?.label} от{' '}
              {confirmDelete && new Date(confirmDelete.createdAt).toLocaleString('ru-RU')}.
              Действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
              data-testid="btn-confirm-delete">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Detail dialog: re-displays the saved chart ──────────────────────────────

interface DetailDialogProps {
  calc: SeismicCalculation | null;
  profile: SoilProfile | null;
  object: InfrastructureObject | null;
  onClose: () => void;
}

const CalcDetailDialog: FC<DetailDialogProps> = ({ calc, profile, object, onClose }) => {
  if (!calc) return null;
  const meta = TYPE_META[calc.calcType as CalcType];
  return (
    <Dialog open={!!calc} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {meta?.icon}
            {meta?.label} · #{calc.id}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {new Date(calc.createdAt).toLocaleString('ru-RU')}
            {profile && <> · профиль: <strong>{profile.profileName}</strong></>}
            {object  && <> · объект: <strong>{object.name}</strong></>}
          </DialogDescription>
        </DialogHeader>

        {calc.calcType === 'mtsm'              && <MtsmDetail  calc={calc} />}
        {calc.calcType === 'response_spectrum' && <RespDetail  calc={calc} />}
        {calc.calcType === 'resonance'         && <ResoDetail  calc={calc} />}

        <ParamsTable inputParams={calc.inputParams} />
      </DialogContent>
    </Dialog>
  );
};

const ParamsTable: FC<{ inputParams: unknown }> = ({ inputParams }) => {
  const params = (inputParams ?? {}) as Record<string, unknown>;
  const entries = Object.entries(params).filter(([, v]) => v != null && typeof v !== 'object');
  if (entries.length === 0) return null;
  return (
    <div className="border rounded p-3 bg-slate-50">
      <div className="text-xs font-semibold text-slate-600 mb-2">Параметры расчёта</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <span className="text-slate-500">{k}</span>
            <span className="font-mono text-slate-800">
              {typeof v === 'number' ? Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 4 }) : String(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MtsmDetail: FC<{ calc: SeismicCalculation }> = ({ calc }) => {
  const r = (calc.results ?? {}) as MtsmResults;
  const points = r.points ?? [];
  if (points.length === 0) {
    return <div className="text-sm text-slate-500 py-8 text-center">Нет точек графика в сохранённом результате.</div>;
  }
  return (
    <div className="space-y-2">
      {(r.peakFreq != null) && (
        <div className="text-xs text-purple-600 font-medium">
          f₀ ≈ {r.peakFreq.toFixed(2)} Гц · A_max ≈ {r.peakAmp?.toFixed(2) ?? '—'} · Tₛ ≈ {(1 / r.peakFreq).toFixed(2)} с
        </div>
      )}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={points} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="freq" scale="log" type="number" domain={[0.1, 25]}
            label={{ value: 'Частота (Гц)', position: 'insideBottom', offset: -5, fontSize: 10 }}
            tickFormatter={v => v < 1 ? v.toFixed(1) : v.toFixed(0)} tick={{ fontSize: 9 }} />
          <YAxis label={{ value: 'A = u_surf / u_bedr', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }}
            tick={{ fontSize: 9 }} />
          <Tooltip formatter={(v: number) => [v.toFixed(3), 'A']} labelFormatter={v => `f=${Number(v).toFixed(3)} Гц`} />
          <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="3 3" />
          {r.peakFreq != null && r.peakFreq > 0 && (
            <ReferenceLine x={r.peakFreq} stroke="#7c3aed" strokeDasharray="4 2"
              label={{ value: `f₀=${r.peakFreq.toFixed(2)} Гц`, fontSize: 9, fill: '#7c3aed', position: 'top' }} />
          )}
          <Line type="monotone" dataKey="amp" stroke="#0891b2" strokeWidth={1.8} dot={false} name="|H(f)|" />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
          onClick={() => {
            const rows = ['freq_hz,amplitude'].concat(points.map(p => `${p.freq.toFixed(4)},${p.amp.toFixed(6)}`));
            downloadCsv(`mtsm_calc_${calc.id}.csv`, rows.join('\n'));
          }}>
          <Download className="h-3 w-3" /> CSV (точки графика)
        </Button>
      </div>
    </div>
  );
};

const RespDetail: FC<{ calc: SeismicCalculation }> = ({ calc }) => {
  const r = (calc.results ?? {}) as RespResults;
  const points = r.points ?? [];
  const inp = (calc.inputParams ?? {}) as Record<string, unknown>;
  if (points.length === 0) {
    return <div className="text-sm text-slate-500 py-8 text-center">Нет точек графика в сохранённом результате.</div>;
  }
  return (
    <div className="space-y-2">
      {r.peakT != null && (
        <div className="text-xs text-rose-600 font-medium">
          Пик Sa @ T = {r.peakT.toFixed(2)} с · Sa = {r.peakSa?.toFixed(3) ?? '—'} м/с² · ζ = {String(inp.damping ?? '—')}%
        </div>
      )}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={points} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="T" scale="log" type="number" domain={[0.05, 3]}
            label={{ value: 'Период T (с)', position: 'insideBottom', offset: -5, fontSize: 10 }}
            tickFormatter={v => v < 1 ? v.toFixed(2) : v.toFixed(1)} tick={{ fontSize: 9 }} />
          <YAxis label={{ value: 'Sa (м/с²)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }}
            tick={{ fontSize: 9 }} tickFormatter={v => v.toFixed(2)} />
          <Tooltip formatter={(v: number, n: string) => [v.toFixed(4), n]}
            labelFormatter={v => `T=${Number(v).toFixed(3)} с`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {r.peakT != null && r.peakT > 0 && (
            <ReferenceLine x={r.peakT} stroke="#7c3aed" strokeDasharray="4 2"
              label={{ value: `T=${r.peakT.toFixed(2)}с`, fontSize: 9, fill: '#7c3aed', position: 'top' }} />
          )}
          <Line type="monotone" dataKey="Sa" stroke="#dc2626" strokeWidth={1.8} dot={false} name={`Sa, ζ=${inp.damping ?? 5}%`} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
          onClick={() => {
            const rows = ['period_s,Sa_m_s2,Sv_m_s,Sd_m']
              .concat(points.map(p => `${p.T.toFixed(4)},${p.Sa.toFixed(6)},${p.Sv.toFixed(6)},${p.Sd.toFixed(6)}`));
            downloadCsv(`response_spectrum_calc_${calc.id}.csv`, rows.join('\n'));
          }}>
          <Download className="h-3 w-3" /> CSV (точки графика)
        </Button>
      </div>
    </div>
  );
};

const ResoDetail: FC<{ calc: SeismicCalculation }> = ({ calc }) => {
  const r = (calc.results ?? {}) as ResoResults;
  const inp = (calc.inputParams ?? {}) as Record<string, number | undefined>;
  const Tb = inp.T_building, Th = inp.T_hv, Tm = inp.T_mtsm;
  const data = [
    Tb != null ? { name: 'Здание (0.1·N)',  T: Tb } : null,
    Th != null ? { name: 'Грунт H/V',        T: Th } : null,
    Tm != null ? { name: 'Грунт МТСМ',       T: Tm } : null,
  ].filter(Boolean) as { name: string; T: number }[];

  return (
    <div className="space-y-3">
      {r.overallRisk && (
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${RISK_BADGE[r.overallRisk] ?? ''}`}>
            ОБЩАЯ ОЦЕНКА: {r.overallRisk === 'red' ? 'ВЫСОКИЙ РИСК' : r.overallRisk === 'yellow' ? 'УМЕРЕННЫЙ РИСК' : 'НИЗКИЙ РИСК'}
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis label={{ value: 'Период T (с)', angle: -90, position: 'insideLeft', fontSize: 10 }}
            tick={{ fontSize: 9 }} />
          <Tooltip formatter={(v: number) => [`${v.toFixed(2)} с`, 'T']} />
          <Line type="monotone" dataKey="T" stroke="#7c3aed" strokeWidth={2} dot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {r.hvLabel && (
          <div className="border rounded p-3 bg-purple-50">
            <div className="font-semibold text-purple-700 mb-1">Сравнение с H/V</div>
            <div className="text-slate-700">{r.hvLabel}</div>
          </div>
        )}
        {r.mtsmLabel && (
          <div className="border rounded p-3 bg-cyan-50">
            <div className="font-semibold text-cyan-700 mb-1">Сравнение с МТСМ</div>
            <div className="text-slate-700">{r.mtsmLabel}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calculations;
