import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useSeismicData } from '@/hooks/useSeismicData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity, Radio, Wifi, WifiOff, Pause, Play, Trash2, Clock,
  Gauge, Database, Cpu, BatteryFull, BatteryMedium, BatteryLow,
  Signal, AlertTriangle,
} from 'lucide-react';
import type { Station, LiveWaveformData } from '@shared/schema';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ConcentratorEvent {
  ts: number;
  kind: 'packet' | 'event' | 'station' | 'warn';
  text: string;
}

const STATION_COLORS = ['#2563eb', '#0f766e', '#f97316', '#7c3aed', '#dc2626', '#0891b2'];

// ─── Mini live waveform (canvas-based, ring buffer) ───────────────────────────

const MiniWaveform: FC<{
  data: LiveWaveformData | undefined;
  color: string;
  paused: boolean;
}> = ({ data, color, paused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<number[]>([]);
  const peakRef   = useRef<number>(1e-9);

  useEffect(() => {
    if (paused || !data || !data.dataPoints || data.dataPoints.length === 0) return;
    // Append new samples; cap at 1024 samples
    bufferRef.current.push(...data.dataPoints);
    if (bufferRef.current.length > 1024) {
      bufferRef.current = bufferRef.current.slice(-1024);
    }
    // Recompute peak ONCE per packet (not per frame)
    let p = 1e-9;
    for (const v of bufferRef.current) {
      const a = Math.abs(v);
      if (a > p) p = a;
    }
    peakRef.current = p;
  }, [data, paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (h / 4) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      // Center line
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

      const buf = bufferRef.current;
      if (buf.length > 0) {
        const max = peakRef.current;
        const dx = w / Math.max(buf.length, 1);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        for (let i = 0; i < buf.length; i++) {
          const x = i * dx;
          const y = h / 2 - (buf[i] / max) * (h / 2 - 4);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText('Ожидание данных…', 8, h / 2);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [color]);

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(100, Math.floor(r.width));
      canvas.height = Math.max(40, Math.floor(r.height));
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const SeismoLive: FC = () => {
  const { isConnected, stations, waveformData, networkStatus, events } = useSeismicData();

  const [paused, setPaused] = useState(false);
  const [eventLog, setEventLog] = useState<ConcentratorEvent[]>([]);

  // Throughput tracking
  const samplesPerSecRef = useRef<number>(0);
  const samplesAccumRef  = useRef<number>(0);
  const lastTickRef      = useRef<number>(Date.now());
  const [sps, setSps]    = useState<number>(0);
  const [packetsRcv, setPacketsRcv] = useState<number>(0);

  // Tick: aggregate samples-per-second from live waveform map deltas
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTickRef.current) / 1000;
      if (dt > 0) {
        samplesPerSecRef.current = samplesAccumRef.current / dt;
        setSps(Math.round(samplesPerSecRef.current));
      }
      samplesAccumRef.current = 0;
      lastTickRef.current = now;
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  // Capture incoming waveform packets → log + sample counter
  const lastSeenRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (paused) return;
    Object.entries(waveformData).forEach(([sid, w]) => {
      const ts = new Date(w.timestamp).getTime();
      if (lastSeenRef.current[sid] !== ts) {
        lastSeenRef.current[sid] = ts;
        samplesAccumRef.current += w.dataPoints?.length ?? 0;
        setPacketsRcv(p => p + 1);
        setEventLog(prev => [
          { ts: Date.now(), kind: 'packet',
            text: `Пакет от ${sid} · ${w.dataPoints?.length ?? 0} отсч. · ${w.samplingRate ?? '—'} sps` },
          ...prev,
        ].slice(0, 60));
      }
    });
  }, [waveformData, paused]);

  // Capture station status changes
  const lastStatusRef = useRef<Record<string, string>>({});
  useEffect(() => {
    stations.forEach(s => {
      const prev = lastStatusRef.current[s.stationId];
      if (prev && prev !== s.status) {
        setEventLog(p => [
          { ts: Date.now(), kind: prev !== s.status && s.status !== 'online' ? 'warn' : 'station',
            text: `Станция ${s.stationId}: ${prev} → ${s.status}` },
          ...p,
        ].slice(0, 60));
      }
      lastStatusRef.current[s.stationId] = s.status;
    });
  }, [stations]);

  // Capture event notifications
  const lastEventCntRef = useRef<number>(events.length);
  useEffect(() => {
    if (events.length > lastEventCntRef.current) {
      const newest = events[0];
      if (newest) {
        setEventLog(p => [
          { ts: Date.now(), kind: 'event',
            text: `Событие ${newest.eventId ?? '?'} · M${(newest as any).magnitude ?? '—'}` },
          ...p,
        ].slice(0, 60));
      }
    }
    lastEventCntRef.current = events.length;
  }, [events]);

  // Most-active stations: those with waveform data, ordered by recency
  const activeStations: Station[] = useMemo(() => {
    const withData = stations
      .filter(s => waveformData[s.stationId])
      .sort((a, b) => {
        const ta = new Date(waveformData[a.stationId].timestamp).getTime();
        const tb = new Date(waveformData[b.stationId].timestamp).getTime();
        return tb - ta;
      });
    // Fallback to first 4 stations if no live data yet
    return (withData.length ? withData : stations).slice(0, 6);
  }, [stations, waveformData]);

  const onlineCount   = stations.filter(s => s.status === 'online').length;
  const degradedCount = stations.filter(s => s.status === 'degraded').length;
  const offlineCount  = stations.filter(s => s.status === 'offline').length;

  const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString('ru-RU', { hour12: false });

  return (
    <div className="p-6 space-y-6" data-testid="page-seismo-live">
      {/* Header / KPI */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            Seismo Live · Пункт наблюдения
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Онлайн-концентратор данных сейсмической сети — потоковая агрегация со всех станций г. Иркутска
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={paused ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPaused(p => !p)}
            data-testid="btn-toggle-pause"
          >
            {paused ? <><Play className="h-3.5 w-3.5 mr-1" />Возобновить</>
                    : <><Pause className="h-3.5 w-3.5 mr-1" />Пауза</>}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEventLog([])}
            data-testid="btn-clear-log"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />Очистить лог
          </Button>
        </div>
      </div>

      {/* Concentrator status row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {isConnected ? <Wifi className="h-5 w-5 text-emerald-600" />
                             : <WifiOff className="h-5 w-5 text-red-600" />}
              </div>
              <div>
                <p className="text-xs text-slate-500">Концентратор</p>
                <p className={`text-sm font-semibold ${isConnected ? 'text-emerald-700' : 'text-red-600'}`}>
                  {isConnected ? 'Подключён' : 'Нет связи'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Radio className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Активных каналов</p>
                <p className="text-sm font-semibold text-slate-800">
                  {onlineCount} / {stations.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Gauge className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Поток (sps)</p>
                <p className="text-sm font-semibold text-slate-800" data-testid="stat-sps">
                  {paused ? '—' : sps.toLocaleString('ru-RU')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Database className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Принято пакетов</p>
                <p className="text-sm font-semibold text-slate-800" data-testid="stat-packets">{packetsRcv}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Cpu className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Здоровье обработки</p>
                <p className="text-sm font-semibold text-slate-800">
                  {networkStatus?.dataProcessingHealth ?? 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live waveform grid */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-600" />
            Потоковые сигналы со станций
            {paused && <Badge variant="outline" className="ml-2 text-[10px] text-amber-600 border-amber-300">пауза</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {activeStations.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Нет активных станций для отображения</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {activeStations.map((st, i) => {
                const w = waveformData[st.stationId];
                const color = STATION_COLORS[i % STATION_COLORS.length];
                const peak = w?.dataPoints
                  ? Math.max(...w.dataPoints.map(v => Math.abs(v))).toFixed(4)
                  : '—';
                return (
                  <div
                    key={st.stationId}
                    className="border border-slate-200 rounded-lg p-2 bg-white"
                    data-testid={`live-stream-${st.stationId}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: st.status === 'online' ? '#10b981'
                                            : st.status === 'degraded' ? '#f59e0b'
                                            : '#ef4444' }}
                        />
                        <span className="text-xs font-medium text-slate-700 truncate">{st.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] h-5">{st.stationId}</Badge>
                    </div>
                    <div className="h-20 bg-slate-50 rounded">
                      <MiniWaveform data={w} color={color} paused={paused} />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
                      <span>Пик: <span className="font-medium text-slate-700">{peak}</span></span>
                      <span>{w ? `${w.samplingRate ?? '—'} sps` : '—'}</span>
                      <span>{w ? new Date(w.timestamp).toLocaleTimeString('ru-RU', { hour12: false }) : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column: channel table + event log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Radio className="h-4 w-4 text-blue-600" />
              Состояние каналов концентратора
              <span className="ml-auto text-[10px] font-normal text-slate-400 flex items-center gap-3">
                <span className="text-emerald-600">● {onlineCount} онлайн</span>
                {degradedCount > 0 && <span className="text-amber-600">● {degradedCount} деград.</span>}
                {offlineCount > 0 && <span className="text-red-600">● {offlineCount} офлайн</span>}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-slate-400 border-b border-slate-100">
                    <th className="pb-1.5 pr-2">Станция</th>
                    <th className="pb-1.5 pr-2">Статус</th>
                    <th className="pb-1.5 pr-2">sps</th>
                    <th className="pb-1.5 pr-2">Сигнал</th>
                    <th className="pb-1.5 pr-2">Батарея</th>
                    <th className="pb-1.5">Последний пакет</th>
                  </tr>
                </thead>
                <tbody>
                  {stations.length === 0 ? (
                    <tr><td colSpan={6} className="py-3 text-center text-slate-400">Нет данных</td></tr>
                  ) : stations.map(st => {
                    const w = waveformData[st.stationId];
                    const bat = st.batteryLevel ?? null;
                    const sig = st.signalQuality ?? null;
                    const BatIcon = bat == null ? BatteryMedium : bat >= 60 ? BatteryFull : bat >= 30 ? BatteryMedium : BatteryLow;
                    const batColor = bat == null ? 'text-slate-400' : bat >= 60 ? 'text-emerald-600' : bat >= 30 ? 'text-amber-600' : 'text-red-600';
                    const isOff = st.status === 'offline';
                    return (
                      <tr key={st.stationId} className="border-b border-slate-50 last:border-0">
                        <td className="py-1.5 pr-2">
                          <div className="font-medium text-slate-700">{st.name}</div>
                          <div className="text-[10px] text-slate-400">{st.stationId}</div>
                        </td>
                        <td className="py-1.5 pr-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 ${
                              st.status === 'online'   ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                              st.status === 'degraded' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                              'border-red-200 text-red-700 bg-red-50'
                            }`}
                          >
                            {isOff && <AlertTriangle className="h-2.5 w-2.5 mr-0.5 inline" />}
                            {st.status}
                          </Badge>
                        </td>
                        <td className="py-1.5 pr-2 text-slate-700">{st.dataRate ?? '—'}</td>
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <Signal className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-700">{sig != null ? `${sig}%` : '—'}</span>
                          </div>
                        </td>
                        <td className="py-1.5 pr-2">
                          <div className={`flex items-center gap-1 ${batColor}`}>
                            <BatIcon className="h-3.5 w-3.5" />
                            <span>{bat != null ? `${bat}%` : '—'}</span>
                          </div>
                        </td>
                        <td className="py-1.5 text-slate-500">
                          {w ? new Date(w.timestamp).toLocaleTimeString('ru-RU', { hour12: false }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Лог потока
              <Badge variant="outline" className="ml-auto text-[10px]">{eventLog.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-[420px] overflow-y-auto space-y-1 font-mono text-[10.5px]" data-testid="event-log">
              {eventLog.length === 0 ? (
                <p className="text-slate-400 py-4 text-center font-sans">Лог пуст. Ожидание входящих пакетов…</p>
              ) : eventLog.map((ev, i) => (
                <div
                  key={i}
                  className={`flex gap-2 px-1.5 py-0.5 rounded ${
                    ev.kind === 'warn'    ? 'bg-red-50 text-red-700' :
                    ev.kind === 'event'   ? 'bg-orange-50 text-orange-700' :
                    ev.kind === 'station' ? 'bg-blue-50 text-blue-700' :
                    'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-slate-400 flex-shrink-0">{fmtTime(ev.ts)}</span>
                  <span className="truncate">{ev.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SeismoLive;
