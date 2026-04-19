import { FC } from 'react';
import StationList from '@/components/stations/StationList';
import { useSeismicData } from '@/hooks/useSeismicData';

const Stations: FC = () => {
  const { stations } = useSeismicData();
  
  return (  <>
        
        <div className="p-6">
          <StationList stations={stations} />
        </div>
  </>
  );
};

export default Stations;
