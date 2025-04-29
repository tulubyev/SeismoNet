import { FC, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useSeismicData } from '@/hooks/useSeismicData';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EventAnalysisPanel from '@/components/dashboard/EventAnalysisPanel';
import LiveWaveformsPanel from '@/components/dashboard/LiveWaveformsPanel';

const Analysis: FC = () => {
  const { events, stations, waveformData, selectedEvent, selectEvent } = useSeismicData();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    selectEvent(eventId);
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto bg-slate-ultralight">
        <Header 
          title="Seismic Analysis" 
          subtitle="Analyze seismic events and waveform data" 
        />
        
        <div className="p-6">
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-dark">Event Selection</h2>
                <div className="w-64">
                  <Select value={selectedEventId} onValueChange={handleEventChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map(event => (
                        <SelectItem key={event.eventId} value={event.eventId}>
                          {event.region} (M{event.magnitude.toFixed(1)}) - {new Date(event.timestamp).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="epicenter">
            <TabsList className="mb-6">
              <TabsTrigger value="epicenter">Epicenter Analysis</TabsTrigger>
              <TabsTrigger value="waveforms">Waveform Analysis</TabsTrigger>
              <TabsTrigger value="frequency">Frequency Analysis</TabsTrigger>
              <TabsTrigger value="comparison">Event Comparison</TabsTrigger>
            </TabsList>
            
            <TabsContent value="epicenter">
              <div className="grid grid-cols-1 gap-6">
                <EventAnalysisPanel 
                  selectedEvent={selectedEvent}
                  stations={stations}
                  fullWidth
                />
              </div>
            </TabsContent>
            
            <TabsContent value="waveforms">
              <LiveWaveformsPanel 
                waveformData={waveformData}
                stations={stations}
                fullWidth
              />
            </TabsContent>
            
            <TabsContent value="frequency">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-12 text-slate-DEFAULT">
                    <p>Frequency analysis module will be available in a future update.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="comparison">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-12 text-slate-DEFAULT">
                    <p>Event comparison module will be available in a future update.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Analysis;
