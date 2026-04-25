import { FC } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useSeismicData } from '@/hooks/useSeismicData';
import { Building2, Radio, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { InfrastructureObject } from '@shared/schema';
import IrkutskMap from '@/components/dashboard/IrkutskMap';

const MonitoringHub: FC = () => {
  const [, navigate] = useLocation();
  const { stations } = useSeismicData();

  const { data: objects = [] } = useQuery<InfrastructureObject[]>({
    queryKey: ['/api/infrastructure-objects'],
  });

  const monitoredObjs   = objects.filter(o => o.isMonitored).length;
  const offlineStations = stations.filter(s => s.status === 'offline').length;
  const onlineStations  = stations.filter(s => s.status === 'online').length;

  const cards = [
    {
      href:        '/infrastructure',
      title:       'Объекты',
      subtitle:    'Здания, мосты, ГЭС и промышленные сооружения под наблюдением',
      description: '3D-схемы объектов, расположение датчиков, параметры сейсмостойкости, паспорта зданий и K₁/K₂',
      icon:        Building2,
      gradient:    'from-emerald-500 to-emerald-700',
      shadow:      'shadow-emerald-900/30',
      badge:       monitoredObjs,
      badgeLabel:  'объектов под наблюдением',
      status:      monitoredObjs > 0 ? 'ok' as const : 'warn' as const,
    },
    {
      href:        '/stations',
      title:       'Сейсмические станции',
      subtitle:    'Управление сетью датчиков, параметры, батарея, качество сигнала',
      description: 'Состояние каждой станции в реальном времени: уровень заряда, частота дискретизации, статус связи',
      icon:        Radio,
      gradient:    'from-cyan-600 to-cyan-800',
      shadow:      'shadow-cyan-900/30',
      badge:       offlineStations > 0 ? offlineStations : onlineStations,
      badgeLabel:  offlineStations > 0 ? 'станций офлайн' : 'станций в сети',
      status:      offlineStations > 0 ? 'warn' as const : 'ok' as const,
    },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* Top row — coloured cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.href}
              onClick={() => navigate(card.href)}
              className={`group relative bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-left
                shadow-lg ${card.shadow} hover:scale-[1.02] hover:shadow-xl
                transition-all duration-200 cursor-pointer border border-white/10 overflow-hidden`}
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
              <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/5" />

              <div className="relative flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  {card.status === 'ok'
                    ? <CheckCircle2  className="h-4 w-4 text-white/70" />
                    : <AlertTriangle className="h-4 w-4 text-yellow-300" />}
                  <ArrowRight className="h-4 w-4 text-white/50 group-hover:text-white/90 group-hover:translate-x-1 transition-all" />
                </div>
              </div>

              <div className="relative">
                <h2 className="text-white font-bold text-lg leading-tight mb-1">{card.title}</h2>
                <p className="text-white/65 text-xs leading-snug mb-1">{card.subtitle}</p>
                <p className="text-white/40 text-[11px] leading-relaxed mb-3">{card.description}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white">{card.badge}</span>
                  <span className="text-white/60 text-xs">{card.badgeLabel}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Map — embedded directly */}
      <IrkutskMap objects={objects} stations={stations} />

    </div>
  );
};

export default MonitoringHub;
