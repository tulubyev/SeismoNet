import { FC, useRef, useState } from 'react';
import type { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, FileText } from 'lucide-react';
import type { SeismicCalculation } from '@shared/schema';
import { MtsmResults, RespResults, ResoResults, RISK_BADGE, downloadCsv } from '@/pages/calculations/shared';


export const ParamsTable: FC<{ inputParams: unknown }> = ({ inputParams }) => {
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

export const MtsmDetail: FC<{ calc: SeismicCalculation }> = ({ calc }) => {
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

export const RespDetail: FC<{ calc: SeismicCalculation }> = ({ calc }) => {
  const r = (calc.results ?? {}) as RespResults;
  const points = r.points ?? [];
  const inp = (calc.inputParams ?? {}) as Record<string, unknown>;
  const scatter = inp.h1h2Scatter as { peak: number; median: number; mean: number } | undefined;
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const exportPdf = async () => {
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;

      const recordLabel = String(inp.recordLabel ?? inp.scenarioLabel ?? `seismogram #${inp.seismogramId ?? '—'}`);
      const dampingStr = String(inp.damping ?? '5');
      const exportDate = new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'medium' });

      // Render report header as HTML image for Cyrillic support
      const headerEl = document.createElement('div');
      headerEl.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:550px;padding:14px 18px;font-family:Arial,sans-serif;background:white;color:#1e293b;line-height:1.5;';
      let scatterHtml = '';
      if (scatter) {
        const scatterColor = scatter.peak < 1.3 ? '#16a34a' : scatter.peak < 1.6 ? '#d97706' : '#dc2626';
        const scatterLabel = scatter.peak < 1.3 ? 'малый' : scatter.peak < 1.6 ? 'умеренный' : 'высокий';
        scatterHtml = `<p style="font-size:9px;color:${scatterColor};margin:0 0 2px 0;">Разброс H1/H2: пиковый=${scatter.peak.toFixed(2)}× · медиана=${scatter.median.toFixed(2)}× · среднее=${scatter.mean.toFixed(2)}× — <strong>${scatterLabel}</strong></p>`;
      }
      const peakHtml = r.peakT != null
        ? `<p style="font-size:9px;color:#7c3aed;margin:0 0 2px 0;">Пик Sa @ T = ${r.peakT.toFixed(2)} с · Sa = ${r.peakSa?.toFixed(4) ?? '—'} м/с²</p>`
        : '';
      headerEl.innerHTML = `
        <h2 style="font-size:15px;font-weight:bold;margin:0 0 5px 0;color:#0f172a;">Отчёт: Спектр отклика SDOF</h2>
        <p style="font-size:9px;color:#475569;margin:0 0 2px 0;">Расчёт #${calc.id} &nbsp;|&nbsp; Запись: ${recordLabel} &nbsp;|&nbsp; ζ = ${dampingStr}%</p>
        ${peakHtml}${scatterHtml}
        <p style="font-size:8px;color:#94a3b8;margin:3px 0 0 0;">Экспорт: ${exportDate}</p>`;
      document.body.appendChild(headerEl);
      const headerCanvas = await html2canvas(headerEl, { backgroundColor: '#ffffff', scale: 1.5, logging: false });
      document.body.removeChild(headerEl);
      const headerImgData = headerCanvas.toDataURL('image/png');
      const headerAspect = headerCanvas.height / headerCanvas.width;
      const headerImgH = Math.min(contentW * headerAspect, pageH * 0.2);
      doc.addImage(headerImgData, 'PNG', margin, y, contentW, headerImgH);
      y += headerImgH + 4;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 5;

      if (chartRef.current) {
        try {
          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
          });
          const imgData = canvas.toDataURL('image/png');
          const aspectRatio = canvas.height / canvas.width;
          const imgH = Math.min(contentW * aspectRatio, pageH * 0.35);
          doc.addImage(imgData, 'PNG', margin, y, contentW, imgH);
          y += imgH + 6;
        } catch (chartErr) {
          console.warn('[PDF export] chart capture failed:', chartErr);
          toast({ title: 'Предупреждение', description: 'График не удалось захватить; PDF создан без изображения спектра.', variant: 'default' });
        }
      }

      if (r.keyPeriodTable && r.keyPeriodTable.length > 0) {
        const compKeys = Object.keys(r.keyPeriodTable[0]).filter(k => k !== 'T' && k !== 'Sa');

        // Table section title — rendered via html2canvas for Cyrillic
        const tableTitleEl = document.createElement('div');
        tableTitleEl.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:550px;padding:4px 0;font-family:Arial,sans-serif;background:white;font-size:11px;font-weight:bold;color:#1e293b;';
        tableTitleEl.textContent = 'Таблица Sa по ключевым периодам (T = 0.1, 0.2, 0.5, 1.0, 2.0 с)';
        document.body.appendChild(tableTitleEl);
        const ttCanvas = await html2canvas(tableTitleEl, { backgroundColor: '#ffffff', scale: 1.5, logging: false });
        document.body.removeChild(tableTitleEl);
        const ttH = Math.min(contentW * (ttCanvas.height / ttCanvas.width), 10);
        doc.addImage(ttCanvas.toDataURL('image/png'), 'PNG', margin, y, contentW, ttH);
        y += ttH + 3;

        const colLabels = ['T (s)', ...compKeys.map(k => k.replace('Sa_', 'Sa ') + ' (m/s2)'), 'Sa calc (m/s2)'];
        const numCols = colLabels.length;
        const colW = contentW / numCols;
        const rowH = 7;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentW, rowH, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(margin, y, contentW, rowH, 'S');
        colLabels.forEach((label, ci) => {
          const x = margin + ci * colW;
          doc.text(label, x + colW / 2, y + rowH / 2 + 1.5, { align: 'center' });
          if (ci > 0) {
            doc.line(x, y, x, y + rowH);
          }
        });
        y += rowH;

        const renderTableHeader = () => {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setFillColor(241, 245, 249);
          doc.rect(margin, y, contentW, rowH, 'F');
          doc.setDrawColor(203, 213, 225);
          doc.rect(margin, y, contentW, rowH, 'S');
          colLabels.forEach((label, ci) => {
            const x = margin + ci * colW;
            doc.text(label, x + colW / 2, y + rowH / 2 + 1.5, { align: 'center' });
            if (ci > 0) {
              doc.line(x, y, x, y + rowH);
            }
          });
        };

        doc.setFont('helvetica', 'normal');
        r.keyPeriodTable.forEach((row, ri) => {
          if (y + rowH > pageH - margin - 20) {
            doc.addPage();
            y = margin;
            renderTableHeader();
            y += rowH;
          }
          if (ri % 2 === 0) {
            doc.setFillColor(255, 255, 255);
          } else {
            doc.setFillColor(248, 250, 252);
          }
          doc.rect(margin, y, contentW, rowH, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.rect(margin, y, contentW, rowH, 'S');
          const cells = [
            row.T.toFixed(1),
            ...compKeys.map(k => row[k] != null ? (row[k] as number).toFixed(4) : '—'),
            row.Sa.toFixed(4),
          ];
          cells.forEach((cell, ci) => {
            const x = margin + ci * colW;
            if (ci > 0) {
              doc.line(x, y, x, y + rowH);
            }
            const isLast = ci === cells.length - 1;
            doc.setFont('helvetica', isLast ? 'bold' : 'normal');
            doc.text(cell, x + colW / 2, y + rowH / 2 + 1.5, { align: 'center' });
          });
          y += rowH;
        });
        y += 6;
      }

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 5;

      // Methodology section — rendered via html2canvas for Cyrillic
      const methodEl = document.createElement('div');
      methodEl.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:550px;padding:4px 0;font-family:Arial,sans-serif;background:white;color:#475569;line-height:1.6;font-size:8.5px;';
      methodEl.innerHTML = `
        <p style="font-weight:bold;color:#1e293b;margin:0 0 4px 0;font-size:9.5px;">Методология</p>
        <p style="margin:0 0 2px 0;">Расчёт спектра отклика выполнен методом Ньюмарка-β (линейно-упругий SDOF осциллятор).</p>
        <p style="margin:0 0 2px 0;">Коэффициент демпфирования ζ = ${dampingStr}%. Шаг интегрирования определяется из записи.</p>
        <p style="margin:0 0 2px 0;">Ключевые периоды T = 0.1, 0.2, 0.5, 1.0, 2.0 с соответствуют стандартным точкам проверки спектров сейсмического воздействия (СП 14.13330, ASCE 7, Eurocode 8).</p>
        <p style="margin:0;">Sa расч. = max(Sa_компонент) по всем компонентам в данной точке периода.</p>`;
      document.body.appendChild(methodEl);
      const methodCanvas = await html2canvas(methodEl, { backgroundColor: '#ffffff', scale: 1.5, logging: false });
      document.body.removeChild(methodEl);
      if (y + 5 > pageH - margin - 20) { doc.addPage(); y = margin; }
      const methodAspect = methodCanvas.height / methodCanvas.width;
      const methodH = Math.min(contentW * methodAspect, pageH * 0.25);
      doc.addImage(methodCanvas.toDataURL('image/png'), 'PNG', margin, y, contentW, methodH);

      const totalPages = doc.getNumberOfPages();
      for (let pg = 1; pg <= totalPages; pg++) {
        doc.setPage(pg);
        const footerY = pageH - 8;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('Seismic Monitoring System — auto-generated', margin, footerY);
        doc.text(`Page ${pg} / ${totalPages}`, pageW - margin, footerY, { align: 'right' });
      }

      doc.save(`response_spectrum_report_${calc.id}.pdf`);
    } catch {
      toast({ title: 'Ошибка экспорта PDF', description: 'Не удалось создать отчёт.', variant: 'destructive' });
    } finally {
      setIsExportingPdf(false);
    }
  };

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
      {scatter && (
        <div className={`flex flex-wrap gap-3 px-3 py-2 rounded-md border text-xs font-medium ${
          scatter.peak < 1.3 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : scatter.peak < 1.6 ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <span className="text-slate-500 font-normal">Разброс H1/H2:</span>
          <span title="Максимальный разброс по всем периодам">Пиковый: <strong>{scatter.peak.toFixed(2)}×</strong></span>
          <span title="Медианный разброс по всем периодам">Медиана: <strong>{scatter.median.toFixed(2)}×</strong></span>
          <span title="Среднеарифметический разброс по всем периодам">Среднее: <strong>{scatter.mean.toFixed(2)}×</strong></span>
          <span className="font-normal opacity-75">{scatter.peak < 1.3 ? '✓ хороший' : scatter.peak < 1.6 ? '⚠ умеренный' : '✗ высокий'}</span>
        </div>
      )}
      {r.keyPeriodTable && r.keyPeriodTable.length > 0 && (() => {
        const compKeys = Object.keys(r.keyPeriodTable[0]).filter(k => k !== 'T' && k !== 'Sa');
        return (
          <div className="border border-slate-200 rounded-md overflow-hidden text-xs">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 font-medium text-slate-600">
              Таблица Sa по ключевым периодам (T = 0.1, 0.2, 0.5, 1.0, 2.0 с)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-1 text-left font-medium text-slate-500">T (с)</th>
                    {compKeys.map(k => (
                      <th key={k} className="px-3 py-1 text-right font-medium text-slate-500">{k.replace('Sa_', 'Sa ')} (м/с²)</th>
                    ))}
                    <th className="px-3 py-1 text-right font-medium text-slate-500">Sa расч. (м/с²)</th>
                  </tr>
                </thead>
                <tbody>
                  {r.keyPeriodTable!.map((row, ri) => (
                    <tr key={row.T} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="px-3 py-1 font-mono text-slate-600">{row.T.toFixed(1)}</td>
                      {compKeys.map(k => (
                        <td key={k} className="px-3 py-1 text-right font-mono text-slate-700">
                          {row[k] != null ? (row[k] as number).toFixed(4) : '—'}
                        </td>
                      ))}
                      <td className="px-3 py-1 text-right font-mono font-semibold text-slate-800">{row.Sa.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
      <div ref={chartRef}>
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
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
          onClick={() => {
            const meta: string[] = [];
            if (scatter) {
              meta.push(`# h1h2_scatter_peak,${scatter.peak.toFixed(4)}`);
              meta.push(`# h1h2_scatter_median,${scatter.median.toFixed(4)}`);
              meta.push(`# h1h2_scatter_mean,${scatter.mean.toFixed(4)}`);
            }
            const rows = meta
              .concat(['period_s,Sa_m_s2,Sv_m_s,Sd_m'])
              .concat(points.map(p => `${p.T.toFixed(4)},${p.Sa.toFixed(6)},${p.Sv.toFixed(6)},${p.Sd.toFixed(6)}`));
            if (r.keyPeriodTable && r.keyPeriodTable.length > 0) {
              rows.push('');
              rows.push('# key_period_table');
              rows.push('T_s,Sa_Z,Sa_NS,Sa_EW,Sa_H1,Sa_H2,Sa_calc');
              for (const kp of r.keyPeriodTable) {
                const fmt = (v: number | undefined) => v != null ? v.toFixed(6) : '';
                rows.push([
                  kp.T.toFixed(1),
                  fmt(kp.Sa_Z),
                  fmt(kp.Sa_NS),
                  fmt(kp.Sa_EW),
                  fmt(kp.Sa_H1),
                  fmt(kp.Sa_H2),
                  kp.Sa.toFixed(6),
                ].join(','));
              }
            }
            downloadCsv(`response_spectrum_calc_${calc.id}.csv`, rows.join('\n'));
          }}>
          <Download className="h-3 w-3" /> CSV (точки графика)
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
          onClick={exportPdf}
          disabled={isExportingPdf}
          title="Экспортировать отчёт PDF с таблицей ключевых периодов">
          {isExportingPdf
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <FileText className="h-3 w-3" />}
          PDF отчёт
        </Button>
      </div>
    </div>
  );
};

export const ResoDetail: FC<{ calc: SeismicCalculation }> = ({ calc }) => {
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

// ─── Compare dialog: overlay 2-3 saved curves on one chart ───────────────────
