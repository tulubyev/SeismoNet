import { FC } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useSeismicData } from '@/hooks/useSeismicData';
import type { SeismogramRecord } from '@shared/schema';
import {
  BarChart2, Map,
  ArrowRight, AlertTriangle, CheckCircle2,
  Settings as SettingsIcon, Globe,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { Alert } from '@shared/schema';

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

const HomePage: FC = () => {
  const [, navigate] = useLocation();
  const { stations, events } = useSeismicData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'administrator';

  const { data: seismograms = [] } = useQuery<SeismogramRecord[]>({
    queryKey: ['/api/seismograms'],
  });
  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
  });

  const unreadAlerts   = alerts.filter(a => !a.isRead).length;
  const onlineStations = stations.filter(s => s.status === 'online').length;
  const last24hEvents  = events.filter(e => Date.now() - new Date(e.timestamp).getTime() < 86_400_000).length;

  const blocks: BlockDef[] = [
    {
      href:       '/monitoring-hub',
      title:      'Карта и мониторинг',
      subtitle:   'Карта событий, объекты инфраструктуры, сейсмические станции',
      icon:       Map,
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
      title:      'Проект SeismoNet',
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

  return (
    <div className="min-h-full bg-slate-900">
      <div className="px-6 pt-8 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Датчиков онлайн', value: `${onlineStations}/${stations.length}`, color: 'text-emerald-400' },
              { label: 'События 24 ч',    value: last24hEvents,                           color: 'text-orange-400'  },
              { label: 'Записей архива',  value: seismograms.length,                      color: 'text-violet-400'  },
              { label: 'Оповещений',      value: unreadAlerts,                            color: unreadAlerts > 0 ? 'text-red-400' : 'text-slate-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {blocks.map(renderBlock)}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
