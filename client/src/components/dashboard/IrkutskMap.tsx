import { FC, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map } from 'lucide-react';
import type { InfrastructureObject, Station } from '@shared/schema';

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

const objectColor = (obj: InfrastructureObject) => {
  if (!obj.isMonitored) return '#94a3b8';
  switch (obj.technicalCondition) {
    case 'good': return '#10b981';
    case 'satisfactory': return '#3b82f6';
    case 'poor': return '#f59e0b';
    case 'critical': return '#ef4444';
    default: return '#6366f1';
  }
};

const stationColor = (status: string) => {
  switch (status) {
    case 'online': return '#10b981';
    case 'degraded': return '#f59e0b';
    case 'offline': return '#ef4444';
    default: return '#94a3b8';
  }
};

const objectTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    residential: 'Жилое', industrial: 'Промышл.', bridge: 'Мост',
    dam: 'Плотина', hospital: 'Больница', school: 'Школа',
    admin: 'Административное', other: 'Прочее'
  };
  return labels[type] || type;
};

const IrkutskMap: FC<IrkutskMapProps> = ({ objects, stations, className = '' }) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const markersRef = useRef<any[]>([]);

  const clearMarkers = () => {
    markersRef.current.forEach(m => {
      try { m.remove(); } catch { /* already removed */ }
    });
    markersRef.current = [];
  };

  const addMarkers = () => {
    if (!mapRef.current || !window.L) return;
    clearMarkers();

    // Infrastructure object markers (circle markers)
    objects.forEach(obj => {
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

      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 180px;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #1e293b;">${esc(obj.name)}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">${esc(obj.address)}</div>
          <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
            <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${esc(objectTypeLabel(obj.objectType))}</span>
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

    // Station markers (different icon)
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
  }, []);

  useEffect(() => {
    if (initializedRef.current) {
      addMarkers();
    }
  }, [objects, stations]);

  return (
    <Card className={`border-0 shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Map className="h-4 w-4 text-blue-600" />
          Карта объектов — г. Иркутск
          <span className="text-[10px] text-slate-400 font-normal ml-auto">
            52.29°N, 104.30°E
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div ref={containerRef} className="rounded-lg overflow-hidden" style={{ height: '320px' }} />
        <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />Мониторинг (норма)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />Мониторинг (удовл.)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-slate-400" />Без датчиков
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-500 flex-shrink-0" />Станция
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default IrkutskMap;
