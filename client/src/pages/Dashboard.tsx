import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSeismicData } from '@/hooks/useSeismicData';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2, Radio, Wifi, WifiOff, Activity
} from 'lucide-react';
import type { InfrastructureObject } from '@shared/schema';
import IrkutskMap from '@/components/dashboard/IrkutskMap';

const Dashboard: FC = () => {
  const { isConnected, stations, events } = useSeismicData();

  const { data: objects = [] } = useQuery<InfrastructureObject[]>({
    queryKey: ['/api/infrastructure-objects']
  });

  const onlineStations = stations.filter(s => s.status === 'online').length;
  const monitoredObjects = objects.filter(o => o.isMonitored).length;
  const recentEventsCount = events.filter(e => {
    const ts = new Date(e.timestamp).getTime();
    return Date.now() - ts < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="p-6 space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {isConnected
                  ? <Wifi className="h-5 w-5 text-emerald-600" />
                  : <WifiOff className="h-5 w-5 text-red-600" />}
              </div>
              <div>
                <p className="text-xs text-slate-500">Связь центра</p>
                <p className={`text-sm font-semibold ${isConnected ? 'text-emerald-700' : 'text-red-600'}`}>
                  {isConnected ? 'Активна' : 'Нет связи'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Radio className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Активных датчиков</p>
                <p className="text-sm font-semibold text-slate-800">
                  {onlineStations} / {stations.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Под наблюдением</p>
                <p className="text-sm font-semibold text-slate-800">{monitoredObjects} объектов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Событий за 24ч</p>
                <p className="text-sm font-semibold text-slate-800">{recentEventsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map with inline object detail */}
      <IrkutskMap objects={objects} stations={stations} />

    </div>
  );
};

export default Dashboard;
