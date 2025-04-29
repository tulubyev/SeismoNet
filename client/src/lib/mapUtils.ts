import L from 'leaflet';
import { SeismicEvent, Station } from '@shared/schema';

// Map markers and layers
let map: L.Map | null = null;
let stations: L.LayerGroup | null = null;
let events: L.LayerGroup | null = null;

/**
 * Initialize the map and return the map instance
 */
export function initializeMap(elementId: string): L.Map {
  if (map !== null) return map;
  
  map = L.map(elementId).setView([20, 0], 2);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  
  stations = L.layerGroup().addTo(map);
  events = L.layerGroup().addTo(map);
  
  return map;
}

/**
 * Plot stations on the map
 */
export function plotStations(stationData: Station[]) {
  if (!map || !stations) return;
  
  stations.clearLayers();
  
  stationData.forEach(station => {
    let color = '#6366f1'; // Default info color
    
    if (station.status === 'degraded') {
      color = '#eab308'; // Warning color
    } else if (station.status === 'offline') {
      color = '#ef4444'; // Danger color
    }
    
    const marker = L.circleMarker([station.latitude, station.longitude], {
      radius: 5,
      fillColor: color,
      color: '#fff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(stations as L.LayerGroup);
    
    marker.bindTooltip(`
      <div class="text-sm">
        <div class="font-bold">${station.stationCode}</div>
        <div>${station.name}</div>
        <div class="text-xs text-gray-600">${station.status}</div>
      </div>
    `);
  });
}

/**
 * Plot seismic events on the map
 */
export function plotEvents(eventData: SeismicEvent[]) {
  if (!map || !events) return;
  
  events.clearLayers();
  
  eventData.forEach(event => {
    let color = '#6366f1'; // Default info color
    let radius = 7;
    
    if (event.magnitude >= 5.0) {
      color = '#ef4444'; // Danger color
      radius = 15;
    } else if (event.magnitude >= 3.0) {
      color = '#eab308'; // Warning color
      radius = 10;
    }
    
    const marker = L.circleMarker([event.latitude, event.longitude], {
      radius: radius,
      fillColor: color,
      color: '#fff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.6
    }).addTo(events as L.LayerGroup);
    
    const eventTime = new Date(event.eventTime).toLocaleString();
    
    marker.bindTooltip(`
      <div class="text-sm">
        <div class="font-bold">${event.description || event.region}</div>
        <div>Magnitude: ${event.magnitude.toFixed(1)}</div>
        <div>Depth: ${event.depth.toFixed(1)} km</div>
        <div class="text-xs text-gray-600">${eventTime}</div>
      </div>
    `);
  });
}

/**
 * Focus the map on a specific event
 */
export function focusOnEvent(event: SeismicEvent) {
  if (!map) return;
  
  map.setView([event.latitude, event.longitude], 6);
}

/**
 * Focus the map on a specific station
 */
export function focusOnStation(station: Station) {
  if (!map) return;
  
  map.setView([station.latitude, station.longitude], 6);
}

/**
 * Clean up map resources
 */
export function cleanupMap() {
  if (map) {
    map.remove();
    map = null;
    stations = null;
    events = null;
  }
}
