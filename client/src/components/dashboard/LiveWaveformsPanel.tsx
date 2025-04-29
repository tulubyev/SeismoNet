import { FC, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Station, LiveWaveformData } from '@shared/schema';
import { renderWaveform } from '@/lib/waveformVisualization';
import { Expand } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LiveWaveformsPanelProps {
  waveformData: Record<string, LiveWaveformData>;
  stations: Station[];
  className?: string;
  fullWidth?: boolean;
}

const LiveWaveformsPanel: FC<LiveWaveformsPanelProps> = ({ 
  waveformData, 
  stations, 
  className = '', 
  fullWidth = false 
}) => {
  // Get the three stations we have waveform data for
  const stationsWithData = stations.filter(
    station => Object.keys(waveformData).includes(station.stationId)
  ).slice(0, 3);
  
  const containerRefs = {
    "PNWST-03": useRef<HTMLDivElement>(null),
    "SOCAL-12": useRef<HTMLDivElement>(null),
    "ALASKA-07": useRef<HTMLDivElement>(null)
  };
  
  // Render waveforms when data changes
  useEffect(() => {
    stationsWithData.forEach(station => {
      const data = waveformData[station.stationId];
      const refKey = station.stationId as keyof typeof containerRefs;
      
      if (data && containerRefs[refKey]?.current) {
        // Get appropriate color based on station ID
        let color = "#2563eb"; // default blue (primary)
        if (station.stationId === "SOCAL-12") color = "#0f766e"; // secondary
        if (station.stationId === "ALASKA-07") color = "#f97316"; // accent
        
        // Render the waveform visualization
        renderWaveform(
          `waveform-${station.stationId}`, 
          data.dataPoints,
          color
        );
      }
    });
  }, [waveformData, stationsWithData]);
  
  // Helper function to get station status badge
  const getStatusBadge = (status: string) => {
    if (status === "degraded") {
      return (
        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-status-warning bg-opacity-10 text-status-warning">
          High Activity
        </span>
      );
    }
    return (
      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-status-success bg-opacity-10 text-status-success">
        Active
      </span>
    );
  };
  
  return (
    <Card className={`${className}`}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-dark">Live Waveforms</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-status-success flex items-center">
              <span className="pulse-dot bg-status-success mr-1"></span>
              Live Data
            </span>
            <Select defaultValue="10min">
              <SelectTrigger className="text-xs h-8 w-auto min-w-[120px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10min">Last 10 Minutes</SelectItem>
                <SelectItem value="30min">Last 30 Minutes</SelectItem>
                <SelectItem value="60min">Last Hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-6">
          {stationsWithData.map(station => {
            const data = waveformData[station.stationId];
            const refKey = station.stationId as keyof typeof containerRefs;
            
            return (
              <div key={station.stationId}>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center">
                    <span className="font-medium text-slate-dark">{station.stationId}</span>
                    {getStatusBadge(station.status)}
                  </div>
                  <div className="text-xs text-slate-DEFAULT flex items-center">
                    <span className="mono mr-2">
                      {station.latitude.toString()}° {parseFloat(station.latitude.toString()) >= 0 ? 'N' : 'S'}, 
                      {station.longitude.toString()}° {parseFloat(station.longitude.toString()) >= 0 ? 'E' : 'W'}
                    </span>
                    <button className="text-primary hover:text-primary-dark">
                      <Expand className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="waveform-container">
                  <div 
                    id={`waveform-${station.stationId}`} 
                    ref={containerRefs[refKey]}
                    className="w-full h-[80px] blink"
                  ></div>
                  <div className="flex justify-between text-xs text-slate-DEFAULT mt-1">
                    <span>-10m</span>
                    <span>-8m</span>
                    <span>-6m</span>
                    <span>-4m</span>
                    <span>-2m</span>
                    <span>Now</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {stationsWithData.length === 0 && (
            <div className="py-10 text-center text-slate-DEFAULT">
              <p>No waveform data available</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default LiveWaveformsPanel;
