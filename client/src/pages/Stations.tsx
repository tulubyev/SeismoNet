import { FC } from 'react';
import { useLocation } from 'wouter';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StationList from '@/components/stations/StationList';
import { usePermission } from '@/hooks/use-permission';

const Stations: FC = () => {
  const [, navigate] = useLocation();
  const { can, canCreate } = usePermission();
  return (
    <div className="p-6 space-y-4">
      {can('stations', 'write') && (
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!canCreate}
            title={!canCreate ? 'Выберите заказчика' : undefined}
            onClick={() => navigate('/stations/new')}
          >
            <Plus className="h-4 w-4 mr-1" />Добавить станцию
          </Button>
        </div>
      )}
      <StationList />
    </div>
  );
};

export default Stations;
