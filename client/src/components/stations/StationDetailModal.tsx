import { FC, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Station } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  MapPin, Cpu, Wifi, Wrench, Battery, Signal, HardDrive,
  Settings, Activity, Save, RotateCcw, CheckCircle2, AlertCircle, XCircle
} from 'lucide-react';

interface StationDetailModalProps {
  station: Station | null;
  open: boolean;
  onClose: () => void;
}

type SensorNode = { id: string; x: number; y: number; label: string; channel: string };

const DEFAULT_SENSOR_NODES: SensorNode[] = [
  { id: 's1', x: 120, y: 60,  label: 'Ось X', channel: 'CH1' },
  { id: 's2', x: 260, y: 60,  label: 'Ось Y', channel: 'CH2' },
  { id: 's3', x: 200, y: 140, label: 'Ось Z', channel: 'CH3' },
];

const FLOORS = [1, 2, 3, 4];

const FloorPlan: FC<{ nodes: SensorNode[]; onChange: (n: SensorNode[]) => void }> = ({ nodes, onChange }) => {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });

  const SVG_W = 400;
  const SVG_H = 220;

  const handleMouseDown = (e: React.MouseEvent<SVGCircleElement>, id: string) => {
    const svg = (e.target as SVGCircleElement).closest('svg')!.getBoundingClientRect();
    const node = nodes.find(n => n.id === id)!;
    setDragging(id);
    setDragOffset({ dx: e.clientX - svg.left - node.x, dy: e.clientY - svg.top - node.y });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const svg = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(14, Math.min(SVG_W - 14, e.clientX - svg.left - dragOffset.dx));
    const ny = Math.max(14, Math.min(SVG_H - 14, e.clientY - svg.top - dragOffset.dy));
    onChange(nodes.map(n => n.id === dragging ? { ...n, x: nx, y: ny } : n));
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-slate-50">
      <div className="bg-slate-700 text-white text-xs px-3 py-1.5 font-medium flex items-center justify-between">
        <span>Схема здания — размещение датчиков</span>
        <span className="text-slate-400">Перетащите датчик для изменения позиции</span>
      </div>
      <svg
        width={SVG_W}
        height={SVG_H}
        className="w-full"
        style={{ cursor: dragging ? 'grabbing' : 'default', userSelect: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
      >
        {/* building outline */}
        <rect x={10} y={10} width={SVG_W - 20} height={SVG_H - 20} fill="white" stroke="#cbd5e1" strokeWidth="1.5" rx="4" />
        {/* floors */}
        {FLOORS.map((f, i) => {
          const y = 10 + (i * (SVG_H - 20)) / FLOORS.length;
          return (
            <g key={f}>
              {i > 0 && <line x1={10} y1={y} x2={SVG_W - 10} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />}
              <text x={18} y={y + 13} fontSize={9} fill="#94a3b8">{f}-й этаж</text>
            </g>
          );
        })}
        {/* structural columns */}
        {[80, 160, 240, 320].map(cx => (
          <rect key={cx} x={cx - 5} y={14} width={10} height={SVG_H - 28} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
        ))}

        {/* sensor nodes */}
        {nodes.map(node => (
          <g key={node.id}>
            <circle
              cx={node.x} cy={node.y} r={13}
              fill="#3b82f6" fillOpacity={0.15}
              stroke="#3b82f6" strokeWidth={1.5}
              style={{ cursor: 'grab' }}
              onMouseDown={e => handleMouseDown(e, node.id)}
            />
            <circle cx={node.x} cy={node.y} r={5} fill="#3b82f6"
              style={{ cursor: 'grab' }}
              onMouseDown={e => handleMouseDown(e, node.id)}
            />
            <text x={node.x} y={node.y + 24} textAnchor="middle" fontSize={9} fill="#1e40af" fontWeight="600">
              {node.channel}
            </text>
            <text x={node.x} y={node.y + 34} textAnchor="middle" fontSize={8} fill="#64748b">
              {node.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="px-3 py-2 border-t bg-white">
        <div className="flex gap-4">
          {nodes.map(n => (
            <div key={n.id} className="flex items-center gap-1.5 text-xs text-slate-600">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="font-medium">{n.channel}</span>
              <span className="text-slate-400">({n.label})</span>
              <span className="text-slate-400">X:{Math.round(n.x)} Y:{Math.round(n.y)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; icon: FC<any>; cls: string }> = {
    online:   { label: 'Онлайн',    icon: CheckCircle2, cls: 'bg-green-50 text-green-700 border-green-200' },
    degraded: { label: 'Деградация',icon: AlertCircle,  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    offline:  { label: 'Оффлайн',   icon: XCircle,      cls: 'bg-red-50 text-red-700 border-red-200' },
  };
  const s = map[status] ?? { label: status, icon: AlertCircle, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      <s.icon className="h-3 w-3" />
      {s.label}
    </span>
  );
};

const StationDetailModal: FC<StationDetailModalProps> = ({ station, open, onClose }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const initConfig = () => ({
    ip: '192.168.10.10',
    port: '4500',
    protocol: 'TCP',
    bandwidth: '1',
    signalStrength: station?.connectionStrength ?? 85,
    sampleRate: '100',
    timeout: '30',
    retries: '3',
  });

  const initCalib = () => {
    const p = (station?.calibrationParameters as any) ?? {};
    return {
      sensitivity: p.sensitivity ?? '1000',
      gainDb: p.gainDb ?? '0',
      freqLow: p.freqLow ?? '0.1',
      freqHigh: p.freqHigh ?? '50',
      damping: p.damping ?? '0.707',
      naturalFreq: p.naturalFreq ?? '1.0',
      correctionFactor: p.correctionFactor ?? '1.00',
      lastCalibDate: station?.lastCalibrationDate
        ? new Date(station.lastCalibrationDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    };
  };

  const [sensors, setSensors] = useState<SensorNode[]>(DEFAULT_SENSOR_NODES);
  const [commForm, setCommForm] = useState(initConfig);
  const [calibForm, setCalibForm] = useState(initCalib);
  const [infoForm, setInfoForm] = useState({
    name: station?.name ?? '',
    location: station?.location ?? '',
    serialNumber: station?.serialNumber ?? '',
    firmwareVersion: station?.firmwareVersion ?? '',
    hardwareModel: station?.hardwareModel ?? '',
    status: station?.status ?? 'offline',
  });

  const mutation = useMutation({
    mutationFn: (updates: any) =>
      apiRequest('PATCH', `/api/stations/${station?.stationId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      toast({ title: 'Сохранено', description: 'Параметры станции обновлены.' });
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить параметры.', variant: 'destructive' });
    },
  });

  if (!station) return null;

  const saveInfo = () => mutation.mutate({
    name: infoForm.name,
    location: infoForm.location,
    serialNumber: infoForm.serialNumber,
    firmwareVersion: infoForm.firmwareVersion,
    hardwareModel: infoForm.hardwareModel,
    status: infoForm.status,
  });

  const saveCalib = () => mutation.mutate({
    calibrationParameters: {
      sensitivity: parseFloat(calibForm.sensitivity),
      gainDb: parseFloat(calibForm.gainDb),
      freqLow: parseFloat(calibForm.freqLow),
      freqHigh: parseFloat(calibForm.freqHigh),
      damping: parseFloat(calibForm.damping),
      naturalFreq: parseFloat(calibForm.naturalFreq),
      correctionFactor: parseFloat(calibForm.correctionFactor),
      sensorLayout: sensors,
    },
    sensorsCalibrated: true,
    lastCalibrationDate: new Date(calibForm.lastCalibDate),
  });

  const saveComm = () => mutation.mutate({
    connectionStrength: parseInt(commForm.signalStrength.toString()),
    configuration: {
      ip: commForm.ip,
      port: parseInt(commForm.port),
      protocol: commForm.protocol,
      bandwidth: parseFloat(commForm.bandwidth),
      sampleRate: parseInt(commForm.sampleRate),
      timeout: parseInt(commForm.timeout),
      retries: parseInt(commForm.retries),
    },
  });

  const savePlacement = () => {
    mutation.mutate({ calibrationParameters: { ...((station.calibrationParameters as any) ?? {}), sensorLayout: sensors } });
  };

  const F = ({ label, value, onChange, type = 'text', unit }: {
    label: string; value: string | number; onChange: (v: string) => void;
    type?: string; unit?: string;
  }) => (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="flex items-center gap-2">
        <Input type={type} value={value} onChange={e => onChange(e.target.value)}
          className="h-8 text-sm" />
        {unit && <span className="text-xs text-slate-400 whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b bg-slate-50">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
                  <Activity className="h-3.5 w-3.5 text-white" />
                </div>
                {station.name}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-500 font-mono">{station.stationId}</span>
                <StatusBadge status={station.status} />
                {station.sensorsCalibrated && (
                  <span className="text-xs text-green-600 flex items-center gap-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Откалиброван
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4">
          <Tabs defaultValue="info">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="info" className="text-xs gap-1">
                <MapPin className="h-3.5 w-3.5" />Сведения
              </TabsTrigger>
              <TabsTrigger value="placement" className="text-xs gap-1">
                <HardDrive className="h-3.5 w-3.5" />Схема
              </TabsTrigger>
              <TabsTrigger value="calibration" className="text-xs gap-1">
                <Wrench className="h-3.5 w-3.5" />Калибровка
              </TabsTrigger>
              <TabsTrigger value="comm" className="text-xs gap-1">
                <Wifi className="h-3.5 w-3.5" />Связь
              </TabsTrigger>
            </TabsList>

            {/* ── TAB 1: GENERAL INFO ───────────────────────────────────── */}
            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <F label="Название станции" value={infoForm.name}
                  onChange={v => setInfoForm(p => ({ ...p, name: v }))} />
                <F label="Адрес / объект" value={infoForm.location}
                  onChange={v => setInfoForm(p => ({ ...p, location: v }))} />
                <F label="Серийный номер" value={infoForm.serialNumber}
                  onChange={v => setInfoForm(p => ({ ...p, serialNumber: v }))} />
                <F label="Версия прошивки" value={infoForm.firmwareVersion}
                  onChange={v => setInfoForm(p => ({ ...p, firmwareVersion: v }))} />
                <F label="Модель оборудования" value={infoForm.hardwareModel}
                  onChange={v => setInfoForm(p => ({ ...p, hardwareModel: v }))} />
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Статус</Label>
                  <Select value={infoForm.status} onValueChange={v => setInfoForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Онлайн</SelectItem>
                      <SelectItem value="degraded">Деградация</SelectItem>
                      <SelectItem value="offline">Оффлайн</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-50 rounded p-3">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                    <MapPin className="h-3 w-3" /> Координаты
                  </div>
                  <div className="font-mono text-xs">
                    <div>{parseFloat(station.latitude.toString()).toFixed(4)}° N</div>
                    <div>{parseFloat(station.longitude.toString()).toFixed(4)}° E</div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded p-3">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                    <Battery className="h-3 w-3" /> Питание
                  </div>
                  <div className="text-xs">
                    <div>Заряд: <b>{station.batteryLevel ?? '—'}%</b></div>
                    <div>{station.batteryVoltage != null ? `${station.batteryVoltage} В` : '—'}</div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded p-3">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                    <Signal className="h-3 w-3" /> Поток данных
                  </div>
                  <div className="text-xs">
                    <div>{station.dataRate != null ? `${station.dataRate.toFixed(1)} МБ/с` : '—'}</div>
                    <div>Хранилище: {station.storageRemaining ?? '—'}%</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={saveInfo} disabled={mutation.isPending}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="h-3.5 w-3.5" />
                  {mutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </TabsContent>

            {/* ── TAB 2: FLOOR PLAN ────────────────────────────────────── */}
            <TabsContent value="placement" className="space-y-4">
              <p className="text-xs text-slate-500">
                Схема отображает расположение сейсмодатчиков на здании. Перетаскивайте узлы для обновления позиций.
              </p>
              <FloorPlan nodes={sensors} onChange={setSensors} />

              <div className="grid grid-cols-3 gap-3">
                {sensors.map((s, i) => (
                  <div key={s.id} className="border rounded p-3 space-y-2">
                    <div className="text-xs font-medium text-blue-700 flex items-center gap-1">
                      <Cpu className="h-3 w-3" /> {s.channel}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Метка</Label>
                      <Input className="h-7 text-xs" value={s.label}
                        onChange={e => setSensors(prev => prev.map((n, j) => j === i ? { ...n, label: e.target.value } : n))} />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-slate-500">X</Label>
                        <Input type="number" className="h-7 text-xs" value={Math.round(s.x)}
                          onChange={e => setSensors(prev => prev.map((n, j) => j === i ? { ...n, x: parseFloat(e.target.value) || 0 } : n))} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-slate-500">Y</Label>
                        <Input type="number" className="h-7 text-xs" value={Math.round(s.y)}
                          onChange={e => setSensors(prev => prev.map((n, j) => j === i ? { ...n, y: parseFloat(e.target.value) || 0 } : n))} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setSensors(DEFAULT_SENSOR_NODES)} className="gap-1.5 text-xs">
                  <RotateCcw className="h-3 w-3" /> Сбросить
                </Button>
                <Button size="sm" onClick={savePlacement} disabled={mutation.isPending}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="h-3.5 w-3.5" />
                  {mutation.isPending ? 'Сохранение...' : 'Сохранить схему'}
                </Button>
              </div>
            </TabsContent>

            {/* ── TAB 3: CALIBRATION ───────────────────────────────────── */}
            <TabsContent value="calibration" className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span>Параметры амплитудно-частотной характеристики (АЧХ) и чувствительности сейсмодатчика.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <F label="Чувствительность" value={calibForm.sensitivity}
                  onChange={v => setCalibForm(p => ({ ...p, sensitivity: v }))}
                  type="number" unit="В/(м/с)" />
                <F label="Усиление" value={calibForm.gainDb}
                  onChange={v => setCalibForm(p => ({ ...p, gainDb: v }))}
                  type="number" unit="дБ" />
                <F label="Нижняя граница полосы" value={calibForm.freqLow}
                  onChange={v => setCalibForm(p => ({ ...p, freqLow: v }))}
                  type="number" unit="Гц" />
                <F label="Верхняя граница полосы" value={calibForm.freqHigh}
                  onChange={v => setCalibForm(p => ({ ...p, freqHigh: v }))}
                  type="number" unit="Гц" />
                <F label="Коэффициент затухания" value={calibForm.damping}
                  onChange={v => setCalibForm(p => ({ ...p, damping: v }))}
                  type="number" />
                <F label="Собственная частота" value={calibForm.naturalFreq}
                  onChange={v => setCalibForm(p => ({ ...p, naturalFreq: v }))}
                  type="number" unit="Гц" />
                <F label="Поправочный коэффициент" value={calibForm.correctionFactor}
                  onChange={v => setCalibForm(p => ({ ...p, correctionFactor: v }))}
                  type="number" />
                <F label="Дата калибровки" value={calibForm.lastCalibDate}
                  onChange={v => setCalibForm(p => ({ ...p, lastCalibDate: v }))}
                  type="date" />
              </div>

              <Separator />

              <div className="bg-slate-50 rounded p-3 space-y-1">
                <div className="text-xs font-medium text-slate-600 mb-2">Текущее состояние</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Статус калибровки:</span>
                    <Badge variant={station.sensorsCalibrated ? 'default' : 'destructive'} className="text-[10px] h-4">
                      {station.sensorsCalibrated ? 'Калиброван' : 'Не калиброван'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Следующая калибровка:</span>
                    <span className="font-mono">
                      {station.nextCalibrationDue ? new Date(station.nextCalibrationDue).toLocaleDateString('ru-RU') : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={saveCalib} disabled={mutation.isPending}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="h-3.5 w-3.5" />
                  {mutation.isPending ? 'Сохранение...' : 'Применить калибровку'}
                </Button>
              </div>
            </TabsContent>

            {/* ── TAB 4: COMMUNICATION ─────────────────────────────────── */}
            <TabsContent value="comm" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <F label="IP-адрес концентратора" value={commForm.ip}
                  onChange={v => setCommForm(p => ({ ...p, ip: v }))} />
                <F label="Порт" value={commForm.port}
                  onChange={v => setCommForm(p => ({ ...p, port: v }))}
                  type="number" />
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Протокол</Label>
                  <Select value={commForm.protocol} onValueChange={v => setCommForm(p => ({ ...p, protocol: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TCP">TCP</SelectItem>
                      <SelectItem value="UDP">UDP</SelectItem>
                      <SelectItem value="SeedLink">SeedLink</SelectItem>
                      <SelectItem value="FDSN-WS">FDSN-WS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <F label="Пропускная способность" value={commForm.bandwidth}
                  onChange={v => setCommForm(p => ({ ...p, bandwidth: v }))}
                  type="number" unit="МБит/с" />
                <F label="Частота дискретизации" value={commForm.sampleRate}
                  onChange={v => setCommForm(p => ({ ...p, sampleRate: v }))}
                  type="number" unit="Гц" />
                <F label="Уровень сигнала" value={commForm.signalStrength}
                  onChange={v => setCommForm(p => ({ ...p, signalStrength: v }))}
                  type="number" unit="%" />
                <F label="Таймаут соединения" value={commForm.timeout}
                  onChange={v => setCommForm(p => ({ ...p, timeout: v }))}
                  type="number" unit="с" />
                <F label="Повторных попыток" value={commForm.retries}
                  onChange={v => setCommForm(p => ({ ...p, retries: v }))}
                  type="number" />
              </div>

              <Separator />

              <div className="bg-slate-50 rounded p-3">
                <div className="text-xs font-medium text-slate-600 mb-2">Диагностика канала</div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center">
                    <div className="text-slate-400 mb-0.5">Уровень сигнала</div>
                    <div className="text-lg font-bold text-blue-600">{station.connectionStrength ?? '—'}%</div>
                    <div className="h-1.5 bg-slate-200 rounded mt-1">
                      <div className="h-full bg-blue-500 rounded" style={{ width: `${station.connectionStrength ?? 0}%` }} />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-400 mb-0.5">Поток данных</div>
                    <div className="text-lg font-bold text-emerald-600">{station.dataRate?.toFixed(1) ?? '—'} МБ/с</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-400 mb-0.5">Статус</div>
                    <div className="mt-0.5">
                      <StatusBadge status={station.status} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={saveComm} disabled={mutation.isPending}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="h-3.5 w-3.5" />
                  {mutation.isPending ? 'Сохранение...' : 'Сохранить параметры'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StationDetailModal;
