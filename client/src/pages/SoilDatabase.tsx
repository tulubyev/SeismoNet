import { FC, useEffect, useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Layers, Search, Plus, Download, MapPin, Trash2, ChevronRight,
  Activity, Droplets, Waves, BarChart3, Info, PlusCircle, X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { SoilProfile, SoilLayer, InfrastructureObject } from '@shared/schema';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOIL_CAT_CONFIG: Record<string, { label: string; color: string; markerColor: string; vs: string }> = {
  'I':   { label: 'Категория I — скальные', color: 'bg-blue-100 text-blue-800 border-blue-200',   markerColor: '#3b82f6', vs: 'Vs > 700 м/с' },
  'II':  { label: 'Категория II — средние',  color: 'bg-emerald-100 text-emerald-800 border-emerald-200', markerColor: '#10b981', vs: '250–700 м/с' },
  'III': { label: 'Категория III — мягкие', color: 'bg-amber-100 text-amber-800 border-amber-200',  markerColor: '#f59e0b', vs: '150–250 м/с' },
  'IV':  { label: 'Категория IV — слабые',  color: 'bg-red-100 text-red-800 border-red-200',        markerColor: '#ef4444', vs: 'Vs ≤ 150 м/с' },
};

const SOIL_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  rock:    { label: 'Скала',            color: '#6b7280' },
  gravel:  { label: 'Галечник/Гравий',  color: '#78716c' },
  sand:    { label: 'Песок',            color: '#ca8a04' },
  loam:    { label: 'Суглинок',         color: '#a16207' },
  clay:    { label: 'Глина',            color: '#92400e' },
  fill:    { label: 'Насыпной',         color: '#9ca3af' },
};

const soilTypeLabel = (t: string) => SOIL_TYPE_CONFIG[t]?.label ?? t;
const soilTypeColor = (t: string) => SOIL_TYPE_CONFIG[t]?.color ?? '#94a3b8';
const catConfig = (c: string | null) => SOIL_CAT_CONFIG[c ?? ''] ?? { label: c ?? '—', color: 'bg-slate-100 text-slate-700 border-slate-200', markerColor: '#94a3b8', vs: '' };

// ─── Stratigraphic column ──────────────────────────────────────────────────────

const Stratigraphy: FC<{ layers: SoilLayer[] }> = ({ layers }) => {
  if (layers.length === 0) return <p className="text-xs text-slate-400 text-center py-4">Нет данных о слоях</p>;

  const totalDepth = Math.max(...layers.map(l => l.depthTo));
  const minH = 28;

  return (
    <div className="flex gap-3 select-none">
      {/* Depth axis */}
      <div className="flex flex-col items-end flex-shrink-0 pt-0 pb-1" style={{ width: 32 }}>
        {layers.map(l => (
          <div
            key={l.id}
            className="flex items-start justify-end text-[10px] text-slate-400 font-mono leading-none"
            style={{ height: Math.max(minH, (l.thickness / totalDepth) * 220) }}
          >
            {l.depthFrom.toFixed(1)}
          </div>
        ))}
        <div className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">
          {totalDepth.toFixed(1)}
        </div>
      </div>

      {/* Column */}
      <div className="flex-shrink-0 rounded overflow-hidden border border-slate-300" style={{ width: 56 }}>
        {layers.map(l => (
          <div
            key={l.id}
            style={{
              height: Math.max(minH, (l.thickness / totalDepth) * 220),
              background: soilTypeColor(l.soilType),
              borderBottom: '1px solid rgba(255,255,255,0.25)',
            }}
            className="flex items-center justify-center"
            title={`${soilTypeLabel(l.soilType)} · ${l.thickness} м`}
          >
            <span className="text-[9px] text-white font-bold drop-shadow">
              {l.shearVelocity}
            </span>
          </div>
        ))}
      </div>

      {/* Layer descriptions */}
      <div className="flex-1 min-w-0 flex flex-col">
        {layers.map(l => (
          <div
            key={l.id}
            className="flex items-start gap-1.5 border-b border-slate-100 pb-1 mb-1"
            style={{ minHeight: Math.max(minH, (l.thickness / totalDepth) * 220) }}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-0.5"
              style={{ background: soilTypeColor(l.soilType) }}
            />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-700 leading-tight">{soilTypeLabel(l.soilType)}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{l.depthFrom}–{l.depthTo} м · Vs={l.shearVelocity} м/с</p>
              {l.description && <p className="text-[10px] text-slate-400 truncate">{l.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── CSV export ────────────────────────────────────────────────────────────────

function exportProfileCsv(profile: SoilProfile, layers: SoilLayer[]) {
  const rows = [
    ['Профиль', profile.profileName],
    ['Категория грунта', profile.soilCategory],
    ['Широта', String(profile.latitude ?? '')],
    ['Долгота', String(profile.longitude ?? '')],
    ['Vs30 (м/с)', String(profile.avgShearVelocity ?? '')],
    ['УГВ (м)', String(profile.groundwaterDepth ?? '')],
    ['Доминирующая частота (Гц)', String(profile.dominantFrequency ?? '')],
    ['Коэф. усиления', String(profile.amplificationFactor ?? '')],
    ['Глубина скважины (м)', String(profile.boreholeDepth ?? '')],
    ['Организация', profile.surveyOrganization ?? ''],
    ['Описание', profile.description ?? ''],
    [],
    ['№ слоя', 'Тип грунта', 'Мощность (м)', 'Глубина от (м)', 'Глубина до (м)',
     'Vs (м/с)', 'Vp (м/с)', 'Плотность (кг/м³)', 'Демпфирование (%)', 'Описание'],
    ...layers.map(l => [
      l.layerNumber, soilTypeLabel(l.soilType), l.thickness, l.depthFrom, l.depthTo,
      l.shearVelocity, l.compressionalVelocity ?? '', l.density ?? '', l.dampingRatio ?? '', l.description ?? '',
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `soil_profile_${profile.id}_${profile.profileName.replace(/\s/g, '_')}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Leaflet map ───────────────────────────────────────────────────────────────

declare global { interface Window { L: any; } }
const esc = (s: string | null | undefined) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SoilMap: FC<{
  profiles: SoilProfile[];
  infraObjects?: InfrastructureObject[];
  selected: number | null;
  onSelect: (id: number) => void;
  onInfraClick?: (lat: number, lng: number, obj: InfrastructureObject) => void;
  onPickCoords?: (lat: number, lng: number) => void;
}> = ({ profiles, infraObjects = [], selected, onSelect, onInfraClick, onPickCoords }) => {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<any>(null);
  const initRef        = useRef(false);
  const markersRef     = useRef<Map<number, any>>(new Map());
  const infraMarkersRef= useRef<Map<number, any>>(new Map());
  const pickingRef     = useRef(!!onPickCoords);
  const onInfraRef     = useRef(onInfraClick);

  pickingRef.current = !!onPickCoords;
  onInfraRef.current = onInfraClick;

  const initMap = () => {
    if (!containerRef.current || !window.L || initRef.current) return;
    mapRef.current = window.L.map(containerRef.current, {
      center: [52.29, 104.30], zoom: 12, zoomControl: true, scrollWheelZoom: true,
    });
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 18,
    }).addTo(mapRef.current);

    if (pickingRef.current) {
      mapRef.current.getContainer().style.cursor = 'crosshair';
    }

    mapRef.current.on('click', (e: any) => {
      if (pickingRef.current && onPickCoords) {
        onPickCoords(e.latlng.lat, e.latlng.lng);
      }
    });

    initRef.current = true;
    addMarkers();
    addInfraMarkers();
  };

  const addMarkers = () => {
    if (!mapRef.current || !window.L) return;
    markersRef.current.forEach(m => { try { m.remove(); } catch { /* */ } });
    markersRef.current.clear();

    profiles.forEach(p => {
      const lat = parseFloat(String(p.latitude));
      const lng = parseFloat(String(p.longitude));
      if (isNaN(lat) || isNaN(lng)) return;
      const cc = catConfig(p.soilCategory);
      const isActive = p.id === selected;
      const marker = window.L.circleMarker([lat, lng], {
        radius: isActive ? 13 : 9,
        fillColor: cc.markerColor,
        color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
        weight: isActive ? 3 : 1.5,
        opacity: 1, fillOpacity: 0.9,
      });
      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:160px">
          <b style="font-size:12px;color:#1e293b">${esc(p.profileName)}</b>
          <div style="margin-top:4px;font-size:11px;color:#64748b">
            Категория грунта <b>${esc(p.soilCategory)}</b> · Vs30=${p.avgShearVelocity ?? '—'} м/с
          </div>
          ${p.amplificationFactor ? `<div style="font-size:11px;color:#64748b">Усиление: ×${p.amplificationFactor.toFixed(2)}</div>` : ''}
          <div style="margin-top:4px;font-size:10px;color:#94a3b8">📍 Точка наблюдения</div>
        </div>`);
      marker.on('click', () => onSelect(p.id));
      marker.addTo(mapRef.current);
      markersRef.current.set(p.id, marker);
    });
  };

  const addInfraMarkers = () => {
    if (!mapRef.current || !window.L) return;
    infraMarkersRef.current.forEach(m => { try { m.remove(); } catch { /* */ } });
    infraMarkersRef.current.clear();

    infraObjects.forEach(obj => {
      const lat = parseFloat(String(obj.latitude));
      const lng = parseFloat(String(obj.longitude));
      if (isNaN(lat) || isNaN(lng)) return;
      const marker = window.L.circleMarker([lat, lng], {
        radius: 5,
        fillColor: '#6366f1',
        color: 'rgba(255,255,255,0.6)',
        weight: 1,
        opacity: 0.7, fillOpacity: 0.5,
      });
      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:180px">
          <b style="font-size:12px;color:#312e81">${esc(obj.name)}</b>
          <div style="margin-top:3px;font-size:11px;color:#64748b">
            ${esc(obj.objectType)} · ${esc(obj.district ?? '')}
            ${obj.seismicCategory ? `<br>Кат. сейсмостойкости: <b>${esc(obj.seismicCategory)}</b>` : ''}
            ${obj.designIntensity ? ` · Расч. интенсивность: ${obj.designIntensity} балл` : ''}
          </div>
          <div style="margin-top:4px;font-size:10px;color:#818cf8">🏗 Нажмите для поиска грунта</div>
        </div>`);
      marker.on('click', () => {
        if (onInfraRef.current) onInfraRef.current(lat, lng, obj);
      });
      marker.addTo(mapRef.current);
      infraMarkersRef.current.set(obj.id, marker);
    });
  };

  useEffect(() => {
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else if (!initRef.current) { initMap(); }
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; initRef.current = false; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (initRef.current) addMarkers(); }, [profiles, selected]);
  useEffect(() => { if (initRef.current) addInfraMarkers(); }, [infraObjects]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => { mapRef.current?.invalidateSize(); });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.getContainer().style.cursor = onPickCoords ? 'crosshair' : '';
  }, [onPickCoords]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

// ─── Add Profile Dialog ────────────────────────────────────────────────────────

const addSchema = z.object({
  profileName:         z.string().min(1, 'Введите название'),
  latitude:            z.string().optional(),
  longitude:           z.string().optional(),
  soilCategory:        z.enum(['I', 'II', 'III', 'IV']),
  avgShearVelocity:    z.coerce.number().optional(),
  groundwaterDepth:    z.coerce.number().optional(),
  dominantFrequency:   z.coerce.number().optional(),
  amplificationFactor: z.coerce.number().optional(),
  boreholeDepth:       z.coerce.number().optional(),
  surveyOrganization:  z.string().optional(),
  description:         z.string().optional(),
});
type AddForm = z.infer<typeof addSchema>;
type SoilCategoryEnum = 'I' | 'II' | 'III' | 'IV';

type LayerEntry = {
  soilType: string;
  thickness: string;
  depthFrom: string;
  depthTo: string;
  shearVelocity: string;
  compressionalVelocity: string;
  density: string;
  description: string;
};

const SOIL_TYPES = Object.keys(SOIL_TYPE_CONFIG);

const emptyLayer = (): LayerEntry => ({
  soilType: 'sand', thickness: '', depthFrom: '', depthTo: '',
  shearVelocity: '', compressionalVelocity: '', density: '', description: '',
});

const AddProfileDialog: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingLayers, setPendingLayers] = useState<LayerEntry[]>([]);

  const form = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { soilCategory: 'II' },
  });

  const handleClose = () => {
    form.reset();
    setPickedCoords(null);
    setPendingLayers([]);
    onClose();
  };

  const mutation = useMutation({
    mutationFn: async (data: AddForm) => {
      const profileRes = await apiRequest('POST', '/api/soil-profiles', data);
      const profile: SoilProfile = await profileRes.json();
      let layerNum = 1;
      for (const layer of pendingLayers) {
        const thickness = parseFloat(layer.thickness);
        const depthFrom = parseFloat(layer.depthFrom);
        const depthTo   = parseFloat(layer.depthTo);
        const vs        = parseFloat(layer.shearVelocity);
        if (isNaN(thickness) || isNaN(depthFrom) || isNaN(depthTo) || isNaN(vs)) continue;
        await apiRequest('POST', '/api/soil-layers', {
          profileId: profile.id,
          layerNumber: layerNum++,
          soilType: layer.soilType,
          thickness,
          depthFrom,
          depthTo,
          shearVelocity: vs,
          compressionalVelocity: layer.compressionalVelocity ? parseFloat(layer.compressionalVelocity) : null,
          density: layer.density ? parseFloat(layer.density) : null,
          dampingRatio: null,
          description: layer.description || null,
        });
      }
      return profile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/soil-profiles'] });
      toast({ title: 'Профиль добавлен' });
      handleClose();
    },
    onError: () => toast({ title: 'Ошибка', description: 'Не удалось сохранить', variant: 'destructive' }),
  });

  const handlePickCoords = (lat: number, lng: number) => {
    setPickedCoords({ lat, lng });
    form.setValue('latitude', lat.toFixed(5));
    form.setValue('longitude', lng.toFixed(5));
  };

  const updateLayer = (idx: number, field: keyof LayerEntry, val: string) => {
    setPendingLayers(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить точку наблюдения</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-5">
          {/* ── Profile fields ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Название *</Label>
              <Input {...form.register('profileName')} placeholder="напр. Центр — ул. Ленина, скважина №12" />
              {form.formState.errors.profileName && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.profileName.message}</p>
              )}
            </div>

            <div>
              <Label className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Категория грунта *
              </Label>
              <Select
                value={form.watch('soilCategory')}
                onValueChange={v => form.setValue('soilCategory', v as SoilCategoryEnum)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOIL_CAT_CONFIG).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>{k} — {cfg.vs}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Широта</Label>
                <Input {...form.register('latitude')} placeholder="52.2901" />
              </div>
              <div>
                <Label>Долгота</Label>
                <Input {...form.register('longitude')} placeholder="104.2964" />
              </div>
            </div>

            {/* Mini map for coord picking */}
            <div className="col-span-2">
              <Label className="mb-1 block text-xs text-slate-500">
                Кликните на карте для выбора координат{pickedCoords && ` → ${pickedCoords.lat.toFixed(5)}, ${pickedCoords.lng.toFixed(5)}`}
              </Label>
              <div className="rounded-lg border border-slate-200 overflow-hidden" style={{ height: 220 }}>
                <SoilMap profiles={[]} selected={null} onSelect={() => {}} onPickCoords={handlePickCoords} />
              </div>
            </div>

            <div>
              <Label>Vs30 (м/с) — среднее за 30 м</Label>
              <Input {...form.register('avgShearVelocity')} type="number" placeholder="380" />
            </div>
            <div>
              <Label>УГВ — уровень грунтовых вод (м)</Label>
              <Input {...form.register('groundwaterDepth')} type="number" placeholder="4.5" />
            </div>
            <div>
              <Label>Доминирующая частота (Гц)</Label>
              <Input {...form.register('dominantFrequency')} type="number" step="0.1" placeholder="3.5" />
            </div>
            <div>
              <Label>Коэффициент усиления</Label>
              <Input {...form.register('amplificationFactor')} type="number" step="0.01" placeholder="1.35" />
            </div>
            <div>
              <Label>Глубина скважины (м)</Label>
              <Input {...form.register('boreholeDepth')} type="number" placeholder="20" />
            </div>
            <div>
              <Label>Организация-исполнитель</Label>
              <Input {...form.register('surveyOrganization')} placeholder="ООО «ГеоЦентр»" />
            </div>
            <div className="col-span-2">
              <Label>Описание</Label>
              <Textarea {...form.register('description')} rows={2} placeholder="Краткое описание условий" />
            </div>
          </div>

          {/* ── Layer table ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold text-slate-700">Слои разреза (стратиграфическая колонка)</Label>
              <Button
                type="button" size="sm" variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setPendingLayers(prev => [...prev, emptyLayer()])}
              >
                <PlusCircle className="h-3 w-3" /> Добавить слой
              </Button>
            </div>

            {pendingLayers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3 border border-dashed rounded-lg">
                Нет слоёв — нажмите «Добавить слой» для ввода стратиграфии
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden text-xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-[11px] py-1 px-2 w-6">#</TableHead>
                      <TableHead className="text-[11px] py-1 px-2">Тип грунта</TableHead>
                      <TableHead className="text-[11px] py-1 px-2">Мощность (м)</TableHead>
                      <TableHead className="text-[11px] py-1 px-2">От (м)</TableHead>
                      <TableHead className="text-[11px] py-1 px-2">До (м)</TableHead>
                      <TableHead className="text-[11px] py-1 px-2">Vs (м/с)</TableHead>
                      <TableHead className="text-[11px] py-1 px-2">Vp (м/с)</TableHead>
                      <TableHead className="text-[11px] py-1 px-2">Описание</TableHead>
                      <TableHead className="text-[11px] py-1 px-2 w-6"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLayers.map((layer, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="py-1 px-2 text-slate-400 font-mono">{idx + 1}</TableCell>
                        <TableCell className="py-1 px-1">
                          <Select
                            value={layer.soilType}
                            onValueChange={v => updateLayer(idx, 'soilType', v)}
                          >
                            <SelectTrigger className="h-7 text-xs min-w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SOIL_TYPES.map(t => (
                                <SelectItem key={t} value={t}>{soilTypeLabel(t)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <Input className="h-7 text-xs w-20" value={layer.thickness}
                            onChange={e => updateLayer(idx, 'thickness', e.target.value)} placeholder="м" />
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <Input className="h-7 text-xs w-20" value={layer.depthFrom}
                            onChange={e => updateLayer(idx, 'depthFrom', e.target.value)} placeholder="м" />
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <Input className="h-7 text-xs w-20" value={layer.depthTo}
                            onChange={e => updateLayer(idx, 'depthTo', e.target.value)} placeholder="м" />
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <Input className="h-7 text-xs w-20" value={layer.shearVelocity}
                            onChange={e => updateLayer(idx, 'shearVelocity', e.target.value)} placeholder="м/с" />
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <Input className="h-7 text-xs w-20" value={layer.compressionalVelocity}
                            onChange={e => updateLayer(idx, 'compressionalVelocity', e.target.value)} placeholder="м/с" />
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <Input className="h-7 text-xs w-36" value={layer.description}
                            onChange={e => updateLayer(idx, 'description', e.target.value)} placeholder="описание" />
                        </TableCell>
                        <TableCell className="py-1 px-1">
                          <button
                            type="button"
                            className="text-slate-300 hover:text-red-500 transition-colors"
                            onClick={() => setPendingLayers(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>Отмена</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Сохранение...' : 'Сохранить профиль'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const SoilDatabase: FC = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addOpen, setAddOpen]       = useState(false);
  const [infraLookup, setInfraLookup] = useState<{ obj: InfrastructureObject; soil: SoilProfile | null } | null>(null);

  const { data: profiles = [], isLoading } = useQuery<SoilProfile[]>({
    queryKey: ['/api/soil-profiles'],
  });

  const { data: infraObjects = [] } = useQuery<InfrastructureObject[]>({
    queryKey: ['/api/infrastructure-objects'],
  });

  const { data: layers = [] } = useQuery<SoilLayer[]>({
    queryKey: ['/api/soil-profiles', selectedId, 'layers'],
    queryFn: async () => {
      if (!selectedId) return [];
      const r = await fetch(`/api/soil-profiles/${selectedId}/layers`);
      return r.json();
    },
    enabled: !!selectedId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/soil-profiles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/soil-profiles'] });
      setSelectedId(null);
      toast({ title: 'Профиль удалён' });
    },
    onError: () => toast({ title: 'Ошибка удаления', variant: 'destructive' }),
  });

  const handleInfraClick = async (lat: number, lng: number, obj: InfrastructureObject) => {
    try {
      const res = await fetch(`/api/soil-profiles/nearest?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const soil: SoilProfile = await res.json();
        setInfraLookup({ obj, soil });
        setSelectedId(soil.id);
      } else {
        setInfraLookup({ obj, soil: null });
      }
    } catch {
      setInfraLookup({ obj, soil: null });
    }
  };

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter(p =>
      (catFilter === 'all' || p.soilCategory === catFilter) &&
      (q === '' || p.profileName.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q))
    );
  }, [profiles, search, catFilter]);

  const selected = profiles.find(p => p.id === selectedId) ?? null;

  const stats = useMemo(() => ({
    I:   profiles.filter(p => p.soilCategory === 'I').length,
    II:  profiles.filter(p => p.soilCategory === 'II').length,
    III: profiles.filter(p => p.soilCategory === 'III').length,
    IV:  profiles.filter(p => p.soilCategory === 'IV').length,
  }), [profiles]);

  return (
    <>
      <div className="p-6 space-y-5">

        {/* Stats KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(['I','II','III','IV'] as const).map(cat => {
            const cc = SOIL_CAT_CONFIG[cat];
            return (
              <Card key={cat} className="border-0 shadow-sm bg-white">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ background: cc.markerColor + '22' }}>
                      <Layers className="h-4 w-4" style={{ color: cc.markerColor }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{stats[cat]}</p>
                      <p className="text-xs text-slate-500">Кат. {cat} · {cc.vs}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main two-panel layout */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

          {/* ── Left panel: profile list ── */}
          <div className="xl:col-span-2 space-y-4">

            {/* Toolbar */}
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-4 pb-3 space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Поиск по точке..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                  <Button size="sm" className="h-9" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Добавить
                  </Button>
                </div>
                <Select value={catFilter} onValueChange={setCatFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Все категории грунтов" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {Object.entries(SOIL_CAT_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  Точек: {filteredProfiles.length} из {profiles.length}
                </p>
              </CardContent>
            </Card>

            {/* Profile list */}
            <div className="space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                ))
              ) : filteredProfiles.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-8 text-center text-slate-400">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Нет данных</p>
                  </CardContent>
                </Card>
              ) : filteredProfiles.map(p => {
                const cc = catConfig(p.soilCategory);
                const isActive = p.id === selectedId;
                return (
                  <Card
                    key={p.id}
                    className={`border shadow-sm cursor-pointer transition-all ${isActive ? 'border-blue-400 bg-blue-50' : 'border-transparent bg-white hover:border-slate-200'}`}
                    onClick={() => setSelectedId(isActive ? null : p.id)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cc.color}`}>
                              Кат. {p.soilCategory}
                            </Badge>
                            <p className="text-sm font-medium text-slate-800 truncate">{p.profileName}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                            {p.avgShearVelocity && (
                              <span className="flex items-center gap-0.5">
                                <Waves className="h-3 w-3" /> Vs30={p.avgShearVelocity} м/с
                              </span>
                            )}
                            {p.amplificationFactor && (
                              <span className="flex items-center gap-0.5">
                                <BarChart3 className="h-3 w-3" /> ×{p.amplificationFactor.toFixed(2)}
                              </span>
                            )}
                            {p.groundwaterDepth && (
                              <span className="flex items-center gap-0.5">
                                <Droplets className="h-3 w-3" /> УГВ {p.groundwaterDepth} м
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 flex-shrink-0 mt-1 transition-transform ${isActive ? 'rotate-90 text-blue-500' : 'text-slate-300'}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Selected profile details */}
            {selected && (
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600" /> Разрез: {selected.profileName}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs"
                        onClick={() => exportProfileCsv(selected, layers)}
                      >
                        <Download className="h-3 w-3 mr-1" /> CSV
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 text-xs text-red-500 hover:text-red-700"
                        onClick={() => {
                          if (confirm('Удалить профиль?')) deleteMutation.mutate(selected.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Meta table */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {[
                      ['Категория', `${selected.soilCategory} (${catConfig(selected.soilCategory).vs})`],
                      ['Vs30', `${selected.avgShearVelocity ?? '—'} м/с`],
                      ['Усиление', selected.amplificationFactor ? `×${selected.amplificationFactor.toFixed(2)}` : '—'],
                      ['УГВ', selected.groundwaterDepth ? `${selected.groundwaterDepth} м` : '—'],
                      ['f₀', selected.dominantFrequency ? `${selected.dominantFrequency} Гц` : '—'],
                      ['Скважина', selected.boreholeDepth ? `${selected.boreholeDepth} м` : '—'],
                      ['Координаты', (selected.latitude && selected.longitude) ? `${parseFloat(String(selected.latitude)).toFixed(4)}°N, ${parseFloat(String(selected.longitude)).toFixed(4)}°E` : '—'],
                      ['Организация', selected.surveyOrganization ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-1">
                        <span className="text-slate-400 min-w-0 truncate">{k}:</span>
                        <span className="font-medium text-slate-700 truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                  {selected.description && (
                    <p className="text-xs text-slate-500 border-t border-slate-100 pt-2">{selected.description}</p>
                  )}

                  {/* Stratigraphic column */}
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 text-blue-600" />
                      Стратиграфическая колонка
                      <span className="text-slate-400 font-normal ml-1">(числа = Vs м/с)</span>
                    </p>
                    <Stratigraphy layers={[...layers].sort((a, b) => a.layerNumber - b.layerNumber)} />
                  </div>

                  {/* Layer table */}
                  {layers.length > 0 && (
                    <div className="border-t border-slate-100 pt-3 overflow-x-auto">
                      <p className="text-xs font-semibold text-slate-600 mb-1.5">Таблица слоёв</p>
                      <Table>
                        <TableHeader>
                          <TableRow className="text-[10px]">
                            <TableHead className="h-7 py-1 px-2">№</TableHead>
                            <TableHead className="h-7 py-1 px-2">Тип</TableHead>
                            <TableHead className="h-7 py-1 px-2">h, м</TableHead>
                            <TableHead className="h-7 py-1 px-2">Vs</TableHead>
                            <TableHead className="h-7 py-1 px-2">Vp</TableHead>
                            <TableHead className="h-7 py-1 px-2">ρ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...layers].sort((a, b) => a.layerNumber - b.layerNumber).map(l => (
                            <TableRow key={l.id} className="text-[11px]">
                              <TableCell className="py-1 px-2">{l.layerNumber}</TableCell>
                              <TableCell className="py-1 px-2">
                                <span className="flex items-center gap-1">
                                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 inline-block" style={{ background: soilTypeColor(l.soilType) }} />
                                  {soilTypeLabel(l.soilType)}
                                </span>
                              </TableCell>
                              <TableCell className="py-1 px-2">{l.thickness}</TableCell>
                              <TableCell className="py-1 px-2">{l.shearVelocity}</TableCell>
                              <TableCell className="py-1 px-2">{l.compressionalVelocity ?? '—'}</TableCell>
                              <TableCell className="py-1 px-2">{l.density ?? '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right panel: map ── */}
          <div className="xl:col-span-3 space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Карта грунтовых условий — г. Иркутск
                  <span className="ml-auto text-[11px] text-slate-400 font-normal">
                    {profiles.filter(p => p.latitude && p.longitude).length} точек на карте
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-lg overflow-hidden border border-slate-200" style={{ height: 480 }}>
                  <SoilMap
                    profiles={filteredProfiles.filter(p => p.latitude && p.longitude)}
                    infraObjects={infraObjects}
                    selected={selectedId}
                    onSelect={id => { setSelectedId(prev => prev === id ? null : id); setInfraLookup(null); }}
                    onInfraClick={handleInfraClick}
                  />
                </div>

                {/* Infrastructure object lookup result */}
                {infraLookup && (
                  <div className={`mt-2 rounded-lg border p-3 text-xs ${infraLookup.soil ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-700 truncate">🏗 {infraLookup.obj.name}</p>
                        <p className="text-slate-500 mt-0.5">
                          {infraLookup.obj.objectType} · {infraLookup.obj.district ?? ''}
                          {infraLookup.obj.seismicCategory && <> · Кат. сейсмост.: <b>{infraLookup.obj.seismicCategory}</b></>}
                          {infraLookup.obj.designIntensity && <> · {infraLookup.obj.designIntensity} балл</>}
                        </p>
                        {infraLookup.soil ? (
                          <p className="mt-1 text-indigo-700">
                            Ближайший грунтовый разрез: <b>{infraLookup.soil.profileName}</b>
                            {' '}· Кат. <b>{infraLookup.soil.soilCategory}</b>
                            {infraLookup.soil.avgShearVelocity ? ` · Vs30=${infraLookup.soil.avgShearVelocity} м/с` : ''}
                            {infraLookup.soil.amplificationFactor ? ` · Усиление ×${parseFloat(String(infraLookup.soil.amplificationFactor)).toFixed(2)}` : ''}
                          </p>
                        ) : (
                          <p className="mt-1 text-amber-600">Грунтовый разрез вблизи объекта не найден</p>
                        )}
                      </div>
                      <button
                        className="text-slate-300 hover:text-slate-500 flex-shrink-0"
                        onClick={() => setInfraLookup(null)}
                      ><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}

                {/* Map legend */}
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                  {Object.entries(SOIL_CAT_CONFIG).map(([k, v]) => (
                    <span key={k} className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ background: v.markerColor }} />
                      Кат. {k} — {v.vs}
                    </span>
                  ))}
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ background: '#6366f1', opacity: 0.6 }} />
                    Объекты инфраструктуры (нажмите для поиска грунта)
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Soil type legend card */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-500" />
                  Категории грунтов по СП 14.13330.2018
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(SOIL_CAT_CONFIG).map(([k, v]) => (
                    <div key={k} className={`rounded-lg border p-3 ${v.color}`}>
                      <p className="text-xs font-semibold">{v.label}</p>
                      <p className="text-[11px] mt-0.5">{v.vs}</p>
                      <p className="text-[11px] mt-0.5">
                        Усиление: ×{k === 'I' ? '1.0' : k === 'II' ? '1.2' : k === 'III' ? '1.5' : '2.0'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-semibold text-slate-600 mb-2">Типы пород (цвета на колонке)</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SOIL_TYPE_CONFIG).map(([k, v]) => (
                      <span key={k} className="flex items-center gap-1 text-[11px] text-slate-600">
                        <span className="w-3 h-3 rounded-sm" style={{ background: v.color }} />
                        {v.label}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AddProfileDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
};

export default SoilDatabase;
