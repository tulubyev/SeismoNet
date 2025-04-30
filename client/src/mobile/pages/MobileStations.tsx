import { FC, useState } from 'react';
import { useSeismicData } from '@/hooks/useSeismicData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RadioTower,
  Search,
  Waves,
  Battery,
  Signal,
  HardDrive,
  AlertTriangle,
  Settings,
  WrenchIcon,
  SortAsc,
  SortDesc,
  ChevronRight
} from 'lucide-react';

// Status indicator component
const StatusIndicator: FC<{ status: string }> = ({ status }) => {
  const getColor = () => {
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
  
  return (
    <span className="flex items-center">
      <span className={`h-2.5 w-2.5 rounded-full ${getColor()} mr-2`}></span>
      <span className="capitalize">{status}</span>
    </span>
  );
};

const BatteryStatus: FC<{ level: number | null | undefined }> = ({ level }) => {
  const batteryLevel = level ?? 0;
  
  const getColor = () => {
    if (batteryLevel < 20) return 'text-red-500';
    if (batteryLevel < 50) return 'text-amber-500';
    return 'text-green-500';
  };
  
  return (
    <div className="flex items-center">
      <Battery className={`h-4 w-4 mr-1 ${getColor()}`} />
      <span>{batteryLevel}%</span>
    </div>
  );
};

const MobileStations: FC = () => {
  const { stations } = useSeismicData();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'status' | 'name' | 'battery'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showOffline, setShowOffline] = useState(true);
  
  // Filter and sort stations
  const filteredStations = stations
    .filter(station => {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          station.name.toLowerCase().includes(query) ||
          station.stationId.toLowerCase().includes(query) ||
          (station.location && station.location.toLowerCase().includes(query))
        );
      }
      
      // Apply status filter
      if (filterStatus && station.status.toLowerCase() !== filterStatus.toLowerCase()) {
        return false;
      }
      
      // Apply offline filter
      if (!showOffline && station.status.toLowerCase() === 'offline') {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Apply sorting
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'battery':
          const batteryA = a.batteryLevel ?? 0;
          const batteryB = b.batteryLevel ?? 0;
          comparison = batteryA - batteryB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  
  const handleToggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };
  
  return (
    <div className="p-4 pb-16">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search stations..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Label htmlFor="show-offline" className="text-sm">Show Offline</Label>
          <Switch
            id="show-offline"
            checked={showOffline}
            onCheckedChange={setShowOffline}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={sortField} onValueChange={(value) => setSortField(value as any)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="battery">Battery</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleToggleSortOrder}
          >
            {sortOrder === 'asc' ? 
              <SortAsc className="h-4 w-4" /> : 
              <SortDesc className="h-4 w-4" />
            }
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all" className="mb-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="online" className="text-xs" onClick={() => setFilterStatus('online')}>
            Online
          </TabsTrigger>
          <TabsTrigger value="warning" className="text-xs" onClick={() => setFilterStatus('warning')}>
            Warning
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="text-xs" onClick={() => setFilterStatus('maintenance')}>
            Maintenance
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="space-y-3">
        {filteredStations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RadioTower className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>No stations match your search criteria</p>
          </div>
        ) : (
          filteredStations.map(station => (
            <Card key={station.id} className="overflow-hidden">
              <div className={`h-1 ${
                station.status === 'online' ? 'bg-green-500' : 
                station.status === 'warning' ? 'bg-yellow-500' :
                station.status === 'maintenance' ? 'bg-blue-500' :
                'bg-red-500'
              }`}></div>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium flex items-center">
                      <RadioTower className="h-4 w-4 mr-1 text-primary" />
                      {station.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{station.stationId}</p>
                  </div>
                  <StatusIndicator status={station.status} />
                </div>
                
                <div className="grid grid-cols-3 gap-1 text-xs mb-3">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground mb-1">Battery</span>
                    <BatteryStatus level={station.batteryLevel} />
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-muted-foreground mb-1">Signal</span>
                    <div className="flex items-center">
                      <Signal className="h-4 w-4 mr-1 text-blue-500" />
                      <span>{station.signalStrength ?? 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-muted-foreground mb-1">Storage</span>
                    <div className="flex items-center">
                      <HardDrive className="h-4 w-4 mr-1 text-purple-500" />
                      <span>{station.storageRemaining ?? 0}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-x-1">
                    {station.status === 'maintenance' && (
                      <Badge variant="outline" className="text-xs bg-blue-50">
                        <WrenchIcon className="h-3 w-3 mr-1" />
                        Maintenance
                      </Badge>
                    )}
                    
                    {station.batteryLevel !== undefined && station.batteryLevel < 25 && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                        <Battery className="h-3 w-3 mr-1" />
                        Low Battery
                      </Badge>
                    )}
                    
                    {station.status === 'warning' && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Warning
                      </Badge>
                    )}
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                  >
                    Details
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MobileStations;