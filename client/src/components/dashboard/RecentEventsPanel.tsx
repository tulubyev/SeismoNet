import { FC } from 'react';
import { Card } from '@/components/ui/card';
import { Event } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';

interface RecentEventsPanelProps {
  events: Event[];
  onSelectEvent: (eventId: string) => void;
}

const RecentEventsPanel: FC<RecentEventsPanelProps> = ({ events, onSelectEvent }) => {
  // Sort events by timestamp (newest first)
  const sortedEvents = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4); // Take most recent 4 events
  
  // Calculate global activity level based on recent events
  const calculateActivityLevel = (): { level: string; percentage: number } => {
    const recentMagnitudes = sortedEvents.map(event => event.magnitude);
    const maxMagnitude = Math.max(...recentMagnitudes, 0);
    
    if (maxMagnitude >= 6.0) return { level: 'High', percentage: 90 };
    if (maxMagnitude >= 5.0) return { level: 'Moderate', percentage: 65 };
    if (maxMagnitude >= 4.0) return { level: 'Elevated', percentage: 45 };
    return { level: 'Low', percentage: 20 };
  };
  
  const activityLevel = calculateActivityLevel();
  
  // Helper to determine status color based on magnitude
  const getMagnitudeColor = (magnitude: number): string => {
    if (magnitude >= 5.0) return 'border-status-danger';
    if (magnitude >= 3.0) return 'border-status-warning';
    return 'border-status-info';
  };
  
  // Helper to determine badge color based on magnitude
  const getMagnitudeBadgeColor = (magnitude: number): string => {
    if (magnitude >= 5.0) return 'bg-status-danger text-white';
    if (magnitude >= 3.0) return 'bg-status-warning text-white';
    return 'bg-status-info text-white';
  };
  
  // Helper to format time
  const formatEventTime = (timestamp: Date): string => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };
  
  // Helper to get status indicator
  const getStatusIndicator = (event: Event): JSX.Element | null => {
    if (new Date(event.timestamp).getTime() > Date.now() - 15 * 60 * 1000) { // Less than 15 minutes old
      return <span className="pulse-dot bg-status-danger mr-1"></span>;
    }
    return null;
  };
  
  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-dark">Recent Events</h2>
        <button className="text-primary hover:text-primary-dark text-sm">
          View All <ArrowRight className="h-4 w-4 inline ml-1" />
        </button>
      </div>
      
      <div className="space-y-4">
        {sortedEvents.map(event => (
          <div 
            key={event.eventId} 
            className={`border-l-4 ${getMagnitudeColor(event.magnitude)} pl-3 py-1 cursor-pointer`}
            onClick={() => onSelectEvent(event.eventId)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-slate-dark flex items-center">
                  {getStatusIndicator(event)}
                  {event.region}
                </h3>
                <p className="text-xs mt-1">{event.location}</p>
              </div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMagnitudeBadgeColor(event.magnitude)}`}>
                  {event.magnitude.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-DEFAULT">
              <div>
                <span className="mono">{formatEventTime(event.timestamp)}</span>
              </div>
              <div>
                <span className="mono">Depth: {event.depth.toFixed(1)} km</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t border-slate-light">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-DEFAULT">Global Activity Level</h3>
          <span className={`text-${
            activityLevel.level === 'High' ? 'status-danger' : 
            activityLevel.level === 'Moderate' ? 'status-warning' : 
            activityLevel.level === 'Elevated' ? 'status-warning' : 
            'status-success'
          } font-medium`}>
            {activityLevel.level}
          </span>
        </div>
        <div className="w-full bg-slate-light rounded-full h-1.5 mt-2">
          <div 
            className={`${
              activityLevel.level === 'High' ? 'bg-status-danger' : 
              activityLevel.level === 'Moderate' || activityLevel.level === 'Elevated' ? 'bg-status-warning' : 
              'bg-status-success'
            } h-1.5 rounded-full`} 
            style={{ width: `${activityLevel.percentage}%` }}
          ></div>
        </div>
      </div>
    </Card>
  );
};

export default RecentEventsPanel;
