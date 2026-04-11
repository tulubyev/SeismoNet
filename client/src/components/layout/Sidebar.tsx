import { FC, useRef, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  SquareDashedBottom,
  Gauge,
  SatelliteDish,
  Globe,
  History,
  Calculator,
  Cog,
  PlusCircle,
  ActivitySquare,
  Zap,
  LogOut,
  Network,
  Waves,
  BarChart3,
  Share2,
  AlertTriangle,
  UserCircle,
  Shield
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

const NavItem: FC<NavItemProps> = ({ href, icon, text, isActive }) => {
  return (
    <li className="mb-1">
      <Link href={href}>
        <div
          role="menuitem"
          tabIndex={-1}
          className={`flex items-center py-3 px-4 text-white cursor-pointer outline-none focus:bg-slate-600 ${
            isActive
              ? "bg-blue-500 border-l-4 border-white"
              : "hover:bg-slate-700 transition-colors"
          }`}
        >
          <div className="w-5 text-center">{icon}</div>
          <span className="hidden md:block ml-3">{text}</span>
        </div>
      </Link>
    </li>
  );
};

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
      const next = arr[currentIndex + 1] ?? arr[0];
      next.focus();
    } else {
      const prev = arr[currentIndex - 1] ?? arr[arr.length - 1];
      prev.focus();
    }
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate();
    navigate('/auth');
  };

  const getUserInitials = () => {
    if (!user) return "?";
    const nameParts = user.fullName.split(" ");
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return nameParts[0].substring(0, 2).toUpperCase();
  };

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === "administrator") {
      return (
        <div className="flex items-center text-xs text-amber-300 mt-1">
          <Shield className="h-3 w-3 mr-1" />
          <span>Administrator</span>
        </div>
      );
    }
    return <p className="text-xs text-gray-300 capitalize">{user.role}</p>;
  };

  return (
    <aside className="w-16 md:w-64 bg-slate-800 text-white flex flex-col transition-all duration-300 h-screen">
      <div className="p-4 flex items-center justify-center md:justify-start flex-shrink-0">
        <div className="bg-primary rounded-lg p-2 flex items-center justify-center">
          <SquareDashedBottom className="size-5" />
        </div>
        <span className="hidden md:block ml-3 font-semibold text-lg">SeismoNet</span>
      </div>

      <nav
        ref={navRef}
        onKeyDown={handleKeyDown}
        className="flex-1 mt-6 overflow-y-auto scrollbar-thin"
        role="menu"
        aria-label="Главное меню"
      >
        <ul className="pb-4">
          <NavItem
            href="/"
            icon={<Gauge className="size-5" />}
            text="Dashboard"
            isActive={location === '/'}
          />

          <div className="mt-5 mb-2 px-4 hidden md:block">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Станции</h3>
          </div>
          <NavItem
            href="/stations"
            icon={<SatelliteDish className="size-5" />}
            text="Все станции"
            isActive={location === '/stations'}
          />
          <NavItem
            href="/stations/new"
            icon={<PlusCircle className="size-5" />}
            text="Добавить станцию"
            isActive={location === '/stations/new'}
          />

          <div className="mt-5 mb-2 px-4 hidden md:block">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">События</h3>
          </div>
          <NavItem
            href="/event-map"
            icon={<Globe className="size-5" />}
            text="Карта событий"
            isActive={location === '/event-map'}
          />
          <NavItem
            href="/event-history"
            icon={<History className="size-5" />}
            text="История событий"
            isActive={location === '/event-history'}
          />
          <NavItem
            href="/events/intensity"
            icon={<ActivitySquare className="size-5" />}
            text="По интенсивности"
            isActive={location === '/events/intensity'}
          />
          <NavItem
            href="/events/major"
            icon={<Zap className="size-5" />}
            text="Крупные события"
            isActive={location === '/events/major'}
          />

          <div className="mt-5 mb-2 px-4 hidden md:block">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Мониторинг</h3>
          </div>
          <NavItem
            href="/network-status"
            icon={<Network className="size-5" />}
            text="Статус сети"
            isActive={location === '/network-status'}
          />
          <NavItem
            href="/live-waveforms"
            icon={<Waves className="size-5" />}
            text="Живые волны"
            isActive={location === '/live-waveforms'}
          />
          <NavItem
            href="/status-detail"
            icon={<BarChart3 className="size-5" />}
            text="Детальный статус"
            isActive={location === '/status-detail'}
          />
          <NavItem
            href="/data-exchange"
            icon={<Share2 className="size-5" />}
            text="Исследовательские сети"
            isActive={location === '/data-exchange'}
          />
          <NavItem
            href="/alerts"
            icon={<AlertTriangle className="size-5" />}
            text="Системные тревоги"
            isActive={location === '/alerts'}
          />

          <div className="mt-5 mb-2 px-4 hidden md:block">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Инструменты</h3>
          </div>
          <NavItem
            href="/analysis"
            icon={<Calculator className="size-5" />}
            text="Анализ"
            isActive={location === '/analysis'}
          />
          <NavItem
            href="/settings"
            icon={<Cog className="size-5" />}
            text="Настройки"
            isActive={location === '/settings'}
          />
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-600 flex-shrink-0">
        {user ? (
          <>
            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">{getUserInitials()}</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">{user.fullName}</p>
                  {getRoleBadge()}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700">
                    <UserCircle className="h-5 w-5" />
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
                      <span>{logoutMutation.isPending ? "Выход..." : "Выйти"}</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="md:hidden flex flex-col items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">{getUserInitials()}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-slate-700 flex items-center"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{logoutMutation.isPending ? "..." : "Выйти"}</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <Link href="/auth">
              <Button variant="secondary" size="sm" className="w-full">
                Войти
              </Button>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
