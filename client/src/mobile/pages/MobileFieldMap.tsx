import { FC, useEffect, useState, useRef } from 'react';
import { useSeismicData } from '@/hooks/useSeismicData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Map,
  LocateFixed,
  ZoomIn,
  ZoomOut,
  Layers,
  Activity,
  RadioTower,
  AlertCircle,
  XCircle
} from 'lucide-react';

const MobileFieldMap: FC = () => {
  const { stations, events, selectedEvent, selectEvent } = useSeismicData();
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapType, setMapType] = useState<'terrain' | 'satellite'>('terrain');
  const [showStations, setShowStations] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [eventInfo, setEventInfo] = useState<{visible: boolean, event: any}>(
    {visible: false, event: null}
  );
  const [stationInfo, setStationInfo] = useState<{visible: boolean, station: any}>(
    {visible: false, station: null}
  );
  
  // Simulated map view for mockup
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);
  
  const handleStationClick = (station: any) => {
    setStationInfo({visible: true, station});
    setEventInfo({visible: false, event: null});
  };
  
  const handleEventClick = (event: any) => {
    setEventInfo({visible: true, event});
    setStationInfo({visible: false, station: null});
    selectEvent(event.eventId);
  };
  
  const handleCloseInfo = () => {
    setEventInfo({visible: false, event: null});
    setStationInfo({visible: false, station: null});
  };
  
  const getStationMarkers = () => {
    return stations.map((station, index) => (
      <div 
        key={station.id}
        className={`absolute w-4 h-4 rounded-full border-2 border-white cursor-pointer
          ${station.status === 'online' ? 'bg-green-500' : 
            station.status === 'warning' ? 'bg-yellow-500' :
            station.status === 'maintenance' ? 'bg-blue-500' : 'bg-red-500'}
        `}
        style={{
          // Place markers at random positions for mockup
          // In a real implementation, use proper geo-positioning
          left: `${25 + (index * 15) % 60}%`,
          top: `${20 + (index * 12) % 40}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: 10
        }}
        onClick={() => handleStationClick(station)}
      />
    ));
  };
  
  const getEventMarkers = () => {
    return events.slice(0, 10).map((event, index) => (
      <div 
        key={event.eventId}
        className="absolute cursor-pointer"
        style={{
          // Place markers at random positions for mockup
          left: `${35 + (index * 9) % 50}%`,
          top: `${30 + (index * 8) % 35}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: event.eventId === selectedEvent?.eventId ? 20 : 10
        }}
        onClick={() => handleEventClick(event)}
      >
        <div className={`w-${Math.min(Math.ceil(event.magnitude), 6) * 2} h-${Math.min(Math.ceil(event.magnitude), 6) * 2} rounded-full bg-red-500 bg-opacity-30 animate-ping absolute`} />
        <div className={`w-${Math.min(Math.ceil(event.magnitude), 6)} h-${Math.min(Math.ceil(event.magnitude), 6)} rounded-full bg-red-500 relative`} />
      </div>
    ));
  };
  
  return (
    <div className="relative h-[calc(100vh-8rem)]">
      {/* Map Container */}
      <div 
        ref={mapContainerRef}
        className={`w-full h-full ${mapType === 'terrain' ? 'bg-blue-50' : 'bg-gray-800'}`}
        style={{
          backgroundImage: mapType === 'terrain' 
            ? 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23dbeafe\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' 
            : 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23374151\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")'
        }}
      >
        {/* Show stations */}
        {showStations && getStationMarkers()}
        
        {/* Show events */}
        {showEvents && getEventMarkers()}
        
        {/* User location */}
        {userLocation && (
          <div 
            className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white"
            style={{
              // For mockup, place at center
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 20
            }}
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full opacity-30 absolute -left-2 -top-2 animate-pulse"></div>
          </div>
        )}
      </div>
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => setMapType(mapType === 'terrain' ? 'satellite' : 'terrain')}>
          <Layers className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
          <LocateFixed className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Layer toggles */}
      <div className="absolute bottom-4 left-4 flex space-x-2">
        <Button 
          size="sm" 
          variant={showStations ? "default" : "outline"}
          className="h-8 text-xs px-2 flex items-center"
          onClick={() => setShowStations(!showStations)}
        >
          <RadioTower className="h-3 w-3 mr-1" />
          Stations
        </Button>
        <Button 
          size="sm" 
          variant={showEvents ? "default" : "outline"}
          className="h-8 text-xs px-2 flex items-center"
          onClick={() => setShowEvents(!showEvents)}
        >
          <Activity className="h-3 w-3 mr-1" />
          Events
        </Button>
      </div>
      
      {/* Event Info */}
      {eventInfo.visible && eventInfo.event && (
        <Card className="absolute left-4 top-4 w-[calc(100%-2rem)] max-w-xs">
          <CardContent className="p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium flex items-center">
                  <Activity className="h-4 w-4 mr-1 text-red-500" />
                  Magnitude {eventInfo.event.magnitude.toFixed(1)}
                </h3>
                <p className="text-xs text-muted-foreground">{eventInfo.event.location || 'Unknown location'}</p>
              </div>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCloseInfo}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Time</span>
                <span>{new Date(eventInfo.event.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Region</span>
                <span>{eventInfo.event.region}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Depth</span>
                <span>{eventInfo.event.depth} km</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize">{eventInfo.event.status}</span>
              </div>
            </div>
            
            <Badge 
              variant={
                eventInfo.event.magnitude >= 5.0 ? 'destructive' : 
                eventInfo.event.magnitude >= 3.0 ? 'default' : 'outline'
              }
              className="text-xs"
            >
              {eventInfo.event.magnitude >= 5.0 ? 'Major' : 
               eventInfo.event.magnitude >= 3.0 ? 'Moderate' : 'Minor'} 
              Event
            </Badge>
          </CardContent>
        </Card>
      )}
      
      {/* Station Info */}
      {stationInfo.visible && stationInfo.station && (
        <Card className="absolute left-4 top-4 w-[calc(100%-2rem)] max-w-xs">
          <CardContent className="p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium flex items-center">
                  <RadioTower className="h-4 w-4 mr-1 text-primary" />
                  {stationInfo.station.name}
                </h3>
                <p className="text-xs text-muted-foreground">{stationInfo.station.stationId}</p>
              </div>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCloseInfo}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize">{stationInfo.station.status}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Battery</span>
                <span>{stationInfo.station.batteryLevel ?? 0}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Location</span>
                <span>{stationInfo.station.location || 'Unknown'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Last Update</span>
                <span>{stationInfo.station.lastUpdate ? 
                  new Date(stationInfo.station.lastUpdate).toLocaleString() : 
                  'Unknown'}</span>
              </div>
            </div>
            
            {stationInfo.station.batteryLevel !== undefined && stationInfo.station.batteryLevel < 25 && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Low Battery
              </Badge>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MobileFieldMap;