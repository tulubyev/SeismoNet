import { FC, useState } from 'react';
import { useSeismicData } from '@/hooks/useSeismicData';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { 
  Battery, 
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  WrenchIcon,
  Filter,
  Volume2,
  Trash2,
  Sigma
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

// Station card component
const StationCard: FC<{ 
  stationId: string, 
  name: string, 
  status: string, 
  batteryLevel?: number,
  storageRemaining?: number,
  location?: string,
  lastUpdate?: Date
}> = ({ 
  stationId, 
  name, 
  status, 
  batteryLevel, 
  storageRemaining,
  location,
  lastUpdate
}) => {
  const getStatusColor = () => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'maintenance':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const getStatusIcon = () => {
    switch (status.toLowerCase()) {
      case 'online':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'maintenance':
        return <WrenchIcon className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${getStatusColor()}`}></div>
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{name}</h3>
            <p className="text-xs text-slate-500">{stationId}</p>
          </div>
          <div className="flex items-center space-x-1 text-xs font-medium">
            {getStatusIcon()}
            <span className="capitalize">{status}</span>
          </div>
        </div>
        
        {location && (
          <p className="text-xs text-slate-500 mt-1">{location}</p>
        )}
        
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center">
                <Battery className="h-3 w-3 mr-1" /> Battery
              </span>
              <span>{batteryLevel ?? 'N/A'}%</span>
            </div>
            <Progress 
              value={batteryLevel ?? 0} 
              className={`h-1.5 ${batteryLevel && batteryLevel < 25 ? 'bg-red-100' : 'bg-slate-100'}`} 
            />
          </div>
          
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Storage</span>
              <span>{storageRemaining ? (100 - storageRemaining) : 'N/A'}% used</span>
            </div>
            <Progress 
              value={storageRemaining ? (100 - storageRemaining) : 0} 
              className="h-1.5"
            />
          </div>
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            Last update: {lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Unknown'}
          </span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="flex items-center">
                <Volume2 className="h-4 w-4 mr-2" />
                <span>Test Signal</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center">
                <WrenchIcon className="h-4 w-4 mr-2" />
                <span>Calibrate</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center">
                <Sigma className="h-4 w-4 mr-2" />
                <span>View Data</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center text-red-500">
                <Trash2 className="h-4 w-4 mr-2" />
                <span>Deactivate</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

const MobileStations: FC = () => {
  const { stations } = useSeismicData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  const filteredStations = stations.filter(station => {
    // Apply search filter
    const matchesSearch = 
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.stationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (station.location && station.location.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Apply status filter
    const matchesStatus = !statusFilter || station.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });
  
  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search stations..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {filteredStations.length} {filteredStations.length === 1 ? 'station' : 'stations'}
          </span>
          
          <ToggleGroup type="single" variant="outline" value={statusFilter || ''} onValueChange={(value) => setStatusFilter(value || null)}>
            <ToggleGroupItem value="online" size="sm" className="text-xs h-7">
              Online
            </ToggleGroupItem>
            <ToggleGroupItem value="offline" size="sm" className="text-xs h-7">
              Offline
            </ToggleGroupItem>
            <ToggleGroupItem value="warning" size="sm" className="text-xs h-7">
              Warning
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      
      <div className="space-y-3">
        {filteredStations.map(station => (
          <StationCard 
            key={station.id}
            stationId={station.stationId}
            name={station.name}
            status={station.status}
            batteryLevel={station.batteryLevel ?? undefined}
            storageRemaining={station.storageRemaining ?? undefined}
            location={station.location ?? undefined}
            lastUpdate={station.lastUpdate}
          />
        ))}
        
        {filteredStations.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <p>No stations found matching your criteria.</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter(null);
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileStations;