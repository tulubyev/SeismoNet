import { FC } from 'react';
import { Link, useLocation } from 'wouter';
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
  Activity,
  Network,
  Waves,
  BarChart3,
  Share2,
  Radio,
  MapPin,
  AlertTriangle
} from 'lucide-react';

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
        <a className={`flex items-center py-3 px-4 ${
          isActive 
            ? "bg-primary bg-opacity-20 border-l-4 border-primary" 
            : "hover:bg-sidebar-accent hover:bg-opacity-30 transition-colors"
        }`}>
          <div className="w-5 text-center">{icon}</div>
          <span className="hidden md:block ml-3">{text}</span>
        </a>
      </Link>
    </li>
  );
};

const Sidebar: FC = () => {
  const [location] = useLocation();
  
  return (
    <aside className="w-16 md:w-64 bg-sidebar-background text-sidebar-foreground flex flex-col transition-all duration-300">
      <div className="p-4 flex items-center justify-center md:justify-start">
        <div className="bg-primary rounded-lg p-2 flex items-center justify-center">
          <SquareDashedBottom className="size-5" />
        </div>
        <span className="hidden md:block ml-3 font-semibold text-lg">SeismoNet</span>
      </div>
      
      <nav className="flex-1 mt-6">
        <ul>
          <NavItem 
            href="/" 
            icon={<Gauge className="size-5" />} 
            text="Dashboard" 
            isActive={location === '/'} 
          />
          
          {/* Stations Section */}
          <div className="mt-5 mb-2 px-4 hidden md:block">
            <h3 className="text-xs font-semibold text-slate-DEFAULT uppercase tracking-wider">Stations</h3>
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
            <h3 className="text-xs font-semibold text-slate-DEFAULT uppercase tracking-wider">Events</h3>
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
            <h3 className="text-xs font-semibold text-slate-DEFAULT uppercase tracking-wider">Monitoring</h3>
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
            <h3 className="text-xs font-semibold text-slate-DEFAULT uppercase tracking-wider">Tools</h3>
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
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="hidden md:flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-semibold">JS</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Dr. John Smith</p>
            <p className="text-xs opacity-70">Seismologist</p>
          </div>
        </div>
        <div className="md:hidden flex justify-center">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-semibold">JS</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
