import { FC, useRef, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  SquareDashedBottom,
  Gauge,
  SatelliteDish,
  Building2,
  Activity,
  BookOpen,
  Layers,
  Cog,
  PlusCircle,
  LogOut,
  UserCircle,
  Shield,
  Globe,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItemProps {
  href: string;
  icon: JSX.Element;
  text: string;
  isActive: boolean;
}

const NavItem: FC<NavItemProps> = ({ href, icon, text, isActive }) => (
  <li className="mb-0.5">
    <Link href={href}>
      <div
        role="menuitem"
        tabIndex={-1}
        className={`flex items-center py-2.5 px-4 text-white cursor-pointer outline-none focus:bg-slate-600 rounded-sm transition-colors ${
          isActive
            ? 'bg-blue-600 border-l-4 border-white'
            : 'hover:bg-slate-700'
        }`}
      >
        <div className="w-5 text-center flex-shrink-0">{icon}</div>
        <span className="hidden md:block ml-3 text-sm">{text}</span>
      </div>
    </Link>
  </li>
);

const SectionLabel: FC<{ text: string }> = ({ text }) => (
  <div className="mt-5 mb-1.5 px-4 hidden md:block">
    <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{text}</h3>
  </div>
);

const Sidebar: FC = () => {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const navRef = useRef<HTMLElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = navRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items || items.length === 0) return;
    const arr = Array.from(items);
    const focused = document.activeElement as HTMLElement;
    const currentIndex = arr.indexOf(focused);
    if (e.key === 'ArrowDown') {
      (arr[currentIndex + 1] ?? arr[0]).focus();
    } else {
      (arr[currentIndex - 1] ?? arr[arr.length - 1]).focus();
    }
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate();
    navigate('/auth');
  };

  const getUserInitials = () => {
    if (!user) return '?';
    const parts = user.fullName.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === 'administrator') {
      return (
        <div className="flex items-center text-xs text-amber-300 mt-0.5">
          <Shield className="h-3 w-3 mr-1" />
          <span>Администратор</span>
        </div>
      );
    }
    return <p className="text-xs text-slate-300 capitalize mt-0.5">{user.role}</p>;
  };

  return (
    <aside className="w-14 md:w-60 bg-slate-800 text-white flex flex-col transition-all duration-300 h-screen">

      {/* Logo */}
      <div className="p-4 flex items-center justify-center md:justify-start flex-shrink-0 border-b border-slate-700">
        <div className="bg-blue-600 rounded-lg p-1.5 flex items-center justify-center">
          <SquareDashedBottom className="size-5" />
        </div>
        <div className="hidden md:block ml-2.5">
          <span className="font-bold text-sm leading-tight block">СейсмоМонитор</span>
          <span className="text-[10px] text-slate-400 leading-tight block">г. Иркутск</span>
        </div>
      </div>

      <nav
        ref={navRef}
        onKeyDown={handleKeyDown}
        className="flex-1 mt-3 overflow-y-auto px-2"
        role="menu"
        aria-label="Главное меню"
      >
        <ul className="pb-4">

          <NavItem href="/" icon={<Gauge className="size-4" />} text="Главная" isActive={location === '/'} />

          <SectionLabel text="Объекты" />
          <NavItem href="/infrastructure" icon={<Building2 className="size-4" />} text="Инфраструктура" isActive={location === '/infrastructure'} />
          <NavItem href="/stations" icon={<SatelliteDish className="size-4" />} text="Станции" isActive={location === '/stations'} />
          <NavItem href="/stations/new" icon={<PlusCircle className="size-4" />} text="Добавить станцию" isActive={location === '/stations/new'} />

          <SectionLabel text="Мониторинг" />
          <NavItem href="/seismograms" icon={<Activity className="size-4" />} text="Сейсмограммы" isActive={location === '/seismograms'} />
          <NavItem href="/event-map" icon={<Globe className="size-4" />} text="Карта событий" isActive={location === '/event-map'} />
          <NavItem href="/event-history" icon={<History className="size-4" />} text="История событий" isActive={location === '/event-history'} />

          <SectionLabel text="Грунты и геология" />
          <NavItem href="/soil-profiles" icon={<Layers className="size-4" />} text="База грунтов" isActive={location === '/soil-profiles'} />

          <SectionLabel text="Анализ" />
          <NavItem href="/analysis" icon={<Layers className="size-4" />} text="Анализ данных" isActive={location === '/analysis'} />

          <SectionLabel text="Нормативная база" />
          <NavItem href="/building-norms" icon={<BookOpen className="size-4" />} text="СНиП / СП / ГОСТ" isActive={location === '/building-norms'} />

          <SectionLabel text="Система" />
          <NavItem href="/settings" icon={<Cog className="size-4" />} text="Настройки" isActive={location === '/settings'} />

        </ul>
      </nav>

      {/* User block */}
      <div className="p-3 border-t border-slate-600 flex-shrink-0">
        {user ? (
          <>
            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">{getUserInitials()}</span>
                </div>
                <div className="ml-2 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{user.fullName}</p>
                  {getRoleBadge()}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700 h-7 w-7">
                    <UserCircle className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href="/settings">
                      <div className="flex items-center">
                        <Cog className="mr-2 h-4 w-4" />
                        <span>Настройки</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
                    <div className="flex items-center text-red-500">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{logoutMutation.isPending ? 'Выход...' : 'Выйти'}</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="md:hidden flex flex-col items-center gap-1">
              <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{getUserInitials()}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-slate-700 h-6 w-6 p-0"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <Link href="/auth">
              <Button variant="secondary" size="sm" className="w-full text-xs h-8">Войти</Button>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
