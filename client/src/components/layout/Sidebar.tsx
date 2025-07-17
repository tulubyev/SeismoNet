import { FC } from 'react';
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
  MapPin,
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
        <div className={`flex items-center py-3 px-4 text-white ${
          isActive 
            ? "bg-blue-500 border-l-4 border-white" 
            : "hover:bg-slate-700 transition-colors"
        }`}>
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
  
  const handleLogout = () => {
    logoutMutation.mutate();
    navigate('/auth');
  };
  
  // Get user's initials for avatar
  const getUserInitials = () => {
    if (!user) return "?";
    
    const nameParts = user.fullName.split(" ");
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return nameParts[0].substring(0, 2).toUpperCase();
  };
  
  // Show role badge for administrators
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
      
      <nav className="flex-1 mt-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        <ul className="pb-4">
          <NavItem 
            href="/" 
            icon={<Gauge className="size-5" />} 
            text="Dashboard" 
            isActive={location === '/'} 
          />
          
          {/* Stations Section */}
          <div className="mt-5 mb-2 px-4 hidden md:block">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Stations</h3>
          </div>
          <NavItem 
            href="/stations" 
            icon={<SatelliteDish className="size-5" />} 
            text="View All Stations" 
            isActive={location === '/stations'} 
          />
          <NavItem 
            href="/stations/new" 
            icon={<PlusCircle className="size-5" />} 
            text="Add New Station" 
            isActive={location === '/stations/new'} 
          />
          
          {/* Events Section */}
          <div className="mt-5 mb-2 px-4 hidden md:block">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Events</h3>
          </div>
          <NavItem 
            href="/event-map" 
            icon={<Globe className="size-5" />} 
            text="Event Map" 
            isActive={location === '/event-map'} 
          />
          <NavItem 
            href="/event-history" 
            icon={<History className="size-5" />} 
            text="Event History" 
            isActive={location === '/event-history'} 
          />
          <NavItem 
            href="/events/intensity" 
            icon={<ActivitySquare className="size-5" />} 
            text="Events by Intensity" 
            isActive={location === '/events/intensity'} 
          />
          <NavItem 
            href="/events/major" 
            icon={<Zap className="size-5" />} 
            text="Major Events" 
            isActive={location === '/events/major'} 
          />
          
          {/* Monitoring Section */}
          <div className="mt-5 mb-2 px-4 hidden md:block">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Monitoring</h3>
          </div>
          <NavItem 
            href="/network-status" 
            icon={<Network className="size-5" />} 
            text="Network Status" 
            isActive={location === '/network-status'} 
          />
          <NavItem 
            href="/live-waveforms" 
            icon={<Waves className="size-5" />} 
            text="Live Waveforms" 
            isActive={location === '/live-waveforms'} 
          />
          <NavItem 
            href="/status-detail" 
            icon={<BarChart3 className="size-5" />} 
            text="Status Detail" 
            isActive={location === '/status-detail'} 
          />
          <NavItem 
            href="/data-exchange" 
            icon={<Share2 className="size-5" />} 
            text="Research Networks" 
            isActive={location === '/data-exchange'} 
          />
          <NavItem 
            href="/alerts" 
            icon={<AlertTriangle className="size-5" />} 
            text="System Alerts" 
            isActive={location === '/alerts'} 
          />
          
          {/* Tools Section */}
          <div className="mt-5 mb-2 px-4 hidden md:block">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Tools</h3>
          </div>
          <NavItem 
            href="/analysis" 
            icon={<Calculator className="size-5" />} 
            text="Analysis" 
            isActive={location === '/analysis'} 
          />
          <NavItem 
            href="/settings" 
            icon={<Cog className="size-5" />} 
            text="Settings" 
            isActive={location === '/settings'} 
          />
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-600 flex-shrink-0">
        {user ? (
          <>
            {/* Desktop View */}
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
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href="/settings">
                      <div className="flex items-center">
                        <Cog className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
                    <div className="flex items-center text-red-500">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Mobile View */}
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
                <span>{logoutMutation.isPending ? "..." : "Logout"}</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <Link href="/auth">
              <Button variant="secondary" size="sm" className="w-full">
                Login
              </Button>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
