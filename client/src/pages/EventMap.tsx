import { FC, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSeismicData } from '@/hooks/useSeismicData';
import type { InfrastructureObject, Event as SeismicEvent } from '@shared/schema';
import { Building2, Radio, Activity, Layers, RefreshCw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

declare global { interface Window { L: any } }

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const IRKUTSK_CENTER: [number, number] = [52.285, 104.295];
const IRKUTSK_ZOOM = 12;

const OBJ_COLOR: Record<string, string> = {
  good: '#10b981', satisfactory: '#3b82f6', poor: '#f59e0b', critical: '#ef4444'
};
const OBJ_TYPE_LABELS: Record<string, string> = {
  residential:'Жилое', industrial:'Промышл.', bridge:'Мост',
  dam:'Плотина', hospital:'Больница', school:'Школа',
  admin:'Администр.', other:'Прочее'
};

const magColor = (m: number) => m >= 5 ? '#ef4444' : m >= 3 ? '#f59e0b' : m >= 1.5 ? '#6366f1' : '#94a3b8';
const magRadius = (m: number) => m >= 5 ? 22 : m >= 4 ? 17 : m >= 3 ? 13 : m >= 2 ? 9 : 6;

interface Layers {
  buildings: boolean;
  stations: boolean;
  events: boolean;
}

const IrkutskSeismicMap: FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const initRef = useRef(false);
  const markerGroupsRef = useRef<{ buildings: any[], stations: any[], events: any[] }>({
    buildings: [], stations: [], events: []
  });
  const [layers, setLayers] = useState<Layers>({ buildings: true, stations: true, events: true });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { stations, events } = useSeismicData();
  const { data: objects = [] } = useQuery<InfrastructureObject[]>({ queryKey: ['/api/infrastructure-objects'] });

  const clearGroup = (key: keyof typeof markerGroupsRef.current) => {
    markerGroupsRef.current[key].forEach(m => { try { m.remove(); } catch {} });
    markerGroupsRef.current[key] = [];
  };

  const renderBuildings = (visible: boolean) => {
    if (!mapRef.current || !window.L) return;
    clearGroup('buildings');
    if (!visible) return;

    objects.forEach(obj => {
      const lat = parseFloat(String(obj.latitude));
      const lng = parseFloat(String(obj.longitude));
      if (isNaN(lat) || isNaN(lng)) return;

      const color = obj.isMonitored ? (OBJ_COLOR[obj.technicalCondition ?? ''] ?? '#6366f1') : '#94a3b8';
      const m = window.L.circleMarker([lat, lng], {
        radius: obj.isMonitored ? 10 : 7,
        fillColor: color, color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.85
      });
      m.bindPopup(`
        <div style="font-family:sans-serif;min-width:190px">
          <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:4px">${esc(obj.name)}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:4px">${esc(obj.address)}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <span style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:10px">${esc(OBJ_TYPE_LABELS[obj.objectType] ?? obj.objectType)}</span>
            ${obj.seismicCategory ? `<span style="background:#fef3c7;padding:2px 6px;border-radius:4px;font-size:10px">Кат. ${esc(obj.seismicCategory)}</span>` : ''}
            ${obj.designIntensity ? `<span style="background:#ede9fe;padding:2px 6px;border-radius:4px;font-size:10px">${esc(String(obj.designIntensity))} балл.</span>` : ''}
          </div>
          <div style="margin-top:6px;font-size:11px">${obj.isMonitored
            ? '<span style="color:#10b981">&#9679; Под мониторингом</span>'
            : '<span style="color:#94a3b8">&#9675; Без мониторинга</span>'}</div>
        </div>
      `);
      m.addTo(mapRef.current);
      markerGroupsRef.current.buildings.push(m);
    });
  };

  const renderStations = (visible: boolean) => {
    if (!mapRef.current || !window.L) return;
    clearGroup('stations');
    if (!visible) return;

    stations.forEach(st => {
      const lat = parseFloat(String(st.latitude));
      const lng = parseFloat(String(st.longitude));
      if (isNaN(lat) || isNaN(lng)) return;

      const color = st.status === 'online' ? '#10b981' : st.status === 'degraded' ? '#f59e0b' : '#ef4444';
      const icon = window.L.divIcon({
        html: `<div style="width:20px;height:20px;background:${color};border:2.5px solid white;border-radius:4px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 5px rgba(0,0,0,.35);font-size:9px;color:white;font-weight:bold">S</div>`,
        iconSize: [20, 20], iconAnchor: [10, 10], className: ''
      });
      const marker = window.L.marker([lat, lng], { icon });
      const stLabel = st.status === 'online' ? 'Онлайн' : st.status === 'degraded' ? 'Деградация' : 'Офлайн';
      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:170px">
          <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:3px">${esc(st.name)}</div>
          <div style="font-size:11px;color:#64748b">${esc(st.stationId)}</div>
          <div style="margin-top:6px;font-size:11px"><span style="color:${color}">&#9679;</span> ${esc(stLabel)}</div>
          ${st.dataRate ? `<div style="font-size:11px;color:#64748b">${esc(String(st.dataRate))} sps</div>` : ''}
          ${st.batteryLevel != null ? `<div style="font-size:11px;color:#64748b">&#128267; ${esc(String(st.batteryLevel))}%</div>` : ''}
        </div>
      `);
      marker.addTo(mapRef.current);
      markerGroupsRef.current.stations.push(marker);
    });
  };

  const renderEvents = (visible: boolean) => {
    if (!mapRef.current || !window.L) return;
    clearGroup('events');
    if (!visible) return;

    const cutoff = Date.now() - 7 * 86_400_000;
    const recent = events.filter(e => new Date(e.timestamp).getTime() > cutoff);

    recent.forEach(ev => {
      const lat = parseFloat(String(ev.latitude));
      const lng = parseFloat(String(ev.longitude));
      if (isNaN(lat) || isNaN(lng)) return;

      const color = magColor(ev.magnitude);
      const m = window.L.circleMarker([lat, lng], {
        radius: magRadius(ev.magnitude),
        fillColor: color, color: '#fff', weight: 1.5, opacity: 1, fillOpacity: 0.65
      });
      const dt = new Date(ev.timestamp).toLocaleString('ru-RU', { dateStyle:'short', timeStyle:'short' });
      m.bindPopup(`
        <div style="font-family:sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:14px;color:${color};margin-bottom:4px">M ${ev.magnitude.toFixed(1)}</div>
          <div style="font-size:12px;font-weight:600;color:#1e293b;margin-bottom:3px">${esc(ev.region)}</div>
          ${ev.location ? `<div style="font-size:11px;color:#64748b;margin-bottom:3px">${esc(ev.location)}</div>` : ''}
          <div style="font-size:11px;color:#64748b">Глубина: ${esc(String(ev.depth))} км</div>
          <div style="font-size:11px;color:#64748b">${esc(dt)}</div>
        </div>
      `);
      m.addTo(mapRef.current);
      markerGroupsRef.current.events.push(m);
    });
  };

  const initMap = () => {
    if (!containerRef.current || !window.L || initRef.current) return;
    mapRef.current = window.L.map(containerRef.current, {
      center: IRKUTSK_CENTER, zoom: IRKUTSK_ZOOM, zoomControl: true, scrollWheelZoom: true
    });
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19
    }).addTo(mapRef.current);
    initRef.current = true;
    renderBuildings(layers.buildings);
    renderStations(layers.stations);
    renderEvents(layers.events);
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
    } else if (!initRef.current) {
      initMap();
    }
    return () => {
      if (mapRef.current) {
        clearGroup('buildings'); clearGroup('stations'); clearGroup('events');
        mapRef.current.remove(); mapRef.current = null; initRef.current = false;
      }
    };
  }, []);

  useEffect(() => { if (initRef.current) renderBuildings(layers.buildings); }, [objects, layers.buildings]);
  useEffect(() => { if (initRef.current) renderStations(layers.stations); }, [stations, layers.stations]);
  useEffect(() => { if (initRef.current) renderEvents(layers.events); }, [events, layers.events]);

  const toggleLayer = (key: keyof Layers) =>
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const recent7d = events.filter(e => Date.now() - new Date(e.timestamp).getTime() < 7 * 86_400_000);
  const monitored = objects.filter(o => o.isMonitored).length;
  const onlineStations = stations.filter(s => s.status === 'online').length;

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-700 flex-shrink-0">
        <div>
          <h1 className="text-base font-bold tracking-tight">Карта сейсмичности — г. Иркутск</h1>
          <p className="text-xs text-slate-400 mt-0.5">52.29°N, 104.30°E · OpenStreetMap</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-slate-300 border-slate-600 text-xs gap-1">
            <Building2 className="h-3 w-3" /> {monitored}/{objects.length} зд.
          </Badge>
          <Badge variant="outline" className="text-slate-300 border-slate-600 text-xs gap-1">
            <Radio className="h-3 w-3" /> {onlineStations}/{stations.length} ст.
          </Badge>
          <Badge variant="outline" className="text-slate-300 border-slate-600 text-xs gap-1">
            <Activity className="h-3 w-3" /> {recent7d.length} соб. 7д
          </Badge>
          <Button size="sm" variant="ghost" className="h-7 text-slate-400 hover:text-white"
            onClick={() => setLastUpdate(new Date())}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={containerRef} className="w-full h-full" />
        </div>

        {/* Right panel */}
        <div className="w-56 flex-shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col overflow-y-auto">
          {/* Layer toggles */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Слои</span>
            </div>
            <div className="space-y-2">
              {[
                { key: 'buildings' as const, icon: <Building2 className="h-3.5 w-3.5" />, label: 'Здания и объекты', color: 'bg-blue-500' },
                { key: 'stations'  as const, icon: <Radio      className="h-3.5 w-3.5" />, label: 'Сейсмостанции',   color: 'bg-emerald-500' },
                { key: 'events'    as const, icon: <Activity   className="h-3.5 w-3.5" />, label: 'События (7 дн.)', color: 'bg-orange-500' },
              ].map(({ key, icon, label, color }) => (
                <button key={key} onClick={() => toggleLayer(key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                    layers[key] ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}>
                  <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${layers[key] ? color : 'bg-slate-600'}`} />
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 border-b border-slate-700">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Легенда</div>

            <div className="text-[10px] text-slate-400 font-medium mb-1.5">Здания (состояние)</div>
            {[
              { color: 'bg-emerald-500', label: 'Хорошее' },
              { color: 'bg-blue-500',    label: 'Удовлетворительное' },
              { color: 'bg-amber-500',   label: 'Неудовлетворительное' },
              { color: 'bg-red-500',     label: 'Критическое' },
              { color: 'bg-slate-500',   label: 'Без мониторинга' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 py-0.5">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${color}`} />
                <span className="text-[10px] text-slate-400">{label}</span>
              </div>
            ))}

            <div className="text-[10px] text-slate-400 font-medium mt-3 mb-1.5">Событие (магнитуда)</div>
            {[
              { color: 'bg-slate-400',   label: '< 1.5' },
              { color: 'bg-indigo-500',  label: '1.5 – 3.0' },
              { color: 'bg-amber-500',   label: '3.0 – 5.0' },
              { color: 'bg-red-500',     label: '≥ 5.0' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 py-0.5">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${color}`} />
                <span className="text-[10px] text-slate-400">{label}</span>
              </div>
            ))}

            <div className="text-[10px] text-slate-400 font-medium mt-3 mb-1.5">Станции</div>
            {[
              { color: 'bg-emerald-500', label: 'Онлайн' },
              { color: 'bg-amber-500',   label: 'Деградация' },
              { color: 'bg-red-500',     label: 'Офлайн' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 py-0.5">
                <div className={`w-3 h-3 rounded flex-shrink-0 ${color}`} />
                <span className="text-[10px] text-slate-400">{label}</span>
              </div>
            ))}
          </div>

          {/* Recent events */}
          <div className="p-4 flex-1">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Последние события</div>
            <div className="space-y-2">
              {recent7d.slice(0, 8).map(ev => (
                <div key={ev.id} className="flex items-start gap-2 py-1.5 border-b border-slate-800 last:border-0">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: magColor(ev.magnitude) + '25', color: magColor(ev.magnitude) }}>
                    M{ev.magnitude.toFixed(1)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium text-slate-200 truncate">{ev.region}</div>
                    <div className="text-[9px] text-slate-500">
                      {new Date(ev.timestamp).toLocaleString('ru-RU', { dateStyle:'short', timeStyle:'short' })}
                    </div>
                    <div className="text-[9px] text-slate-500">H={ev.depth} км</div>
                  </div>
                </div>
              ))}
              {recent7d.length === 0 && (
                <div className="text-[11px] text-slate-500 text-center py-4">Нет событий за 7 дней</div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-700">
            <div className="text-[9px] text-slate-500 text-center">
              Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IrkutskSeismicMap;
