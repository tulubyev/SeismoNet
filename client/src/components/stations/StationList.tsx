import { FC, useState } from 'react';
import { Station, InfrastructureObject, SensorInstallation, Developer } from '@shared/schema';
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
  Building2, Radio, Filter, RefreshCw, Layers
} from 'lucide-react';
import { format } from 'date-fns';
import StationDetailModal from './StationDetailModal';
import DeveloperObjectFilter, {
  type DeveloperObjectFilterValue,
  DEVELOPER_FILTER_DEFAULT,
} from '@/components/DeveloperObjectFilter';

// ─── Constants (mirrored from InfrastructureObjects) ──────────────────────────

const IRKUTSK_DISTRICTS = [
  'Октябрьский',
  'Свердловский',
  'Ленинский',
  'Правобережный',
  'Иркутский район',
];

const constructionTypeOptions = [
  { value: 'all',                 label: 'Все типы конструкций'  },
  { value: 'monolithic',          label: 'Монолит'               },
  { value: 'frame',               label: 'Каркас'                },
  { value: 'brick',               label: 'Кирпич'                },
  { value: 'panel',               label: 'Панельное'             },
  { value: 'reinforced_concrete', label: 'Ж/Б каркас'            },
  { value: 'steel',               label: 'Стальной каркас'       },
  { value: 'masonry',             label: 'Кирпичная кладка'      },
  { value: 'wood',                label: 'Деревянный'            },
  { value: 'mixed',               label: 'Смешанная система'     },
];

// ─────────────────────────────────────────────────────────────────────────────

interface StationListProps {
  stations: Station[];
}

const StationList: FC<StationListProps> = ({ stations }) => {
  const [searchTerm,         setSearchTerm]         = useState('');
  const [statusFilter,       setStatusFilter]       = useState('all');
  const [districtFilter,     setDistrictFilter]     = useState('all');
  const [constructionFilter, setConstructionFilter] = useState('all');
  const [devFilter,          setDevFilter]          = useState<DeveloperObjectFilterValue>(DEVELOPER_FILTER_DEFAULT);
  const [selectedStation,    setSelectedStation]    = useState<Station | null>(null);

  const { data: objects = [] }       = useQuery<InfrastructureObject[]>({ queryKey: ['/api/infrastructure-objects'] });
  const { data: installations = [] } = useQuery<SensorInstallation[]>({ queryKey: ['/api/sensor-installations'] });
  const { data: developers = [] }    = useQuery<Developer[]>({ queryKey: ['/api/developers'] });

  // ── Filter objects the same way InfrastructureObjects does ─────────────────
  const filteredObjects = objects.filter(obj => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      q === '' ||
      obj.name.toLowerCase().includes(q) ||
      (obj.address ?? '').toLowerCase().includes(q) ||
      (obj.objectId ?? '').toLowerCase().includes(q);

    const matchDistrict     = districtFilter === 'all'     || (obj.district ?? '')        === districtFilter;
    const matchConstruction = constructionFilter === 'all' || (obj.structuralSystem ?? '') === constructionFilter;

    const matchDeveloper = devFilter.developerName === 'all' || (obj.developer ?? '') === devFilter.developerName;
    const matchObject    = devFilter.objectId      === 'all' || String(obj.id)         === devFilter.objectId;
    const matchComplex   = devFilter.complexName   === 'all' || (() => {
      const needle = devFilter.complexName.toLowerCase();
      return obj.name.toLowerCase().includes(needle) || (obj.address ?? '').toLowerCase().includes(needle);
    })();

    return matchSearch && matchDistrict && matchConstruction && matchDeveloper && matchComplex && matchObject;
  });

  // ── Station IDs that belong to the filtered objects ─────────────────────────
  const allowedObjectIds = new Set(filteredObjects.map(o => o.id));
  const anyObjectFilter  = districtFilter !== 'all' || constructionFilter !== 'all' ||
    devFilter.developerName !== 'all' || devFilter.complexName !== 'all' || devFilter.objectId !== 'all' || searchTerm !== '';

  const filteredStations = stations.filter(s => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;

    // If any object-level filter is active, restrict to stations attached to filtered objects
    const matchObject = !anyObjectFilter || installations.some(
      i => i.stationId === s.stationId && i.objectId != null && allowedObjectIds.has(i.objectId) && i.isActive
    );
    return matchStatus && matchObject;
  });

  const activeFilterCount = [
    districtFilter !== 'all',
    devFilter.developerName !== 'all',
    devFilter.complexName !== 'all',
    devFilter.objectId !== 'all',
    constructionFilter !== 'all',
    searchTerm !== '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchTerm('');
    setDistrictFilter('all');
    setConstructionFilter('all');
    setDevFilter(DEVELOPER_FILTER_DEFAULT);
  };

  // Helper: which object is a station linked to?
  const stationObject = (s: Station) =>
    objects.find(o => installations.some(i => i.stationId === s.stationId && i.objectId === o.id && i.isActive));

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

        {/* ── Filter block ───────────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              Фильтры станций и датчиков
              {activeFilterCount > 0 && (
                <Badge className="ml-auto text-[10px] h-5 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                  активны: {activeFilterCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4 space-y-3">
            {/* Row 1: search + status + reset */}
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Поиск по объекту, названию, адресу, ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <div className="w-44 flex-shrink-0">
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
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-500 hover:text-red-600 flex-shrink-0" onClick={resetFilters}>
                  Сбросить ({activeFilterCount})
                </Button>
              )}
            </div>

            {/* Row 2: district + construction type */}
            <div className="grid grid-cols-2 gap-3">
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <MapPin className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                  <SelectValue placeholder="Район города" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все районы</SelectItem>
                  {IRKUTSK_DISTRICTS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={constructionFilter} onValueChange={setConstructionFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <Layers className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                  <SelectValue placeholder="Тип конструкции" />
                </SelectTrigger>
                <SelectContent>
                  {constructionTypeOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: hierarchical developer filter */}
            <DeveloperObjectFilter
              developers={developers}
              objects={objects}
              value={devFilter}
              onChange={setDevFilter}
            />

            {anyObjectFilter && (
              <p className="text-xs text-slate-500">
                Объектов подходит: <span className="font-semibold text-blue-600">{filteredObjects.length}</span> из {objects.length} —
                Станций найдено: <span className="font-semibold text-blue-600">{filteredStations.length}</span> из {stations.length}
              </p>
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
                  {filteredStations.map(station => {
                    const obj = stationObject(station);
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
                          {obj ? (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <Building2 className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{obj.name}</span>
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

                  {filteredStations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10">
                        <Radio className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Станции не найдены</p>
                        {activeFilterCount > 0 && (
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
