import { FC, useState, useEffect } from 'react';
import { useSeismicData } from '@/hooks/useSeismicData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Map, 
  MapPin, 
  Layers, 
  Navigation, 
  Compass, 
  LocateFixed, 
  Download,
  Waves
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MobileFieldMap: FC = () => {
  const { stations, events } = useSeismicData();
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showOffline, setShowOffline] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [mapMode, setMapMode] = useState<'satellite' | 'terrain' | 'street'>('terrain');
  
  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);
  
  return (
    <div className="p-4 pb-16">
      <div className="mb-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Map className="h-5 w-5 mr-2 text-primary" />
              Field Map
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="bg-gray-800 rounded-md h-[400px] flex items-center justify-center text-white text-center mb-3">
              <div>
                <Map className="h-16 w-16 mx-auto mb-2 opacity-40" />
                <p>Map would render here with GIS layers</p>
                <p className="text-xs opacity-60 mt-1">Currently displaying {mapMode} view</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Button variant="outline" size="sm" className="flex items-center">
                <LocateFixed className="h-4 w-4 mr-1" />
                Current Location
              </Button>
              <Button variant="outline" size="sm" className="flex items-center">
                <Download className="h-4 w-4 mr-1" />
                Save Offline Maps
              </Button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-stations" className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-1 text-blue-500" />
                  Show Stations
                </Label>
                <Switch 
                  id="show-stations" 
                  checked={showStations} 
                  onCheckedChange={setShowStations} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="show-events" className="flex items-center text-sm">
                  <Waves className="h-4 w-4 mr-1 text-red-500" />
                  Show Seismic Events
                </Label>
                <Switch 
                  id="show-events"
                  checked={showEvents}
                  onCheckedChange={setShowEvents}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="show-offline" className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                  Show Offline Stations
                </Label>
                <Switch 
                  id="show-offline"
                  checked={showOffline}
                  onCheckedChange={setShowOffline}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex space-x-2 mb-3">
        <Button variant="outline" size="sm" className="h-9 px-3 flex-1 flex items-center justify-center">
          <Navigation className="h-4 w-4 mr-1" />
          Directions
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3 flex-1 flex items-center justify-center">
              <Layers className="h-4 w-4 mr-1" />
              Map Layers
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Map Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem 
                className={mapMode === 'satellite' ? 'bg-accent' : ''}
                onClick={() => setMapMode('satellite')}
              >
                Satellite
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={mapMode === 'terrain' ? 'bg-accent' : ''}
                onClick={() => setMapMode('terrain')}
              >
                Terrain
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={mapMode === 'street' ? 'bg-accent' : ''}
                onClick={() => setMapMode('street')}
              >
                Street
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Additional Layers</DropdownMenuLabel>
            <DropdownMenuItem>Geological Faults</DropdownMenuItem>
            <DropdownMenuItem>Terrain Elevation</DropdownMenuItem>
            <DropdownMenuItem>Historical Events</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="outline" size="sm" className="h-9 w-9 p-0 flex items-center justify-center">
          <Compass className="h-5 w-5" />
        </Button>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">Nearby Points</h3>
        {stations.slice(0, 3).map((station, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-blue-500" />
              <div>
                <p className="text-sm font-medium">{station.name}</p>
                <p className="text-xs text-slate-500">{station.stationId}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {[3.2, 1.8, 4.5][index]} km
            </Badge>
          </div>
        ))}
        
        {events.slice(0, 2).map((event, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center">
              <Waves className="h-4 w-4 mr-2 text-red-500" />
              <div>
                <p className="text-sm font-medium">{event.location}</p>
                <p className="text-xs text-slate-500">Mag {event.magnitude.toFixed(1)}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {[12.4, 8.9][index]} km
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileFieldMap;