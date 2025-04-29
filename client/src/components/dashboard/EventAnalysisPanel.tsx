import { FC, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Event, Station } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { Download, RefreshCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { 
  getContributingStations, 
  calculateDistance, 
  calculateWaveArrivalTime,
  formatSecondsToMMSS
} from '@/lib/epicenterCalculator';

interface EventAnalysisPanelProps {
  selectedEvent: Event | null;
  stations: Station[];
  fullWidth?: boolean;
}

const EventAnalysisPanel: FC<EventAnalysisPanelProps> = ({ 
  selectedEvent, 
  stations, 
  fullWidth = false
}) => {
  const [contributingStations, setContributingStations] = useState<Array<{
    stationId: string;
    distance: number;
    pWaveArrival: number;
    sWaveArrival: number;
  }>>([]);
  
  // Calculate contributing stations when event or stations change
  useEffect(() => {
    if (selectedEvent && stations.length > 0) {
      const calculated = getContributingStations(selectedEvent, stations);
      setContributingStations(calculated);
    }
  }, [selectedEvent, stations]);
  
  // If no event is selected, show a placeholder
  if (!selectedEvent) {
    return (
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-dark">Event Analysis</h2>
        </div>
        <div className="py-12 text-center text-slate-DEFAULT">
          <p>Select an event to view analysis</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-dark">Event Analysis</h2>
        <div>
          <button className="px-3 py-1 text-xs bg-primary text-white rounded-md hover:bg-primary-dark">
            <Download className="h-3 w-3 inline mr-1" /> Export
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-DEFAULT mb-2">Current Focus Event</h3>
        <div className="border border-slate-light rounded-lg p-3">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-slate-dark flex items-center">
                <span className="pulse-dot bg-status-danger mr-1"></span>
                {selectedEvent.region} (M{selectedEvent.magnitude.toFixed(1)})
              </h4>
              <p className="text-xs mt-1">
                {selectedEvent.location} • Occurred {formatDistanceToNow(new Date(selectedEvent.timestamp), { addSuffix: true })}
              </p>
            </div>
            <div>
              <button className="text-xs px-2 py-1 bg-slate-light rounded hover:bg-slate-light hover:bg-opacity-70">
                <RefreshCcw className="h-3 w-3 inline mr-1" /> Change Event
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <div className="text-xs text-slate-DEFAULT">Epicenter</div>
              <div className="text-sm font-mono font-medium">
                {selectedEvent.latitude.toString()}° {parseFloat(selectedEvent.latitude.toString()) >= 0 ? 'N' : 'S'}, 
                {selectedEvent.longitude.toString()}° {parseFloat(selectedEvent.longitude.toString()) >= 0 ? 'E' : 'W'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-DEFAULT">Depth</div>
              <div className="text-sm font-medium">{selectedEvent.depth.toFixed(1)} km</div>
            </div>
            <div>
              <div className="text-xs text-slate-DEFAULT">Magnitude</div>
              <div className="text-sm font-medium">{selectedEvent.magnitude.toFixed(1)} Mw (Moment)</div>
            </div>
            <div>
              <div className="text-xs text-slate-DEFAULT">Status</div>
              <div className="text-sm font-medium text-status-danger">
                {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-sm font-medium text-slate-DEFAULT mb-2">Epicenter Calculation</h3>
        <div className="bg-slate-ultralight rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Triangulation Method</span>
            <span className="text-xs px-2 py-0.5 bg-status-success bg-opacity-10 text-status-success rounded-full">Complete</span>
          </div>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Primary Analysis</span>
              <span>100%</span>
            </div>
            <Progress value={100} className="h-1.5" />
            
            <div className="flex items-center justify-between text-xs">
              <span>Secondary Verification</span>
              <span>100%</span>
            </div>
            <Progress value={100} className="h-1.5" />
            
            <div className="flex items-center justify-between text-xs">
              <span>Depth Calculation</span>
              <span>100%</span>
            </div>
            <Progress value={100} className="h-1.5" />
          </div>
          <div className="text-xs text-slate-DEFAULT mt-3">
            <span className="inline-block mr-1">ⓘ</span>
            Calculated using data from {contributingStations.length} stations with confidence rating of 
            {' '}{selectedEvent.calculationConfidence?.toFixed(0) || '94'}%.
          </div>
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-slate-DEFAULT">Contributing Stations</h3>
          <span className="text-xs text-slate-DEFAULT">{contributingStations.length} stations</span>
        </div>
        
        <div className={`overflow-auto ${fullWidth ? 'max-h-64' : 'max-h-40'} border border-slate-light rounded-lg`}>
          <table className="min-w-full">
            <thead className="bg-slate-ultralight border-b border-slate-light">
              <tr>
                <th className="text-xs font-medium text-slate-DEFAULT text-left py-2 px-3">Station</th>
                <th className="text-xs font-medium text-slate-DEFAULT text-left py-2 px-3">Distance</th>
                <th className="text-xs font-medium text-slate-DEFAULT text-left py-2 px-3">P-Wave</th>
                <th className="text-xs font-medium text-slate-DEFAULT text-left py-2 px-3">S-Wave</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-light">
              {contributingStations.slice(0, 10).map(station => (
                <tr key={station.stationId}>
                  <td className="text-xs py-2 px-3">{station.stationId}</td>
                  <td className="text-xs py-2 px-3 mono">{station.distance} km</td>
                  <td className="text-xs py-2 px-3 mono">{formatSecondsToMMSS(station.pWaveArrival)}</td>
                  <td className="text-xs py-2 px-3 mono">{formatSecondsToMMSS(station.sWaveArrival)}</td>
                </tr>
              ))}
              
              {contributingStations.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-xs py-4 text-center text-slate-DEFAULT">
                    No contributing stations data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

export default EventAnalysisPanel;
