import { FC, useState } from 'react';
import { Station } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Search, Filter, MapPin, Activity, Signal, RefreshCw, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import StationDetailModal from './StationDetailModal';

interface StationListProps {
  stations: Station[];
}

const StationList: FC<StationListProps> = ({ stations }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  
  const filteredStations = stations.filter(station => {
    const matchesSearch = 
      station.stationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (station.location && station.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || station.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Онлайн</span>;
      case 'degraded':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Деградация</span>;
      case 'offline':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">Оффлайн</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border">Неизвестно</span>;
    }
  };
  
  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input 
                  placeholder="Поиск по ID, названию, адресу..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <div className="w-44">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все станции" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все станции</SelectItem>
                      <SelectItem value="online">Онлайн</SelectItem>
                      <SelectItem value="degraded">Деградация</SelectItem>
                      <SelectItem value="offline">Оффлайн</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs">ID станции</TableHead>
                    <TableHead className="text-xs">Название</TableHead>
                    <TableHead className="text-xs">Расположение</TableHead>
                    <TableHead className="text-xs">Статус</TableHead>
                    <TableHead className="text-xs">Поток</TableHead>
                    <TableHead className="text-xs">Обновление</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStations.map(station => (
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
                          <span>{station.location || 'Не указано'}</span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {parseFloat(station.latitude.toString()).toFixed(4)}° N, {parseFloat(station.longitude.toString()).toFixed(4)}° E
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(station.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Signal className="h-3 w-3 mr-1 text-slate-400" />
                          <span>{station.dataRate ? `${station.dataRate.toFixed(1)} МБ/с` : 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-slate-500">
                          <Clock className="h-3 w-3 mr-1 text-slate-400" />
                          <span>{format(new Date(station.lastUpdate), 'dd.MM HH:mm')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-slate-400">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {filteredStations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <p className="text-slate-400">Станции не найдены</p>
                        {searchTerm && (
                          <p className="text-sm text-slate-400 mt-1">
                            Попробуйте изменить запрос или сбросить фильтры
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-slate-400">
                Показано {filteredStations.length} из {stations.length} станций
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-slate-700 mb-4">Обзор сети</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-medium text-slate-400 mb-1">Всего станций</div>
                <div className="text-2xl font-semibold">{stations.length}</div>
                <div className="text-xs text-slate-400 mt-1">Сеть г. Иркутск</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-xs font-medium text-slate-400 mb-1">Онлайн</div>
                <div className="text-2xl font-semibold text-green-700">
                  {stations.filter(s => s.status === 'online').length}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {stations.length > 0 ? ((stations.filter(s => s.status === 'online').length / stations.length) * 100).toFixed(0) : 0}% от сети
                </div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="text-xs font-medium text-slate-400 mb-1">Деградация</div>
                <div className="text-2xl font-semibold text-amber-700">
                  {stations.filter(s => s.status === 'degraded').length}
                </div>
                <div className="text-xs text-slate-400 mt-1">Проблемы связи / питания</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
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
