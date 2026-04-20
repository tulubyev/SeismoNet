import { FC, useState } from 'react';
import { Station, InfrastructureObject, SensorInstallation } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Search, MapPin, Signal, Clock, ChevronRight,
  Building2, Radio, Filter, X, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import StationDetailModal from './StationDetailModal';

interface StationListProps {
  stations: Station[];
}

const StationList: FC<StationListProps> = ({ stations }) => {
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [objectFilter, setObjectFilter] = useState('all');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const { data: objects = [] } = useQuery<InfrastructureObject[]>({
    queryKey: ['/api/infrastructure-objects'],
  });
  const { data: installations = [] } = useQuery<SensorInstallation[]>({
    queryKey: ['/api/sensor-installations'],
  });

  const stationsForObject = (objectId: number) =>
    new Set(
      installations
        .filter(i => i.objectId === objectId && i.isActive)
        .map(i => i.stationId)
    );

  const objectsWithStations = objects.filter(o =>
    installations.some(i => i.objectId === o.id && i.isActive)
  );

  const filtered = stations.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      s.stationId.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      (s.location ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchObject = objectFilter === 'all' ||
      stationsForObject(parseInt(objectFilter)).has(s.stationId);
    return matchSearch && matchStatus && matchObject;
  });

  const hasActiveFilters = statusFilter !== 'all' || objectFilter !== 'all' || searchTerm !== '';
  const resetFilters = () => { setStatusFilter('all'); setObjectFilter('all'); setSearchTerm(''); };

  const selectedObject = objectFilter !== 'all'
    ? objects.find(o => String(o.id) === objectFilter)
    : null;

  const sensorsOnObject = selectedObject
    ? installations.filter(i => i.objectId === selectedObject.id && i.isActive).length
    : null;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'online':   return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Онлайн</span>;
      case 'degraded': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Деградация</span>;
      case 'offline':  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Оффлайн</span>;
      default:         return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border">Неизвестно</span>;
    }
  };

  return (
    <>
      <div className="space-y-4">

        {/* ── Filter block ───────────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              Фильтры
              {hasActiveFilters && (
                <Badge className="ml-auto text-[10px] h-5 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                  активны
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Поиск по ID, названию, адресу…"
                  className="pl-9 h-9 text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="online">Онлайн</SelectItem>
                  <SelectItem value="degraded">Деградация</SelectItem>
                  <SelectItem value="offline">Оффлайн</SelectItem>
                </SelectContent>
              </Select>

              {/* Object */}
              <Select value={objectFilter} onValueChange={setObjectFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Все объекты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все объекты</SelectItem>
                  {objectsWithStations.map(o => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active filter info row */}
            {(selectedObject || hasActiveFilters) && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedObject && (
                    <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1">
                      <Building2 className="h-3 w-3" />
                      {selectedObject.name}
                      {sensorsOnObject !== null && (
                        <span className="ml-1 bg-blue-200 text-blue-800 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                          {sensorsOnObject} датч.
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-xs text-slate-500">
                    Найдено: <strong>{filtered.length}</strong> из {stations.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-slate-500 gap-1 hover:text-slate-700"
                  onClick={resetFilters}
                >
                  <X className="h-3 w-3" /> Сбросить
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs">ID станции</TableHead>
                    <TableHead className="text-xs">Название</TableHead>
                    <TableHead className="text-xs">Расположение</TableHead>
                    <TableHead className="text-xs">Объект</TableHead>
                    <TableHead className="text-xs">Статус</TableHead>
                    <TableHead className="text-xs">Поток</TableHead>
                    <TableHead className="text-xs">Обновление</TableHead>
                    <TableHead className="text-xs w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(station => {
                    const stationObj = objects.find(o =>
                      installations.some(i => i.stationId === station.stationId && i.objectId === o.id && i.isActive)
                    );
                    return (
                      <TableRow
                        key={station.stationId}
                        className="cursor-pointer hover:bg-blue-50/60 transition-colors"
                        onClick={() => setSelectedStation(station)}
                      >
                        <TableCell className="font-mono text-xs font-medium text-slate-700">
                          {station.stationId}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{station.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <MapPin className="h-3 w-3 mr-1 text-slate-400 flex-shrink-0" />
                            {station.location || 'Не указано'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {parseFloat(station.latitude.toString()).toFixed(4)}° N,{' '}
                            {parseFloat(station.longitude.toString()).toFixed(4)}° E
                          </div>
                        </TableCell>
                        <TableCell>
                          {stationObj ? (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <Building2 className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{stationObj.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(station.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Signal className="h-3 w-3 mr-1 text-slate-400" />
                            {station.dataRate ? `${station.dataRate.toFixed(1)} МБ/с` : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-slate-500">
                            <Clock className="h-3 w-3 mr-1 text-slate-400" />
                            {format(new Date(station.lastUpdate), 'dd.MM HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10">
                        <Radio className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Станции не найдены</p>
                        {hasActiveFilters && (
                          <button
                            onClick={resetFilters}
                            className="text-xs text-blue-500 hover:underline mt-1"
                          >
                            Сбросить фильтры
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── Network summary ───────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Обзор сети</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs font-medium text-slate-400 mb-1">Всего станций</div>
                <div className="text-2xl font-semibold">{stations.length}</div>
                <div className="text-xs text-slate-400 mt-1">Сеть г. Иркутск</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs font-medium text-slate-400 mb-1">Онлайн</div>
                <div className="text-2xl font-semibold text-green-700">
                  {stations.filter(s => s.status === 'online').length}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {stations.length > 0
                    ? ((stations.filter(s => s.status === 'online').length / stations.length) * 100).toFixed(0)
                    : 0}% от сети
                </div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-xs font-medium text-slate-400 mb-1">Деградация</div>
                <div className="text-2xl font-semibold text-amber-700">
                  {stations.filter(s => s.status === 'degraded').length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Проблемы связи / питания</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs font-medium text-slate-400 mb-1">Оффлайн</div>
                <div className="text-2xl font-semibold text-red-700">
                  {stations.filter(s => s.status === 'offline').length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Требует обслуживания</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <StationDetailModal
        station={selectedStation}
        open={selectedStation !== null}
        onClose={() => setSelectedStation(null)}
      />
    </>
  );
};

export default StationList;
