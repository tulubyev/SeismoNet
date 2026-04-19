import { FC } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useSeismicData } from '@/hooks/useSeismicData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2, Radio, Activity, CheckCircle2,
  XCircle, Wifi, WifiOff, ArrowRight, Gauge, Clock
} from 'lucide-react';
import type { InfrastructureObject, SeismogramRecord } from '@shared/schema';
import IrkutskMap from '@/components/dashboard/IrkutskMap';

const statusColor = (status: string) => {
  switch (status) {
    case 'online': return 'bg-emerald-500';
    case 'degraded': return 'bg-amber-500';
    case 'offline': return 'bg-red-500';
    default: return 'bg-slate-400';
  }
};

const conditionBadge = (condition: string | null) => {
  switch (condition) {
    case 'good': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Хорошее</Badge>;
    case 'satisfactory': return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Удовл.</Badge>;
    case 'poor': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Плохое</Badge>;
    case 'critical': return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Крит.</Badge>;
    default: return <Badge variant="outline">Н/Д</Badge>;
  }
};

const objectTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    residential: 'Жилое', industrial: 'Промышл.', bridge: 'Мост',
    dam: 'Плотина', hospital: 'Больница', school: 'Школа',
    admin: 'Административное', other: 'Прочее'
  };
  return labels[type] || type;
};

const Dashboard: FC = () => {
  const { isConnected, stations, events, networkStatus } = useSeismicData();

  const { data: objects = [] } = useQuery<InfrastructureObject[]>({
    queryKey: ['/api/infrastructure-objects']
  });

  const { data: recentSeismograms = [] } = useQuery<SeismogramRecord[]>({
    queryKey: ['/api/seismograms'],
    refetchInterval: 30000
  });

  const onlineStations = stations.filter(s => s.status === 'online').length;
  const monitoredObjects = objects.filter(o => o.isMonitored).length;
  const recentEventsCount = events.filter(e => {
    const ts = new Date(e.timestamp).getTime();
    return Date.now() - ts < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Header
          title="Центр мониторинга г. Иркутска"
          subtitle="Сеть сейсмических наблюдений за объектами гражданской и промышленной инфраструктуры"
        />

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

          {/* Irkutsk map */}
          <IrkutskMap objects={objects} stations={stations} />

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Station list */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Radio className="h-4 w-4 text-blue-600" />
                      Сейсмические станции
                    </CardTitle>
                    <Link href="/stations">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700">
                        Все <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {stations.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">Нет данных</p>
                  ) : (
                    stations.slice(0, 6).map(station => (
                      <div key={station.stationId} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor(station.status)}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-800 truncate">{station.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{station.stationId}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-[10px] text-slate-500">{station.dataRate ?? '—'} sps</p>
                          {station.batteryLevel != null && (
                            <p className="text-[10px] text-slate-500">🔋 {station.batteryLevel}%</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Infrastructure objects */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-600" />
                      Объекты инфраструктуры
                    </CardTitle>
                    <Link href="/infrastructure">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700">
                        Все <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {objects.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">Загрузка объектов...</p>
                    ) : (
                      objects.slice(0, 5).map(obj => (
                        <div key={obj.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-1.5 rounded-md flex-shrink-0 ${obj.isMonitored ? 'bg-purple-100' : 'bg-slate-200'}`}>
                              <Building2 className={`h-3.5 w-3.5 ${obj.isMonitored ? 'text-purple-600' : 'text-slate-500'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-800 truncate">{obj.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {objectTypeLabel(obj.objectType)}
                                {obj.floors ? ` · ${obj.floors} эт.` : ''}
                                {obj.constructionYear ? ` · ${obj.constructionYear} г.` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {conditionBadge(obj.technicalCondition)}
                            {obj.isMonitored
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              : <XCircle className="h-4 w-4 text-slate-300" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Recent seismograms */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-orange-600" />
                    Последние записи сейсмограмм
                  </CardTitle>
                  <Link href="/seismograms">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700">
                      Архив <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {recentSeismograms.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Нет сохранённых записей</p>
                    <Link href="/seismograms">
                      <Button variant="outline" size="sm" className="mt-3 text-xs h-7">
                        Онлайн-просмотр
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentSeismograms.slice(0, 4).map(rec => (
                      <div key={rec.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <div>
                          <p className="text-xs font-medium text-slate-700">{rec.stationId}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(rec.startTime).toLocaleString('ru-RU')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px]">{rec.recordingType}</Badge>
                          {rec.peakGroundAcceleration && (
                            <p className="text-[10px] text-slate-500 mt-0.5">PGA: {rec.peakGroundAcceleration.toFixed(3)}g</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System health */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-blue-600" />
                  Состояние системы
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {[
                  { label: 'Обработка данных', value: networkStatus?.dataProcessingHealth ?? 0 },
                  { label: 'Сетевое подключение', value: networkStatus?.networkConnectivityHealth ?? 0 },
                  { label: 'Хранилище', value: networkStatus?.storageCapacityHealth ?? 0 },
                  { label: 'API-производительность', value: networkStatus?.apiPerformanceHealth ?? 0 }
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-600">{item.label}</span>
                      <span className="text-xs font-medium text-slate-700">{item.value}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.value >= 90 ? 'bg-emerald-500' :
                          item.value >= 70 ? 'bg-blue-500' :
                          item.value >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" /> Онлайн: {onlineStations}
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500" /> Деград.: {stations.filter(s => s.status === 'degraded').length}
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" /> Офлайн: {stations.filter(s => s.status === 'offline').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
