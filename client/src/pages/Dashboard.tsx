import { FC } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import NetworkStatusPanel from '@/components/dashboard/NetworkStatusPanel';
import MapPanel from '@/components/dashboard/MapPanel';
import RecentEventsPanel from '@/components/dashboard/RecentEventsPanel';
import LiveWaveformsPanel from '@/components/dashboard/LiveWaveformsPanel';
import NetworkStatusDetailPanel from '@/components/dashboard/NetworkStatusDetailPanel';
import DataExchangePanel from '@/components/dashboard/DataExchangePanel';
import EventAnalysisPanel from '@/components/dashboard/EventAnalysisPanel';
import { useSeismicData } from '@/hooks/useSeismicData';

const Dashboard: FC = () => {
  const { 
    isConnected,
    stations,
    events,
    waveformData,
    networkStatus,
    researchNetworks,
    selectedEvent,
    selectEvent
  } = useSeismicData();
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto bg-slate-ultralight">
        <Header 
          title="Network Dashboard" 
          subtitle="Real-time seismic monitoring system" 
        />
        
        <div className="p-6">
          {/* Status Overview */}
          <NetworkStatusPanel 
            networkStatus={networkStatus} 
            events={events}
          />
          
          {/* Map and Recent Events */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <MapPanel 
              className="lg:col-span-2" 
              stations={stations} 
              events={events} 
            />
            <RecentEventsPanel 
              events={events}
              onSelectEvent={selectEvent}
            />
          </div>
          
          {/* Seismic Waveforms and Network Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <LiveWaveformsPanel 
              className="lg:col-span-2" 
              waveformData={waveformData}
              stations={stations}
            />
            <NetworkStatusDetailPanel 
              stations={stations} 
              systemStatus={networkStatus} 
            />
          </div>
          
          {/* Data Exchange and Event Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataExchangePanel 
              researchNetworks={researchNetworks} 
            />
            <EventAnalysisPanel 
              selectedEvent={selectedEvent}
              stations={stations}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
