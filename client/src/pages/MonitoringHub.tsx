import { FC } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useSeismicData } from '@/hooks/useSeismicData';
import { Map, Building2, Radio, ArrowRight, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import type { InfrastructureObject } from '@shared/schema';

const MonitoringHub: FC = () => {
  const [, navigate] = useLocation();
  const { stations, events } = useSeismicData();

  const { data: objects = [] } = useQuery<InfrastructureObject[]>({
    queryKey: ['/api/infrastructure-objects'],
  });

  const monitoredObjs   = objects.filter(o => o.isMonitored).length;
  const last24hEvents   = events.filter(e => Date.now() - new Date(e.timestamp).getTime() < 86_400_000).length;
  const offlineStations = stations.filter(s => s.status === 'offline').length;
  const onlineStations  = stations.filter(s => s.status === 'online').length;

  const compactCards = [
    {
      href:       '/infrastructure',
      title:      'Объекты',
      icon:       Building2,
      iconBg:     'bg-emerald-100',
      iconColor:  'text-emerald-600',
      value:      monitoredObjs,
      valueLabel: 'под наблюдением',
      status:     monitoredObjs > 0 ? 'ok' as const : 'warn' as const,
    },
    {
      href:       '/stations',
      title:      'Сейсмические станции',
      icon:       Radio,
      iconBg:     'bg-cyan-100',
      iconColor:  'text-cyan-600',
      value:      offlineStations > 0 ? offlineStations : onlineStations,
      valueLabel: offlineStations > 0 ? 'офлайн' : 'онлайн',
      status:     offlineStations > 0 ? 'warn' as const : 'ok' as const,
    },
  ];

  return (
    <div className="min-h-full bg-slate-50 p-6 flex flex-col gap-4">

      {/* Top row — compact cards */}
      <div className="grid grid-cols-2 gap-3 max-w-7xl mx-auto w-full">
        {compactCards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.href}
              onClick={() => navigate(card.href)}
              className="group flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-200
                shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150 text-left"
            >
              <div className={`p-2 rounded-lg ${card.iconBg} flex-shrink-0`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 truncate">{card.title}</p>
                <p className="text-sm font-semibold text-slate-800 leading-tight">
                  {card.value}&nbsp;<span className="text-xs font-normal text-slate-500">{card.valueLabel}</span>
                </p>
              </div>
              {card.status === 'ok'
                ? <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                : <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />}
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Main block — Карта и мониторинг */}
      <div className="max-w-7xl mx-auto w-full flex-1">
        <button
          onClick={() => navigate('/monitoring')}
          className="group relative w-full bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-8 text-left
            shadow-xl shadow-teal-900/30 hover:shadow-2xl hover:scale-[1.005]
            transition-all duration-200 cursor-pointer border border-white/10 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />

          {/* Decorative circles */}
          <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -right-4 w-28 h-28 rounded-full bg-white/5" />
          <div className="absolute top-0 left-1/2 w-72 h-72 -translate-y-1/2 rounded-full bg-white/[0.03]" />

          <div className="relative">
            <div className="flex items-start justify-between mb-5">
              <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-sm">
                <Map className="h-10 w-10 text-white" />
              </div>
              <div className="flex items-center gap-2">
                {last24hEvents > 5
                  ? <AlertTriangle className="h-5 w-5 text-yellow-300" />
                  : <CheckCircle2  className="h-5 w-5 text-white/70" />}
                <ArrowRight className="h-5 w-5 text-white/50 group-hover:text-white/90 group-hover:translate-x-1 transition-all" />
              </div>
            </div>

            <h2 className="text-white font-bold text-2xl leading-tight mb-2">Карта и мониторинг</h2>
            <p className="text-white/70 text-base leading-snug mb-1">
              Интерактивная карта сейсмических событий, состояние сети в реальном времени
            </p>
            <p className="text-white/45 text-sm leading-relaxed mb-6">
              Просмотр последних землетрясений, местоположения станций, уровней сигнала и оперативной обстановки
            </p>

            <div className="flex items-center gap-6">
              <div className="flex items-baseline gap-2">
                <Activity className="h-4 w-4 text-white/60" />
                <span className="text-4xl font-bold text-white">{last24hEvents}</span>
                <span className="text-white/60 text-sm">событий за 24 ч</span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="flex items-baseline gap-2">
                <Radio className="h-4 w-4 text-white/60" />
                <span className="text-2xl font-bold text-white">{onlineStations}</span>
                <span className="text-white/60 text-sm">станций онлайн</span>
              </div>
            </div>
          </div>
        </button>
      </div>

    </div>
  );
};

export default MonitoringHub;
