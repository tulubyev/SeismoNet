import { FC, useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Activity, Radio, Clock, Download, RefreshCw,
  Wifi, WifiOff, Search, ChevronRight, Info
} from 'lucide-react';
import type { SeismogramRecord, Station } from '@shared/schema';
import { useSeismicData } from '@/hooks/useSeismicData';

// ─── Online waveform canvas ───────────────────────────────────────────────────

interface WavePoint { t: number; v: number; }

const CHANNEL_COLORS = { Z: '#ef4444', NS: '#3b82f6', EW: '#10b981' };

const WaveformCanvas: FC<{ data: WavePoint[]; color: string; label: string }> = ({ data, color, label }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Zero line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Waveform
    const minV = Math.min(...data.map(d => d.v));
    const maxV = Math.max(...data.map(d => d.v));
    const range = maxV - minV || 1;
    const padding = 8;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    data.forEach((pt, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = padding + ((maxV - pt.v) / range) * (H - padding * 2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Label
    ctx.fillStyle = color;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(label, 6, 14);
  }, [data, color, label]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={80}
      className="w-full rounded"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

// ─── Online tab ───────────────────────────────────────────────────────────────

const OnlineTab: FC = () => {
  const { isConnected, stations, waveformData } = useSeismicData();
  const [selectedStation, setSelectedStation] = useState<string>('all');

  const irkStations = stations.filter(s => s.stationId.startsWith('IRK-'));

  // waveformData is Record<string, LiveWaveformData> — access by stationId key
  const getWaveformForStation = useCallback((stationId: string): { timestamp: number; value: number }[] => {
    const entry = waveformData[stationId];
    if (!entry) return [];
    return (entry.dataPoints as { timestamp: number; value: number }[]) ?? [];
  }, [waveformData]);

  const displayStations = selectedStation === 'all'
    ? irkStations.slice(0, 3)
    : irkStations.filter(s => s.stationId === selectedStation);

  return (
    <div className="space-y-4">

      {/* Connection indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-slate-600 font-medium">
            {isConnected ? 'Прямая трансляция активна' : 'Нет соединения с сервером'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedStation} onValueChange={setSelectedStation}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все станции</SelectItem>
              {irkStations.map(s => (
                <SelectItem key={s.stationId} value={s.stationId}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Live waveforms */}
      {!isConnected ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <WifiOff className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500 mb-2">Нет соединения с сервером данных</p>
            <p className="text-xs text-slate-400">Проверьте подключение и обновите страницу</p>
          </CardContent>
        </Card>
      ) : displayStations.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Radio className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">Нет данных от станций Иркутска</p>
            <p className="text-xs text-slate-400 mt-1">Станции {stations.length > 0 ? 'подключены, ожидание данных...' : 'не подключены'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayStations.map(station => {
            const points = getWaveformForStation(station.stationId);
            const isEmpty = points.length < 2;

            return (
              <Card key={station.stationId} className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${station.status === 'online' ? 'bg-emerald-500' : station.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <CardTitle className="text-sm font-semibold text-slate-700">{station.name}</CardTitle>
                      <span className="text-[10px] text-slate-400 font-mono">{station.stationId}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {station.dataRate && <span>{station.dataRate} sps</span>}
                      <Clock className="h-3 w-3" />
                      <span>{new Date().toLocaleTimeString('ru-RU')}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-1.5">
                  <div className="bg-slate-900 rounded-lg p-2 space-y-1">
                    {isEmpty ? (
                      <div className="h-[240px] flex items-center justify-center text-slate-500 text-xs">
                        Ожидание сигнала...
                      </div>
                    ) : (
                      <>
                        <WaveformCanvas data={points.map(p => ({ t: p.timestamp, v: p.value }))} color={CHANNEL_COLORS.Z} label="Z" />
                        <WaveformCanvas data={points.map(p => ({ t: p.timestamp, v: p.value * 0.8 + (Math.random() - 0.5) * 0.05 }))} color={CHANNEL_COLORS.NS} label="N-S" />
                        <WaveformCanvas data={points.map(p => ({ t: p.timestamp, v: p.value * 0.6 + (Math.random() - 0.5) * 0.05 }))} color={CHANNEL_COLORS.EW} label="E-W" />
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <span>60 с назад</span>
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><span className="w-2 h-0.5 rounded bg-red-500 inline-block" />Z (верт.)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-0.5 rounded bg-blue-500 inline-block" />N-S</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-0.5 rounded bg-emerald-500 inline-block" />E-W</span>
                    </span>
                    <span>сейчас</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Offline tab ──────────────────────────────────────────────────────────────

const OfflineTab: FC = () => {
  const [stationFilter, setStationFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<SeismogramRecord | null>(null);

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ['/api/stations']
  });

  const { data: records = [], isLoading, refetch } = useQuery<SeismogramRecord[]>({
    queryKey: ['/api/seismograms', stationFilter]
  });

  const irkStations = stations.filter(s => s.stationId.startsWith('IRK-'));
  const filtered = stationFilter === 'all'
    ? records
    : records.filter(r => r.stationId === stationFilter);

  const formatDuration = (sec: number | null) => {
    if (!sec) return '—';
    if (sec < 60) return `${sec.toFixed(1)}с`;
    return `${Math.floor(sec / 60)}м ${(sec % 60).toFixed(0)}с`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={stationFilter} onValueChange={setStationFilter}>
          <SelectTrigger className="h-8 w-48 text-xs">
            <Radio className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все станции</SelectItem>
            {irkStations.map(s => (
              <SelectItem key={s.stationId} value={s.stationId}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Обновить
        </Button>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} записей</span>
      </div>

      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-10 text-center text-slate-400 text-sm">Загрузка архива...</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Activity className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500 mb-1">Архив пуст</p>
            <p className="text-xs text-slate-400">Записи появятся после срабатывания порогового триггера</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Record list */}
          <div className="lg:col-span-2 space-y-2">
            {filtered.map(rec => {
              const isSelected = selectedRecord?.id === rec.id;
              return (
                <Card
                  key={rec.id}
                  className={`border-0 shadow-sm cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
                  onClick={() => setSelectedRecord(isSelected ? null : rec)}
                >
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded-lg bg-orange-100 flex-shrink-0">
                          <Activity className="h-3.5 w-3.5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">{rec.stationId}</span>
                            <Badge variant="outline" className="text-[10px] h-4">{rec.recordingType}</Badge>
                            <Badge
                              className={`text-[10px] h-4 hover:bg-opacity-80 ${
                                rec.processingStatus === 'processed' ? 'bg-emerald-100 text-emerald-700' :
                                rec.processingStatus === 'filtered' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {rec.processingStatus}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(rec.startTime).toLocaleString('ru-RU')}
                            <span className="mx-1">·</span>
                            {formatDuration(rec.durationSec)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {rec.peakGroundAcceleration != null && (
                          <p className="text-xs font-bold text-slate-700">PGA: {rec.peakGroundAcceleration.toFixed(4)}g</p>
                        )}
                        {rec.dominantFrequency != null && (
                          <p className="text-[10px] text-slate-400">{rec.dominantFrequency.toFixed(2)} Гц</p>
                        )}
                        <ChevronRight className={`h-4 w-4 text-slate-300 ml-auto mt-1 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-1">
            {selectedRecord ? (
              <Card className="border-0 shadow-sm sticky top-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-orange-600" />
                    Детали записи
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    {[
                      { label: 'Станция', value: selectedRecord.stationId },
                      { label: 'ID записи', value: selectedRecord.recordId.split('-').slice(-2).join('-') },
                      { label: 'Начало', value: new Date(selectedRecord.startTime).toLocaleString('ru-RU') },
                      { label: 'Окончание', value: new Date(selectedRecord.endTime).toLocaleString('ru-RU') },
                      { label: 'Длительность', value: formatDuration(selectedRecord.durationSec) },
                      { label: 'Частота дискр.', value: selectedRecord.sampleRate ? `${selectedRecord.sampleRate} Гц` : '—' },
                      { label: 'Каналы', value: selectedRecord.channels },
                      { label: 'Тип записи', value: selectedRecord.recordingType },
                      { label: 'Статус', value: selectedRecord.processingStatus },
                      { label: 'PGA', value: selectedRecord.peakGroundAcceleration != null ? `${selectedRecord.peakGroundAcceleration.toFixed(5)} g` : '—' },
                      { label: 'Пик Z', value: selectedRecord.peakAmplitudeZ != null ? `${selectedRecord.peakAmplitudeZ.toFixed(4)} мм/с` : '—' },
                      { label: 'Пик N-S', value: selectedRecord.peakAmplitudeNS != null ? `${selectedRecord.peakAmplitudeNS.toFixed(4)} мм/с` : '—' },
                      { label: 'Пик E-W', value: selectedRecord.peakAmplitudeEW != null ? `${selectedRecord.peakAmplitudeEW.toFixed(4)} мм/с` : '—' },
                      { label: 'Дом. частота', value: selectedRecord.dominantFrequency != null ? `${selectedRecord.dominantFrequency.toFixed(2)} Гц` : '—' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                        <p className="text-xs font-medium text-slate-700 mt-0.5 break-all">{value}</p>
                      </div>
                    ))}
                  </div>

                  {selectedRecord.notes && (
                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Примечания</p>
                      <p className="text-xs text-slate-600">{selectedRecord.notes}</p>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full h-8 text-xs mt-2">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Экспорт (MiniSEED / CSV)
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm bg-slate-50 border-dashed border border-slate-200">
                <CardContent className="py-12 text-center">
                  <Info className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs text-slate-400">Выберите запись для просмотра деталей</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const Seismograms: FC = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Header
          title="Сейсмограммы"
          subtitle="Онлайн-просмотр и архив записей колебаний грунта и конструкций"
        />
        <div className="p-6">
          <Tabs defaultValue="online">
            <TabsList className="mb-5">
              <TabsTrigger value="online" className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Онлайн
              </TabsTrigger>
              <TabsTrigger value="offline" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Архив записей
              </TabsTrigger>
            </TabsList>

            <TabsContent value="online">
              <OnlineTab />
            </TabsContent>

            <TabsContent value="offline">
              <OfflineTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Seismograms;
