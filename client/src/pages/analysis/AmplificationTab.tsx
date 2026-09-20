import { FC, useCallback, useRef } from 'react';
import type { jsPDF } from 'jspdf';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Save, Zap, Layers as LayersIcon, Download } from 'lucide-react';
import type { SoilProfile, SoilLayer, InfrastructureObject } from '@shared/schema';
import { AmpLayer, AmpPoint, computeAmplification } from '@/lib/numeric/amplification';


// ─── Amplification tab (МТСМ — 1D SH transfer function) ─────────────────────

export interface AmpTabProps {
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

export const AmplificationTab: FC<AmpTabProps> = ({
  objects, soilProfiles, selectedSoilProfileId, setSelectedSoilProfileId,
  bedrockVs, setBedrockVs, bedrockDensity, setBedrockDensity,
  bedrockDamping, setBedrockDamping, ampResult, setAmpResult, toast
}) => {
  const mtsmChartRef = useRef<HTMLDivElement>(null);
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

  const exportMtsmPdf = useCallback(async () => {
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
    if (!ampResult || ampResult.length === 0) return;
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;

      const headerDiv = document.createElement('div');
      headerDiv.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:550px;padding:14px 18px;font-family:Arial,sans-serif;background:white;color:#1e293b;line-height:1.5;';
      const exportDate = new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'medium' });
      const profileName = profile?.profileName ?? '—';
      const objName = profile?.objectId != null ? (objects.find(o => o.id === profile.objectId)?.name ?? `#${profile.objectId}`) : '—';
      const soilCat = profile?.soilCategory ?? '—';
      const peakFreqStr = peakAmp && peakAmp.freq > 0 ? peakAmp.freq.toFixed(2) : '—';
      const peakAmpStr = peakAmp && peakAmp.freq > 0 ? peakAmp.amp.toFixed(2) : '—';
      const layerRows = sortedLayers.map((l, i) =>
        `<tr style="background:${i%2===0?'#f8fafc':'#fff'}"><td style="padding:3px 8px">${l.layerName}</td><td style="padding:3px 8px;text-align:center">${l.thickness} м</td><td style="padding:3px 8px;text-align:center">${l.shearVelocity} м/с</td><td style="padding:3px 8px;text-align:center">${l.density ?? '—'} кг/м³</td><td style="padding:3px 8px;text-align:center">${l.dampingRatio ?? 3}%</td></tr>`
      ).join('');
      headerDiv.innerHTML = `
        <h2 style="font-size:15px;font-weight:bold;margin:0 0 6px 0;color:#0f172a;">Отчёт МТСМ — усиление сейсмического воздействия в грунтовом разрезе</h2>
        <p style="font-size:9px;color:#64748b;margin:0 0 8px 0;">Метод тонкослоистых сред (1D SH, формализм Томсона–Хаскелла) · Экспорт: ${exportDate}</p>
        <table style="width:100%;border-collapse:collapse;font-size:9px;margin-bottom:8px;">
          <tr><td style="padding:2px 8px;color:#64748b">Профиль грунта:</td><td style="padding:2px 8px;font-weight:bold">${profileName}</td><td style="padding:2px 8px;color:#64748b">Объект:</td><td style="padding:2px 8px;font-weight:bold">${objName}</td></tr>
          <tr><td style="padding:2px 8px;color:#64748b">Категория грунта:</td><td style="padding:2px 8px;font-weight:bold">${soilCat}</td><td style="padding:2px 8px;color:#64748b">Скальное основание Vs:</td><td style="padding:2px 8px;font-weight:bold">${bedrockVs} м/с</td></tr>
          <tr><td style="padding:2px 8px;color:#64748b">Пиковая частота f₀:</td><td style="padding:2px 8px;font-weight:bold;color:#7c3aed">${peakFreqStr} Гц</td><td style="padding:2px 8px;color:#64748b">Макс. усиление Amax:</td><td style="padding:2px 8px;font-weight:bold;color:#7c3aed">${peakAmpStr}</td></tr>
        </table>
        <p style="font-size:9px;font-weight:bold;color:#334155;margin:0 0 3px 0;">Инженерно-геологические слои:</p>
        <table style="width:100%;border-collapse:collapse;font-size:8.5px;">
          <thead><tr style="background:#e2e8f0"><th style="padding:3px 8px;text-align:left">Название слоя</th><th style="padding:3px 8px">Мощность</th><th style="padding:3px 8px">Vs</th><th style="padding:3px 8px">ρ</th><th style="padding:3px 8px">ξ</th></tr></thead>
          <tbody>${layerRows}</tbody>
        </table>`;
      document.body.appendChild(headerDiv);
      const headerCanvas = await html2canvas(headerDiv, { backgroundColor: '#ffffff', scale: 1.5, logging: false });
      document.body.removeChild(headerDiv);
      const headerImgData = headerCanvas.toDataURL('image/png');
      const headerAspect = headerCanvas.height / headerCanvas.width;
      const headerImgH = Math.min(contentW * headerAspect, pageH * 0.5);
      doc.addImage(headerImgData, 'PNG', margin, y, contentW, headerImgH);
      y += headerImgH + 6;

      if (mtsmChartRef.current) {
        try {
          const chartCanvas = await html2canvas(mtsmChartRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
          const chartImgData = chartCanvas.toDataURL('image/png');
          const chartAspect = chartCanvas.height / chartCanvas.width;
          const chartImgH = Math.min(contentW * chartAspect, pageH * 0.4);
          if (y + chartImgH > pageH - margin) { doc.addPage(); y = margin; }
          doc.addImage(chartImgData, 'PNG', margin, y, contentW, chartImgH);
          y += chartImgH + 4;
        } catch { /* chart capture failed, skip */ }
      }

      const totalPages = doc.getNumberOfPages();
      for (let pg = 1; pg <= totalPages; pg++) {
        doc.setPage(pg);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('Сейсмический мониторинг — автоматически создано системой', margin, pageH - 8);
        doc.text(`Стр. ${pg} / ${totalPages}`, pageW - margin, pageH - 8, { align: 'right' });
      }

      doc.save(`mtsm_${profileName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('[MTSM PDF]', err);
      toast({ title: 'Ошибка экспорта PDF', variant: 'destructive' });
    }
  }, [ampResult, peakAmp, profile, objects, sortedLayers, bedrockVs, bedrockDensity, bedrockDamping, toast]);

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
            <div ref={mtsmChartRef}>
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
            </div>
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
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={exportMtsmPdf}
                title="Экспортировать отчёт МТСМ в PDF с кириллицей">
                <Download className="h-3 w-3" /> PDF отчёт
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
