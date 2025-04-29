import { FC, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
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
import { format } from 'date-fns';

const EventHistory: FC = () => {
  const { events, selectEvent } = useSeismicData();
  const [filter, setFilter] = useState('all');
  
  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'major') return event.magnitude >= 5.0;
    if (filter === 'moderate') return event.magnitude >= 3.0 && event.magnitude < 5.0;
    if (filter === 'minor') return event.magnitude < 3.0;
    return true;
  });
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto bg-slate-ultralight">
        <Header 
          title="Event History" 
          subtitle="Historical seismic event data" 
        />
        
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-slate-dark">Seismic Events</h2>
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
                    Major (≥5.0)
                  </button>
                  <button 
                    onClick={() => setFilter('moderate')}
                    className={`px-3 py-1 text-xs rounded-md ${
                      filter === 'moderate' 
                        ? 'bg-status-warning text-white' 
                        : 'bg-slate-light hover:bg-slate-light hover:bg-opacity-70'
                    }`}
                  >
                    Moderate (3.0-4.9)
                  </button>
                  <button 
                    onClick={() => setFilter('minor')}
                    className={`px-3 py-1 text-xs rounded-md ${
                      filter === 'minor' 
                        ? 'bg-status-info text-white' 
                        : 'bg-slate-light hover:bg-slate-light hover:bg-opacity-70'
                    }`}
                  >
                    Minor (&lt;3.0)
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
                          event.magnitude >= 5.0 
                            ? 'bg-status-danger text-white' 
                            : event.magnitude >= 3.0 
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
                          onClick={() => selectEvent(event.eventId)}
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
      </main>
    </div>
  );
};

export default EventHistory;
