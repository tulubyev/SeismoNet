import { FC, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useSeismicData } from '@/hooks/useSeismicData';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format, formatDistanceToNow } from 'date-fns';
import { Activity, ArrowUpRight, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const EventHistory: FC = () => {
  const { events, selectEvent, selectedEvent } = useSeismicData();
  const [filter, setFilter] = useState('all');
  const [showDetails, setShowDetails] = useState(false);
  const [location] = useLocation();
  
  // Check if we're on the major events page
  const isMajorEventsPage = location === '/events/major';
  const isIntensityPage = location === '/events/intensity';
  
  // Set filter for special pages
  useEffect(() => {
    if (isMajorEventsPage) {
      setFilter('major');
    } else if (isIntensityPage) {
      setFilter('all'); // Show all on intensity page
    }
  }, [isMajorEventsPage, isIntensityPage]);
  
  // Lower the threshold for major events to show more data
  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'major') return event.magnitude >= 4.5; // Changed from 5.0 to show more events
    if (filter === 'moderate') return event.magnitude >= 2.5 && event.magnitude < 4.5;
    if (filter === 'minor') return event.magnitude < 2.5;
    return true;
  });
  
  const handleViewDetails = (eventId: string) => {
    selectEvent(eventId);
    setShowDetails(true);
  };
  
  return (  <>
        
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-slate-dark">
                  {isMajorEventsPage ? "Major Seismic Events" : "Seismic Events"}
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 text-xs rounded-md ${
                      filter === 'all' 
                        ? 'bg-primary text-white' 
                        : 'bg-slate-light hover:bg-slate-light hover:bg-opacity-70'
                    }`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setFilter('major')}
                    className={`px-3 py-1 text-xs rounded-md ${
                      filter === 'major' 
                        ? 'bg-status-danger text-white' 
                        : 'bg-slate-light hover:bg-slate-light hover:bg-opacity-70'
                    }`}
                  >
                    Major (≥4.5)
                  </button>
                  <button 
                    onClick={() => setFilter('moderate')}
                    className={`px-3 py-1 text-xs rounded-md ${
                      filter === 'moderate' 
                        ? 'bg-status-warning text-white' 
                        : 'bg-slate-light hover:bg-slate-light hover:bg-opacity-70'
                    }`}
                  >
                    Moderate (2.5-4.4)
                  </button>
                  <button 
                    onClick={() => setFilter('minor')}
                    className={`px-3 py-1 text-xs rounded-md ${
                      filter === 'minor' 
                        ? 'bg-status-info text-white' 
                        : 'bg-slate-light hover:bg-slate-light hover:bg-opacity-70'
                    }`}
                  >
                    Minor (&lt;2.5)
                  </button>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event ID</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Magnitude</TableHead>
                    <TableHead>Depth</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map(event => (
                    <TableRow key={event.eventId}>
                      <TableCell className="font-medium mono">{event.eventId}</TableCell>
                      <TableCell>
                        {event.region}
                        <div className="text-xs text-slate-DEFAULT">{event.location}</div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(event.timestamp), 'MMM dd, yyyy')}
                        <div className="text-xs text-slate-DEFAULT mono">
                          {format(new Date(event.timestamp), 'HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.magnitude >= 4.5 
                            ? 'bg-status-danger text-white' 
                            : event.magnitude >= 2.5 
                              ? 'bg-status-warning text-white' 
                              : 'bg-status-info text-white'
                        }`}>
                          {event.magnitude.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell>{event.depth.toFixed(1)} km</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.status === 'verified' 
                            ? 'bg-status-success bg-opacity-10 text-status-success' 
                            : 'bg-status-warning bg-opacity-10 text-status-warning'
                        }`}>
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <button 
                          onClick={() => handleViewDetails(event.eventId)}
                          className="text-xs text-primary hover:text-primary-dark"
                        >
                          Details
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      
      {/* Event Details Dialog */}
      {selectedEvent && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5 text-status-danger" />
                Seismic Event Details
              </DialogTitle>
              <DialogDescription>
                {selectedEvent.region} - {format(new Date(selectedEvent.timestamp), 'MMM dd, yyyy, HH:mm:ss')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="border rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-status-danger bg-opacity-10 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-status-danger" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">Magnitude {selectedEvent.magnitude.toFixed(1)}</h3>
                    <p className="text-sm text-slate-DEFAULT">{selectedEvent.location || 'Unknown location'}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-slate-DEFAULT">
                    <MapPin className="mr-2 h-4 w-4" />
                    Epicenter
                  </div>
                  <p className="text-sm">
                    {selectedEvent.latitude.toString()}° {parseFloat(selectedEvent.latitude.toString()) >= 0 ? 'N' : 'S'}, 
                    {selectedEvent.longitude.toString()}° {parseFloat(selectedEvent.longitude.toString()) >= 0 ? 'E' : 'W'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-slate-DEFAULT">
                    <Clock className="mr-2 h-4 w-4" />
                    Time
                  </div>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(selectedEvent.timestamp), { addSuffix: true })}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-slate-DEFAULT">
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Depth
                  </div>
                  <p className="text-sm">{selectedEvent.depth.toFixed(1)} km</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-slate-DEFAULT">
                    Status
                  </div>
                  <p className="text-sm capitalize">{selectedEvent.status}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Event Impact Analysis</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Potential Damage</span>
                    <span>
                      {selectedEvent.magnitude >= 5.5 ? 'Severe' : 
                       selectedEvent.magnitude >= 4.5 ? 'Moderate' : 
                       selectedEvent.magnitude >= 3.5 ? 'Light' : 'Minimal'}
                    </span>
                  </div>
                  <Progress value={
                    selectedEvent.magnitude >= 5.5 ? 100 : 
                    selectedEvent.magnitude >= 4.5 ? 70 : 
                    selectedEvent.magnitude >= 3.5 ? 40 : 20
                  } className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Population Affected</span>
                    <span>
                      {selectedEvent.magnitude >= 5.5 ? 'Large' : 
                       selectedEvent.magnitude >= 4.5 ? 'Moderate' : 
                       selectedEvent.magnitude >= 3.5 ? 'Small' : 'Very Few'}
                    </span>
                  </div>
                  <Progress value={
                    selectedEvent.magnitude >= 5.5 ? 90 : 
                    selectedEvent.magnitude >= 4.5 ? 60 : 
                    selectedEvent.magnitude >= 3.5 ? 30 : 10
                  } className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Data Reliability</span>
                    <span>{selectedEvent.status === 'verified' ? 'High' : 'Medium'}</span>
                  </div>
                  <Progress value={selectedEvent.status === 'verified' ? 90 : 60} className="h-2" />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
  </>
  );
};

export default EventHistory;
