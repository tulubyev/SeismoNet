import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map as MapIcon, Layers as LayersIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { InfrastructureObject, Station, ObjectCategory } from '@shared/schema';

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

  const [showStations, setShowStations] = useState(true);
  const [showLegend,   setShowLegend]   = useState(true);
  const [enabledCats,  setEnabledCats]  = useState<Set<string>>(new Set());
  const [enabledInit,  setEnabledInit]  = useState(false);

  const { data: categories = [] } = useQuery<ObjectCategory[]>({
    queryKey: ['/api/object-categories'],
  });

  // Initialise enabled categories to "all on" once categories load
  useEffect(() => {
    if (!enabledInit && categories.length) {
      setEnabledCats(new Set(categories.map(c => c.slug)));
      setEnabledInit(true);
    }
  }, [categories, enabledInit]);

  const catBySlug = useMemo(() => {
    const m = new Map<string, ObjectCategory>();
    categories.forEach(c => m.set(c.slug, c));
    return m;
  }, [categories]);

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

    objects.forEach(obj => {
      if (enabledInit && !enabledCats.has(obj.objectType)) return;

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

  // Load Leaflet & init
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

  // Re-render markers when data / filters change
  useEffect(() => {
    if (initializedRef.current) addMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, stations, enabledCats, enabledInit, showStations, categories]);

  // Watch container resize → invalidateSize so Leaflet repaints tiles
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

  const toggleCat = (slug: string) => {
    setEnabledCats(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };
  const allOn  = () => setEnabledCats(new Set(categories.map(c => c.slug)));
  const allOff = () => setEnabledCats(new Set());

  return (
    <Card className={`border-0 shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-blue-600" />
          Карта объектов — г. Иркутск
          <span className="text-[10px] text-slate-400 font-normal ml-auto">
            52.29°N, 104.30°E
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-3">
          {/* Layer panel */}
          <div className="w-48 flex-shrink-0 border border-slate-200 rounded-lg p-2 bg-slate-50/40 max-h-[420px] overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <LayersIcon className="h-3 w-3" /> Слои
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={allOn}  data-testid="btn-layers-all-on">Все</Button>
                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={allOff} data-testid="btn-layers-all-off">Снять</Button>
              </div>
            </div>

            <div className="space-y-1">
              {categories.map(cat => {
                const checked = enabledCats.has(cat.slug);
                return (
                  <label
                    key={cat.slug}
                    className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-white cursor-pointer"
                    data-testid={`layer-toggle-${cat.slug}`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleCat(cat.slug)}
                      className="h-3.5 w-3.5"
                    />
                    <span
                      className="inline-block w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                      style={{ background: cat.color }}
                    />
                    <span className="text-[11px] text-slate-700 truncate">{cat.name}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-white cursor-pointer">
                <Checkbox
                  checked={showStations}
                  onCheckedChange={v => setShowStations(!!v)}
                  className="h-3.5 w-3.5"
                />
                <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500 flex-shrink-0" />
                <span className="text-[11px] text-slate-700">Сейсмостанции</span>
              </label>
            </div>
          </div>

          {/* Map container — resizable both axes */}
          <div className="flex-1 min-w-0">
            <div
              ref={wrapperRef}
              style={{
                resize: 'both',
                overflow: 'hidden',
                width: '100%',
                height: '420px',
                minHeight: '260px',
                minWidth: '300px',
                maxHeight: '900px',
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

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
              <button
                type="button"
                onClick={() => setShowLegend(v => !v)}
                className="flex items-center gap-1 hover:text-slate-600"
              >
                {showLegend ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Состояние / легенда
              </button>
              <span>Перетащите правый-нижний угол карты для изменения размера ↔ ↕</span>
            </div>

            {showLegend && (
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-slate-400" />Без датчиков
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-emerald-500" />Станция онлайн
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-amber-500" />Деградация
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500" />Офлайн
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IrkutskMap;
