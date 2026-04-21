import { FC } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useSeismicData } from '@/hooks/useSeismicData';
import { useAuth } from '@/hooks/use-auth';
import type { Alert, InfrastructureObject, SeismogramRecord } from '@shared/schema';
import {
  Settings as SettingsIcon, ShieldCheck, ArrowRight,
  HardHat, PlusSquare, Radio, Network, Server, Database, BellRing, Siren,
  Wrench,
} from 'lucide-react';

const SystemManagement: FC = () => {
  const [, navigate] = useLocation();
  const { stations, events } = useSeismicData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'administrator';

  const { data: objects = [] } = useQuery<InfrastructureObject[]>({ queryKey: ['/api/infrastructure-objects'] });
  const { data: seismograms = [] } = useQuery<SeismogramRecord[]>({ queryKey: ['/api/seismograms'] });
  const { data: alerts = [] } = useQuery<Alert[]>({ queryKey: ['/api/alerts'] });
  const { data: developers = [] } = useQuery<{ id: number }[]>({ queryKey: ['/api/developers'] });

  const unreadAlerts = alerts.filter(a => !a.isRead).length;

  const items = [
    {
      href: '/developers', icon: HardHat, title: 'Застройщики',
      desc: 'Реестр и контакты компаний', badge: developers.length || null,
      color: 'text-orange-300', bg: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
    },
    {
      href: '/infrastructure', icon: PlusSquare, title: 'Объекты',
      desc: 'Добавление зданий и сооружений', badge: objects.length || null,
      color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20',
    },
    {
      href: '/stations', icon: Radio, title: 'Датчики',
      desc: 'Параметры и калибровка', badge: stations.length || null,
      color: 'text-cyan-300', bg: 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20',
    },
    {
      href: '/settings', icon: Network, title: 'Сеть передачи',
      desc: 'SeedLink, FDSN-WS, концентратор', badge: null,
      color: 'text-blue-300', bg: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20',
    },
    {
      href: '/settings', icon: Server, title: 'Серверы',
      desc: 'Состояние и нагрузка узлов', badge: null,
      color: 'text-violet-300', bg: 'bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/20',
    },
    {
      href: '/archive', icon: Database, title: 'Хранение данных',
      desc: 'Архив, объёмы, политика хранения', badge: seismograms.length || null,
      color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20',
    },
    {
      href: '/alerts', icon: BellRing, title: 'Оповещения',
      desc: 'Каналы Telegram, Email, Slack', badge: unreadAlerts || null,
      color: 'text-rose-300', bg: 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20',
    },
    {
      href: '/analysis', icon: Siren, title: 'Контроль событий',
      desc: 'Каталог, фильтры, экспорт', badge: events.length || null,
      color: 'text-red-300', bg: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20',
    },
  ];

  return (
    <div className="min-h-full bg-slate-900">
      <div className="px-6 pt-8 pb-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-600/20 border border-blue-500/30">
                <SettingsIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white leading-tight">Управление системой</h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  Администрирование сети, объектов, серверной и системы оповещения
                </p>
              </div>
            </div>
            {!isAdmin && (
              <div className="flex items-center gap-1.5 text-amber-400 text-xs bg-amber-900/30 border border-amber-700/40 rounded-full px-3 py-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Доступно администраторам
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {items.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  onClick={() => navigate(item.href)}
                  className={`group relative text-left rounded-xl border ${item.bg} p-4 transition-all cursor-pointer`}
                  data-testid={`button-${item.title}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Icon className={`h-6 w-6 ${item.color}`} />
                    {item.badge !== null && (
                      <span className="text-xs font-semibold text-white bg-white/10 border border-white/15 rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-white font-semibold text-sm leading-tight">{item.title}</div>
                  <div className="text-slate-400 text-xs mt-1 leading-snug">{item.desc}</div>
                  <ArrowRight className="absolute bottom-3 right-3 h-4 w-4 text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>

          {/* Settings block */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-slate-700/60" />
              <span className="text-xs text-slate-500 uppercase tracking-widest">Системные настройки</span>
              <div className="h-px flex-1 bg-slate-700/60" />
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="group w-full text-left rounded-xl border bg-slate-700/20 border-slate-600/40 hover:bg-slate-700/40 p-4 transition-all cursor-pointer flex items-center gap-4"
            >
              <div className="p-3 rounded-xl bg-slate-600/30 border border-slate-500/30 flex-shrink-0">
                <Wrench className="h-6 w-6 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm">Настройки системы</div>
                <div className="text-slate-400 text-xs mt-0.5">
                  Пользователи, роли, уведомления, подключения, безопасность
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemManagement;
