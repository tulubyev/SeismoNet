import { FC, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Download, BookOpen, TriangleAlert } from 'lucide-react';
import type { SoilProfile, InfrastructureObject, SeismicCalculation } from '@shared/schema';
import { RiskLevel, calcRisk } from '@/lib/numeric/resonance';


// ─── Resonance Analysis Tab ───────────────────────────────────────────────────
// Compares building eigenperiod T≈0.1·N with:
//   1. H/V peak period — from profile.dominantFrequency (H/V Nakamura method)
//   2. МТСМ peak period — from actual saved МТСМ calculation results in DB
// Colour-coded risk per source independently; worst case drives overall verdict.

export interface ResonanceTabProps {
  objects: InfrastructureObject[];
  soilProfiles: SoilProfile[];
  toast: ReturnType<typeof useToast>['toast'];
}



export const RISK_STYLE: Record<RiskLevel, { border: string; badge: string; icon: string }> = {
  red:    { border: 'border-red-400 bg-red-50',     badge: 'bg-red-600 text-white',     icon: '🔴' },
  yellow: { border: 'border-amber-400 bg-amber-50', badge: 'bg-amber-500 text-white',   icon: '🟡' },
  green:  { border: 'border-emerald-400 bg-emerald-50', badge: 'bg-emerald-600 text-white', icon: '🟢' },
};

export const ResonanceTab: FC<ResonanceTabProps> = ({ objects, soilProfiles, toast }) => {
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
