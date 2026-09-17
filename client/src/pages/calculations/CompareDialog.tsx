import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import { Download, GitCompareArrows, Loader2, Bookmark, Link2, Check, ImageDown } from 'lucide-react';
import type { SeismicCalculation, SoilProfile, InfrastructureObject } from '@shared/schema';
import { CalcType, TYPE_META, MtsmResults, RespResults, ResoResults, RISK_BADGE, downloadCsv } from '@/pages/calculations/shared';


// ─── Compare dialog: overlay 2-3 saved curves on one chart ───────────────────

export const COMPARE_COLORS = ['#0891b2', '#dc2626', '#7c3aed'];

export interface CurveStats { peakX: number; peakY: number; area: number }

export function computeCurveStats<T extends Record<string, number>>(
  pts: T[], xKey: keyof T, yKey: keyof T,
): CurveStats | null {
  if (!pts || pts.length === 0) return null;
  let bestI = 0;
  for (let i = 1; i < pts.length; i++) {
    if ((pts[i][yKey] as number) > (pts[bestI][yKey] as number)) bestI = i;
  }
  const sorted = [...pts].sort((a, b) => (a[xKey] as number) - (b[xKey] as number));
  let area = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dx = (sorted[i][xKey] as number) - (sorted[i - 1][xKey] as number);
    area += (dx * ((sorted[i][yKey] as number) + (sorted[i - 1][yKey] as number))) / 2;
  }
  return {
    peakX: pts[bestI][xKey] as number,
    peakY: pts[bestI][yKey] as number,
    area,
  };
}

export const CompareStatsBar: FC<{
  stats: (CurveStats | null)[];
  xLabel: string;
  xUnit: string;
  yLabel: string;
  xFractionDigits?: number;
}> = ({ stats, xLabel, xUnit, yLabel, xFractionDigits = 3 }) => {
  const base = stats[0];
  if (!base) return null;
  const others = stats.slice(1);
  if (others.every(s => s == null)) return null;
  return (
    <div className="border rounded p-2 bg-indigo-50/60 flex flex-wrap gap-3 text-xs"
      data-testid="compare-stats-bar">
      <div className="text-slate-500 font-semibold whitespace-nowrap">
        Δ vs #{/* first calc id is shown via legend */}первый:
      </div>
      {others.map((s, idx) => {
        const i = idx + 1;
        if (!s) {
          return (
            <div key={i} className="text-slate-400" data-testid={`compare-stats-${i}`}>
              <span className="inline-block w-2.5 h-2.5 rounded mr-1 align-middle"
                style={{ background: COMPARE_COLORS[i] }} />
              нет данных
            </div>
          );
        }
        const dX = s.peakX - base.peakX;
        const ratioY = base.peakY !== 0 ? s.peakY / base.peakY : NaN;
        const ratioA = base.area !== 0 ? s.area / base.area : NaN;
        const fmt = (v: number, d = 3) => Number.isFinite(v) ? v.toFixed(d) : '—';
        return (
          <div key={i} className="flex items-center gap-2 px-2 py-0.5 rounded bg-white border"
            data-testid={`compare-stats-${i}`}>
            <span className="inline-block w-2.5 h-2.5 rounded"
              style={{ background: COMPARE_COLORS[i] }} />
            <span title={`${xLabel} сдвиг пика`}>
              Δ{xLabel}=<b>{dX >= 0 ? '+' : ''}{fmt(dX, xFractionDigits)}</b> {xUnit}
            </span>
            <span className="text-slate-300">·</span>
            <span title="Отношение пиковой амплитуды">
              {yLabel}_ratio=<b>{fmt(ratioY, 2)}</b>
            </span>
            <span className="text-slate-300">·</span>
            <span title="Отношение интегральной площади под кривой">
              ∫ratio=<b>{fmt(ratioA, 2)}</b>
            </span>
          </div>
        );
      })}
    </div>
  );
};

export interface CompareDialogProps {
  open: boolean;
  onClose: () => void;
  calcs: SeismicCalculation[];
  profMap: Map<number, SoilProfile>;
  objMap: Map<number, InfrastructureObject>;
  onSaveSet: (name: string) => void;
  onShareLink: () => void;
  isSaving: boolean;
}

export const CompareDialog: FC<CompareDialogProps> = ({
  open, onClose, calcs, profMap, objMap, onSaveSet, onShareLink, isSaving,
}) => {
  const [setName, setSetName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showWatermark, setShowWatermark] = useState(false);
  const [exportedAt, setExportedAt] = useState('');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { can } = usePermission();
  // Reset the name input whenever the dialog opens or the selection changes.
  useEffect(() => { if (open) setSetName(''); }, [open, calcs.map(c => c.id).join(',')]);
  const calcType = calcs[0]?.calcType as CalcType | undefined;
  const meta = calcType ? TYPE_META[calcType] : null;

  const hasChartData = useMemo(() => {
    if (calcType === 'mtsm') {
      return calcs.some(c => (((c.results ?? {}) as MtsmResults).points ?? []).length > 0);
    }
    if (calcType === 'response_spectrum') {
      return calcs.some(c => (((c.results ?? {}) as RespResults).points ?? []).length > 0);
    }
    if (calcType === 'resonance') {
      return calcs.some(c => {
        const inp = (c.inputParams ?? {}) as Record<string, unknown>;
        return inp.T_building != null || inp.T_hv != null || inp.T_mtsm != null;
      });
    }
    return false;
  }, [calcs, calcType]);

  const exportChartImage = async () => {
    const { default: html2canvas } = await import('html2canvas');
    const el = chartContainerRef.current;
    if (!el) {
      toast({ title: 'Нет данных для экспорта', description: 'График недоступен.', variant: 'destructive' });
      return;
    }
    setIsExporting(true);
    setExportedAt(new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'medium' }));
    setShowWatermark(true);
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `compare_${calcType}_${calcs.map(c => c.id).join('_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      toast({ title: 'Ошибка экспорта', description: 'Не удалось создать изображение.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
      setShowWatermark(false);
    }
  };

  const labelFor = (c: SeismicCalculation): string => {
    const inp = (c.inputParams ?? {}) as Record<string, unknown>;
    const prof = c.soilProfileId ? profMap.get(c.soilProfileId)?.profileName : null;
    const obj  = c.objectId      ? objMap.get(c.objectId)?.name              : null;
    if (c.calcType === 'response_spectrum') {
      const lbl = (inp.recordLabel ?? inp.scenarioLabel ?? `seismogram #${inp.seismogramId ?? '—'}`) as string;
      return `#${c.id} · ${lbl}${inp.damping != null ? ` · ζ=${inp.damping}%` : ''}`;
    }
    if (c.calcType === 'mtsm') {
      return `#${c.id}${prof ? ` · ${prof}` : ''}${obj ? ` · ${obj}` : ''}`;
    }
    return `#${c.id}`;
  };

  const exportCombinedCsv = () => {
    if (!calcType) return;
    const buildStatsRows = (
      stats: (CurveStats | null)[], peakXLabel: string, peakYLabel: string,
    ): string[] => {
      const base = stats[0];
      const fmt = (v: number | null | undefined, d = 6) =>
        v != null && Number.isFinite(v) ? v.toFixed(d) : '';
      const cell = (s: CurveStats | null, getter: (x: CurveStats) => number, d = 6) =>
        s ? fmt(getter(s), d) : '';
      const ratio = (s: CurveStats | null, getter: (x: CurveStats) => number) => {
        if (!s || !base) return '';
        const a = getter(s), b = getter(base);
        return b !== 0 && Number.isFinite(a / b) ? (a / b).toFixed(6) : '';
      };
      const delta = (s: CurveStats | null, getter: (x: CurveStats) => number) => {
        if (!s || !base) return '';
        return (getter(s) - getter(base)).toFixed(6);
      };
      return [
        '',
        `"${peakXLabel}",` + stats.map(s => cell(s, x => x.peakX)).join(','),
        `"${peakYLabel}",` + stats.map(s => cell(s, x => x.peakY)).join(','),
        `"integrated_area",` + stats.map(s => cell(s, x => x.area)).join(','),
        `"delta_${peakXLabel}_vs_first",` + stats.map(s => delta(s, x => x.peakX)).join(','),
        `"${peakYLabel}_ratio_vs_first",` + stats.map(s => ratio(s, x => x.peakY)).join(','),
        `"integrated_ratio_vs_first",` + stats.map(s => ratio(s, x => x.area)).join(','),
      ];
    };
    if (calcType === 'mtsm') {
      const xs = new Set<number>();
      const series = calcs.map(c => {
        const pts = ((c.results ?? {}) as MtsmResults).points ?? [];
        const m = new Map(pts.map(p => [p.freq, p.amp]));
        m.forEach((_v, f) => xs.add(f));
        return { label: labelFor(c), m, pts };
      });
      const xsSorted = Array.from(xs).sort((a, b) => a - b);
      const header = 'freq_hz,' + series.map(s => `"A · ${s.label.replace(/"/g, '""')}"`).join(',');
      const rows = xsSorted.map(f => [f.toFixed(4), ...series.map(s => s.m.get(f)?.toFixed(6) ?? '')].join(','));
      const stats = series.map(s => computeCurveStats(s.pts, 'freq', 'amp'));
      const statRows = buildStatsRows(stats, 'peak_freq_hz', 'peak_amp');
      downloadCsv(`compare_mtsm_${calcs.map(c => c.id).join('_')}.csv`,
        [header, ...rows, ...statRows].join('\n'));
      return;
    }
    if (calcType === 'response_spectrum') {
      const xs = new Set<number>();
      const series = calcs.map(c => {
        const pts = ((c.results ?? {}) as RespResults).points ?? [];
        const m = new Map(pts.map(p => [p.T, p.Sa]));
        m.forEach((_v, T) => xs.add(T));
        return { label: labelFor(c), m, pts };
      });
      const xsSorted = Array.from(xs).sort((a, b) => a - b);
      const header = 'period_s,' + series.map(s => `"Sa · ${s.label.replace(/"/g, '""')}"`).join(',');
      const rows = xsSorted.map(T => [T.toFixed(4), ...series.map(s => s.m.get(T)?.toFixed(6) ?? '')].join(','));
      const stats = series.map(s => computeCurveStats(s.pts, 'T', 'Sa'));
      const statRows = buildStatsRows(stats, 'peak_period_s', 'peak_Sa');
      downloadCsv(`compare_response_${calcs.map(c => c.id).join('_')}.csv`,
        [header, ...rows, ...statRows].join('\n'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="compare-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitCompareArrows className="h-4 w-4 text-indigo-600" />
            Сравнение расчётов{meta ? ` · ${meta.label}` : ''}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {calcType === 'resonance'
              ? `Сравнение периодов резонанса · ${calcs.length} расчёта`
              : `Наложение ${calcs.length} сохранённых кривых на один график`}
          </DialogDescription>
        </DialogHeader>

        <div ref={chartContainerRef} className="bg-white">
          {showWatermark && (
            <div className="px-3 py-2 border-b border-slate-200 bg-white space-y-0.5">
              <div className="text-sm font-semibold text-slate-800">
                {meta?.label ?? calcType} · Сравнение расчётов
              </div>
              <div className="text-[11px] text-slate-500">
                Расчёты: {calcs.map(c => `#${c.id}`).join(', ')} · Экспортировано: {exportedAt}
              </div>
            </div>
          )}
          {calcType === 'mtsm' && <MtsmCompareChart calcs={calcs} labelFor={labelFor} />}
          {calcType === 'response_spectrum' && <RespCompareChart calcs={calcs} labelFor={labelFor} />}
          {calcType === 'resonance' && <ResonanceCompareChart calcs={calcs} labelFor={labelFor} />}
          {showWatermark && (
            <div className="px-3 py-1.5 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-400 text-right">
              Сейсмический мониторинг — автоматически создано системой
            </div>
          )}
        </div>

        <div className="border rounded p-3 bg-slate-50 space-y-2">
          <div className="text-xs font-semibold text-slate-600">Выбранные расчёты</div>
          <div className="space-y-1">
            {calcs.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 text-xs" data-testid={`compare-legend-${c.id}`}>
                <span className="inline-block w-3 h-3 rounded" style={{ background: COMPARE_COLORS[i] }} />
                <span className="font-mono text-slate-500">#{c.id}</span>
                <span className="text-slate-700 truncate">{labelFor(c)}</span>
                <span className="ml-auto text-slate-400">
                  {new Date(c.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded p-3 bg-amber-50/40 space-y-2">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5 text-amber-600" />
            Сохранить как именованный набор
          </div>
          <div className="flex items-center gap-2">
            {can('mtsm', 'write') && (<>
              <Input
                value={setName}
                onChange={e => setSetName(e.target.value)}
                placeholder="Название (напр. «Сравнение оснований ЖК Юбилейный»)"
                maxLength={120}
                className="h-8 text-xs flex-1"
                data-testid="input-save-set-name"
              />
              <Button size="sm" variant="default" className="h-8 text-xs gap-1"
                disabled={!setName.trim() || isSaving}
                onClick={() => { onSaveSet(setName.trim()); setSetName(''); }}
                data-testid="btn-save-set">
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Сохранить набор
              </Button>
            </>)}
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
              onClick={onShareLink}
              data-testid="btn-share-link"
              title="Скопировать прямую ссылку на это сравнение">
              <Link2 className="h-3 w-3" /> Ссылка
            </Button>
          </div>
          <div className="text-[10px] text-slate-500">
            Сохранённые наборы появятся в панели «Сохранённые сравнения» на странице расчётов и будут доступны всем пользователям.
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={exportChartImage}
            disabled={isExporting || !hasChartData}
            data-testid="btn-compare-export-image">
            {isExporting
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <ImageDown className="h-3 w-3" />}
            Экспорт PNG
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={exportCombinedCsv}
            data-testid="btn-compare-csv">
            <Download className="h-3 w-3" /> CSV (объединённый)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const MtsmCompareChart: FC<{
  calcs: SeismicCalculation[];
  labelFor: (c: SeismicCalculation) => string;
}> = ({ calcs, labelFor }) => {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const series = calcs.map(c => ({
    id: c.id,
    label: labelFor(c),
    points: ((c.results ?? {}) as MtsmResults).points ?? [],
    peakFreq: ((c.results ?? {}) as MtsmResults).peakFreq,
  }));
  const stats = series.map(s => computeCurveStats(s.points, 'freq', 'amp'));
  if (series.every(s => s.points.length === 0)) {
    return <div className="text-sm text-slate-500 py-8 text-center">У выбранных расчётов нет точек графика.</div>;
  }
  const baseStat = stats[0];
  return (
    <div className="space-y-2">
    <CompareStatsBar stats={stats} xLabel="f₀" xUnit="Гц" yLabel="A" xFractionDigits={2} />
    <div className="flex justify-end">
      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none"
        data-testid="toggle-annotations-mtsm">
        <Checkbox checked={showAnnotations} onCheckedChange={v => setShowAnnotations(!!v)}
          className="h-3.5 w-3.5" id="annot-mtsm" />
        <span>Аннотации пиков</span>
      </label>
    </div>
    <ResponsiveContainer width="100%" height={380}>
      <LineChart margin={{ top: 16, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="freq" type="number" scale="log" domain={[0.1, 25]} allowDuplicatedCategory={false}
          label={{ value: 'Частота (Гц)', position: 'insideBottom', offset: -5, fontSize: 10 }}
          tickFormatter={v => v < 1 ? v.toFixed(1) : v.toFixed(0)} tick={{ fontSize: 9 }} />
        <YAxis label={{ value: 'A = u_surf / u_bedr', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }}
          tick={{ fontSize: 9 }} />
        <Tooltip formatter={(v: number) => v.toFixed(3)}
          labelFormatter={v => `f=${Number(v).toFixed(3)} Гц`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="3 3" />
        {showAnnotations && baseStat && stats.slice(1).map((s, idx) => {
          if (!s) return null;
          const i = idx + 1;
          const x1 = Math.min(baseStat.peakX, s.peakX);
          const x2 = Math.max(baseStat.peakX, s.peakX);
          if (x1 === x2) return null;
          return (
            <ReferenceArea key={`shade-${i}`} x1={x1} x2={x2}
              fill={COMPARE_COLORS[i]} fillOpacity={0.07} stroke="none" />
          );
        })}
        {showAnnotations && stats.map((s, i) => {
          if (!s) return null;
          return (
            <ReferenceLine key={`peak-${i}`} x={s.peakX} stroke={COMPARE_COLORS[i]}
              strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: `f₀=${s.peakX.toFixed(2)}`, position: 'top', fontSize: 9, fill: COMPARE_COLORS[i] }} />
          );
        })}
        {series.map((s, i) => (
          <Line key={s.id} data={s.points} type="monotone" dataKey="amp"
            name={s.label}
            stroke={COMPARE_COLORS[i]} strokeWidth={1.8} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
};

export const RespCompareChart: FC<{
  calcs: SeismicCalculation[];
  labelFor: (c: SeismicCalculation) => string;
}> = ({ calcs, labelFor }) => {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const series = calcs.map(c => ({
    id: c.id,
    label: labelFor(c),
    points: ((c.results ?? {}) as RespResults).points ?? [],
  }));
  const stats = series.map(s => computeCurveStats(s.points, 'T', 'Sa'));
  if (series.every(s => s.points.length === 0)) {
    return <div className="text-sm text-slate-500 py-8 text-center">У выбранных расчётов нет точек графика.</div>;
  }
  const baseStat = stats[0];
  return (
    <div className="space-y-2">
    <CompareStatsBar stats={stats} xLabel="T_peak" xUnit="с" yLabel="Sa" xFractionDigits={3} />
    <div className="flex justify-end">
      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none"
        data-testid="toggle-annotations-resp">
        <Checkbox checked={showAnnotations} onCheckedChange={v => setShowAnnotations(!!v)}
          className="h-3.5 w-3.5" id="annot-resp" />
        <span>Аннотации пиков</span>
      </label>
    </div>
    <ResponsiveContainer width="100%" height={380}>
      <LineChart margin={{ top: 16, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="T" type="number" scale="log" domain={[0.05, 3]} allowDuplicatedCategory={false}
          label={{ value: 'Период T (с)', position: 'insideBottom', offset: -5, fontSize: 10 }}
          tickFormatter={v => v < 1 ? v.toFixed(2) : v.toFixed(1)} tick={{ fontSize: 9 }} />
        <YAxis label={{ value: 'Sa (м/с²)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }}
          tick={{ fontSize: 9 }} tickFormatter={v => v.toFixed(2)} />
        <Tooltip formatter={(v: number) => v.toFixed(4)}
          labelFormatter={v => `T=${Number(v).toFixed(3)} с`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {showAnnotations && baseStat && stats.slice(1).map((s, idx) => {
          if (!s) return null;
          const i = idx + 1;
          const x1 = Math.min(baseStat.peakX, s.peakX);
          const x2 = Math.max(baseStat.peakX, s.peakX);
          if (x1 === x2) return null;
          return (
            <ReferenceArea key={`shade-${i}`} x1={x1} x2={x2}
              fill={COMPARE_COLORS[i]} fillOpacity={0.07} stroke="none" />
          );
        })}
        {showAnnotations && stats.map((s, i) => {
          if (!s) return null;
          return (
            <ReferenceLine key={`peak-${i}`} x={s.peakX} stroke={COMPARE_COLORS[i]}
              strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: `T=${s.peakX.toFixed(3)}с`, position: 'top', fontSize: 9, fill: COMPARE_COLORS[i] }} />
          );
        })}
        {series.map((s, i) => (
          <Line key={s.id} data={s.points} type="monotone" dataKey="Sa"
            name={s.label}
            stroke={COMPARE_COLORS[i]} strokeWidth={1.8} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
};

export const ResonanceCompareChart: FC<{
  calcs: SeismicCalculation[];
  labelFor: (c: SeismicCalculation) => string;
}> = ({ calcs, labelFor }) => {
  const PERIOD_KEYS: { key: 'T_building' | 'T_hv' | 'T_mtsm'; label: string }[] = [
    { key: 'T_building', label: 'T зд.' },
    { key: 'T_hv',       label: 'T H/V' },
    { key: 'T_mtsm',     label: 'T МТСМ' },
  ];

  const chartData = PERIOD_KEYS.map(({ key, label }) => {
    const row: Record<string, string | number> = { name: label };
    calcs.forEach(c => {
      const inp = (c.inputParams ?? {}) as Record<string, number | undefined>;
      const v = inp[key];
      if (v != null) row[`calc_${c.id}`] = v;
    });
    return row;
  });

  const RISK_LABEL: Record<string, string> = {
    red: 'Высокий риск',
    yellow: 'Умеренный риск',
    green: 'Низкий риск',
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-500 text-center">Сравнение периодов резонанса (с)</div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 16, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis
            label={{ value: 'Период T (с)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }}
            tick={{ fontSize: 9 }}
            tickFormatter={v => v.toFixed(2)}
          />
          <Tooltip formatter={(v: number) => [`${v.toFixed(2)} с`, 'T']} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {calcs.map((c, i) => (
            <Bar key={c.id} dataKey={`calc_${c.id}`} name={labelFor(c)}
              fill={COMPARE_COLORS[i]} opacity={0.85} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {calcs.map((c, i) => {
          const r = (c.results ?? {}) as ResoResults;
          const inp = (c.inputParams ?? {}) as Record<string, number | undefined>;
          return (
            <div key={c.id} className="border rounded p-2.5 bg-slate-50 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold" style={{ color: COMPARE_COLORS[i] }}>
                <span className="inline-block w-2.5 h-2.5 rounded" style={{ background: COMPARE_COLORS[i] }} />
                {labelFor(c)}
              </div>
              <div className="text-slate-600 space-y-0.5">
                {inp.T_building != null && <div>T зд. = <b>{inp.T_building.toFixed(2)} с</b></div>}
                {inp.T_hv       != null && <div>T H/V = <b>{inp.T_hv.toFixed(2)} с</b></div>}
                {inp.T_mtsm     != null && <div>T МТСМ = <b>{inp.T_mtsm.toFixed(2)} с</b></div>}
              </div>
              {r.overallRisk && (
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_BADGE[r.overallRisk] ?? ''}`}>
                  {RISK_LABEL[r.overallRisk] ?? r.overallRisk.toUpperCase()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
