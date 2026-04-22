import { FC, ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  ArrowDown, ArrowUp, ArrowLeft,
  LogOut, UserCircle, Bell,
  ChevronDown, Activity, AlertTriangle, Siren, BatteryLow, ServerCrash,
  WifiOff as StationOfflineIcon, Info, CheckCheck, ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Alert } from '@shared/schema';

const PARENT_ROUTES: Record<string, string> = {
  '/monitoring-hub':     '/',
  '/data-analysis':      '/',
  '/system-management':  '/',
  '/seismonet-project':  '/',
  '/infrastructure':     '/',
  '/stations':           '/',
  '/seismograms':        '/',
  '/analysis':           '/',
  '/calculations':       '/',
  '/soil-database':      '/',
  '/settings':           '/',
  '/building-norms':     '/',
  '/archive':            '/',
  '/developers':         '/',
  '/seismo-live':        '/',
  '/monitoring':         '/',
  '/network-status':     '/',
  '/live-waveforms':     '/',
  '/status-detail':      '/',
  '/data-exchange':      '/',
  '/alerts':             '/',
  '/stations/new':       '/stations',
  '/about-project':      '/seismonet-project',
  '/partners':           '/seismonet-project',
  '/about-earthquakes':  '/seismonet-project',
  '/seismic-basics':     '/seismonet-project',
  '/interesting':        '/seismonet-project',
};

function getParent(location: string): string | null {
  if (location === '/') return null;
  if (PARENT_ROUTES[location]) return PARENT_ROUTES[location];
  const segments = location.split('/').filter(Boolean);
  if (segments.length > 1) return '/' + segments.slice(0, -1).join('/');
  return '/';
}

function relativeTime(ts: string | Date): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'только что';
  if (m < 60)  return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} д назад`;
}

function alertMeta(alert: Alert): { Icon: FC<{ className?: string }>; color: string; bg: string } {
  const t = alert.alertType ?? '';
  const s = alert.severity ?? '';

  if (s === 'critical' || t.includes('seismic') || t.includes('event'))
    return { Icon: Siren,              color: 'text-red-400',    bg: 'bg-red-500/10'    };
  if (t.includes('battery') || t.includes('power'))
    return { Icon: BatteryLow,         color: 'text-amber-400',  bg: 'bg-amber-500/10'  };
  if (t.includes('offline') || t.includes('station') || t.includes('connection'))
    return { Icon: StationOfflineIcon, color: 'text-orange-400', bg: 'bg-orange-500/10' };
  if (t.includes('server') || t.includes('data'))
    return { Icon: ServerCrash,        color: 'text-violet-400', bg: 'bg-violet-500/10' };
  if (s === 'warning')
    return { Icon: AlertTriangle,      color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  return   { Icon: Info,               color: 'text-blue-400',   bg: 'bg-blue-500/10'   };
}

const AlertsPanel: FC = () => {
  const qc = useQueryClient();
  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
    select: (d) => d.slice(0, 20),
  });

  const markOne = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/alerts/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/alerts'] }),
  });

  const markAll = useMutation({
    mutationFn: () => apiRequest('POST', '/api/alerts/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/alerts'] }),
  });

  const unread = alerts.filter(a => !a.isRead).length;

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
        <Bell className="h-8 w-8 opacity-30" />
        <p className="text-sm">Нет оповещений</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-700">
        <span className="text-sm font-semibold text-white">
          Оповещения
          {unread > 0 && (
            <span className="ml-2 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">{unread}</span>
          )}
        </span>
        {unread > 0 && (
          <button
            onClick={() => markAll.mutate()}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Все прочитано
          </button>
        )}
      </div>

      <div className="overflow-y-auto max-h-[340px]">
        {alerts.map(alert => {
          const { Icon, color, bg } = alertMeta(alert);
          return (
            <div
              key={alert.id}
              onClick={() => !alert.isRead && markOne.mutate(alert.id)}
              className={`flex items-start gap-3 px-4 py-3 border-b border-slate-700/50 transition-colors cursor-pointer
                ${alert.isRead ? 'opacity-50' : 'hover:bg-slate-700/40'}`}
            >
              <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${bg}`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs leading-snug ${alert.isRead ? 'text-slate-400' : 'text-slate-200'}`}>
                  {alert.message}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{relativeTime(alert.timestamp)}</p>
              </div>
              {!alert.isRead && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2.5 border-t border-slate-700">
        <Link href="/alerts">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
            <ExternalLink className="h-3 w-3" />
            Все оповещения
          </div>
        </Link>
      </div>
    </>
  );
};

const TopBar: FC = () => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { data: alerts = [] } = useQuery<Alert[]>({ queryKey: ['/api/alerts'] });
  const unread = alerts.filter(a => !a.isRead).length;

  const isHome = location === '/';
  const parentHref = getParent(location);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/60 flex items-center px-4 shadow-lg">

      {/* Logo / brand — left */}
      <Link href="/">
        <div className="flex items-center gap-2 cursor-pointer flex-shrink-0">
          <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
            <Activity className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-white font-semibold text-xs leading-tight hidden sm:block">
            SeismoNet
            <span className="text-blue-400 font-normal ml-1 text-[10px]">г. Иркутск</span>
          </span>
        </div>
      </Link>

      {/* Navigation arrows — absolutely centered */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
      {isHome ? (
        /* Home page: single green ↓ arrow */
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full
              bg-gradient-to-r from-green-500/20 to-green-600/20
              border border-green-500/40
              text-green-400 select-none"
          >
            <ArrowDown className="h-4 w-4 animate-bounce" strokeWidth={2.5} />
            <span className="text-xs font-medium hidden sm:inline">к разделам</span>
          </div>
      ) : (
        /* Sub-page: ↑ green (home) + ← blue (parent) */
        <>
          <Link href="/">
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer
                bg-gradient-to-r from-green-500/20 to-green-600/20
                border border-green-500/40
                text-green-400 hover:text-green-300 hover:border-green-400/60
                transition-all duration-150"
              title="На главную"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              <span className="text-xs font-medium hidden sm:inline">Главная</span>
            </div>
          </Link>

          {parentHref && (
            <Link href={parentHref}>
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full cursor-pointer
                  bg-gradient-to-r from-blue-500/20 to-blue-600/20
                  border border-blue-500/40
                  text-blue-400 hover:text-blue-300 hover:border-blue-400/60
                  transition-all duration-150"
                title="Назад"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
                <span className="text-xs font-medium hidden sm:inline">Назад</span>
              </div>
            </Link>
          )}
        </>
      )}
      </div>

      {/* Right: alerts + user */}
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
        <Popover>
          <PopoverTrigger asChild>
            <div className="relative cursor-pointer">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700">
                <Bell className="h-4 w-4" />
              </Button>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold pointer-events-none">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-80 p-0 bg-slate-800 border-slate-700 shadow-2xl rounded-xl overflow-hidden"
          >
            <AlertsPanel />
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-2 text-slate-300 hover:text-white hover:bg-slate-700 gap-1.5">
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">{user?.username}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">
              <div className="font-semibold">{user?.username}</div>
              <div className="text-slate-500 font-normal">{user?.role}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4" /> Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

const AppFooter: FC = () => (
  <footer className="fixed bottom-0 left-0 right-0 z-40 h-10 bg-slate-900 border-t border-slate-700 flex items-center px-6 gap-2">
    <span className="text-slate-400 text-sm truncate min-w-0 flex-1">
         Центр сейсмического мониторинга
    </span>
    <span className="text-slate-300 text-sm font-medium hidden md:inline whitespace-nowrap flex-shrink-0">
    Приглашем к партнерству
    </span>
    <div className="flex items-center justify-end gap-4 text-slate-500 text-sm flex-1 min-w-0">
      <span className="flex-shrink-0">v2.0.1</span>
      <span className="hidden sm:inline truncate">© 2026 Байкальская Инновационная Компания</span>
    </div>
  </footer>
);

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: FC<AppLayoutProps> = ({ children }) => (
  <div className="min-h-screen bg-slate-900 flex flex-col">
    <TopBar />
    <main className="flex-1 overflow-y-auto pt-12 pb-10">
      {children}
    </main>
    <AppFooter />
  </div>
);

export default AppLayout;
