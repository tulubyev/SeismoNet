import { FC, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Building2, Search, MapPin, CheckCircle2, XCircle,
  Calendar, Layers, Shield, AlertTriangle, Filter, Box
} from 'lucide-react';
import type { InfrastructureObject, SensorInstallation } from '@shared/schema';
import Building3DViewer from '@/components/infrastructure/Building3DViewer';

// ─── Lookup helpers ───────────────────────────────────────────────────────────

const objectTypeOptions = [
  { value: 'all',         label: 'Все типы' },
  { value: 'residential', label: 'Жилое' },
  { value: 'industrial',  label: 'Промышленное' },
  { value: 'bridge',      label: 'Мост / Путепровод' },
  { value: 'dam',         label: 'Плотина / ГТС' },
  { value: 'hospital',    label: 'Больница' },
  { value: 'school',      label: 'Школа / ВУЗ' },
  { value: 'admin',       label: 'Административное' },
  { value: 'other',       label: 'Прочее' },
];

const objectTypeLabel = (type: string) => {
  const found = objectTypeOptions.find(o => o.value === type);
  return found ? found.label : type;
};

const conditionInfo = (condition: string | null) => {
  switch (condition) {
    case 'good':         return { label: 'Хорошее',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> };
    case 'satisfactory': return { label: 'Удовл.',       cls: 'bg-blue-100    text-blue-700    border-blue-200',    icon: null };
    case 'poor':         return { label: 'Плохое',       cls: 'bg-amber-100   text-amber-700   border-amber-200',   icon: <AlertTriangle className="h-3 w-3" /> };
    case 'critical':     return { label: 'Критическое', cls: 'bg-red-100      text-red-700     border-red-200',     icon: <AlertTriangle className="h-3 w-3" /> };
    default:             return { label: 'Н/Д',          cls: 'bg-slate-100   text-slate-500',                      icon: null };
  }
};

const seismicCategoryColor = (cat: string | null) => {
  switch (cat) {
    case 'I':   return 'bg-red-100    text-red-700    border-red-200';
    case 'II':  return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'III': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'IV':  return 'bg-green-100  text-green-700  border-green-200';
    default:    return 'bg-slate-100  text-slate-500';
  }
};

const structuralSystemLabel = (sys: string | null) => {
  const labels: Record<string, string> = {
    reinforced_concrete: 'Ж/Б каркас',
    steel:   'Стальной каркас',
    masonry: 'Кирпичная кладка',
    wood:    'Деревянный',
    mixed:   'Смешанная система',
  };
  return sys ? (labels[sys] ?? sys) : '—';
};

const installationLocationLabel = (loc: string | null) => {
  const labels: Record<string, string> = {
    foundation:   'Фундамент',
    ground_floor: '1-й этаж',
    mid_floor:    'Средний этаж',
    roof:         'Кровля',
    free_field:   'Свободное поле',
  };
  return loc ? (labels[loc] ?? loc) : '—';
};

// ─── Detail panel ─────────────────────────────────────────────────────────────

const DetailPanel: FC<{ obj: InfrastructureObject; sensors: SensorInstallation[] }> = ({ obj, sensors }) => {
  const cond = conditionInfo(obj.technicalCondition);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-purple-600" />
          {obj.name}
        </CardTitle>
        {obj.address && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 flex-shrink-0" />{obj.address}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs defaultValue="info">
          <TabsList className="w-full mb-3 h-8">
            <TabsTrigger value="info"   className="text-xs flex-1">Параметры</TabsTrigger>
            <TabsTrigger value="3d"     className="text-xs flex-1 flex items-center gap-1">
              <Box className="h-3 w-3" />3D Схема
            </TabsTrigger>
            <TabsTrigger value="sensors" className="text-xs flex-1">
              Датчики ({sensors.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Parameters ── */}
          <TabsContent value="info" className="space-y-4 mt-0">
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Тип</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{objectTypeLabel(obj.objectType)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Год постройки</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  {obj.constructionYear ?? 'Н/Д'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Этажность</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">
                  {obj.floors ? `${obj.floors} эт.` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Конструктив</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{structuralSystemLabel(obj.structuralSystem)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Кат. грунта (СП14)</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">
                  {obj.seismicCategory ? `Категория ${obj.seismicCategory}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Расч. интенс.</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5 flex items-center gap-1">
                  <Shield className="h-3 w-3 text-slate-400" />
                  {obj.designIntensity ? `${obj.designIntensity} балл.` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Тип фундамента</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{obj.foundationType ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Тех. состояние</p>
                <div className="mt-0.5">
                  <Badge className={`text-[10px] h-5 flex items-center gap-1 w-fit hover:bg-opacity-80 ${cond.cls}`}>
                    {cond.icon}{cond.label}
                  </Badge>
                </div>
              </div>
            </div>

            {obj.description && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Описание</p>
                <p className="text-xs text-slate-600">{obj.description}</p>
              </div>
            )}
            {obj.responsibleOrganization && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Ответственная организация</p>
                <p className="text-xs text-slate-600">{obj.responsibleOrganization}</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-500">
                {Number(obj.latitude).toFixed(4)}°N, {Number(obj.longitude).toFixed(4)}°E
              </span>
            </div>
          </TabsContent>

          {/* ── Tab: 3D Viewer ── */}
          <TabsContent value="3d" className="mt-0">
            <Building3DViewer object={obj} sensors={sensors} />
          </TabsContent>

          {/* ── Tab: Sensors list ── */}
          <TabsContent value="sensors" className="mt-0">
            {sensors.length === 0 ? (
              <div className="text-center py-8">
                <Radio className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs text-slate-400">Датчики не привязаны к объекту</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sensors.map(inst => (
                  <div key={inst.id} className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700 font-mono">{inst.stationId}</p>
                      <Badge
                        className={`text-[9px] h-4 hover:bg-opacity-80 ${
                          inst.isActive
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {inst.isActive ? 'Активен' : 'Откл.'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <div>
                        <p className="text-[9px] text-slate-400">Расположение</p>
                        <p className="text-[11px] text-slate-600">{installationLocationLabel(inst.installationLocation)}</p>
                      </div>
                      {inst.floor != null && (
                        <div>
                          <p className="text-[9px] text-slate-400">Этаж</p>
                          <p className="text-[11px] text-slate-600">{inst.floor}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[9px] text-slate-400">Оси измерений</p>
                        <p className="text-[11px] text-slate-600 font-mono">{inst.measurementAxes}</p>
                      </div>
                      {inst.sensorType && (
                        <div>
                          <p className="text-[9px] text-slate-400">Тип датчика</p>
                          <p className="text-[11px] text-slate-600">{inst.sensorType}</p>
                        </div>
                      )}
                      {inst.frequencyRange && (
                        <div>
                          <p className="text-[9px] text-slate-400">Диапазон частот</p>
                          <p className="text-[11px] text-slate-600 font-mono">{inst.frequencyRange}</p>
                        </div>
                      )}
                      {inst.sensitivity && (
                        <div>
                          <p className="text-[9px] text-slate-400">Чувствительность</p>
                          <p className="text-[11px] text-slate-600">{inst.sensitivity} В/(м/с)</p>
                        </div>
                      )}
                    </div>
                    {inst.calibrationDate && (
                      <p className="text-[9px] text-slate-400">
                        Калибровка: {new Date(inst.calibrationDate).toLocaleDateString('ru-RU')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Placeholder to fix unused import error
const Radio = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
  </svg>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const InfrastructureObjects: FC = () => {
  const [search,        setSearch]        = useState('');
  const [typeFilter,    setTypeFilter]    = useState('all');
  const [monitoredOnly, setMonitoredOnly] = useState(false);
  const [selectedObj,   setSelectedObj]   = useState<InfrastructureObject | null>(null);

  const { data: objects = [], isLoading } = useQuery<InfrastructureObject[]>({
    queryKey: ['/api/infrastructure-objects']
  });

  const { data: sensorInstallations = [] } = useQuery<SensorInstallation[]>({
    queryKey: ['/api/sensor-installations', selectedObj?.id],
    queryFn: async () => {
      if (!selectedObj) return [];
      const res = await fetch(`/api/sensor-installations?objectId=${selectedObj.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!selectedObj
  });

  const filtered = objects.filter(obj => {
    const matchSearch = search === '' ||
      obj.name.toLowerCase().includes(search.toLowerCase()) ||
      (obj.address ?? '').toLowerCase().includes(search.toLowerCase());
    const matchType     = typeFilter === 'all' || obj.objectType === typeFilter;
    const matchMonitored = !monitoredOnly || obj.isMonitored;
    return matchSearch && matchType && matchMonitored;
  });

  const stats = {
    total:     objects.length,
    monitored: objects.filter(o => o.isMonitored).length,
    good:      objects.filter(o => o.technicalCondition === 'good').length,
    critical:  objects.filter(o => o.technicalCondition === 'critical' || o.technicalCondition === 'poor').length,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Header
          title="Объекты инфраструктуры"
          subtitle="Гражданские и промышленные объекты г. Иркутска под сейсмическим наблюдением"
        />

        <div className="p-6 space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Всего объектов',    value: stats.total,     color: 'text-slate-700',  bg: 'bg-slate-100'  },
              { label: 'Под мониторингом',  value: stats.monitored, color: 'text-purple-700', bg: 'bg-purple-100' },
              { label: 'Хорошее состояние', value: stats.good,      color: 'text-emerald-700',bg: 'bg-emerald-100'},
              { label: 'Требует внимания',  value: stats.critical,  color: 'text-red-700',    bg: 'bg-red-100'    },
            ].map(s => (
              <Card key={s.label} className="border-0 shadow-sm bg-white">
                <CardContent className="pt-4 pb-3">
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${s.bg}`}>
                    <Building2 className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Filters + List */}
            <div className="lg:col-span-2 space-y-4">

              {/* Filters */}
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="pt-4 pb-3">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Поиск по названию или адресу..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-9 w-44 text-sm">
                        <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {objectTypeOptions.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant={monitoredOnly ? 'default' : 'outline'}
                      size="sm"
                      className="h-9 text-xs"
                      onClick={() => setMonitoredOnly(v => !v)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Только мониторинг
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Object list */}
              <div className="space-y-2">
                {isLoading ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="py-12 text-center text-slate-400 text-sm">Загрузка...</CardContent>
                  </Card>
                ) : filtered.length === 0 ? (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="py-12 text-center text-slate-400 text-sm">Объекты не найдены</CardContent>
                  </Card>
                ) : (
                  filtered.map(obj => {
                    const cond       = conditionInfo(obj.technicalCondition);
                    const isSelected = selectedObj?.id === obj.id;
                    return (
                      <Card
                        key={obj.id}
                        className={`border-0 shadow-sm cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
                        onClick={() => setSelectedObj(isSelected ? null : obj)}
                      >
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${obj.isMonitored ? 'bg-purple-100' : 'bg-slate-100'}`}>
                                <Building2 className={`h-4 w-4 ${obj.isMonitored ? 'text-purple-600' : 'text-slate-400'}`} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-slate-800">{obj.name}</p>
                                  {obj.isMonitored
                                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                    : <XCircle      className="h-3.5 w-3.5 text-slate-300   flex-shrink-0" />}
                                </div>
                                {obj.address && (
                                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3 flex-shrink-0" /> {obj.address}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  <Badge variant="outline" className="text-[10px] h-5">{objectTypeLabel(obj.objectType)}</Badge>
                                  {obj.seismicCategory && (
                                    <Badge className={`text-[10px] h-5 hover:bg-opacity-80 ${seismicCategoryColor(obj.seismicCategory)}`}>
                                      Кат. {obj.seismicCategory}
                                    </Badge>
                                  )}
                                  {obj.designIntensity && (
                                    <Badge variant="outline" className="text-[10px] h-5">{obj.designIntensity} балл.</Badge>
                                  )}
                                  {obj.floors && (
                                    <Badge variant="outline" className="text-[10px] h-5">{obj.floors} эт.</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <Badge className={`text-[10px] h-5 flex items-center gap-1 hover:bg-opacity-80 ${cond.cls}`}>
                                {cond.icon}{cond.label}
                              </Badge>
                              {isSelected && (
                                <Badge className="text-[9px] h-4 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                                  <Box className="h-2.5 w-2.5 mr-0.5" />3D
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detail panel */}
            <div className="lg:col-span-1">
              {selectedObj ? (
                <div className="sticky top-4">
                  <DetailPanel obj={selectedObj} sensors={sensorInstallations} />
                </div>
              ) : (
                <Card className="border-0 shadow-sm bg-slate-50 border-dashed border border-slate-200">
                  <CardContent className="py-16 text-center">
                    <Building2 className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm text-slate-400 font-medium">Выберите объект</p>
                    <p className="text-xs text-slate-400 mt-1">для просмотра параметров и 3D-схемы</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InfrastructureObjects;
