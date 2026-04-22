import { FC, useEffect, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSeismicData } from '@/hooks/useSeismicData';
import type { SeismogramRecord } from '@shared/schema';
import {
  BarChart2, Map as MapIcon,
  ArrowRight, AlertTriangle, CheckCircle2,
  Settings as SettingsIcon, Globe, Users, ChevronRight, Search, X, Download,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import type { Alert, InfrastructureObject, SensorInstallation, PageVisitLog } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BlockDef {
  href: string;
  title: string;
  subtitle: string;
  icon: FC<{ className?: string }>;
  gradient: string;
  shadow: string;
  badge?: string | number | null;
  badgeLabel?: string;
  status?: 'ok' | 'warn' | 'error' | null;
}

const countryName = (code: string | null): string => {
  if (!code) return '—';
  try {
    return new Intl.DisplayNames(['ru'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};

const HomePage: FC = () => {
  const [, navigate] = useLocation();
  const { stations, events } = useSeismicData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'administrator';
  const [visitsOpen, setVisitsOpen] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterIp, setFilterIp] = useState('');

  type ExportColumnKey = 'datetime' | 'ip' | 'country' | 'region' | 'city';
  const ALL_EXPORT_COLUMNS: { key: ExportColumnKey; label: string }[] = [
    { key: 'datetime', label: 'Дата и время' },
    { key: 'ip',       label: 'IP' },
    { key: 'country',  label: 'Страна' },
    { key: 'region',   label: 'Регион' },
    { key: 'city',     label: 'Город' },
  ];
  const [exportColumns, setExportColumns] = useState<Set<ExportColumnKey>>(
    new Set<ExportColumnKey>(['datetime', 'ip', 'country', 'region', 'city'])
  );
  const [exportPickerOpen, setExportPickerOpen] = useState(false);

  const toggleExportColumn = (key: ExportColumnKey) => {
    setExportColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const { data: seismograms = [] } = useQuery<SeismogramRecord[]>({
    queryKey: ['/api/seismograms'],
  });
  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
  });
  const { data: infraObjects = [] } = useQuery<InfrastructureObject[]>({
    queryKey: ['/api/infrastructure-objects'],
  });
  const { data: pageViewsData } = useQuery<{ views: number; views_today: number; views_yesterday: number; daily: { date: string; count: number }[] }>({
    queryKey: ['/api/page-views'],
  });
  const { data: sensorInstallations = [] } = useQuery<SensorInstallation[]>({
    queryKey: ['/api/sensor-installations'],
  });
  const { data: visitLogs = [], isLoading: logsLoading } = useQuery<PageVisitLog[]>({
    queryKey: ['/api/page-visits'],
    enabled: isAdmin && visitsOpen,
  });

  const { data: visitsByCity = [], isLoading: isCityLoading } = useQuery<{ city: string | null; region: string | null; count: number }[]>({
    queryKey: ['/api/page-visits/by-city'],
    enabled: isAdmin && visitsOpen,
  });

  const countryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const log of visitLogs) {
      if (log.countryCode && !seen.has(log.countryCode)) {
        seen.set(log.countryCode, countryName(log.countryCode));
      }
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [visitLogs]);

  const filteredLogs = useMemo(() => {
    return visitLogs.filter(log => {
      if (filterDateFrom) {
        const from = new Date(filterDateFrom);
        if (new Date(log.visitedAt) < from) return false;
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(log.visitedAt) > to) return false;
      }
      if (filterCountry && filterCountry !== 'all') {
        if (log.countryCode !== filterCountry) return false;
      }
      if (filterIp) {
        if (!log.ip?.toLowerCase().includes(filterIp.toLowerCase())) return false;
      }
      return true;
    });
  }, [visitLogs, filterDateFrom, filterDateTo, filterCountry, filterIp]);

  const hasActiveFilters = filterDateFrom || filterDateTo || (filterCountry && filterCountry !== 'all') || filterIp;

  const clearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterCountry('');
    setFilterIp('');
  };

  const pageViewMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/page-views'),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.setQueryData(['/api/page-views'], data);
    },
  });

  useEffect(() => {
    pageViewMutation.mutate();
  }, []);

  const unreadAlerts    = alerts.filter(a => !a.isRead).length;
  const last24hEvents   = events.filter(e => Date.now() - new Date(e.timestamp).getTime() < 86_400_000).length;
  const activeSensors   = sensorInstallations.filter(si => si.isActive).length;
  const totalSensors    = sensorInstallations.length;

  const managedStations          = stations.filter(s => s.isManaged);
  const totalMonitoringStations  = managedStations.length;
  const activeMonitoringStations = managedStations.filter(s => s.status === 'online').length;

  const blocks: BlockDef[] = [
    {
      href:       '/monitoring-hub',
      title:      'Онлайн обзор',
      subtitle:   'Карта событий, объекты инфраструктуры, сейсмические станции',
      icon:       MapIcon,
      gradient:   'from-teal-500 to-teal-700',
      shadow:     'shadow-teal-900/40',
      badge:      last24hEvents,
      badgeLabel: 'событий за 24 ч',
      status:     last24hEvents > 5 ? 'warn' : 'ok',
    },
    {
      href:       '/data-analysis',
      title:      'Анализ данных',
      subtitle:   'Сейсмограммы, Фурье-анализ, спектры отклика, АЧХ',
      icon:       BarChart2,
      gradient:   'from-violet-600 to-violet-800',
      shadow:     'shadow-violet-900/40',
      badge:      seismograms.length,
      badgeLabel: 'записей в архиве',
      status:     'ok',
    },
    {
      href:       '/system-management',
      title:      'Управление системой',
      subtitle:   'Администрирование сети, серверной и оповещений',
      icon:       SettingsIcon,
      gradient:   'from-slate-600 to-slate-800',
      shadow:     'shadow-slate-900/40',
      badge:      unreadAlerts > 0 ? unreadAlerts : null,
      badgeLabel: unreadAlerts > 0 ? 'непрочитанных оповещений' : '',
      status:     isAdmin ? 'ok' : 'warn',
    },
    {
      href:       '/seismonet-project',
      title:      'WiKi SeismoNet',
      subtitle:   'Нормативная база, партнёры, публикации и просветительские материалы',
      icon:       Globe,
      gradient:   'from-indigo-600 to-indigo-800',
      shadow:     'shadow-indigo-900/40',
      badge:      null,
      status:     null,
    },
  ];

  const renderBlock = (block: BlockDef) => {
    const Icon = block.icon;
    return (
      <button
        key={block.href}
        onClick={() => navigate(block.href)}
        className={`group relative bg-gradient-to-br ${block.gradient} rounded-2xl p-6 text-left
          shadow-xl ${block.shadow} hover:scale-[1.02] hover:shadow-2xl
          transition-all duration-200 cursor-pointer border border-white/10 overflow-hidden`}
      >
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />

        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm">
            <Icon className="h-7 w-7 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            {block.status === 'ok'    && <CheckCircle2  className="h-4 w-4 text-white/70" />}
            {block.status === 'warn'  && <AlertTriangle className="h-4 w-4 text-yellow-300" />}
            {block.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-300" />}
            <ArrowRight className="h-4 w-4 text-white/50 group-hover:text-white/90 group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        <h2 className="text-white font-bold text-lg leading-tight mb-1">{block.title}</h2>
        <p className="text-white/65 text-sm leading-snug mb-4">{block.subtitle}</p>

        {block.badge !== null && block.badge !== undefined && (
          <div className="flex items-baseline gap-2 mt-auto">
            <span className="text-3xl font-bold text-white">{block.badge}</span>
            <span className="text-white/60 text-xs">{block.badgeLabel}</span>
          </div>
        )}

        <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-white/5 -mr-8 -mb-8" />
        <div className="absolute bottom-0 right-0 w-14 h-14 rounded-full bg-white/5 -mr-2 -mb-2" />
      </button>
    );
  };

  const today = new Date().toISOString().slice(0, 10);
  const chartData = (pageViewsData?.daily ?? []).map(d => ({
    date: d.date,
    count: d.count,
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    isToday: d.date === today,
  }));

  return (
    <div className="min-h-full bg-slate-900">
      <div className="px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(() => {
              const viewsToday = pageViewsData?.views_today ?? 0;
              const viewsYesterday = pageViewsData?.views_yesterday ?? 0;
              const delta = viewsToday - viewsYesterday;
              const trendLabel = viewsYesterday > 0
                ? (delta >= 0 ? `+${delta} vs вчера` : `${delta} vs вчера`)
                : `${viewsToday} сегодня`;
              const trendColor = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-500';

              const basicStats = [
                { label: 'Датчиков онлайн',  value: `${activeSensors}/${totalSensors}`, color: 'text-emerald-400' },
                { label: 'Активных станций',  value: `${activeMonitoringStations}/${totalMonitoringStations}`, color: 'text-teal-400' },
                { label: 'Объектов в базе',   value: infraObjects.length, color: 'text-violet-400' },
              ];

              return (
                <>
                  {basicStats.map(s => (
                    <div key={s.label} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700">
                      <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
                    </div>
                  ))}
                  <button
                    onClick={() => setVisitsOpen(true)}
                    className="bg-slate-800/60 rounded-xl p-3 border border-slate-700 col-span-2 sm:col-span-1 text-left hover:bg-slate-700/60 hover:border-sky-500/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-sky-400">{pageViewsData?.views ?? 0}</div>
                      <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5 group-hover:text-slate-300 transition-colors">Просмотров сайта</div>
                    <div className={`text-xs mt-1 font-medium ${trendColor}`}>{trendLabel}</div>
                  </button>
                </>
              );
            })()}
          </div>

          {/* Blocks — always 2 per row */}
          <div className="grid grid-cols-2 gap-5">
            {blocks.map(renderBlock)}
          </div>
        </div>
      </div>

      {/* Views modal — chart for all users, visit logs for admins only */}
      <Dialog open={visitsOpen} onOpenChange={setVisitsOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-400" />
              Просмотры сайта
            </DialogTitle>
          </DialogHeader>

          {/* 14-day bar chart — visible to all users */}
          <div className="shrink-0 mt-1">
            <p className="text-slate-400 text-xs mb-2">Динамика за 14 дней</p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#94a3b8', fontSize: 9 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
                    cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                    formatter={(value: number) => [value, 'Просмотры']}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {chartData.map(entry => (
                      <Cell
                        key={entry.date}
                        fill={entry.isToday ? '#38bdf8' : '#3b82f6'}
                        opacity={entry.isToday ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">Нет данных за период</p>
            )}
            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-sky-400" />
                Сегодня
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-blue-500 opacity-60" />
                Предыдущие дни
              </span>
            </div>
          </div>

          {/* Visit log table — admin only */}
          {isAdmin && (
            <div className="flex-1 overflow-auto mt-4 min-h-0 border-t border-slate-800 pt-3 flex flex-col gap-2">
              {/* Russian cities panel */}
              <div className="shrink-0 mb-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-400 text-xs font-medium">Посетители по городам России</p>
                  <span className="text-xs text-slate-600">по IP-адресу (geoip-lite)</span>
                </div>
                {isCityLoading ? (
                  <div className="space-y-1.5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={idx} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-3 bg-slate-700 rounded animate-pulse shrink-0" />
                          <span className="flex-1 h-3 bg-slate-700 rounded animate-pulse" />
                          <span className="w-12 h-3 bg-slate-700 rounded animate-pulse shrink-0" />
                          <span className="w-6 h-3 bg-slate-700 rounded animate-pulse shrink-0" />
                        </div>
                        <div className="ml-6 h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-slate-600 animate-pulse"
                            style={{ width: `${65 - idx * 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : visitsByCity.length === 0 ? (
                  <p className="text-slate-600 text-xs py-2">Нет данных — визиты с российских IP ещё не зафиксированы</p>
                ) : (
                  <div className="space-y-1.5">
                    {(() => {
                      const total = visitsByCity.reduce((s, r) => s + r.count, 0);
                      const top = visitsByCity.slice(0, 10);
                      return top.map((row, idx) => {
                        const pct = total > 0 ? (row.count / total) * 100 : 0;
                        const cityLabel = row.city ?? 'Неизвестный город';
                        const regionLabel = row.region ? ` (${row.region})` : '';
                        return (
                          <div key={`${row.city}-${row.region}-${idx}`} className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-600 w-4 text-right shrink-0 tabular-nums">{idx + 1}</span>
                              <span className="text-slate-300 flex-1 truncate">
                                {cityLabel}
                                <span className="text-slate-500">{regionLabel}</span>
                              </span>
                              <span className="text-slate-400 shrink-0 tabular-nums">{row.count}</span>
                            </div>
                            <div className="ml-6 h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-sky-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
              {/* Filter bar */}
              <div className="shrink-0 flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[120px]">
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={e => setFilterDateFrom(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
                    title="С даты"
                  />
                </div>
                <div className="relative flex-1 min-w-[120px]">
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={e => setFilterDateTo(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
                    title="По дату"
                  />
                </div>
                <div className="flex-1 min-w-[130px]">
                  <Select value={filterCountry || 'all'} onValueChange={v => setFilterCountry(v === 'all' ? '' : v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300 text-xs h-7 focus:ring-sky-500">
                      <SelectValue placeholder="Все страны" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-300 text-xs">
                      <SelectItem value="all">Все страны</SelectItem>
                      {countryOptions.map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {countryFlag(code)} {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative flex-1 min-w-[120px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={filterIp}
                    onChange={e => setFilterIp(e.target.value)}
                    placeholder="Фильтр по IP"
                    className="w-full bg-slate-800 border border-slate-700 rounded pl-6 pr-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors px-1.5 py-1 rounded hover:bg-slate-800"
                  >
                    <X className="h-3 w-3" />
                    Сбросить
                  </button>
                )}
                <div className="relative flex items-center gap-0.5">
                  <button
                    onClick={() => setExportPickerOpen(o => !o)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-sky-300 transition-colors px-1.5 py-1 rounded hover:bg-slate-800"
                    title="Выбрать столбцы для экспорта"
                  >
                    <SettingsIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      const colDefs: { key: ExportColumnKey; header: string; getValue: (log: PageVisitLog) => string }[] = [
                        { key: 'datetime', header: 'Дата и время', getValue: log => new Date(log.visitedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) },
                        { key: 'ip',       header: 'IP',           getValue: log => log.ip ?? '' },
                        { key: 'country',  header: 'Страна',       getValue: log => countryName(log.countryCode) },
                        { key: 'region',   header: 'Регион',       getValue: log => log.region ?? '' },
                        { key: 'city',     header: 'Город',        getValue: log => log.city ?? '' },
                      ];
                      const active = colDefs.filter(c => exportColumns.has(c.key));
                      const header = active.map(c => c.header);
                      const rows = filteredLogs.map(log => active.map(c => c.getValue(log)));
                      const sanitize = (v: string) => {
                        const s = String(v);
                        return /^[=+\-@]/.test(s) ? `'${s}` : s;
                      };
                      const csv = [header, ...rows]
                        .map(r => r.map(v => `"${sanitize(v).replace(/"/g, '""')}"`).join(','))
                        .join('\n');
                      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `visitor-logs-${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    disabled={filteredLogs.length === 0}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-sky-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-1.5 py-1 rounded hover:bg-slate-800"
                    title="Экспорт в CSV"
                  >
                    <Download className="h-3 w-3" />
                    CSV
                  </button>
                  {exportPickerOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 min-w-[160px]">
                      <p className="text-slate-400 text-xs font-medium mb-2">Столбцы в экспорте</p>
                      <div className="flex flex-col gap-1.5">
                        {ALL_EXPORT_COLUMNS.map(col => (
                          <label key={col.key} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={exportColumns.has(col.key)}
                              onChange={() => toggleExportColumn(col.key)}
                              className="w-3 h-3 accent-sky-500"
                            />
                            <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors select-none">
                              {col.label}
                            </span>
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={() => setExportPickerOpen(false)}
                        className="mt-3 w-full text-xs text-slate-500 hover:text-slate-300 transition-colors text-center"
                      >
                        Закрыть
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-slate-400 text-xs shrink-0">
                {hasActiveFilters
                  ? `Найдено: ${filteredLogs.length} из ${visitLogs.length}`
                  : `Последние визиты (${visitLogs.length})`}
              </p>

              {logsLoading ? (
                <div className="text-slate-500 text-sm text-center py-8">Загрузка...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-8">
                  {hasActiveFilters ? 'Ничего не найдено' : 'Нет записей'}
                </div>
              ) : (
                <div className="overflow-auto flex-1 min-h-0">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 text-left border-b border-slate-800">
                        <th className="pb-2 pr-3 font-medium">Дата и время</th>
                        <th className="pb-2 pr-3 font-medium">IP</th>
                        <th className="pb-2 pr-3 font-medium">Страна</th>
                        <th className="pb-2 pr-3 font-medium">Регион</th>
                        <th className="pb-2 font-medium">Город</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map(log => (
                        <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                          <td className="py-1.5 pr-3 text-slate-300 whitespace-nowrap">
                            {new Date(log.visitedAt).toLocaleString('ru-RU', {
                              day: '2-digit', month: '2-digit', year: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                          <td className="py-1.5 pr-3 text-slate-400 font-mono">{log.ip}</td>
                          <td className="py-1.5 pr-3 text-slate-300">
                            {log.countryCode && (
                              <span className="mr-1">{countryFlag(log.countryCode)}</span>
                            )}
                            {countryName(log.countryCode)}
                          </td>
                          <td className="py-1.5 pr-3 text-slate-400">{log.region ?? '—'}</td>
                          <td className="py-1.5 text-slate-400">{log.city ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const cp1 = 0x1F1E6 + code.toUpperCase().charCodeAt(0) - 65;
  const cp2 = 0x1F1E6 + code.toUpperCase().charCodeAt(1) - 65;
  return String.fromCodePoint(cp1, cp2);
}

export default HomePage;
