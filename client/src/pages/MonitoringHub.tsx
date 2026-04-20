import { FC } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useSeismicData } from '@/hooks/useSeismicData';
import { Map, Building2, Radio, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
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

  const blocks = [
    {
      href:       '/monitoring',
      title:      'Карта и мониторинг',
      subtitle:   'Интерактивная карта сейсмических событий, состояние сети в реальном времени',
      description:'Просмотр последних землетрясений, местоположения станций, уровней сигнала и оперативной обстановки',
      icon:       Map,
      gradient:   'from-teal-500 to-teal-700',
      shadow:     'shadow-teal-900/40',
      badge:      last24hEvents,
      badgeLabel: 'событий за 24 ч',
      status:     last24hEvents > 5 ? 'warn' as const : 'ok' as const,
    },
    {
      href:       '/infrastructure',
      title:      'Объекты',
      subtitle:   'Здания, мосты, ГЭС и промышленные сооружения под наблюдением',
      description:'3D-схемы объектов, расположение датчиков, параметры сейсмостойкости, паспорта зданий и K₁/K₂',
      icon:       Building2,
      gradient:   'from-emerald-500 to-emerald-700',
      shadow:     'shadow-emerald-900/40',
      badge:      monitoredObjs,
      badgeLabel: 'объектов под наблюдением',
      status:     monitoredObjs > 0 ? 'ok' as const : 'warn' as const,
    },
    {
      href:       '/stations',
      title:      'Сейсмические станции',
      subtitle:   'Управление сетью датчиков, параметры, батарея, качество сигнала',
      description:'Состояние каждой станции в реальном времени: уровень заряда, частота дискретизации, статус связи',
      icon:       Radio,
      gradient:   'from-cyan-600 to-cyan-800',
      shadow:     'shadow-cyan-900/40',
      badge:      offlineStations > 0 ? offlineStations : stations.length,
      badgeLabel: offlineStations > 0 ? 'станций офлайн' : 'станций в сети',
      status:     offlineStations > 0 ? 'warn' as const : 'ok' as const,
    },
  ];

  return (
    <div className="min-h-full bg-slate-900">
      <div className="px-6 pt-8 pb-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {blocks.map(block => {
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
                    {block.status === 'ok'   && <CheckCircle2  className="h-4 w-4 text-white/70" />}
                    {block.status === 'warn' && <AlertTriangle className="h-4 w-4 text-yellow-300" />}
                    <ArrowRight className="h-4 w-4 text-white/50 group-hover:text-white/90 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                <h2 className="text-white font-bold text-xl leading-tight mb-1">{block.title}</h2>
                <p className="text-white/65 text-sm leading-snug mb-3">{block.subtitle}</p>
                <p className="text-white/45 text-xs leading-relaxed mb-4">{block.description}</p>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{block.badge}</span>
                  <span className="text-white/60 text-xs">{block.badgeLabel}</span>
                </div>

                <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-white/5 -mr-8 -mb-8" />
                <div className="absolute bottom-0 right-0 w-14 h-14 rounded-full bg-white/5 -mr-2 -mb-2" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MonitoringHub;
