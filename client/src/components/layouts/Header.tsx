import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface HeaderProps {
  systemActive?: boolean;
}

const Header = ({ systemActive = true }: HeaderProps) => {
  const [location] = useLocation();
  
  // Generate page title based on current route
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Network Dashboard";
      case "/stations":
        return "Seismic Stations";
      case "/event-map":
        return "Event Map";
      case "/event-history":
        return "Event History";
      case "/analysis":
        return "Seismic Analysis";
      case "/settings":
        return "Settings";
      default:
        return "Seismic Monitoring";
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="flex justify-between items-center px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-dark">{getPageTitle()}</h1>
          <p className="text-sm text-slate-DEFAULT">Real-time seismic monitoring system</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-status-danger"></span>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="text-slate-DEFAULT" />
            </Button>
          </div>
          <div className="px-3 py-1.5 bg-status-success bg-opacity-10 text-status-success rounded-full flex items-center">
            <span className="h-2 w-2 rounded-full bg-status-success animate-pulse mr-2"></span>
            <span className="text-sm font-medium">{systemActive ? "System Active" : "System Inactive"}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
