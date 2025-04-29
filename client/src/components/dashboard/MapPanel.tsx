import { FC, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Station, Event } from '@shared/schema';
import { Filter, Maximize } from 'lucide-react';

interface MapPanelProps {
  stations: Station[];
  events: Event[];
  className?: string;
  fullscreen?: boolean;
}

declare global {
  interface Window {
    L: any;
  }
}

const MapPanel: FC<MapPanelProps> = ({ stations, events, className = '', fullscreen = false }) => {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitializedRef = useRef(false);
  
  useEffect(() => {
    // Check if Leaflet is available
    if (!window.L) {
      // Load Leaflet if not available
      const linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(linkEl);
      
      const scriptEl = document.createElement('script');
      scriptEl.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js';
      scriptEl.onload = initializeMap;
      document.head.appendChild(scriptEl);
    } else if (!mapInitializedRef.current) {
      initializeMap();
    } else {
      updateMap();
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        mapInitializedRef.current = false;
      }
    };
  }, []);
  
  // Update map when stations or events change
  useEffect(() => {
    if (mapInitializedRef.current) {
      updateMap();
    }
  }, [stations, events]);
  
  const initializeMap = () => {
    if (!mapContainerRef.current || !window.L || mapInitializedRef.current) return;
    
    // Create map
    mapRef.current = window.L.map(mapContainerRef.current).setView([20, 0], 2);
    
    // Add tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);
    
    mapInitializedRef.current = true;
    
    // Add markers
    updateMap();
  };
  
  const updateMap = () => {
    if (!mapRef.current || !window.L) return;
    
    // Clear existing markers
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof window.L.Marker || layer instanceof window.L.CircleMarker) {
        mapRef.current.removeLayer(layer);
      }
    });
    
    // Add station markers
    stations.forEach(station => {
      const lat = parseFloat(station.latitude.toString());
      const lng = parseFloat(station.longitude.toString());
      
      if (isNaN(lat) || isNaN(lng)) return;
      
      const color = station.status === "online" ? "#6366f1" : 
                    station.status === "degraded" ? "#eab308" : "#ef4444";
      
      const marker = window.L.circleMarker([lat, lng], {
        radius: 5,
        fillColor: color,
        color: "#fff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(mapRef.current);
      
      marker.bindTooltip(station.stationId);
    });
    
    // Add event markers
    events.forEach(event => {
      const lat = parseFloat(event.latitude.toString());
      const lng = parseFloat(event.longitude.toString());
      
      if (isNaN(lat) || isNaN(lng)) return;
      
      let color, radius;
      
      if (event.magnitude >= 5.0) {
        color = "#ef4444"; // Major (red)
        radius = 15;
      } else if (event.magnitude >= 3.0) {
        color = "#eab308"; // Moderate (yellow)
        radius = 10;
      } else {
        color = "#6366f1"; // Minor (blue)
        radius = 7;
      }
      
      const marker = window.L.circleMarker([lat, lng], {
        radius: radius,
        fillColor: color,
        color: "#fff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.6
      }).addTo(mapRef.current);
      
      marker.bindTooltip(`${event.region} - Magnitude ${event.magnitude.toFixed(1)}`);
    });
  };
  
  return (
    <Card className={`${className}`}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-dark">Seismic Activity Map</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs bg-slate-light rounded-md hover:bg-slate-light hover:bg-opacity-70">
              <Filter className="h-4 w-4 inline mr-1" /> Filter
            </button>
            <button className="px-3 py-1 text-xs bg-primary text-white rounded-md hover:bg-primary-dark">
              <Maximize className="h-4 w-4 inline mr-1" /> Full View
            </button>
          </div>
        </div>
        
        <div 
          ref={mapContainerRef}
          className={`w-full ${fullscreen ? 'h-[calc(100vh-220px)]' : 'h-[500px]'} rounded-md`}
        ></div>
        
        <div className="flex justify-between mt-4 text-sm">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-status-info mr-1"></span>
            <span className="mr-3">Station</span>
            
            <span className="inline-block w-3 h-3 rounded-full bg-status-warning mr-1"></span>
            <span className="mr-3">Minor Event</span>
            
            <span className="inline-block w-3 h-3 rounded-full bg-status-danger mr-1"></span>
            <span>Major Event</span>
          </div>
          <div>
            <span className="text-xs text-slate-DEFAULT">Last updated: <span className="font-medium">3 min ago</span></span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MapPanel;
