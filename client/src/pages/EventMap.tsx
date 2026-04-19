import { FC } from 'react';
import MapPanel from '@/components/dashboard/MapPanel';
import { useSeismicData } from '@/hooks/useSeismicData';

const EventMap: FC = () => {
  const { stations, events } = useSeismicData();
  
  return (  <>
        
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-dark">Global Seismic Activity</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs bg-slate-light rounded-md hover:bg-slate-light hover:bg-opacity-70">
                  <span className="mr-1">☰</span> Filter
                </button>
                <button className="px-3 py-1 text-xs bg-primary text-white rounded-md hover:bg-primary-dark">
                  Last 24 Hours
                </button>
              </div>
            </div>
            
            <div className="h-[calc(100vh-200px)] w-full">
              <MapPanel 
                stations={stations} 
                events={events} 
                fullscreen 
              />
            </div>
          </div>
        </div>
  </>
  );
};

export default EventMap;
