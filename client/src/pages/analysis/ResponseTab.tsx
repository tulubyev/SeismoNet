import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SP14_ACCELEROGRAMS, SP14_BY_INTENSITY, SP14_SOIL_K_TABLE4, SP14_PGA_TABLE3, SP14_K1_TABLE5, SP14_K2_TABLE6, sp14DesignSpectrum, synthesizeSP14Accelerogram, synthesizeSP14HorizontalPair, type NormativeAccelerogram, type SeismicIntensity } from '@/data/sp14-accelerograms';
import { useToast } from '@/hooks/use-toast';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Plus, Save, Zap, Building2, Download, Copy } from 'lucide-react';
import type { SeismogramRecord, InfrastructureObject } from '@shared/schema';
import { hasRealData, getRealArrays } from '@/lib/numeric/waveform';
import { SpecPoint, RespComponent, RESP_COMPONENT_LABEL, combineSpectraGeomean, responseSpectrum } from '@/lib/numeric/responseSpectrum';
import { BAIKAL_CATALOG, generateSyntheticAccelerogram, generateSyntheticAccelerogramPair } from '@/lib/numeric/scenarios';


// ─── Response spectrum tab (Newmark-β SDOF) ──────────────────────────────────

export interface RespTabProps {
  seismograms: SeismogramRecord[];
  objects: InfrastructureObject[];
  selectedSeismogramId: number | null;
  setSelectedSeismogramId: (id: number | null) => void;
  respDamping: string;   setRespDamping: (v: string) => void;
  respComponent: RespComponent; setRespComponent: (v: RespComponent) => void;
  respResult: SpecPoint[] | null; setRespResult: (v: SpecPoint[] | null) => void;
  toast: ReturnType<typeof useToast>['toast'];
}

export const ResponseTab: FC<RespTabProps> = ({
  seismograms, objects, selectedSeismogramId, setSelectedSeismogramId,
  respDamping, setRespDamping, respComponent, setRespComponent,
  respResult, setRespResult, toast,
}) => {
  const [inputMode, setInputMode] = useState<'catalog' | 'sp14' | 'seismogram'>('sp14');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(BAIKAL_CATALOG[0].id);
  const [sp14Intensity, setSp14Intensity] = useState<SeismicIntensity>('VIII');
  const [sp14SoilCategory, setSp14SoilCategory] = useState<'I'|'II'|'III'>('II');
  const [sp14RecordId, setSp14RecordId] = useState<string>(SP14_BY_INTENSITY['VIII'][0].id);
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [sp14K1Key, setSp14K1Key] = useState<keyof typeof SP14_K1_TABLE5>('elastic');
  const [sp14K2Key, setSp14K2Key] = useState<keyof typeof SP14_K2_TABLE6>('wall_monolithic');
  const [sp14Component, setSp14Component] = useState<'single' | 'GMH'>('single');
  const [catalogComponent, setCatalogComponent] = useState<'single' | 'GMH'>('single');
  const [componentSpectra, setComponentSpectra] = useState<{ Z?: SpecPoint[]; NS?: SpecPoint[]; EW?: SpecPoint[]; H1?: SpecPoint[]; H2?: SpecPoint[] } | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [customPeriods,  setCustomPeriods]  = useState<number[]>([]);
  const [customPeriodInput, setCustomPeriodInput] = useState<string>('');
  const [customPeriodError, setCustomPeriodError] = useState<string>('');
  const [k1FromProfile, setK1FromProfile] = useState(false);
  const [k2FromProfile, setK2FromProfile] = useState(false);

  useEffect(() => {
    if (selectedObjectId === null) {
      setSp14K1Key('elastic');
      setSp14K2Key('wall_monolithic');
      setK1FromProfile(false);
      setK2FromProfile(false);
      return;
    }
    const obj = objects.find(o => o.id === selectedObjectId);
    if (!obj) return;
    if (obj.k1Key && obj.k1Key in SP14_K1_TABLE5) {
      setSp14K1Key(obj.k1Key as keyof typeof SP14_K1_TABLE5);
      setK1FromProfile(true);
    }
    if (obj.k2Key && obj.k2Key in SP14_K2_TABLE6) {
      setSp14K2Key(obj.k2Key as keyof typeof SP14_K2_TABLE6);
      setK2FromProfile(true);
    }
  }, [selectedObjectId, objects]);


  const sp14K1 = SP14_K1_TABLE5[sp14K1Key];
  const sp14K2 = SP14_K2_TABLE6[sp14K2Key];
  const SP14_K1_LABEL: Record<keyof typeof SP14_K1_TABLE5, string> = {
    elastic:     'Упругий — 1.00',
    critical:    'Критич. сооружения — 1.00',
    normal:      'Здания I уровня — 0.35',
    residential: 'Гражданские — 0.25',
  };
  const SP14_K2_LABEL: Record<keyof typeof SP14_K2_TABLE6, string> = {
    frame_no_braces:    'Каркас без связей — 1.50',
    frame_braced:       'Каркас со связями/диафрагмами — 1.30',
    wall_monolithic:    'Стеновая/монолитная ж/б — 1.00',
    timber:             'Деревянное — 0.80',
    masonry_protected:  'Кирпичная/каменная (защищ.) — 0.70',
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
    setComponentSpectra(null);
    setHiddenSeries(new Set());
    try {
      if (inputMode === 'catalog') {
        const sr = 200;
        if (catalogComponent === 'GMH') {
          const { h1, h2, pga_ms2 } = generateSyntheticAccelerogramPair(scenario, sr);
          const dt = 1 / sr;
          const specH1 = responseSpectrum(Array.from(h1), dt, periods, zeta);
          const specH2 = responseSpectrum(Array.from(h2), dt, periods, zeta);
          setRespResult(combineSpectraGeomean([specH1, specH2]));
          setComponentSpectra({ H1: specH1, H2: specH2 });
          toast({
            title: 'Спектр отклика рассчитан',
            description: `Байкал (H1⊕H2 геом. среднее): ${scenario.label}, PGA=${pga_ms2.toFixed(2)} м/с², ζ=${(zeta*100).toFixed(1)}%`,
          });
        } else {
          const sig = generateSyntheticAccelerogram(scenario, sr, 'H1');
          setRespResult(responseSpectrum(sig, 1 / sr, periods, zeta));
          toast({ title: 'Спектр отклика рассчитан', description: `Сценарий: ${scenario.label}, PGA=${(scenario.PGA_g * 1000).toFixed(0)} мг, ζ=${(zeta*100).toFixed(1)}%` });
        }
      } else if (inputMode === 'sp14') {
        if (sp14Component === 'GMH') {
          const { h1, h2, sampleRate, pga_ms2 } = synthesizeSP14HorizontalPair(sp14Record, { soilCategory: sp14SoilCategory });
          const dt = 1 / sampleRate;
          const specH1 = responseSpectrum(Array.from(h1), dt, periods, zeta);
          const specH2 = responseSpectrum(Array.from(h2), dt, periods, zeta);
          setRespResult(combineSpectraGeomean([specH1, specH2]));
          setComponentSpectra({ H1: specH1, H2: specH2 });
          toast({
            title: 'Спектр отклика рассчитан',
            description: `СП 14 (H1⊕H2 геом. среднее): ${sp14Record.label}, грунт ${sp14SoilCategory} (K=${SP14_SOIL_K_TABLE4[sp14SoilCategory]}), PGA=${pga_ms2.toFixed(2)} м/с², ζ=${(zeta*100).toFixed(1)}%`,
          });
        } else {
          // Single-component mode uses the same H1 phase realization that GMH
          // mode shows on the chart, so toggling between modes keeps the H1
          // curve identical (the two are physically the same component).
          const { signal, sampleRate, pga_ms2 } = synthesizeSP14Accelerogram(sp14Record, { soilCategory: sp14SoilCategory, phaseTag: 'H1' });
          setRespResult(responseSpectrum(Array.from(signal), 1 / sampleRate, periods, zeta));
          toast({
            title: 'Спектр отклика рассчитан',
            description: `СП 14: ${sp14Record.label}, грунт ${sp14SoilCategory} (K=${SP14_SOIL_K_TABLE4[sp14SoilCategory]}), PGA=${pga_ms2.toFixed(2)} м/с², ζ=${(zeta*100).toFixed(1)}%`,
          });
        }
      } else {
        if (!rec || !real) return;
        const arrs = getRealArrays(rec);
        const dt = 1 / (rec.sampleRate || 100);
        if (respComponent === 'AVG3') {
          const specZ = responseSpectrum(arrs.z, dt, periods, zeta);
          const specNS = responseSpectrum(arrs.ns, dt, periods, zeta);
          const specEW = responseSpectrum(arrs.ew, dt, periods, zeta);
          setRespResult(combineSpectraGeomean([specZ, specNS, specEW]));
          setComponentSpectra({ Z: specZ, NS: specNS, EW: specEW });
          toast({ title: 'Спектр отклика рассчитан', description: `Геом. среднее Z+NS+EW · ${NP} периодов · ζ=${(zeta*100).toFixed(1)}%` });
        } else if (respComponent === 'GMH') {
          const specNS = responseSpectrum(arrs.ns, dt, periods, zeta);
          const specEW = responseSpectrum(arrs.ew, dt, periods, zeta);
          setRespResult(combineSpectraGeomean([specNS, specEW]));
          setComponentSpectra({ NS: specNS, EW: specEW });
          toast({ title: 'Спектр отклика рассчитан', description: `Геом. среднее NS+EW (СП 14) · ${NP} периодов · ζ=${(zeta*100).toFixed(1)}%` });
        } else {
          const sig = respComponent === 'Z' ? arrs.z : respComponent === 'NS' ? arrs.ns : arrs.ew;
          setRespResult(responseSpectrum(sig, dt, periods, zeta));
          setComponentSpectra(null);
          toast({ title: 'Спектр отклика рассчитан', description: `Компонента ${respComponent} · ${NP} периодов · ζ=${(zeta*100).toFixed(1)}%` });
        }
      }
    } catch (e) {
      toast({ title: 'Ошибка расчёта', description: String(e), variant: 'destructive' });
    }
  }, [inputMode, scenario, catalogComponent, sp14Record, sp14SoilCategory, sp14Component, rec, real, respComponent, respDamping, setRespResult, toast]);

  const peakSa = respResult ? respResult.reduce((b, p) => p.Sa > b.Sa ? p : b, { T: 0, Sa: 0, Sv: 0, Sd: 0 }) : null;

  const peakIdx = useMemo(() => {
    if (!respResult) return -1;
    return respResult.reduce((bi, p, i) => p.Sa > respResult[bi].Sa ? i : bi, 0);
  }, [respResult]);

  const COMP_META: Record<string, { label: string; color: string }> = {
    Z:  { label: 'Z',  color: '#94a3b8' },
    NS: { label: 'NS', color: '#65a30d' },
    EW: { label: 'EW', color: '#d97706' },
    H1: { label: 'H1', color: '#65a30d' },
    H2: { label: 'H2', color: '#d97706' },
  };

  const dominantComp = useMemo(() => {
    if (peakIdx < 0 || !componentSpectra) return null;
    const entries: { key: string; sa: number }[] = [];
    if (componentSpectra.Z)  entries.push({ key: 'Z',  sa: componentSpectra.Z[peakIdx]?.Sa  ?? 0 });
    if (componentSpectra.NS) entries.push({ key: 'NS', sa: componentSpectra.NS[peakIdx]?.Sa ?? 0 });
    if (componentSpectra.EW) entries.push({ key: 'EW', sa: componentSpectra.EW[peakIdx]?.Sa ?? 0 });
    if (componentSpectra.H1) entries.push({ key: 'H1', sa: componentSpectra.H1[peakIdx]?.Sa ?? 0 });
    if (componentSpectra.H2) entries.push({ key: 'H2', sa: componentSpectra.H2[peakIdx]?.Sa ?? 0 });
    if (entries.length === 0) return null;
    return entries.reduce((best, c) => c.sa > best.sa ? c : best);
  }, [peakIdx, componentSpectra]);

  const h1h2ScatterStats = useMemo(() => {
    const H1 = componentSpectra?.H1 ?? (componentSpectra?.NS && componentSpectra?.EW ? componentSpectra.NS : null);
    const H2 = componentSpectra?.H2 ?? (componentSpectra?.NS && componentSpectra?.EW ? componentSpectra.EW : null);
    if (!H1 || !H2) return null;
    const ratios: number[] = [];
    for (let i = 0; i < H1.length; i++) {
      const h1 = H1[i]?.Sa ?? 0;
      const h2 = H2[i]?.Sa ?? 0;
      const mn = Math.min(h1, h2);
      const mx = Math.max(h1, h2);
      if (mn > 0) ratios.push(mx / mn);
    }
    if (ratios.length === 0) return null;
    const sorted = [...ratios].sort((a, b) => a - b);
    const peak   = sorted[sorted.length - 1];
    const mid    = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 1
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
    const mean   = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    return { peak, median, mean, ratios };
  }, [componentSpectra]);

  // Нормативный проектный спектр β(T)·A0·g·K_грунт по СП 14.13330.2018 §5,
  // совмещённый с сеткой периодов вычисленного Sa(T) для прямого сравнения.
  const chartData = useMemo(() => {
    if (!respResult) return [];
    const periods = respResult.map(p => p.T);
    const design = sp14DesignSpectrum(periods, sp14Intensity, sp14SoilCategory, sp14K1, sp14K2);
    return respResult.map((p, i) => {
      const h1 = componentSpectra?.H1?.[i]?.Sa;
      const h2 = componentSpectra?.H2?.[i]?.Sa;
      const ns = componentSpectra?.NS?.[i]?.Sa;
      const ew = componentSpectra?.EW?.[i]?.Sa;
      // Use H1/H2 pair when available (catalog/sp14 GMH), fall back to NS/EW pair (seismogram GMH/AVG3)
      const pairA = h1 ?? (ns != null && ew != null ? ns : undefined);
      const pairB = h2 ?? (ns != null && ew != null ? ew : undefined);
      const h1h2Ratio = (pairA != null && pairB != null && Math.min(pairA, pairB) > 0)
        ? Math.max(pairA, pairB) / Math.min(pairA, pairB)
        : undefined;
      const ribbonLow  = (pairA != null && pairB != null) ? Math.min(pairA, pairB) : undefined;
      const ribbonHigh = (pairA != null && pairB != null) ? Math.max(pairA, pairB) : undefined;
      return {
        ...p,
        Sa_design: design[i].Sa_design,
        Sa_Z:  componentSpectra?.Z?.[i]?.Sa,
        Sa_NS: ns,
        Sa_EW: ew,
        Sa_H1: h1,
        Sa_H2: h2,
        H1_H2_ratio: h1h2Ratio,
        Sa_H1H2_ribbon: (ribbonLow != null && ribbonHigh != null) ? [ribbonLow, ribbonHigh] as [number, number] : undefined,
      };
    });
  }, [respResult, sp14Intensity, sp14SoilCategory, sp14K1, sp14K2, componentSpectra]);

  const H1H2_GRADIENT_DOMAIN: [number, number] = [0.05, 3];
  const h1h2GradientStops = useMemo(() => {
    const pts = chartData.filter(pt => pt.H1_H2_ratio != null && pt.T >= H1H2_GRADIENT_DOMAIN[0] && pt.T <= H1H2_GRADIENT_DOMAIN[1]);
    if (pts.length === 0) return null;
    const logMin = Math.log(H1H2_GRADIENT_DOMAIN[0]);
    const logMax = Math.log(H1H2_GRADIENT_DOMAIN[1]);
    return pts.map(pt => {
      const offset = ((Math.log(pt.T) - logMin) / (logMax - logMin)) * 100;
      const ratio = pt.H1_H2_ratio!;
      const color = ratio < 1.3 ? '#22c55e' : ratio < 1.6 ? '#f59e0b' : '#ef4444';
      return { offset: Math.max(0, Math.min(100, offset)), color };
    });
  }, [chartData]);

  const COMPONENT_KEYS = new Set(['Sa_Z', 'Sa_NS', 'Sa_EW', 'Sa_H1', 'Sa_H2']);
  const AGGREGATE_KEYS = new Set(['Sa', 'Sa_design']);

  const CustomRespTooltip = useCallback(({ active, payload, label }: {
    active?: boolean; label?: unknown;
    payload?: { name: string; value: number; color: string; dataKey: string }[];
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const validRows = payload.filter(p => p.value != null && isFinite(p.value));
    const compRows = validRows
      .filter(p => COMPONENT_KEYS.has(p.dataKey))
      .sort((a, b) => b.value - a.value);
    const aggRows = validRows.filter(p => AGGREGATE_KEYS.has(p.dataKey));
    const hasComp = compRows.length > 0;
    const tVal = Number(label);
    const nearestPt = chartData.reduce<(typeof chartData)[0] | null>((best, pt) =>
      best == null || Math.abs(pt.T - tVal) < Math.abs(best.T - tVal) ? pt : best, null);
    const h1h2RatioAtT = nearestPt?.H1_H2_ratio;
    const ratioColor = h1h2RatioAtT == null ? undefined
      : h1h2RatioAtT < 1.3 ? '#16a34a'
      : h1h2RatioAtT < 1.6 ? '#d97706'
      : '#dc2626';
    return (
      <div className="bg-white border border-slate-200 rounded shadow-lg px-3 py-2 text-xs min-w-[180px]">
        <div className="font-medium text-slate-600 border-b pb-1 mb-1.5">T = {tVal.toFixed(3)} с</div>
        {hasComp && (
          <>
            <div className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">Компоненты (↓ по убыванию)</div>
            {compRows.map((item, i) => (
              <div key={item.dataKey} className="flex justify-between gap-4 items-center py-0.5">
                <span className="flex items-center gap-1" style={{ color: item.color }}>
                  {i === 0 && <span className="text-[10px] font-bold">▲</span>}
                  <span className={i === 0 ? 'font-bold' : ''}>{item.name}</span>
                </span>
                <span className="font-mono text-slate-700">{item.value.toFixed(4)}</span>
              </div>
            ))}
          </>
        )}
        {aggRows.length > 0 && (
          <div className={`space-y-0.5 ${hasComp ? 'mt-1.5 pt-1.5 border-t border-slate-100' : ''}`}>
            {aggRows.map(item => (
              <div key={item.dataKey} className="flex justify-between gap-4 items-center py-0.5">
                <span style={{ color: item.color }}>{item.name}</span>
                <span className="font-mono text-slate-700">{item.value.toFixed(4)}</span>
              </div>
            ))}
          </div>
        )}
        {!hasComp && aggRows.length === 0 && validRows.map(item => (
          <div key={item.dataKey} className="flex justify-between gap-4 items-center py-0.5">
            <span style={{ color: item.color }}>{item.name}</span>
            <span className="font-mono text-slate-700">{item.value.toFixed(4)}</span>
          </div>
        ))}
        {h1h2RatioAtT != null && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex justify-between gap-4 items-center">
            <span className="text-slate-500">H1/H2 разброс</span>
            <span className="font-mono font-semibold" style={{ color: ratioColor }}>{h1h2RatioAtT.toFixed(2)}×</span>
          </div>
        )}
      </div>
    );
  }, [chartData]);

  const KEY_PERIODS = [0.1, 0.2, 0.5, 1.0, 2.0];

  const saKeyTable = useMemo(() => {
    if (!componentSpectra || !chartData.length) return null;
    const comps: string[] = [];
    if (componentSpectra.Z)  comps.push('Z');
    if (componentSpectra.NS) comps.push('NS');
    if (componentSpectra.EW) comps.push('EW');
    if (componentSpectra.H1) comps.push('H1');
    if (componentSpectra.H2) comps.push('H2');
    if (comps.length === 0) return null;

    const allPeriods: { T: number; isCustom: boolean }[] = [
      ...KEY_PERIODS.map(T => ({ T, isCustom: false })),
      ...customPeriods.map(T => ({ T, isCustom: true })),
    ].sort((a, b) => a.T - b.T);

    const rows = allPeriods.map(({ T: kp, isCustom }) => {
      let nearestIdx = 0;
      let minDiff = Infinity;
      chartData.forEach((pt, i) => {
        const diff = Math.abs(pt.T - kp);
        if (diff < minDiff) { minDiff = diff; nearestIdx = i; }
      });
      const pt = chartData[nearestIdx];
      const compValues: Record<string, number | undefined> = {};
      comps.forEach(c => {
        compValues[c] = (pt as Record<string, unknown>)[`Sa_${c}`] as number | undefined;
      });
      return { T: kp, Sa: pt.Sa, compValues, isCustom };
    });

    let peakRow = -1;
    if (peakSa && peakSa.T > 0) {
      let minDiff = Infinity;
      rows.forEach((r, i) => {
        const diff = Math.abs(r.T - peakSa.T);
        if (diff < minDiff) { minDiff = diff; peakRow = i; }
      });
    }

    return { rows, comps, peakRow };
  }, [componentSpectra, chartData, peakSa, customPeriods]);

  const toggleSeries = useCallback((dataKey: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(dataKey)) next.delete(dataKey); else next.add(dataKey);
      return next;
    });
  }, []);

  const designPeak = SP14_PGA_TABLE3[sp14Intensity] * SP14_SOIL_K_TABLE4[sp14SoilCategory] * sp14K1 * sp14K2 * 9.80665 * 2.5;

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-3 px-4">
          {objects.length > 0 && (
            <div className="flex items-end gap-3 mb-3 pb-3 border-b border-slate-100">
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-slate-500">Объект мониторинга (K₁/K₂ сохраняются по объекту)</Label>
                <Select
                  value={selectedObjectId !== null ? String(selectedObjectId) : '__none__'}
                  onValueChange={v => setSelectedObjectId(v === '__none__' ? null : parseInt(v))}
                >
                  <SelectTrigger className="h-8 w-full text-xs mt-0.5" data-testid="select-resp-object">
                    <SelectValue placeholder="— выбрать объект —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs text-slate-400">— без объекта —</SelectItem>
                    {objects.map(obj => (
                      <SelectItem key={obj.id} value={String(obj.id)} className="text-xs">
                        {obj.name}{obj.address ? ` · ${obj.address}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedObjectId !== null && (
                <div className="text-[11px] text-slate-400 leading-tight pb-1 flex-shrink-0">
                  K₁/K₂ загружены из профиля
                </div>
              )}
            </div>
          )}
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
                <div className="space-y-1">
                  <Label className="text-xs">Компонента</Label>
                  <Select value={sp14Component} onValueChange={v => { setSp14Component(v as 'single' | 'GMH'); setRespResult(null); }}>
                    <SelectTrigger className="h-9 w-72 text-sm" data-testid="select-sp14-component"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single" className="text-xs">Одиночная (H1)</SelectItem>
                      <SelectItem value="GMH" className="text-xs">H1⊕H2 — геом. среднее горизонталей (СП 14)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1 min-w-0">
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
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1 flex-1 min-w-0">
                  <Label className="text-xs">Расчётный сценарий (Байкальский регион)</Label>
                  <Select value={selectedScenarioId} onValueChange={v => { setSelectedScenarioId(v); setRespResult(null); }}>
                    <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BAIKAL_CATALOG.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Компонента</Label>
                  <Select value={catalogComponent} onValueChange={v => { setCatalogComponent(v as 'single' | 'GMH'); setRespResult(null); }}>
                    <SelectTrigger className="h-9 w-72 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single" className="text-xs">Одиночная (H1)</SelectItem>
                      <SelectItem value="GMH" className="text-xs">H1⊕H2 — геом. среднее горизонталей (СП 14)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <Label className="text-xs flex items-center gap-1.5">
                K₁ — допуск. поврежд. (Табл. 5)
                {k1FromProfile && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-normal">из профиля</span>}
              </Label>
              <Select value={sp14K1Key} onValueChange={v => {
                const k = v as keyof typeof SP14_K1_TABLE5;
                setSp14K1Key(k);
                setK1FromProfile(false);
              }}>
                <SelectTrigger className="h-8 w-64 text-xs" data-testid="select-sp14-k1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="elastic" className="text-xs">Упругий — 1.00</SelectItem>
                  <SelectItem value="critical" className="text-xs">Критич. сооружения — 1.00</SelectItem>
                  <SelectItem value="normal" className="text-xs">Здания I уровня — 0.35</SelectItem>
                  <SelectItem value="residential" className="text-xs">Гражданские — 0.25</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                K₂ — конструктив. решение (Табл. 6)
                {k2FromProfile && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-normal">из профиля</span>}
              </Label>
              <Select value={sp14K2Key} onValueChange={v => {
                const k = v as keyof typeof SP14_K2_TABLE6;
                setSp14K2Key(k);
                setK2FromProfile(false);
              }}>
                <SelectTrigger className="h-8 w-72 text-xs" data-testid="select-sp14-k2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="frame_no_braces" className="text-xs">Каркас без связей — 1.50</SelectItem>
                  <SelectItem value="frame_braced" className="text-xs">Каркас со связями/диафрагмами — 1.30</SelectItem>
                  <SelectItem value="wall_monolithic" className="text-xs">Стеновая/монолитная ж/б — 1.00</SelectItem>
                  <SelectItem value="timber" className="text-xs">Деревянное — 0.80</SelectItem>
                  <SelectItem value="masonry_protected" className="text-xs">Кирпичная/каменная (защищ.) — 0.70</SelectItem>
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
            <CardTitle className="text-sm text-slate-600 flex flex-wrap items-center gap-2">
              Спектр отклика конструкций · SDOF · Newmark-β (β=¼, γ=½)
              {peakSa && peakSa.T > 0 && (
                <span className="text-purple-600 font-normal text-xs">
                  Пик Sa @ T = {peakSa.T.toFixed(2)} с · Sa = {peakSa.Sa.toFixed(3)} м/с²
                </span>
              )}
              {dominantComp && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                  style={{ backgroundColor: COMP_META[dominantComp.key]?.color ?? '#64748b' }}
                  title={`Компонента ${dominantComp.key} доминирует в пике спектра (Sa = ${dominantComp.sa.toFixed(3)} м/с²)`}
                >
                  ▲ {COMP_META[dominantComp.key]?.label ?? dominantComp.key} @ T={peakSa?.T.toFixed(2)}с
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
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
                <Tooltip content={<CustomRespTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, cursor: 'pointer' }}
                  onClick={(data) => {
                    const dk = (data as { dataKey?: unknown }).dataKey;
                    if (typeof dk === 'string') toggleSeries(dk);
                  }}
                />
                {peakSa && peakSa.T > 0 && (
                  <ReferenceLine x={peakSa.T} stroke="#7c3aed" strokeDasharray="4 2"
                    label={{ value: `T=${peakSa.T.toFixed(2)}с`, fontSize: 9, fill: '#7c3aed', position: 'top' }} />
                )}
                {peakSa && peakSa.T > 0 && dominantComp && (
                  <ReferenceLine x={peakSa.T} stroke="none"
                    label={{ value: `${COMP_META[dominantComp.key]?.label ?? dominantComp.key} @ пик`, fontSize: 9, fill: COMP_META[dominantComp.key]?.color ?? '#64748b', position: 'insideTop' }} />
                )}
                {h1h2GradientStops && (
                  <defs>
                    <linearGradient id="h1h2RibbonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      {h1h2GradientStops.map((stop, i) => (
                        <stop key={i} offset={`${stop.offset.toFixed(2)}%`} stopColor={stop.color} stopOpacity={0.35} />
                      ))}
                    </linearGradient>
                  </defs>
                )}
                {((componentSpectra?.H1 && componentSpectra?.H2) || (componentSpectra?.NS && componentSpectra?.EW)) && (
                  <Area
                    type="monotone"
                    dataKey="Sa_H1H2_ribbon"
                    stroke="none"
                    fill={h1h2GradientStops ? 'url(#h1h2RibbonGradient)' : '#6366f1'}
                    fillOpacity={h1h2GradientStops ? 1 : 0.13}
                    legendType="none"
                    hide={
                      hiddenSeries.has('Sa_H1') || hiddenSeries.has('Sa_H2') ||
                      hiddenSeries.has('Sa_NS') || hiddenSeries.has('Sa_EW')
                    }
                    isAnimationActive={false}
                    dot={false}
                    activeDot={false}
                  />
                )}
                {componentSpectra?.Z && (
                  <Line type="monotone" dataKey="Sa_Z" stroke="#94a3b8" strokeWidth={1} dot={false}
                    hide={hiddenSeries.has('Sa_Z')} name="Sa Z (вертик.)" isAnimationActive={false} />
                )}
                {componentSpectra?.NS && (
                  <Line type="monotone" dataKey="Sa_NS" stroke="#65a30d" strokeWidth={1} dot={false}
                    hide={hiddenSeries.has('Sa_NS')} name="Sa NS (С–Ю)" isAnimationActive={false} />
                )}
                {componentSpectra?.EW && (
                  <Line type="monotone" dataKey="Sa_EW" stroke="#d97706" strokeWidth={1} dot={false}
                    hide={hiddenSeries.has('Sa_EW')} name="Sa EW (В–З)" isAnimationActive={false} />
                )}
                {componentSpectra?.H1 && (
                  <Line type="monotone" dataKey="Sa_H1" stroke="#65a30d" strokeWidth={1} dot={false}
                    hide={hiddenSeries.has('Sa_H1')} name="Sa H1 (горизонт. 1)" isAnimationActive={false} />
                )}
                {componentSpectra?.H2 && (
                  <Line type="monotone" dataKey="Sa_H2" stroke="#d97706" strokeWidth={1} dot={false}
                    hide={hiddenSeries.has('Sa_H2')} name="Sa H2 (горизонт. 2)" isAnimationActive={false} />
                )}
                <Line type="monotone" dataKey="Sa" stroke="#dc2626" strokeWidth={1.8} dot={false}
                  hide={hiddenSeries.has('Sa')} name={`Sa расч., ζ=${respDamping}%`} />
                <Line type="monotone" dataKey="Sa_design" stroke="#0369a1" strokeWidth={1.6} strokeDasharray="6 4" dot={false}
                  hide={hiddenSeries.has('Sa_design')}
                  name={`Sa норм. СП 14 (I=${sp14Intensity}, грунт ${sp14SoilCategory}, K₁=${sp14K1.toFixed(2)}, K₂=${sp14K2.toFixed(2)})`} />
              </ComposedChart>
            </ResponsiveContainer>
            {h1h2GradientStops && (
              <div className="mx-3 mt-1 mb-0 flex items-center gap-2 px-1">
                <span className="text-[10px] text-slate-400 shrink-0">Лента H1/H2:</span>
                <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] bg-green-100 text-green-800 border border-green-300">
                  <span className="inline-block w-2 h-2 rounded-sm bg-green-500 mr-0.5" />
                  &lt; 1.3× — малый
                </span>
                <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
                  <span className="inline-block w-2 h-2 rounded-sm bg-amber-500 mr-0.5" />
                  1.3–1.6× — умеренный
                </span>
                <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] bg-red-100 text-red-800 border border-red-300">
                  <span className="inline-block w-2 h-2 rounded-sm bg-red-500 mr-0.5" />
                  &gt; 1.6× — высокий
                </span>
              </div>
            )}
            {h1h2ScatterStats && (
              <div className="mx-3 mt-2 mb-1 rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 shrink-0">
                    Разброс H1/H2 · max/min Sa(T):
                  </span>
                  {[
                    { label: 'Пиковый', value: h1h2ScatterStats.peak,   title: 'Максимальный разброс по всем периодам' },
                    { label: 'Медиана',  value: h1h2ScatterStats.median, title: 'Медианный разброс по всем периодам' },
                    { label: 'Среднее', value: h1h2ScatterStats.mean,   title: 'Среднеарифметический разброс по всем периодам' },
                  ].map(({ label, value, title }) => {
                    const color =
                      value < 1.3 ? 'bg-green-100 text-green-800 border-green-300' :
                      value < 1.6 ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                    'bg-red-100  text-red-800  border-red-300';
                    return (
                      <span key={label} title={title}
                        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-mono ${color}`}>
                        <span className="font-sans font-medium">{label}:</span>
                        {value.toFixed(2)}×
                      </span>
                    );
                  })}
                  <span className="text-[10px] text-slate-400 ml-1">
                    {h1h2ScatterStats.peak < 1.3
                      ? '✓ Малый разброс — геом. среднее хорошо представляет оба направления'
                      : h1h2ScatterStats.peak < 1.6
                      ? '△ Умеренный разброс — горизонтали заметно отличаются'
                      : '⚠ Высокий разброс — один из горизонталей существенно превышает другой'}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  Разброс = max(Sa<sub>H1</sub>, Sa<sub>H2</sub>) / min(Sa<sub>H1</sub>, Sa<sub>H2</sub>) по каждому периоду T; значение 1.0 означает идеальное совпадение.
                  {' '}Поэкспортируется в CSV как столбец <code>H1_H2_ratio</code>.
                </div>
              </div>
            )}
            {saKeyTable && (
              <div className="mx-3 mt-2 mb-1 rounded-md border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Sa(T) при ключевых инженерных периодах (м/с²)
                  </span>
                  <Button
                    size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1 text-slate-500 hover:text-slate-700"
                    onClick={() => {
                      const headers = ['T (с)', ...saKeyTable.comps.map(c => `Sa_${c}`), 'Sa расч.'].join('\t');
                      const dataRows = saKeyTable.rows.map(r =>
                        [r.T.toFixed(r.isCustom ? 3 : 1), ...saKeyTable.comps.map(c => r.compValues[c]?.toFixed(4) ?? '—'), r.Sa.toFixed(4)].join('\t')
                      );
                      navigator.clipboard.writeText([headers, ...dataRows].join('\n'));
                    }}
                  >
                    <Copy className="h-3 w-3" /> Копировать
                  </Button>
                </div>
                <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap items-center gap-1.5">
                  {customPeriods.map(T => (
                    <span key={T}
                      className="inline-flex items-center gap-1 rounded border border-dashed border-violet-400 bg-violet-50 text-violet-700 text-[11px] font-mono px-2 py-0.5">
                      {T % 1 === 0 ? T.toFixed(1) : T} с
                      <button
                        className="ml-0.5 text-violet-400 hover:text-violet-700 leading-none"
                        onClick={() => setCustomPeriods(prev => prev.filter(p => p !== T))}
                        title="Удалить"
                      >×</button>
                    </span>
                  ))}
                  <form
                    className="flex items-center gap-1"
                    onSubmit={e => {
                      e.preventDefault();
                      const raw = parseFloat(customPeriodInput.replace(',', '.'));
                      const val = Math.round(raw * 1000) / 1000;
                      if (isNaN(val) || val <= 0 || val > 20) {
                        setCustomPeriodError('Введите T от 0 до 20 с');
                        return;
                      }
                      if (KEY_PERIODS.includes(val) || customPeriods.includes(val)) {
                        setCustomPeriodError('Этот период уже есть в таблице');
                        return;
                      }
                      setCustomPeriods(prev => [...prev, val]);
                      setCustomPeriodError('');
                      setCustomPeriodInput('');
                    }}
                  >
                    <Input
                      value={customPeriodInput}
                      onChange={e => { setCustomPeriodInput(e.target.value); setCustomPeriodError(''); }}
                      placeholder="T, с"
                      className={`h-6 w-20 text-[11px] px-2 font-mono ${customPeriodError ? 'border-red-400' : ''}`}
                    />
                    <Button type="submit" size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-0.5 text-violet-600 border-violet-300 hover:bg-violet-50">
                      <Plus className="h-3 w-3" /> Добавить
                    </Button>
                  </form>
                  {customPeriodError
                    ? <span className="text-[10px] text-red-500">{customPeriodError}</span>
                    : <span className="text-[10px] text-slate-400">— добавить пользовательский период</span>
                  }
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-slate-100">
                        <th className="px-3 py-1.5 text-left text-slate-500 font-medium whitespace-nowrap">T (с)</th>
                        {saKeyTable.comps.map(c => (
                          <th key={c} className="px-3 py-1.5 text-right font-semibold whitespace-nowrap"
                            style={{ color: COMP_META[c]?.color ?? '#64748b' }}>
                            Sa<sub>{c}</sub>
                          </th>
                        ))}
                        <th className="px-3 py-1.5 text-right text-red-600 font-semibold whitespace-nowrap">Sa расч.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saKeyTable.rows.map((row, ri) => {
                        const isPeakRow = ri === saKeyTable.peakRow;
                        const rowDomKey = isPeakRow
                          ? saKeyTable.comps.reduce<string | null>((best, c) => {
                              const v = row.compValues[c] ?? 0;
                              const bv = best ? (row.compValues[best] ?? 0) : -1;
                              return v > bv ? c : best;
                            }, null)
                          : null;
                        const rowClass = isPeakRow
                          ? 'bg-purple-50 border-l-2 border-purple-400'
                          : row.isCustom
                            ? (ri % 2 === 0 ? 'bg-violet-50/60 border-l-2 border-dashed border-violet-300' : 'bg-violet-50/40 border-l-2 border-dashed border-violet-300')
                            : (ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/40');
                        return (
                          <tr key={row.T} className={rowClass}>
                            <td className={`px-3 py-1 font-mono ${isPeakRow ? 'font-bold text-purple-700' : row.isCustom ? 'text-violet-700' : 'text-slate-600'}`}>
                              {row.isCustom ? (row.T % 1 === 0 ? row.T.toFixed(1) : String(row.T)) : row.T.toFixed(1)}
                              {isPeakRow && <span className="ml-1 text-[9px] text-purple-500">▲ пик</span>}
                              {row.isCustom && !isPeakRow && <span className="ml-1 text-[9px] text-violet-400">★ польз.</span>}
                            </td>
                            {saKeyTable.comps.map(c => {
                              const isDom = isPeakRow && rowDomKey === c;
                              const val = row.compValues[c];
                              return (
                                <td key={c}
                                  className={`px-3 py-1 text-right font-mono ${isDom ? 'font-bold' : 'text-slate-700'}`}
                                  style={isDom ? { color: COMP_META[c]?.color, backgroundColor: `${COMP_META[c]?.color}1a` } : {}}>
                                  {val != null ? val.toFixed(4) : '—'}
                                  {isDom && <span className="ml-1 text-[9px]">★</span>}
                                </td>
                              );
                            })}
                            <td className={`px-3 py-1 text-right font-mono ${isPeakRow ? 'font-bold text-red-600' : 'text-slate-700'}`}>
                              {row.Sa.toFixed(4)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-3 py-1 text-[10px] text-slate-400 border-t border-slate-100">
                  Стандартные периоды T = 0.1, 0.2, 0.5, 1.0, 2.0 с · пользовательские периоды выделены пунктирной рамкой (★ польз.) · ближайший шаг сетки · «Sa расч.» — итоговый (геом. среднее при GMH/AVG3) · ★ — доминирующая компонента в строке пика · строка пика (▲) выделена.
                </div>
              </div>
            )}
            <div className="px-4 pt-1 text-[11px] text-sky-700 bg-sky-50 border border-sky-200 rounded-md mx-3 py-1.5">
              <strong>Норм. спектр СП 14.13330.2018 §5:</strong>{' '}
              Sa<sub>норм</sub>(T) = A<sub>0</sub>·g·K<sub>гр</sub>·K<sub>1</sub>·K<sub>2</sub>·β(T) ={' '}
              {SP14_PGA_TABLE3[sp14Intensity].toFixed(2)}·9.81·{SP14_SOIL_K_TABLE4[sp14SoilCategory]}·{sp14K1.toFixed(2)}·{sp14K2.toFixed(2)}·β(T) ={' '}
              {(SP14_PGA_TABLE3[sp14Intensity] * SP14_SOIL_K_TABLE4[sp14SoilCategory] * sp14K1 * sp14K2 * 9.80665).toFixed(2)}·β(T) м/с²
              {' · '}пик плато {designPeak.toFixed(2)} м/с² @ T ≤ {sp14SoilCategory === 'III' ? '0.8' : '0.4'} с
              {' · '}I={sp14Intensity}, грунт {sp14SoilCategory}, K<sub>1</sub>={sp14K1.toFixed(2)} ({SP14_K1_LABEL[sp14K1Key]}), K<sub>2</sub>={sp14K2.toFixed(2)} ({SP14_K2_LABEL[sp14K2Key]})
            </div>
            <div className="px-4 text-xs text-slate-500 space-y-0.5">
              <p>SDOF-осциллятор: m ü + 2mζω u̇ + mω² u = −m a_g(t); численное интегрирование Newmark-β (безусловно устойчивая схема).</p>
              {inputMode === 'catalog' && (
                <p>Сценарий: <strong>{scenario.label}</strong> · PGA={( scenario.PGA_g * 9.81).toFixed(2)} м/с² · {scenario.seismicIntensity} · СП 14.13330.2018
                {catalogComponent === 'GMH' && (
                  <span> · компонента: <strong>H1⊕H2</strong> — пара ортогональных горизонталей с одинаковым целевым PGA и формой спектра, но статистически некоррелированными фазами; Sa(T) = exp(½·[ln Sa<sub>H1</sub>(T) + ln Sa<sub>H2</sub>(T)]) — поточечное геом. среднее, напрямую сопоставимое с проектным спектром СП 14.</span>
                )}</p>
              )}
              {inputMode === 'sp14' && (
                <p>СП 14.13330: <strong>{sp14Record.label}</strong> · прототип: {sp14Record.source} · грунт {sp14SoilCategory} (K={SP14_SOIL_K_TABLE4[sp14SoilCategory]}) · PGA={(sp14Record.PGA_g * SP14_SOIL_K_TABLE4[sp14SoilCategory] * 9.80665).toFixed(2)} м/с²
                {sp14Component === 'GMH' && (
                  <span> · компонента: <strong>H1⊕H2</strong> — пара ортогональных горизонталей с одинаковым целевым PGA и формой спектра, но статистически некоррелированными фазами; Sa(T) = exp(½·[ln Sa<sub>H1</sub>(T) + ln Sa<sub>H2</sub>(T)]) — поточечное геом. среднее, напрямую сопоставимое с проектным спектром СП 14.</span>
                )}</p>
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
                  const cs = componentSpectra;
                  const extraCols: string[] = [];
                  if (cs?.Z)  extraCols.push('Sa_Z_m_s2');
                  if (cs?.NS) extraCols.push('Sa_NS_m_s2');
                  if (cs?.EW) extraCols.push('Sa_EW_m_s2');
                  if (cs?.H1) extraCols.push('Sa_H1_m_s2');
                  if (cs?.H2) extraCols.push('Sa_H2_m_s2');
                  const hasH1H2 = !!(cs?.H1 && cs?.H2);
                  if (hasH1H2) extraCols.push('H1_H2_ratio');
                  const header = ['period_s,Sa_m_s2,Sv_m_s,Sd_m', ...extraCols].join(',');
                  const rows = [header].concat(
                    respResult!.map((p, i) => {
                      const base = `${p.T.toFixed(4)},${p.Sa.toFixed(6)},${p.Sv.toFixed(6)},${p.Sd.toFixed(6)}`;
                      const extras: string[] = [];
                      if (cs?.Z)  extras.push((cs.Z[i]?.Sa  ?? 0).toFixed(6));
                      if (cs?.NS) extras.push((cs.NS[i]?.Sa ?? 0).toFixed(6));
                      if (cs?.EW) extras.push((cs.EW[i]?.Sa ?? 0).toFixed(6));
                      if (cs?.H1) extras.push((cs.H1[i]?.Sa ?? 0).toFixed(6));
                      if (cs?.H2) extras.push((cs.H2[i]?.Sa ?? 0).toFixed(6));
                      if (hasH1H2) {
                        const h1v = cs!.H1![i]?.Sa ?? 0;
                        const h2v = cs!.H2![i]?.Sa ?? 0;
                        const mn = Math.min(h1v, h2v);
                        extras.push(mn > 0 ? (Math.max(h1v, h2v) / mn).toFixed(4) : '');
                      }
                      return extras.length ? `${base},${extras.join(',')}` : base;
                    })
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
                    const selectedObj = selectedObjectId !== null ? objects.find(o => o.id === selectedObjectId) ?? null : null;
                    const objectInputMeta = selectedObj ? { objectExternalId: selectedObj.objectId, objectName: selectedObj.name } : {};
                    const r = await fetch('/api/calculations', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ calcType: 'response_spectrum',
                        objectId: selectedObj?.id ?? null,
                        inputParams: (() => {
                          const scatterMeta = h1h2ScatterStats
                            ? { h1h2Scatter: { peak: h1h2ScatterStats.peak, median: h1h2ScatterStats.median, mean: h1h2ScatterStats.mean } }
                            : {};
                          return inputMode === 'catalog'
                            ? { ...objectInputMeta, scenarioId: scenario.id, scenarioLabel: scenario.label, Mw: scenario.Mw, R_km: scenario.R_km, PGA_g: scenario.PGA_g, damping: parseFloat(respDamping), component: catalogComponent === 'GMH' ? 'H1⊕H2_geomean' : 'single', K1: sp14K1, K1_key: sp14K1Key, K2: sp14K2, K2_key: sp14K2Key, ...scatterMeta }
                            : inputMode === 'sp14'
                              ? { ...objectInputMeta, sp14: true, recordId: sp14Record.id, recordLabel: sp14Record.label, source: sp14Record.source, intensity: sp14Record.intensity, soilCategory: sp14SoilCategory, K_soil: SP14_SOIL_K_TABLE4[sp14SoilCategory], K1: sp14K1, K1_key: sp14K1Key, K2: sp14K2, K2_key: sp14K2Key, PGA_g: sp14Record.PGA_g, PGA_eff_ms2: sp14Record.PGA_g * SP14_SOIL_K_TABLE4[sp14SoilCategory] * 9.80665, Mw: sp14Record.Mw, R_km: sp14Record.R_km, T_dom: sp14Record.T_dom, damping: parseFloat(respDamping), component: sp14Component === 'GMH' ? 'H1⊕H2_geomean' : 'single', ...scatterMeta }
                              : { ...objectInputMeta, seismogramId: selectedSeismogramId, component: respComponent, damping: parseFloat(respDamping), K1: sp14K1, K1_key: sp14K1Key, K2: sp14K2, K2_key: sp14K2Key, ...scatterMeta };
                        })(),
                        results: { points: respResult, peakT: peakSa?.T, peakSa: peakSa?.Sa, inputMode,
                          keyPeriodTable: saKeyTable ? saKeyTable.rows.map(row => {
                            const entry: Record<string, number | undefined> = { T: row.T, Sa: row.Sa };
                            saKeyTable.comps.forEach(c => { entry[`Sa_${c}`] = row.compValues[c]; });
                            return entry;
                          }) : undefined } }) });
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
