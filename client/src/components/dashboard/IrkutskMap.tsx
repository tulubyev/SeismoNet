import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Map as MapIcon, Search, MapPin, Layers, Radio,
  X, ExternalLink, Building2, Calendar, Shield,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, SlidersHorizontal
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import type { InfrastructureObject, Station, ObjectCategory, Developer, SensorInstallation, DeveloperObject } from '@shared/schema';
import { sp14K1Label, sp14K2Label } from '@/data/sp14-accelerograms';

declare global {
  interface Window { L: any; __mapOpenObj?: (id: number) => void; }
}

const esc = (s: string | null | undefined): string =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface IrkutskMapProps {
  objects: InfrastructureObject[];
  stations: Station[];
  className?: string;
}

const IRKUTSK_CENTER: [number, number] = [52.29, 104.30];
const IRKUTSK_ZOOM = 12;
const FALLBACK_CATEGORY_COLOR = '#6366f1';

const IRKUTSK_DISTRICTS = [
  'Октябрьский', 'Свердловский', 'Ленинский', 'Правобережный', 'Иркутский район',
];

const constructionTypeOptions = [
  { value: 'all',                 label: 'Все типы конструкций' },
  { value: 'monolithic',          label: 'Монолит' },
  { value: 'frame',               label: 'Каркас' },
  { value: 'brick',               label: 'Кирпич' },
  { value: 'panel',               label: 'Панельное' },
  { value: 'reinforced_concrete', label: 'Ж/Б каркас' },
  { value: 'steel',               label: 'Стальной каркас' },
  { value: 'masonry',             label: 'Кирпичная кладка' },
  { value: 'wood',                label: 'Деревянный' },
  { value: 'mixed',               label: 'Смешанная система' },
];

const structuralSystemLabel = (sys: string | null) => {
  const labels: Record<string, string> = {
    monolithic: 'Монолит', frame: 'Каркас', brick: 'Кирпич', panel: 'Панельное',
    reinforced_concrete: 'Ж/Б каркас', steel: 'Стальной каркас',
    masonry: 'Кирпичная кладка', wood: 'Деревянный', mixed: 'Смешанная система',
  };
  return sys ? (labels[sys] ?? sys) : '—';
};

const conditionInfo = (condition: string | null) => {
  switch (condition) {
    case 'good':         return { label: 'Хорошее',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> };
    case 'satisfactory': return { label: 'Удовл.',      cls: 'bg-blue-100 text-blue-700 border-blue-200',          icon: null };
    case 'poor':         return { label: 'Плохое',      cls: 'bg-amber-100 text-amber-700 border-amber-200',       icon: <AlertTriangle className="h-3 w-3" /> };
    case 'critical':     return { label: 'Критическое', cls: 'bg-red-100 text-red-700 border-red-200',             icon: <AlertTriangle className="h-3 w-3" /> };
    default:             return { label: 'Н/Д',         cls: 'bg-slate-100 text-slate-500',                        icon: null };
  }
};

const installationLocationLabel = (loc: string | null) => {
  const labels: Record<string, string> = {
    foundation: 'Фундамент', ground_floor: '1-й этаж',
    mid_floor: 'Средний этаж', roof: 'Кровля', free_field: 'Свободное поле',
  };
  return loc ? (labels[loc] ?? loc) : '—';
};

const stationColor = (status: string) => {
  switch (status) {
    case 'online':   return '#10b981';
    case 'degraded': return '#f59e0b';
    case 'offline':  return '#ef4444';
    default:         return '#94a3b8';
  }
};

const IrkutskMap: FC<IrkutskMapProps> = ({ objects, stations, className = '' }) => {
  const mapRef         = useRef<any>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const wrapperRef     = useRef<HTMLDivElement>(null);
  const detailRef      = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const markersRef     = useRef<any[]>([]);
  const objectsRef     = useRef<InfrastructureObject[]>([]);

  const [search,             setSearch]             = useState('');
  const [districtFilter,     setDistrictFilter]     = useState('all');
  const [complexFilter,      setComplexFilter]      = useState('all');
  const [constructionFilter, setConstructionFilter] = useState('all');
  const [selectedObj,        setSelectedObj]        = useState<InfrastructureObject | null>(null);
  const [filtersOpen,        setFiltersOpen]        = useState(false);

  const { data: categories = [] } = useQuery<ObjectCategory[]>({ queryKey: ['/api/object-categories'] });
  const { data: developers  = [] } = useQuery<Developer[]>({ queryKey: ['/api/developers'] });

  const { data: sensorInstallations = [] } = useQuery<SensorInstallation[]>({
    queryKey: ['/api/sensor-installations', selectedObj?.id],
    enabled: !!selectedObj,
  });

  const catBySlug = useMemo(() => {
    const m = new Map<string, ObjectCategory>();
    categories.forEach(c => m.set(c.slug, c));
    return m;
  }, [categories]);

  const allComplexes = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const dev of developers) {
      const items: DeveloperObject[] = [
        ...((Array.isArray(dev.completedObjects) ? dev.completedObjects : []) as DeveloperObject[]),
        ...((Array.isArray(dev.plannedObjects)   ? dev.plannedObjects   : []) as DeveloperObject[]),
      ];
      for (const item of items) {
        if (item?.name && !seen.has(item.name)) { seen.add(item.name); result.push(item.name); }
      }
    }
    return result.sort((a, b) => a.localeCompare(b, 'ru'));
  }, [developers]);

  const filteredObjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return objects.filter(obj => {
      const matchSearch = q === '' ||
        obj.name.toLowerCase().includes(q) ||
        (obj.address ?? '').toLowerCase().includes(q) ||
        (obj.objectId ?? '').toLowerCase().includes(q);
      const matchDistrict     = districtFilter     === 'all' || (obj.district         ?? '') === districtFilter;
      const matchConstruction = constructionFilter === 'all' || (obj.structuralSystem ?? '') === constructionFilter;
      const matchComplex      = complexFilter === 'all' || (() => {
        const needle = complexFilter.toLowerCase();
        return obj.name.toLowerCase().includes(needle) || (obj.address ?? '').toLowerCase().includes(needle);
      })();
      return matchSearch && matchDistrict && matchConstruction && matchComplex;
    });
  }, [objects, search, districtFilter, complexFilter, constructionFilter]);

  // Keep ref in sync to avoid stale closures in window function
  useEffect(() => { objectsRef.current = filteredObjects; }, [filteredObjects]);

  const activeFilterCount = [
    districtFilter !== 'all',
    complexFilter !== 'all',
    constructionFilter !== 'all',
    search !== '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearch(''); setDistrictFilter('all'); setComplexFilter('all'); setConstructionFilter('all');
  };

  const objectColor = (obj: InfrastructureObject): string => {
    if (!obj.isMonitored) return '#94a3b8';
    return catBySlug.get(obj.objectType)?.color || FALLBACK_CATEGORY_COLOR;
  };

  const clearMarkers = () => {
    markersRef.current.forEach(m => { try { m.remove(); } catch { /* */ } });
    markersRef.current = [];
  };

  const addMarkers = () => {
    if (!mapRef.current || !window.L) return;
    clearMarkers();

    filteredObjects.forEach(obj => {
      const lat = parseFloat(String(obj.latitude));
      const lng = parseFloat(String(obj.longitude));
      if (isNaN(lat) || isNaN(lng)) return;

      const color = objectColor(obj);
      const marker = window.L.circleMarker([lat, lng], {
        radius: obj.isMonitored ? 10 : 7,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      });

      const catLabel = catBySlug.get(obj.objectType)?.name || obj.objectType;
      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 200px;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #1e293b;">${esc(obj.name)}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">${esc(obj.address)}</div>
          <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
            <span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${esc(catLabel)}</span>
            ${obj.seismicCategory ? `<span style="background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Кат. ${esc(obj.seismicCategory)}</span>` : ''}
            ${obj.designIntensity ? `<span style="background: #ede9fe; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${esc(String(obj.designIntensity))} балл.</span>` : ''}
          </div>
          <div style="margin-top: 6px; font-size: 11px;">
            ${obj.isMonitored
              ? '<span style="color: #10b981;">&#9679; Под мониторингом</span>'
              : '<span style="color: #94a3b8;">&#9675; Без мониторинга</span>'}
          </div>
          ${obj.developer ? `<div style="margin-top: 4px; font-size: 10px; color: #64748b;">Застройщик: ${esc(obj.developer)}</div>` : ''}
          <button
            onclick="window.__mapOpenObj(${obj.id})"
            style="
              margin-top: 10px; width: 100%; padding: 6px 0;
              background: #2563eb; color: white; border: none;
              border-radius: 6px; font-size: 12px; font-weight: 600;
              cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;
            "
            onmouseover="this.style.background='#1d4ed8'"
            onmouseout="this.style.background='#2563eb'"
          >&#9432; Открыть объект</button>
        </div>
      `);

      marker.addTo(mapRef.current);
      markersRef.current.push(marker);
    });

    if (true) {
      stations.filter(s => s.stationId.startsWith('IRK-')).forEach(st => {
        const lat = parseFloat(String(st.latitude));
        const lng = parseFloat(String(st.longitude));
        if (isNaN(lat) || isNaN(lng)) return;

        const color = stationColor(st.status);
        const icon = window.L.divIcon({
          html: `<div style="
            width: 18px; height: 18px;
            background: ${color};
            border: 2px solid white;
            border-radius: 3px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 1px 4px rgba(0,0,0,.3);
            font-size: 9px; color: white; font-weight: bold;
          ">S</div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          className: ''
        });

        const marker = window.L.marker([lat, lng], { icon });
        const stStatus = st.status === 'online' ? 'Онлайн' : st.status === 'degraded' ? 'Деградация' : 'Офлайн';
        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 160px;">
            <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 4px;">${esc(st.name)}</div>
            <div style="font-size: 11px; color: #64748b;">${esc(st.stationId)}</div>
            <div style="margin-top: 6px; font-size: 11px;">
              <span style="color: ${color};">&#9679;</span>
              ${esc(stStatus)}${st.dataRate ? ` &middot; ${esc(String(st.dataRate))} sps` : ''}
            </div>
            ${st.batteryLevel != null ? `<div style="font-size: 11px; margin-top: 2px;">&#128267; ${esc(String(st.batteryLevel))}%</div>` : ''}
          </div>
        `);

        marker.addTo(mapRef.current);
        markersRef.current.push(marker);
      });
    }
  };

  const initMap = () => {
    if (!containerRef.current || !window.L || initializedRef.current) return;

    mapRef.current = window.L.map(containerRef.current, {
      center: IRKUTSK_CENTER,
      zoom: IRKUTSK_ZOOM,
      zoomControl: true,
      scrollWheelZoom: true
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(mapRef.current);

    initializedRef.current = true;
    addMarkers();
  };

  // Register global window handler (once, reads from ref to avoid stale closure)
  useEffect(() => {
    window.__mapOpenObj = (id: number) => {
      const obj = objectsRef.current.find(o => o.id === id) ?? null;
      setSelectedObj(obj);
      if (mapRef.current) mapRef.current.closePopup();
      // Scroll to detail panel
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    };
    return () => { delete window.__mapOpenObj; };
  }, []);

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
    } else if (!initializedRef.current) {
      initMap();
    }

    return () => {
      if (mapRef.current) {
        clearMarkers();
        mapRef.current.remove();
        mapRef.current = null;
        initializedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initializedRef.current) addMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredObjects, stations]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        try { mapRef.current.invalidateSize(); } catch { /* */ }
      }
    });
    ro.observe(containerRef.current);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Keep selectedObj in sync if filteredObjects change (e.g. after filter reset)
  useEffect(() => {
    if (selectedObj) {
      const updated = objects.find(o => o.id === selectedObj.id);
      setSelectedObj(updated ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects]);

  const cond = conditionInfo(selectedObj?.technicalCondition ?? null);

  return (
    <Card className={`border-0 shadow-sm w-full ${className}`}>
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span>Карта объектов — г. Иркутск</span>
          <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">52.29°N, 104.30°E</span>
          <span className="text-[11px] text-slate-500 font-normal ml-auto">
            На карте: <span className="font-semibold text-blue-600">{filteredObjects.length}</span>
            <span className="text-slate-400"> / {objects.length}</span>
          </span>
          {activeFilterCount > 0 && !filtersOpen && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-blue-100 text-blue-700 border-0">
              {activeFilterCount} фильтр{activeFilterCount === 1 ? '' : 'а'}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 ml-1 text-slate-400 hover:text-slate-700 flex-shrink-0"
            onClick={() => setFiltersOpen(v => !v)}
            title={filtersOpen ? 'Скрыть фильтры' : 'Показать фильтры'}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {filtersOpen
              ? <ChevronUp   className="h-3 w-3 ml-0.5" />
              : <ChevronDown className="h-3 w-3 ml-0.5" />}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0 px-4 pb-4 space-y-3">

        {/* Collapsible filter bar */}
        {filtersOpen && (
          <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/40">
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Поиск по названию, адресу, ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                  data-testid="map-input-search"
                />
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-500 hover:text-red-600 flex-shrink-0" onClick={resetFilters}>
                  Сбросить ({activeFilterCount})
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger className="h-9 text-sm" data-testid="map-select-district">
                  <MapPin className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                  <SelectValue placeholder="Район города" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 1001 }}>
                  <SelectItem value="all">Все районы</SelectItem>
                  {IRKUTSK_DISTRICTS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={constructionFilter} onValueChange={setConstructionFilter}>
                <SelectTrigger className="h-9 text-sm" data-testid="map-select-construction">
                  <Layers className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                  <SelectValue placeholder="Тип конструкции" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 1001 }}>
                  {constructionTypeOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={complexFilter} onValueChange={setComplexFilter}>
                <SelectTrigger className="h-9 text-sm" data-testid="map-select-complex">
                  <Building2 className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                  <SelectValue placeholder="ЖК и проекты" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 1001 }} className="max-h-72">
                  <SelectItem value="all">Все ЖК и проекты</SelectItem>
                  {allComplexes.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Map — full width, shifts down when filters open */}
        <div
          ref={wrapperRef}
          style={{ resize: 'vertical', overflow: 'hidden', width: '100%', height: '560px', minHeight: '320px', maxHeight: '1000px' }}
          className="rounded-lg border border-slate-200"
          data-testid="map-resize-wrapper"
        >
          <div
            ref={containerRef}
            className="rounded-lg overflow-hidden"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
          {categories
            .filter(cat => !['industrial', 'bridge', 'pipeline', 'dam', 'school'].includes(cat.slug))
            .map(cat => (
              <span key={cat.slug} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ background: cat.color }} />
                {cat.name}
              </span>
            ))}
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-slate-400" /> Без датчиков
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500" /> Станция онлайн
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500" /> Деградация
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500" /> Офлайн
          </span>
        </div>

        {/* ── Object detail panel ── */}
        {selectedObj && (
          <div ref={detailRef} className="border border-blue-200 rounded-xl bg-white shadow-sm overflow-hidden">

            {/* Detail header */}
            <div className="flex items-start justify-between gap-3 px-4 py-3 bg-blue-50 border-b border-blue-100">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-800 leading-tight">{selectedObj.name}</h3>
                  {selectedObj.isMonitored
                    ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] h-5">Под мониторингом</Badge>
                    : <Badge variant="outline" className="text-[10px] h-5 text-slate-500">Без мониторинга</Badge>}
                </div>
                {selectedObj.address && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />{selectedObj.address}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href="/infrastructure">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-100">
                    <ExternalLink className="h-3 w-3" />
                    В раздел
                  </Button>
                </Link>
                <button
                  onClick={() => setSelectedObj(null)}
                  className="p-1 rounded hover:bg-blue-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Detail tabs */}
            <div className="p-4">
              <Tabs defaultValue="params">
                <TabsList className="w-full mb-4 h-8">
                  <TabsTrigger value="params"  className="text-xs flex-1">Параметры</TabsTrigger>
                  <TabsTrigger value="sensors" className="text-xs flex-1">
                    Датчики {sensorInstallations.length > 0 ? `(${sensorInstallations.length})` : ''}
                  </TabsTrigger>
                </TabsList>

                {/* Parameters */}
                <TabsContent value="params" className="mt-0 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Тип объекта</p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">
                        {categories.find(c => c.slug === selectedObj.objectType)?.name || selectedObj.objectType}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Год постройки</p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {selectedObj.constructionYear ?? 'Н/Д'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Этажность</p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">
                        {selectedObj.floors ? `${selectedObj.floors} эт.` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Конструктив</p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">{structuralSystemLabel(selectedObj.structuralSystem)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Кат. грунта (СП14)</p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">
                        {selectedObj.seismicCategory ? `Категория ${selectedObj.seismicCategory}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Расч. интенсивность</p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5 flex items-center gap-1">
                        <Shield className="h-3 w-3 text-slate-400" />
                        {selectedObj.designIntensity ? `${selectedObj.designIntensity} балл.` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Тип фундамента</p>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">{selectedObj.foundationType ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Тех. состояние</p>
                      <div className="mt-0.5">
                        <Badge className={`text-[10px] h-5 flex items-center gap-1 w-fit ${cond.cls}`}>
                          {cond.icon}{cond.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* K1/K2 */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Коэфф. нагрузки (СП14)</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <div>
                        <p className="text-[10px] text-slate-400">K₁ (уровень отв.)</p>
                        <p className="text-xs font-medium text-slate-700 mt-0.5">{sp14K1Label(selectedObj.k1Key)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">K₂ (конструктив)</p>
                        <p className="text-xs font-medium text-slate-700 mt-0.5">{sp14K2Label(selectedObj.k2Key)}</p>
                      </div>
                    </div>
                  </div>

                  {selectedObj.developer && (
                    <p className="text-xs text-slate-500">Застройщик: <span className="font-medium text-slate-700">{selectedObj.developer}</span></p>
                  )}
                </TabsContent>

                {/* Sensors */}
                <TabsContent value="sensors" className="mt-0">
                  {sensorInstallations.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Radio className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Датчики не установлены</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sensorInstallations.map(inst => (
                        <div key={inst.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-800">{inst.stationId}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {installationLocationLabel(inst.installationLocation)}
                              {inst.floor ? `, ${inst.floor} эт.` : ''}
                              {inst.measurementAxes ? ` · ${inst.measurementAxes}` : ''}
                            </p>
                            {inst.sensorType && (
                              <p className="text-[10px] text-slate-400">{inst.sensorType}</p>
                            )}
                          </div>
                          <Badge
                            className={`text-[10px] h-5 ml-3 flex-shrink-0 ${inst.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {inst.isActive ? 'Активен' : 'Откл.'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default IrkutskMap;
