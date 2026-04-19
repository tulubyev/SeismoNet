import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map as MapIcon, Search, MapPin, Layers, Shield, Calendar, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import type { InfrastructureObject, Station, ObjectCategory, Developer } from '@shared/schema';

declare global {
  interface Window { L: any; }
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
  'Октябрьский',
  'Свердловский',
  'Ленинский',
  'Правобережный',
  'Иркутский район',
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
  const initializedRef = useRef(false);
  const markersRef     = useRef<any[]>([]);

  // Filter state — mirrors the filter on the InfrastructureObjects page
  const [search,             setSearch]             = useState('');
  const [districtFilter,     setDistrictFilter]     = useState('all');
  const [developerFilter,    setDeveloperFilter]    = useState('all');
  const [constructionFilter, setConstructionFilter] = useState('all');
  const [yearFrom,           setYearFrom]           = useState('');
  const [yearTo,             setYearTo]             = useState('');
  const [showStations,       setShowStations]       = useState(true);

  const { data: categories  = [] } = useQuery<ObjectCategory[]>({ queryKey: ['/api/object-categories'] });
  const { data: developers  = [] } = useQuery<Developer[]>({ queryKey: ['/api/developers'] });

  const catBySlug = useMemo(() => {
    const m = new Map<string, ObjectCategory>();
    categories.forEach(c => m.set(c.slug, c));
    return m;
  }, [categories]);

  const developerOptions = useMemo(() => {
    const names = new Set<string>();
    developers.forEach(d => names.add(d.name));
    objects.forEach(o => { if (o.developer) names.add(o.developer); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [developers, objects]);

  const filteredObjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return objects.filter(obj => {
      const matchSearch = q === '' ||
        obj.name.toLowerCase().includes(q) ||
        (obj.address ?? '').toLowerCase().includes(q) ||
        (obj.objectId ?? '').toLowerCase().includes(q);
      const matchDistrict     = districtFilter     === 'all' || (obj.district          ?? '') === districtFilter;
      const matchDeveloper    = developerFilter    === 'all' || (obj.developer         ?? '') === developerFilter;
      const matchConstruction = constructionFilter === 'all' || (obj.structuralSystem  ?? '') === constructionFilter;
      const yr = obj.constructionYear ?? 0;
      const matchYearFrom = yearFrom === '' || yr >= parseInt(yearFrom);
      const matchYearTo   = yearTo   === '' || yr <= parseInt(yearTo);
      return matchSearch && matchDistrict && matchDeveloper && matchConstruction && matchYearFrom && matchYearTo;
    });
  }, [objects, search, districtFilter, developerFilter, constructionFilter, yearFrom, yearTo]);

  const activeFilterCount = [
    districtFilter !== 'all',
    developerFilter !== 'all',
    constructionFilter !== 'all',
    yearFrom !== '',
    yearTo !== '',
    search !== '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearch(''); setDistrictFilter('all'); setDeveloperFilter('all');
    setConstructionFilter('all'); setYearFrom(''); setYearTo('');
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
        <div style="font-family: sans-serif; min-width: 180px;">
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
        </div>
      `);

      marker.addTo(mapRef.current);
      markersRef.current.push(marker);
    });

    if (showStations) {
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
  }, [filteredObjects, stations, showStations]);

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

  return (
    <Card className={`border-0 shadow-sm w-full ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-blue-600" />
          Карта объектов — г. Иркутск
          <span className="text-[10px] text-slate-400 font-normal ml-2">52.29°N, 104.30°E</span>
          <span className="ml-auto text-[11px] text-slate-500 font-normal">
            На карте: <span className="font-semibold text-blue-600">{filteredObjects.length}</span> из {objects.length}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">

        {/* ── Filter bar (mirrors the InfrastructureObjects page) ── */}
        <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/40">
          {/* Row 1: search + station toggle + reset */}
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
            <Button
              type="button"
              variant={showStations ? 'default' : 'outline'}
              size="sm"
              className="h-9 text-xs flex-shrink-0"
              onClick={() => setShowStations(v => !v)}
              data-testid="map-toggle-stations"
            >
              <Radio className="h-3.5 w-3.5 mr-1" />
              Сейсмостанции
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-500 hover:text-red-600 flex-shrink-0" onClick={resetFilters}>
                Сбросить ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Row 2: district + construction */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="h-9 text-sm" data-testid="map-select-district">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                <SelectValue placeholder="Район города" />
              </SelectTrigger>
              <SelectContent>
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
              <SelectContent>
                {constructionTypeOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 z-10 pointer-events-none" />
              <Select value={developerFilter} onValueChange={setDeveloperFilter}>
                <SelectTrigger className="pl-8 h-9 text-sm" data-testid="map-select-developer">
                  <SelectValue placeholder="Застройщик / подрядчик" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Все застройщики</SelectItem>
                  {developerOptions.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-slate-400">Нет данных</div>
                  )}
                  {developerOptions.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="с года"
                  value={yearFrom}
                  onChange={e => setYearFrom(e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                  className="pl-8 h-9 text-sm"
                  data-testid="map-input-year-from"
                />
              </div>
              <div className="relative flex-1">
                <Input
                  placeholder="по год"
                  value={yearTo}
                  onChange={e => setYearTo(e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                  className="pl-2 h-9 text-sm"
                  data-testid="map-input-year-to"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Map (full width) ── */}
        <div
          ref={wrapperRef}
          style={{
            resize: 'vertical',
            overflow: 'hidden',
            width: '100%',
            height: '560px',
            minHeight: '320px',
            maxHeight: '1000px',
          }}
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
          {categories.slice(0, 8).map(cat => (
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
      </CardContent>
    </Card>
  );
};

export default IrkutskMap;
