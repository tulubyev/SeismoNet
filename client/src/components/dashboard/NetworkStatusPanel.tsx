import { FC } from 'react';
import { NetworkStatusUpdate, Event } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { 
  SatelliteDish, 
  AlertCircle, 
  SquareSplitHorizontal, 
  Bell 
} from 'lucide-react';

interface NetworkStatusPanelProps {
  networkStatus: NetworkStatusUpdate;
  events: Event[];
}

const NetworkStatusPanel: FC<NetworkStatusPanelProps> = ({ networkStatus, events }) => {
  // Get today's events (last 24h)
  const eventsToday = events.filter(event => {
    const eventDate = new Date(event.timestamp);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    return eventDate >= oneDayAgo;
  });
  
  // Count events by magnitude
  const minorEvents = eventsToday.filter(event => event.magnitude < 3.0).length;
  const moderateEvents = eventsToday.filter(event => event.magnitude >= 3.0 && event.magnitude < 5.0).length;
  const majorEvents = eventsToday.filter(event => event.magnitude >= 5.0).length;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Active Stations */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-DEFAULT">Active Stations</h3>
          <span className="text-primary"><SatelliteDish className="h-5 w-5" /></span>
        </div>
        <div className="flex items-end">
          <span className="text-3xl font-semibold text-slate-dark">{networkStatus.activeStations || 87}</span>
          <span className="ml-2 text-sm text-status-success pb-1">
            <span className="inline-block mr-1">↑</span> 2
          </span>
          <span className="text-xs text-slate-DEFAULT ml-auto pb-1">of {networkStatus.totalStations || 94} total</span>
        </div>
        <div className="w-full bg-slate-light rounded-full h-1.5 mt-4">
          <div 
            className="bg-primary h-1.5 rounded-full" 
            style={{ 
              width: `${networkStatus.activeStations && networkStatus.totalStations 
                ? (networkStatus.activeStations / networkStatus.totalStations) * 100 
                : 92}%` 
            }}
          ></div>
        </div>
      </Card>
      
      {/* Events Today */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-DEFAULT">Events Today</h3>
          <span className="text-accent-dark"><AlertCircle className="h-5 w-5" /></span>
        </div>
        <div className="flex items-end">
          <span className="text-3xl font-semibold text-slate-dark">{eventsToday.length}</span>
          <span className="ml-2 text-sm text-status-danger pb-1">
            <span className="inline-block mr-1">↑</span> {majorEvents}
          </span>
          <span className="text-xs text-slate-DEFAULT ml-auto pb-1">Last 24h</span>
        </div>
        <div className="flex gap-2 mt-4">
          <span className="px-2 py-0.5 text-xs rounded-full bg-status-info bg-opacity-10 text-status-info">
            Minor: {minorEvents}
          </span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-status-warning bg-opacity-10 text-status-warning">
            Moderate: {moderateEvents}
          </span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-status-danger bg-opacity-10 text-status-danger">
            Major: {majorEvents}
          </span>
        </div>
      </Card>
      
      {/* Data Transmission */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-DEFAULT">Data Transmission</h3>
          <span className="text-secondary"><SquareSplitHorizontal className="h-5 w-5" /></span>
        </div>
        <div className="flex items-end">
          <span className="text-3xl font-semibold text-slate-dark">
            {networkStatus.dataProcessingHealth?.toFixed(1)}<span className="text-lg">%</span>
          </span>
          <span className="ml-2 text-sm text-status-success pb-1">
            <span className="inline-block mr-1">✓</span>
          </span>
          <span className="text-xs text-slate-DEFAULT ml-auto pb-1">Uptime</span>
        </div>
        <div className="flex items-center mt-4">
          <div className="flex-1">
            <div className="text-xs text-slate-DEFAULT mb-1">Transfer Rate</div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-slate-dark">4.8 MB/s</span>
              <span className="ml-2 text-xs text-status-success">
                <span className="inline-block mr-1">↑</span>
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-DEFAULT mb-1">Last Sync</div>
            <div className="text-sm font-medium text-slate-dark">2 min ago</div>
          </div>
        </div>
      </Card>
      
      {/* Alert Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-DEFAULT">Alert Status</h3>
          <span className="text-status-warning"><Bell className="h-5 w-5" /></span>
        </div>
        <div className="flex items-end">
          <span className="text-3xl font-semibold text-status-warning">
            {majorEvents > 0 ? "Elevated" : "Normal"}
          </span>
          <span className="text-xs text-slate-DEFAULT ml-auto pb-1">Updated 5m ago</span>
        </div>
        <div className="flex gap-2 mt-4">
          {majorEvents > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-status-danger bg-opacity-10 text-status-danger">
              <span className="inline-block mr-1">⚠</span> Region 4 Alert
            </span>
          )}
          <span className="px-2 py-0.5 text-xs rounded-full bg-status-info bg-opacity-10 text-status-info">
            <span className="inline-block mr-1">ⓘ</span> 2 Notifications
          </span>
        </div>
      </Card>
    </div>
  );
};

export default NetworkStatusPanel;
