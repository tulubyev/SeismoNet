import { FC } from 'react';
import { useSeismicData } from '@/hooks/useSeismicData';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Battery, 
  Wifi, 
  Disc, 
  AlertTriangle,
  Gauge,
  Activity,
  GanttChart,
  CloudOff
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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

const MobileDashboard: FC = () => {
  const { stations, events, networkStatus, isConnected } = useSeismicData();
  
  // Calculate statistics
  const onlineStations = stations.filter(s => s.status.toLowerCase() === 'online').length;
  const stationsWithLowBattery = stations.filter(s => (s.batteryLevel ?? 0) < 25).length;
  const recentEvents = events.slice(0, 5);
  
  return (
    <div className="p-4">
      {!isConnected && (
        <Card className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4 flex items-center text-yellow-700 dark:text-yellow-400">
            <CloudOff className="h-5 w-5 mr-2" />
            <p className="text-sm">
              Working in offline mode. Data may not be up to date.
            </p>
          </CardContent>
        </Card>
      )}
      
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Field Status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="flex flex-col p-3 bg-slate-50 rounded-lg">
            <span className="text-xs text-slate-500 mb-1">Stations</span>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">{onlineStations}/{stations.length}</span>
              <Disc className={`h-5 w-5 ${onlineStations === stations.length ? 'text-green-500' : 'text-amber-500'}`} />
            </div>
            <span className="text-xs mt-1 text-slate-500">Online</span>
          </div>
          
          <div className="flex flex-col p-3 bg-slate-50 rounded-lg">
            <span className="text-xs text-slate-500 mb-1">Network</span>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">
                {networkStatus?.networkConnectivityHealth ? `${networkStatus.networkConnectivityHealth}%` : 'N/A'}
              </span>
              <Wifi className={`h-5 w-5 ${(networkStatus?.networkConnectivityHealth ?? 0) > 70 ? 'text-green-500' : 'text-amber-500'}`} />
            </div>
            <span className="text-xs mt-1 text-slate-500">Signal Strength</span>
          </div>
          
          <div className="flex flex-col p-3 bg-slate-50 rounded-lg">
            <span className="text-xs text-slate-500 mb-1">Batteries</span>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">{stationsWithLowBattery}</span>
              <Battery className={`h-5 w-5 ${stationsWithLowBattery > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
            <span className="text-xs mt-1 text-slate-500">Need Attention</span>
          </div>
          
          <div className="flex flex-col p-3 bg-slate-50 rounded-lg">
            <span className="text-xs text-slate-500 mb-1">Data Sync</span>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">
                {networkStatus?.dataProcessingHealth ? `${networkStatus.dataProcessingHealth}%` : 'N/A'}
              </span>
              <GanttChart className={`h-5 w-5 ${(networkStatus?.dataProcessingHealth ?? 0) > 90 ? 'text-green-500' : 'text-blue-500'}`} />
            </div>
            <span className="text-xs mt-1 text-slate-500">Last: Unknown</span>
          </div>
        </CardContent>
      </Card>
      
      <h2 className="text-lg font-semibold mb-3">Recent Seismic Activity</h2>
      <div className="space-y-3">
        {recentEvents.map(event => (
          <Card key={event.eventId} className="overflow-hidden">
            <div className={`h-1.5 ${event.magnitude >= 5.0 ? 'bg-red-500' : event.magnitude >= 3.0 ? 'bg-amber-500' : 'bg-green-500'}`}></div>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{event.location || 'Unknown location'}</h3>
                  <p className="text-sm text-slate-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
                <Badge variant={event.magnitude >= 5.0 ? 'destructive' : event.magnitude >= 3.0 ? 'default' : 'outline'}>
                  <Activity className="h-3.5 w-3.5 mr-1" />
                  M{event.magnitude.toFixed(1)}
                </Badge>
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>Depth: {event.depth} km</span>
                <span>Region: {event.region}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <h2 className="text-lg font-semibold mt-5 mb-3">Field Equipment</h2>
      <div className="space-y-3">
        {stations.slice(0, 3).map(station => (
          <Card key={station.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-medium">{station.name}</h3>
                  <p className="text-xs text-slate-500">{station.stationId}</p>
                </div>
                <StatusIndicator status={station.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Battery</span>
                    <span>{station.batteryLevel ?? 0}%</span>
                  </div>
                  <Progress 
                    value={station.batteryLevel ?? 0} 
                    className={`h-2 ${station.batteryLevel && station.batteryLevel < 25 ? 'bg-red-100' : 'bg-slate-100'}`} 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Storage</span>
                    <span>{station.storageRemaining ? (100 - station.storageRemaining) : 0}% used</span>
                  </div>
                  <Progress 
                    value={station.storageRemaining ? (100 - station.storageRemaining) : 0} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MobileDashboard;