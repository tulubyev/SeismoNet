import { FC, ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  Home, Building2, Radio, FileText,
  Layers, Settings, LogOut, UserCircle, Bell,
  ChevronDown, Wifi, WifiOff, Calculator, Activity
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import type { Alert } from '@shared/schema';
import { useSeismicData } from '@/hooks/useSeismicData';

const NAV_LINKS = [
  { href: '/',               icon: <Home className="h-4 w-4" />,       label: 'Обзор'               },
  { href: '/infrastructure', icon: <Building2 className="h-4 w-4" />,  label: 'Объекты мониторинга' },
  { href: '/stations',       icon: <Radio className="h-4 w-4" />,      label: 'Датчики'             },
  { href: '/soil-profiles',  icon: <Layers className="h-4 w-4" />,     label: 'Грунты'              },
  { href: '/seismograms',    icon: <FileText className="h-4 w-4" />,   label: 'Сигналы'             },
  { href: '/analysis',       icon: <Calculator className="h-4 w-4" />, label: 'Расчёты'             },
  { href: '/settings',       icon: <Settings className="h-4 w-4" />,   label: 'Настройки'           },
];

const TopNav: FC = () => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { isConnected } = useSeismicData();
  const { data: alerts = [] } = useQuery<Alert[]>({ queryKey: ['/api/alerts'] });
  const unread = alerts.filter(a => !a.isRead).length;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-2 shadow-lg">
      <Link href="/">
        <div className="flex items-center gap-2 mr-4 cursor-pointer flex-shrink-0">
          <div className="w-7 h-7 rounded bg-blue-500 flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm leading-tight hidden lg:block">
            Seismo Net<br />
            <span className="text-blue-400 font-normal text-[10px]">г. Иркутск</span>
          </span>
        </div>
      </Link>

      <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-hide">
        {NAV_LINKS.map(link => {
          const isActive = link.href === '/'
            ? location === '/'
            : location.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm cursor-pointer whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}>
                {link.icon}
                <span className="hidden md:inline">{link.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          isConnected ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'
        }`}>
          {isConnected
            ? <><Wifi className="h-3 w-3" /> Онлайн</>
            : <><WifiOff className="h-3 w-3" /> Нет связи</>}
        </div>

        <div className="relative">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700">
            <Bell className="h-4 w-4" />
          </Button>
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>

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
  <footer className="fixed bottom-0 left-0 right-0 z-40 h-10 bg-slate-900 border-t border-slate-700 flex items-center justify-between px-6">
    <span className="text-slate-400 text-xs">
      SeismoNet Irkutsk Сеть сейсмических станций
    </span>
    <div className="flex items-center gap-4 text-slate-500 text-xs">
      <span>v2.0.0</span>
      <span className="hidden sm:inline">© 2026 Байкальская Инновационная Компания</span>
    </div>
  </footer>
);

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: FC<AppLayoutProps> = ({ children }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col">
    <TopNav />
    <main className="flex-1 overflow-y-auto pt-14 pb-10">
      {children}
    </main>
    <AppFooter />
  </div>
);

export default AppLayout;
