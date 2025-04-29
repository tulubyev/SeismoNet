import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Satellite, 
  Globe, 
  History, 
  Calculator, 
  Settings as SettingsIcon,
  SquareDashedBottom
} from "lucide-react";

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

const Sidebar = ({ expanded, onToggle }: SidebarProps) => {
  const [location] = useLocation();

  // Navigation items
  const navItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard className="w-5 text-center" /> },
    { path: "/stations", label: "Stations", icon: <Satellite className="w-5 text-center" /> },
    { path: "/event-map", label: "Event Map", icon: <Globe className="w-5 text-center" /> },
    { path: "/event-history", label: "Event History", icon: <History className="w-5 text-center" /> },
    { path: "/analysis", label: "Analysis", icon: <Calculator className="w-5 text-center" /> },
    { path: "/settings", label: "Settings", icon: <SettingsIcon className="w-5 text-center" /> },
  ];

  return (
    <aside className={cn(
      "bg-slate-dark text-white flex flex-col transition-all duration-300",
      expanded ? "w-64" : "w-16"
    )}>
      <div className="p-4 flex items-center justify-center md:justify-start">
        <div className="bg-primary rounded-lg p-2 flex items-center justify-center">
          <SquareDashedBottom className="text-xl" />
        </div>
        {expanded && <span className="ml-3 font-semibold text-lg">SeismoNet</span>}
      </div>
      
      <nav className="flex-1 mt-6">
        <ul>
          {navItems.map((item) => (
            <li className="mb-1" key={item.path}>
              <Link href={item.path}>
                <a className={cn(
                  "flex items-center py-3 px-4 hover:bg-slate-DEFAULT hover:bg-opacity-30 transition-colors",
                  location === item.path && "bg-primary bg-opacity-20 border-l-4 border-primary"
                )}>
                  {item.icon}
                  {expanded && <span className="ml-3">{item.label}</span>}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-DEFAULT">
        <div className={cn(
          "flex items-center",
          !expanded && "justify-center"
        )}>
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-semibold">JS</span>
          </div>
          {expanded && (
            <div className="ml-3">
              <p className="text-sm font-medium">Dr. John Smith</p>
              <p className="text-xs opacity-70">Seismologist</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
