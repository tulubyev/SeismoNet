import { FC, useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import type { SoilProfile, SoilLayer } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const SOIL_TYPES: { value: string; label: string }[] = [
  { value: 'rock',       label: 'Скальный' },
  { value: 'gravel',     label: 'Гравий' },
  { value: 'sand',       label: 'Песок' },
  { value: 'clay',       label: 'Глина' },
  { value: 'silt',       label: 'Суглинок' },
  { value: 'loam',       label: 'Супесь' },
  { value: 'fill',       label: 'Насыпной' },
  { value: 'peat',       label: 'Торф' },
  { value: 'permafrost', label: 'Вечная мерзлота' },
];

const soilTypeLabel = (t: string | null) => SOIL_TYPES.find(s => s.value === t)?.label ?? (t ?? '—');

const CATEGORY_BADGE: Record<string, string> = {
  I:   'bg-red-100 text-red-700',
  II:  'bg-orange-100 text-orange-700',
  III: 'bg-yellow-100 text-yellow-700',
  IV:  'bg-green-100 text-green-700',
};

type LayerDraft = Omit<SoilLayer, 'id' | 'profileId'> & { id?: number };

const emptyLayerDraft = (n: number, depthFrom: number): LayerDraft => ({
  layerNumber:           n,
  soilType:              'sand',
  thickness:             1,
  depthFrom,
  depthTo:               depthFrom + 1,
  shearVelocity:         200,
  compressionalVelocity: null,
  density:               null,
  dampingRatio:          null,
  description:           null,
});

// ── Layers editor (inline, per profile) ──────────────────────────────────────

const LayersEditor: FC<{ profileId: number }> = ({ profileId }) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState<LayerDraft[]>([]);

  const { data: layers = [], isLoading } = useQuery<SoilLayer[]>({
    queryKey: ['/api/soil-profiles', profileId, 'layers'],
    queryFn: async () => {
      const r = await fetch(`/api/soil-profiles/${profileId}/layers`);
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });

  const startEditing = () => {
    setDraft(layers.length > 0
      ? layers.map(l => ({ ...l }))
      : [emptyLayerDraft(1, 0)]);
    setEditing(true);
  };

  const updateRow = (idx: number, patch: Partial<LayerDraft>) => {
    setDraft(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const addRow = () => {
    setDraft(prev => {
      const last = prev[prev.length - 1];
      const from = last ? last.depthTo : 0;
      return [...prev, emptyLayerDraft(prev.length + 1, from)];
    });
  };

  const removeRow = (idx: number) => {
    setDraft(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, layerNumber: i + 1 })));
  };

  const saveLayers = useMutation({
    mutationFn: async (rows: LayerDraft[]) => {
      // Replace strategy: delete current layers, insert new ones.
      for (const existing of layers) {
        await apiRequest('DELETE', `/api/soil-layers/${existing.id}`);
      }
      for (const row of rows) {
        await apiRequest('POST', '/api/soil-layers', {
          profileId,
          layerNumber:           row.layerNumber,
          soilType:              row.soilType,
          thickness:             row.thickness,
          depthFrom:             row.depthFrom,
          depthTo:               row.depthTo,
          shearVelocity:         row.shearVelocity,
          compressionalVelocity: row.compressionalVelocity,
          density:               row.density,
          dampingRatio:          row.dampingRatio,
          description:           row.description,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/soil-profiles', profileId, 'layers'] });
      setEditing(false);
      toast({ title: 'Слои сохранены' });
    },
    onError: (e: Error) => toast({ title: 'Ошибка', description: e.message, variant: 'destructive' }),
  });

  const validateAndSave = () => {
    for (const r of draft) {
      if (!isFinite(r.thickness) || r.thickness <= 0) {
        toast({ title: 'Неверные данные', description: `Слой №${r.layerNumber}: толщина должна быть > 0`, variant: 'destructive' });
        return;
      }
      if (!isFinite(r.shearVelocity) || r.shearVelocity <= 0) {
        toast({ title: 'Неверные данные', description: `Слой №${r.layerNumber}: Vs должно быть > 0`, variant: 'destructive' });
        return;
      }
      if (r.depthTo <= r.depthFrom) {
        toast({ title: 'Неверные данные', description: `Слой №${r.layerNumber}: глубина "до" должна быть больше "от"`, variant: 'destructive' });
        return;
      }
    }
    saveLayers.mutate(draft);
  };

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Литологический разрез</p>
          <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1" onClick={startEditing} data-testid="button-edit-layers">
            <Pencil className="h-3 w-3" /> {layers.length === 0 ? 'Добавить слои' : 'Редактировать'}
          </Button>
        </div>
        {isLoading
          ? <p className="text-xs text-slate-400">Загрузка слоёв...</p>
          : layers.length === 0
            ? <p className="text-xs text-slate-400">Данные по слоям не внесены</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="text-left  pb-1.5 pr-3 font-medium">№</th>
                      <th className="text-left  pb-1.5 pr-3 font-medium">Грунт</th>
                      <th className="text-right pb-1.5 pr-3 font-medium">От, м</th>
                      <th className="text-right pb-1.5 pr-3 font-medium">До, м</th>
                      <th className="text-right pb-1.5 pr-3 font-medium">h, м</th>
                      <th className="text-right pb-1.5 pr-3 font-medium">Vs, м/с</th>
                      <th className="text-right pb-1.5 pr-3 font-medium">Vp, м/с</th>
                      <th className="text-right pb-1.5 pr-3 font-medium">ρ, кг/м³</th>
                      <th className="text-right pb-1.5 font-medium">D, %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {layers.map(l => (
                      <tr key={l.id} className="border-b border-slate-100 text-slate-600 hover:bg-slate-50">
                        <td className="py-1.5 pr-3">{l.layerNumber}</td>
                        <td className="py-1.5 pr-3">{soilTypeLabel(l.soilType)}</td>
                        <td className="py-1.5 pr-3 text-right font-mono">{l.depthFrom.toFixed(1)}</td>
                        <td className="py-1.5 pr-3 text-right font-mono">{l.depthTo.toFixed(1)}</td>
                        <td className="py-1.5 pr-3 text-right font-mono">{l.thickness.toFixed(1)}</td>
                        <td className="py-1.5 pr-3 text-right font-mono text-blue-600">{l.shearVelocity}</td>
                        <td className="py-1.5 pr-3 text-right font-mono">{l.compressionalVelocity ?? '—'}</td>
                        <td className="py-1.5 pr-3 text-right">{l.density != null ? l.density.toFixed(0) : '—'}</td>
                        <td className="py-1.5 text-right">{l.dampingRatio ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </div>
    );
  }

  return (
    <div className="space-y-2 border border-slate-200 rounded p-2 bg-slate-50">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-slate-700">Редактирование слоёв</p>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1" onClick={addRow} data-testid="button-add-layer">
            <Plus className="h-3 w-3" /> Слой
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1" onClick={() => setEditing(false)}>
            <X className="h-3 w-3" /> Отмена
          </Button>
          <Button size="sm" className="h-6 text-[11px] gap-1" onClick={validateAndSave} disabled={saveLayers.isPending} data-testid="button-save-layers">
            <Save className="h-3 w-3" /> Сохранить
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400">
              <th className="text-left  pb-1 pr-1 font-medium">№</th>
              <th className="text-left  pb-1 pr-1 font-medium">Грунт</th>
              <th className="text-right pb-1 pr-1 font-medium">От, м</th>
              <th className="text-right pb-1 pr-1 font-medium">До, м</th>
              <th className="text-right pb-1 pr-1 font-medium">Vs, м/с</th>
              <th className="text-right pb-1 pr-1 font-medium">Vp, м/с</th>
              <th className="text-right pb-1 pr-1 font-medium">ρ, кг/м³</th>
              <th className="text-right pb-1 pr-1 font-medium">D, %</th>
              <th className="pb-1"></th>
            </tr>
          </thead>
          <tbody>
            {draft.map((r, idx) => (
              <tr key={idx} className="border-b border-slate-100">
                <td className="py-1 pr-1 text-slate-600">{r.layerNumber}</td>
                <td className="py-1 pr-1">
                  <Select value={r.soilType} onValueChange={v => updateRow(idx, { soilType: v })}>
                    <SelectTrigger className="h-6 text-[11px] w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOIL_TYPES.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-1 pr-1">
                  <Input type="number" step="0.1" value={r.depthFrom} className="h-6 text-[11px] w-16 text-right font-mono"
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0;
                      updateRow(idx, { depthFrom: v, thickness: Math.max(0.1, r.depthTo - v) });
                    }} />
                </td>
                <td className="py-1 pr-1">
                  <Input type="number" step="0.1" value={r.depthTo} className="h-6 text-[11px] w-16 text-right font-mono"
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0;
                      updateRow(idx, { depthTo: v, thickness: Math.max(0.1, v - r.depthFrom) });
                    }} />
                </td>
                <td className="py-1 pr-1">
                  <Input type="number" step="10" value={r.shearVelocity} className="h-6 text-[11px] w-16 text-right font-mono"
                    onChange={e => updateRow(idx, { shearVelocity: parseFloat(e.target.value) || 0 })} />
                </td>
                <td className="py-1 pr-1">
                  <Input type="number" step="10" value={r.compressionalVelocity ?? ''} className="h-6 text-[11px] w-16 text-right font-mono"
                    onChange={e => updateRow(idx, { compressionalVelocity: e.target.value === '' ? null : parseFloat(e.target.value) })} />
                </td>
                <td className="py-1 pr-1">
                  <Input type="number" step="10" value={r.density ?? ''} className="h-6 text-[11px] w-16 text-right font-mono"
                    onChange={e => updateRow(idx, { density: e.target.value === '' ? null : parseFloat(e.target.value) })} />
                </td>
                <td className="py-1 pr-1">
                  <Input type="number" step="0.5" value={r.dampingRatio ?? ''} className="h-6 text-[11px] w-14 text-right font-mono"
                    onChange={e => updateRow(idx, { dampingRatio: e.target.value === '' ? null : parseFloat(e.target.value) })} />
                </td>
                <td className="py-1">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                    onClick={() => removeRow(idx)} data-testid={`button-remove-layer-${idx}`}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Profile form (create / edit) ─────────────────────────────────────────────

type ProfileForm = {
  profileName: string; soilCategory: string;
  positionX: string; positionY: string;
  avgShearVelocity: string; groundwaterDepth: string;
  dominantFrequency: string; amplificationFactor: string;
  boreholeDepth: string; surveyDate: string;
  surveyOrganization: string; description: string;
};

const emptyForm: ProfileForm = {
  profileName: '', soilCategory: 'III',
  positionX: '', positionY: '',
  avgShearVelocity: '', groundwaterDepth: '',
  dominantFrequency: '', amplificationFactor: '',
  boreholeDepth: '', surveyDate: '',
  surveyOrganization: '', description: '',
};

const profileToForm = (p: SoilProfile): ProfileForm => ({
  profileName:         p.profileName,
  soilCategory:        p.soilCategory,
  positionX:           p.positionX != null ? String(p.positionX) : '',
  positionY:           p.positionY != null ? String(p.positionY) : '',
  avgShearVelocity:    p.avgShearVelocity != null ? String(p.avgShearVelocity) : '',
  groundwaterDepth:    p.groundwaterDepth != null ? String(p.groundwaterDepth) : '',
  dominantFrequency:   p.dominantFrequency != null ? String(p.dominantFrequency) : '',
  amplificationFactor: p.amplificationFactor != null ? String(p.amplificationFactor) : '',
  boreholeDepth:       p.boreholeDepth != null ? String(p.boreholeDepth) : '',
  surveyDate:          p.surveyDate ? new Date(p.surveyDate).toISOString().slice(0, 10) : '',
  surveyOrganization:  p.surveyOrganization ?? '',
  description:         p.description ?? '',
});

const formToPayload = (f: ProfileForm, objectId: number) => {
  const num = (s: string): number | null => s.trim() === '' ? null : (isNaN(parseFloat(s)) ? null : parseFloat(s));
  return {
    objectId,
    profileName:         f.profileName.trim(),
    soilCategory:        f.soilCategory,
    positionX:           num(f.positionX),
    positionY:           num(f.positionY),
    avgShearVelocity:    num(f.avgShearVelocity),
    groundwaterDepth:    num(f.groundwaterDepth),
    dominantFrequency:   num(f.dominantFrequency),
    amplificationFactor: num(f.amplificationFactor),
    boreholeDepth:       num(f.boreholeDepth),
    surveyDate:          f.surveyDate ? new Date(f.surveyDate).toISOString() : null,
    surveyOrganization:  f.surveyOrganization.trim() || null,
    description:         f.description.trim() || null,
  };
};

const ProfileForm: FC<{ initial?: SoilProfile; objectId: number; onCancel: () => void; onSaved: () => void }> = ({ initial, objectId, onCancel, onSaved }) => {
  const { toast } = useToast();
  const [form, setForm] = useState<ProfileForm>(initial ? profileToForm(initial) : emptyForm);

  const save = useMutation({
    mutationFn: async (payload: object) => {
      if (initial) return apiRequest('PATCH', `/api/soil-profiles/${initial.id}`, payload);
      return apiRequest('POST', '/api/soil-profiles', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/soil-profiles'] });
      toast({ title: initial ? 'Скважина обновлена' : 'Скважина создана' });
      onSaved();
    },
    onError: (e: Error) => toast({ title: 'Ошибка сохранения', description: e.message, variant: 'destructive' }),
  });

  const submit = () => {
    if (!form.profileName.trim()) {
      toast({ title: 'Название скважины обязательно', variant: 'destructive' });
      return;
    }
    save.mutate(formToPayload(form, objectId));
  };

  const set = (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Card className="border border-blue-200 bg-blue-50/50 shadow-none">
      <CardContent className="p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-700">{initial ? 'Редактирование скважины' : 'Новая скважина / точка изысканий'}</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-slate-500">Название *</Label>
            <Input value={form.profileName} onChange={set('profileName')} className="h-7 text-xs" placeholder="Скв. СК-1 (СВ угол)" data-testid="input-profile-name" />
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">Категория грунта (СП 14)</Label>
            <Select value={form.soilCategory} onValueChange={v => setForm(p => ({ ...p, soilCategory: v }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['I', 'II', 'III', 'IV'].map(c => <SelectItem key={c} value={c} className="text-xs">Категория {c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">X в плане, м</Label>
            <Input type="number" step="0.5" value={form.positionX} onChange={set('positionX')} className="h-7 text-xs font-mono" placeholder="0" />
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">Y в плане, м</Label>
            <Input type="number" step="0.5" value={form.positionY} onChange={set('positionY')} className="h-7 text-xs font-mono" placeholder="0" />
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">Vs30, м/с</Label>
            <Input type="number" step="10" value={form.avgShearVelocity} onChange={set('avgShearVelocity')} className="h-7 text-xs font-mono" />
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">Глубина скв., м</Label>
            <Input type="number" step="0.5" value={form.boreholeDepth} onChange={set('boreholeDepth')} className="h-7 text-xs font-mono" />
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">УГВ, м</Label>
            <Input type="number" step="0.5" value={form.groundwaterDepth} onChange={set('groundwaterDepth')} className="h-7 text-xs font-mono" />
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">Доминир. частота, Гц</Label>
            <Input type="number" step="0.1" value={form.dominantFrequency} onChange={set('dominantFrequency')} className="h-7 text-xs font-mono" />
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">Коэф. усиления</Label>
            <Input type="number" step="0.01" value={form.amplificationFactor} onChange={set('amplificationFactor')} className="h-7 text-xs font-mono" />
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">Дата изысканий</Label>
            <Input type="date" value={form.surveyDate} onChange={set('surveyDate')} className="h-7 text-xs" />
          </div>
          <div className="col-span-2">
            <Label className="text-[10px] text-slate-500">Изыскательная организация</Label>
            <Input value={form.surveyOrganization} onChange={set('surveyOrganization')} className="h-7 text-xs" />
          </div>
          <div className="col-span-2">
            <Label className="text-[10px] text-slate-500">Описание</Label>
            <Textarea value={form.description} onChange={set('description')} className="text-xs min-h-[50px]" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onCancel}>
            <X className="h-3 w-3" /> Отмена
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={submit} disabled={save.isPending} data-testid="button-save-profile">
            <Save className="h-3 w-3" /> Сохранить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Foundation plan (visual placement of boreholes) ──────────────────────────

const FoundationPlan: FC<{ profiles: SoilProfile[]; selectedId: number | null; onSelect: (id: number) => void }> = ({ profiles, selectedId, onSelect }) => {
  const placed = profiles.filter(p => p.positionX != null && p.positionY != null);
  if (placed.length === 0) {
    return (
      <p className="text-[11px] text-slate-400 italic px-2 py-3">
        Задайте координаты X/Y у скважин — они появятся на схеме плана фундамента.
      </p>
    );
  }
  const xs = placed.map(p => p.positionX!);
  const ys = placed.map(p => p.positionY!);
  const minX = Math.min(0, ...xs), maxX = Math.max(...xs, minX + 10);
  const minY = Math.min(0, ...ys), maxY = Math.max(...ys, minY + 10);
  const padX = (maxX - minX) * 0.15 || 2;
  const padY = (maxY - minY) * 0.15 || 2;
  const vbX = minX - padX, vbY = minY - padY;
  const vbW = (maxX - minX) + 2 * padX;
  const vbH = (maxY - minY) + 2 * padY;
  return (
    <div className="border border-slate-200 rounded bg-slate-50 p-2">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">План фундамента (м)</p>
        <p className="text-[10px] text-slate-400">{placed.length} точек размещено</p>
      </div>
      <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} className="w-full h-40" preserveAspectRatio="xMidYMid meet">
        <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY}
              fill="#fff" stroke="#cbd5e1" strokeWidth={Math.max(vbW, vbH) * 0.003} strokeDasharray={`${vbW * 0.01},${vbW * 0.005}`} />
        {placed.map(p => {
          const isSel = p.id === selectedId;
          const r = Math.max(vbW, vbH) * 0.025;
          return (
            <g key={p.id} onClick={() => onSelect(p.id)} className="cursor-pointer">
              <circle cx={p.positionX!} cy={p.positionY!} r={r}
                      fill={isSel ? '#2563eb' : '#fbbf24'} stroke="#1e293b" strokeWidth={r * 0.15} />
              <text x={p.positionX!} y={p.positionY! - r * 1.6} textAnchor="middle"
                    fontSize={r * 1.4} fill="#1e293b" fontWeight={isSel ? 'bold' : 'normal'}>
                {p.profileName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ── Profile card (collapsible) ───────────────────────────────────────────────

const ProfileCard: FC<{
  profile: SoilProfile; isExpanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}> = ({ profile, isExpanded, onToggle, onEdit, onDelete }) => (
  <Card className="border border-slate-200 shadow-none" data-testid={`profile-card-${profile.id}`}>
    <CardContent className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1 cursor-pointer" onClick={onToggle}>
          <div className="p-1.5 rounded bg-yellow-50 flex-shrink-0">
            <Layers className="h-3.5 w-3.5 text-yellow-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-xs font-semibold text-slate-800">{profile.profileName}</p>
              <Badge className={`text-[10px] hover:opacity-80 ${CATEGORY_BADGE[profile.soilCategory] ?? 'bg-slate-100 text-slate-700'}`}>
                Кат. {profile.soilCategory}
              </Badge>
              {profile.positionX != null && profile.positionY != null && (
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 font-mono">
                  <MapPin className="h-2.5 w-2.5" />({profile.positionX}, {profile.positionY})
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1.5">
              {profile.avgShearVelocity != null && <Stat label="Vs30" value={`${profile.avgShearVelocity} м/с`} />}
              {profile.boreholeDepth   != null && <Stat label="Глубина" value={`${profile.boreholeDepth} м`} />}
              {profile.groundwaterDepth != null && <Stat label="УГВ" value={`${profile.groundwaterDepth} м`} />}
              {profile.amplificationFactor != null && <Stat label="К.усил." value={profile.amplificationFactor.toFixed(2)} accent />}
              {profile.dominantFrequency != null && <Stat label="Дом. f" value={`${profile.dominantFrequency.toFixed(2)} Гц`} />}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400" onClick={onToggle}>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600" onClick={onEdit} data-testid={`button-edit-profile-${profile.id}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-red-600" onClick={onDelete} data-testid={`button-delete-profile-${profile.id}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          {profile.description       && <p className="text-[11px] text-slate-600">{profile.description}</p>}
          {profile.surveyOrganization && <p className="text-[10px] text-slate-500">Изыскания: {profile.surveyOrganization}</p>}
          {profile.surveyDate         && <p className="text-[10px] text-slate-500">Дата: {new Date(profile.surveyDate).toLocaleDateString('ru-RU')}</p>}
          <LayersEditor profileId={profile.id} />
        </div>
      )}
    </CardContent>
  </Card>
);

const Stat: FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div>
    <p className="text-[9px] text-slate-400">{label}</p>
    <p className={`text-[11px] font-bold ${accent ? 'text-blue-700' : 'text-slate-700'}`}>{value}</p>
  </div>
);

// ── Main tab component ──────────────────────────────────────────────────────

const SoilProfilesTab: FC<{ objectId: number }> = ({ objectId }) => {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingProfile, setEditingProfile] = useState<SoilProfile | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: allProfiles = [], isLoading } = useQuery<SoilProfile[]>({
    queryKey: ['/api/soil-profiles'],
  });
  const profiles = useMemo(
    () => allProfiles.filter(p => p.objectId === objectId),
    [allProfiles, objectId]
  );

  const deleteProfile = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/soil-profiles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/soil-profiles'] });
      toast({ title: 'Скважина удалена' });
    },
    onError: (e: Error) => toast({ title: 'Ошибка удаления', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">
          {profiles.length === 0 ? 'Точки изысканий не заданы' : `Скважин / точек: ${profiles.length}`}
        </p>
        {!creating && !editingProfile && (
          <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => setCreating(true)} data-testid="button-add-profile">
            <Plus className="h-3 w-3" /> Новая скважина
          </Button>
        )}
      </div>

      {profiles.length > 0 && !creating && !editingProfile && (
        <FoundationPlan profiles={profiles} selectedId={expandedId} onSelect={id => setExpandedId(prev => prev === id ? null : id)} />
      )}

      {creating && (
        <ProfileForm objectId={objectId} onCancel={() => setCreating(false)} onSaved={() => setCreating(false)} />
      )}
      {editingProfile && (
        <ProfileForm initial={editingProfile} objectId={objectId} onCancel={() => setEditingProfile(null)} onSaved={() => setEditingProfile(null)} />
      )}

      {isLoading
        ? <p className="text-xs text-slate-400 py-6 text-center">Загрузка...</p>
        : profiles.length === 0 && !creating
          ? (
            <Card className="border border-dashed border-slate-200">
              <CardContent className="py-6 text-center">
                <Layers className="h-7 w-7 mx-auto mb-1.5 text-slate-300" />
                <p className="text-xs text-slate-500">Нет данных по грунтам для этого объекта</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Добавьте точки геологических изысканий с послойным разрезом</p>
              </CardContent>
            </Card>
          )
          : (
            <div className="space-y-2">
              {profiles.map(p => (
                <ProfileCard
                  key={p.id}
                  profile={p}
                  isExpanded={expandedId === p.id}
                  onToggle={() => setExpandedId(prev => prev === p.id ? null : p.id)}
                  onEdit={() => { setEditingProfile(p); setExpandedId(null); }}
                  onDelete={() => {
                    if (confirm(`Удалить скважину "${p.profileName}" вместе со всеми слоями?`)) {
                      deleteProfile.mutate(p.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
    </div>
  );
};

export default SoilProfilesTab;
