import { Layers as LayersIcon, Building2, TriangleAlert } from 'lucide-react';
import type { SeismicCalculation, SoilProfile, InfrastructureObject, KeyPeriodTableRow, RespSpectrumResults, MtsmAmplResults, ResonanceResults } from '@shared/schema';


export type CalcType = 'mtsm' | 'response_spectrum' | 'resonance';

export const TYPE_META: Record<CalcType, { label: string; icon: JSX.Element; color: string }> = {
  mtsm:              { label: 'МТСМ — усиление грунта',     icon: <LayersIcon className="h-3.5 w-3.5" />,    color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  response_spectrum: { label: 'Спектр отклика SDOF',         icon: <Building2 className="h-3.5 w-3.5" />,    color: 'bg-rose-100 text-rose-700 border-rose-300' },
  resonance:         { label: 'Анализ резонанса',            icon: <TriangleAlert className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700 border-amber-300' },
};

export type MtsmResults = MtsmAmplResults;
export type RespResults = RespSpectrumResults;
export type ResoResults = ResonanceResults;
export type KeyPeriodRow = KeyPeriodTableRow;

export const RISK_BADGE: Record<string, string> = {
  red: 'bg-red-600 text-white',
  yellow: 'bg-amber-500 text-white',
  green: 'bg-emerald-600 text-white',
};

export function summary(c: SeismicCalculation): string {
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

export function paramsToCsv(c: SeismicCalculation): string {
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

export function downloadCsv(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

export function listToCsv(rows: SeismicCalculation[],
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
