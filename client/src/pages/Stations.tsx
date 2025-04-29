import { FC } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import StationList from '@/components/stations/StationList';
import { useSeismicData } from '@/hooks/useSeismicData';

const Stations: FC = () => {
  const { stations } = useSeismicData();
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto bg-slate-ultralight">
        <Header 
          title="Seismic Stations" 
          subtitle="Monitor and manage seismic station network" 
        />
        
        <div className="p-6">
          <StationList stations={stations} />
        </div>
      </main>
    </div>
  );
};

export default Stations;
