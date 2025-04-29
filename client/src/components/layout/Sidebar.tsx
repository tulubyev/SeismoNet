import { FC } from 'react';
import { Link, useLocation } from 'wouter';
import {
  SquareDashedBottom,
  Gauge,
  SatelliteDish,
  Globe,
  History,
  Calculator,
  Cog
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
          <NavItem 
            href="/stations" 
            icon={<SatelliteDish className="size-5" />} 
            text="Stations" 
            isActive={location === '/stations'} 
          />
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
