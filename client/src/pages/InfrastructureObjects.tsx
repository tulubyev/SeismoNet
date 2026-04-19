import { FC, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Building2, Search, MapPin, CheckCircle2, XCircle,
  Calendar, Layers, Shield, AlertTriangle, Filter, Box, Radio,
  Plus, Pencil, Trash2, Save, X as IconX
} from 'lucide-react';
import type { InfrastructureObject, SensorInstallation } from '@shared/schema';
import Building3DViewer, { type SchemaParams } from '@/components/infrastructure/Building3DViewer';
import { apiRequest } from '@/lib/queryClient';

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

const IRKUTSK_DISTRICTS = [
  'Октябрьский',
  'Свердловский',
  'Ленинский',
  'Правобережный',
  'Иркутский район',
];

const constructionTypeOptions = [
  { value: 'all',        label: 'Все типы конструкций' },
  { value: 'monolithic', label: 'Монолит' },
  { value: 'frame',      label: 'Каркас' },
  { value: 'brick',      label: 'Кирпич' },
  { value: 'panel',      label: 'Панельное' },
  // legacy values
  { value: 'reinforced_concrete', label: 'Ж/Б каркас' },
  { value: 'steel',   label: 'Стальной каркас' },
  { value: 'masonry', label: 'Кирпичная кладка' },
  { value: 'wood',    label: 'Деревянный' },
  { value: 'mixed',   label: 'Смешанная система' },
];

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
    monolithic:          'Монолит',
    frame:               'Каркас',
    brick:               'Кирпич',
    panel:               'Панельное',
    reinforced_concrete: 'Ж/Б каркас',
    steel:               'Стальной каркас',
    masonry:             'Кирпичная кладка',
    wood:                'Деревянный',
    mixed:               'Смешанная система',
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

// ─── Blank sensor form ─────────────────────────────────────────────────────────

const BLANK_SENSOR = {
  stationId: '',
  installationLocation: 'ground_floor',
  floor: '',
  measurementAxes: 'Z,NS,EW',
  installationDate: new Date().toISOString().slice(0, 10),
  isActive: true,
  sensorType: 'accelerometer',
  sensitivity: '',
  frequencyRange: '',
  calibrationDate: '',
  notes: '',
};

const LOCATION_OPTS = [
  { value: 'foundation',   label: 'Фундамент' },
  { value: 'ground_floor', label: '1-й этаж' },
  { value: 'mid_floor',    label: 'Средний этаж' },
  { value: 'roof',         label: 'Кровля' },
  { value: 'free_field',   label: 'Свободное поле' },
];
const SENSOR_TYPE_OPTS = [
  { value: 'accelerometer', label: 'Акселерометр' },
  { value: 'velocimeter',   label: 'Велосиметр' },
  { value: 'seismometer',   label: 'Сейсмометр' },
];

// ─── Detail panel ─────────────────────────────────────────────────────────────

const DetailPanel: FC<{ obj: InfrastructureObject; sensors: SensorInstallation[] }> = ({ obj, sensors }) => {
  const cond    = conditionInfo(obj.technicalCondition);
  const queryClient = useQueryClient();

  // Sensor form state
  const [showSensorForm, setShowSensorForm] = useState(false);
  const [editingSensor,  setEditingSensor]  = useState<SensorInstallation | null>(null);
  const [sensorForm, setSensorForm] = useState<typeof BLANK_SENSOR>({ ...BLANK_SENSOR });

  const invalidateSensors = () => queryClient.invalidateQueries({ queryKey: ['/api/sensor-installations', obj.id] });

  const createMutation = useMutation({
    mutationFn: (data: Record<string,unknown>) => apiRequest('POST', '/api/sensor-installations', data),
    onSuccess: () => { invalidateSensors(); setShowSensorForm(false); setSensorForm({ ...BLANK_SENSOR }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string,unknown> }) =>
      apiRequest('PATCH', `/api/sensor-installations/${id}`, data),
    onSuccess: () => { invalidateSensors(); setEditingSensor(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/sensor-installations/${id}`),
    onSuccess: () => invalidateSensors(),
  });

  const updateMutation2 = useMutation({
    mutationFn: (data: Partial<InfrastructureObject>) =>
      apiRequest('PATCH', `/api/infrastructure-objects/${obj.id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/infrastructure-objects'] }),
  });

  const openAddForm = () => {
    setEditingSensor(null);
    setSensorForm({ ...BLANK_SENSOR });
    setShowSensorForm(true);
  };
  const openEditForm = (inst: SensorInstallation) => {
    setEditingSensor(inst);
    setSensorForm({
      stationId: inst.stationId,
      installationLocation: inst.installationLocation ?? 'ground_floor',
      floor: inst.floor != null ? String(inst.floor) : '',
      measurementAxes: inst.measurementAxes ?? 'Z,NS,EW',
      installationDate: inst.installationDate
        ? new Date(inst.installationDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      isActive: inst.isActive,
      sensorType: inst.sensorType ?? 'accelerometer',
      sensitivity: inst.sensitivity != null ? String(inst.sensitivity) : '',
      frequencyRange: inst.frequencyRange ?? '',
      calibrationDate: inst.calibrationDate
        ? new Date(inst.calibrationDate).toISOString().slice(0, 10)
        : '',
      notes: inst.notes ?? '',
    });
    setShowSensorForm(true);
  };

  const handleSensorSubmit = () => {
    const payload = {
      objectId: obj.id,
      stationId: sensorForm.stationId,
      installationLocation: sensorForm.installationLocation,
      floor: sensorForm.floor ? parseInt(sensorForm.floor) : null,
      measurementAxes: sensorForm.measurementAxes,
      installationDate: new Date(sensorForm.installationDate).toISOString(),
      isActive: sensorForm.isActive,
      sensorType: sensorForm.sensorType || null,
      sensitivity: sensorForm.sensitivity ? parseFloat(sensorForm.sensitivity) : null,
      frequencyRange: sensorForm.frequencyRange || null,
      calibrationDate: sensorForm.calibrationDate ? new Date(sensorForm.calibrationDate).toISOString() : null,
      notes: sensorForm.notes || null,
    };
    if (editingSensor) {
      updateMutation.mutate({ id: editingSensor.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleSaveSchema = (params: SchemaParams) => {
    updateMutation2.mutate({ floors: params.floors, structuralSystem: params.structuralSystem });
  };

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
            <Building3DViewer
              object={obj}
              sensors={sensors}
              editMode={true}
              onSaveSchema={handleSaveSchema}
            />
          </TabsContent>

          {/* ── Tab: Sensors list ── */}
          <TabsContent value="sensors" className="mt-0 space-y-3">

            {/* Add sensor button */}
            {!showSensorForm && (
              <Button
                size="sm"
                className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                onClick={openAddForm}
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить датчик
              </Button>
            )}

            {/* Sensor form */}
            {showSensorForm && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-700">
                    {editingSensor ? 'Редактировать датчик' : 'Новый датчик'}
                  </p>
                  <button onClick={() => setShowSensorForm(false)} className="text-slate-400 hover:text-slate-600">
                    <IconX className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[11px] text-slate-500">ID станции / датчика *</Label>
                    <Input
                      placeholder="IRK-ST-01"
                      value={sensorForm.stationId}
                      onChange={e => setSensorForm(f => ({ ...f, stationId: e.target.value }))}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Расположение</Label>
                    <Select
                      value={sensorForm.installationLocation}
                      onValueChange={v => setSensorForm(f => ({ ...f, installationLocation: v }))}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATION_OPTS.map(o => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Этаж</Label>
                    <Input
                      type="number" placeholder="1"
                      value={sensorForm.floor}
                      onChange={e => setSensorForm(f => ({ ...f, floor: e.target.value }))}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Тип датчика</Label>
                    <Select
                      value={sensorForm.sensorType}
                      onValueChange={v => setSensorForm(f => ({ ...f, sensorType: v }))}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SENSOR_TYPE_OPTS.map(o => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Оси измерений</Label>
                    <Input
                      placeholder="Z,NS,EW"
                      value={sensorForm.measurementAxes}
                      onChange={e => setSensorForm(f => ({ ...f, measurementAxes: e.target.value }))}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Диапазон частот</Label>
                    <Input
                      placeholder="0.1–50 Гц"
                      value={sensorForm.frequencyRange}
                      onChange={e => setSensorForm(f => ({ ...f, frequencyRange: e.target.value }))}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Чувствительность В/(м/с)</Label>
                    <Input
                      type="number" placeholder="10.0"
                      value={sensorForm.sensitivity}
                      onChange={e => setSensorForm(f => ({ ...f, sensitivity: e.target.value }))}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Дата установки *</Label>
                    <Input
                      type="date"
                      value={sensorForm.installationDate}
                      onChange={e => setSensorForm(f => ({ ...f, installationDate: e.target.value }))}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Дата калибровки</Label>
                    <Input
                      type="date"
                      value={sensorForm.calibrationDate}
                      onChange={e => setSensorForm(f => ({ ...f, calibrationDate: e.target.value }))}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[11px] text-slate-500">Примечания</Label>
                    <Input
                      placeholder="Дополнительная информация..."
                      value={sensorForm.notes}
                      onChange={e => setSensorForm(f => ({ ...f, notes: e.target.value }))}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={sensorForm.isActive}
                      onChange={e => setSensorForm(f => ({ ...f, isActive: e.target.checked }))}
                      className="h-3.5 w-3.5 accent-purple-600"
                    />
                    <Label htmlFor="isActive" className="text-[11px] text-slate-600 cursor-pointer">
                      Датчик активен
                    </Label>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => setShowSensorForm(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1"
                    disabled={!sensorForm.stationId || createMutation.isPending || updateMutation.isPending}
                    onClick={handleSensorSubmit}
                  >
                    <Save className="h-3 w-3" />
                    {createMutation.isPending || updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </div>
              </div>
            )}

            {/* Sensors list */}
            {sensors.length === 0 && !showSensorForm ? (
              <div className="text-center py-6">
                <Radio className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs text-slate-400">Датчики не привязаны к объекту</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sensors.map(inst => (
                  <div key={inst.id} className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
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
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          className="p-1 rounded hover:bg-blue-100 text-blue-500 transition-colors"
                          onClick={() => openEditForm(inst)}
                          title="Редактировать"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
                          onClick={() => { if (confirm(`Удалить датчик ${inst.stationId}?`)) deleteMutation.mutate(inst.id); }}
                          title="Удалить"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
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
                          <p className="text-[11px] text-slate-600">{SENSOR_TYPE_OPTS.find(o => o.value === inst.sensorType)?.label ?? inst.sensorType}</p>
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


// ─── Main page ────────────────────────────────────────────────────────────────

const InfrastructureObjects: FC = () => {
  const [search,           setSearch]           = useState('');
  const [districtFilter,   setDistrictFilter]   = useState('all');
  const [developerSearch,  setDeveloperSearch]  = useState('');
  const [constructionFilter, setConstructionFilter] = useState('all');
  const [yearFrom,         setYearFrom]         = useState('');
  const [yearTo,           setYearTo]           = useState('');
  const [selectedObj,      setSelectedObj]       = useState<InfrastructureObject | null>(null);

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
    const q = search.toLowerCase();
    const matchSearch = q === '' ||
      obj.name.toLowerCase().includes(q) ||
      (obj.address ?? '').toLowerCase().includes(q) ||
      (obj.objectId ?? '').toLowerCase().includes(q);

    const matchDistrict = districtFilter === 'all' ||
      (obj.district ?? '') === districtFilter;

    const matchDeveloper = developerSearch === '' ||
      (obj.developer ?? '').toLowerCase().includes(developerSearch.toLowerCase());

    const matchConstruction = constructionFilter === 'all' ||
      (obj.structuralSystem ?? '') === constructionFilter;

    const yr = obj.constructionYear ?? 0;
    const matchYearFrom = yearFrom === '' || yr >= parseInt(yearFrom);
    const matchYearTo   = yearTo   === '' || yr <= parseInt(yearTo);

    return matchSearch && matchDistrict && matchDeveloper && matchConstruction && matchYearFrom && matchYearTo;
  });

  const activeFilterCount = [
    districtFilter !== 'all',
    developerSearch !== '',
    constructionFilter !== 'all',
    yearFrom !== '',
    yearTo !== '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setDistrictFilter('all');
    setDeveloperSearch('');
    setConstructionFilter('all');
    setYearFrom('');
    setYearTo('');
    setSearch('');
  };

  const stats = {
    total:     objects.length,
    monitored: objects.filter(o => o.isMonitored).length,
    good:      objects.filter(o => o.technicalCondition === 'good').length,
    critical:  objects.filter(o => o.technicalCondition === 'critical' || o.technicalCondition === 'poor').length,
  };

  return (  <>

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
                <CardContent className="pt-4 pb-3 space-y-3">
                  {/* Row 1: search + reset */}
                  <div className="flex gap-3 items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Поиск по названию, адресу, ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                      />
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
                        {constructionTypeOptions.slice(0, 5).map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Row 3: developer + year range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Застройщик / подрядчик"
                        value={developerSearch}
                        onChange={e => setDeveloperSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="с года"
                          value={yearFrom}
                          onChange={e => setYearFrom(e.target.value.replace(/\D/g, ''))}
                          maxLength={4}
                          className="pl-8 h-9 text-sm"
                        />
                      </div>
                      <div className="relative flex-1">
                        <Input
                          placeholder="по год"
                          value={yearTo}
                          onChange={e => setYearTo(e.target.value.replace(/\D/g, ''))}
                          maxLength={4}
                          className="pl-2 h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  {filtered.length !== objects.length && (
                    <p className="text-xs text-slate-500">
                      Найдено: <span className="font-semibold text-blue-600">{filtered.length}</span> из {objects.length}
                    </p>
                  )}
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
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                  {obj.address && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                      <MapPin className="h-3 w-3 flex-shrink-0" /> {obj.address}
                                    </p>
                                  )}
                                  {obj.district && (
                                    <p className="text-xs text-blue-600 font-medium">
                                      {obj.district} р-н
                                    </p>
                                  )}
                                </div>
                                {obj.developer && (
                                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                    <Shield className="h-3 w-3 flex-shrink-0" /> {obj.developer}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  <Badge variant="outline" className="text-[10px] h-5">{objectTypeLabel(obj.objectType)}</Badge>
                                  {obj.structuralSystem && (
                                    <Badge variant="outline" className="text-[10px] h-5">{structuralSystemLabel(obj.structuralSystem)}</Badge>
                                  )}
                                  {obj.constructionYear && (
                                    <Badge variant="outline" className="text-[10px] h-5">{obj.constructionYear} г.</Badge>
                                  )}
                                  {obj.seismicCategory && (
                                    <Badge className={`text-[10px] h-5 hover:bg-opacity-80 ${seismicCategoryColor(obj.seismicCategory)}`}>
                                      Кат. {obj.seismicCategory}
                                    </Badge>
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
  </>
  );
};

export default InfrastructureObjects;
