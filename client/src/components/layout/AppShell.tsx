import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { useLocation } from "wouter";

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [location] = useLocation();
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [pageDescription, setPageDescription] = useState("Real-time seismic monitoring system");

  // Set page title based on current route
  useEffect(() => {
    switch (location) {
      case "/":
        setPageTitle("Network Dashboard");
        setPageDescription("Real-time seismic monitoring system");
        break;
      case "/stations":
        setPageTitle("Seismic Stations");
        setPageDescription("Monitor and manage connected stations");
        break;
      case "/event-map":
        setPageTitle("Event Map");
        setPageDescription("Geographic visualization of seismic events");
        break;
      case "/event-history":
        setPageTitle("Event History");
        setPageDescription("Historical record of seismic events");
        break;
      case "/analysis":
        setPageTitle("Seismic Analysis");
        setPageDescription("Analyze and interpret seismic data");
        break;
      case "/settings":
        setPageTitle("System Settings");
        setPageDescription("Configure system parameters and connections");
        break;
      default:
        setPageTitle("SeismoNet");
        setPageDescription("Real-time seismic monitoring system");
    }
  }, [location]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto bg-slate-ultralight">
        <header className="bg-white shadow-sm">
          <div className="flex justify-between items-center px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-dark">{pageTitle}</h1>
              <p className="text-sm text-slate-DEFAULT">{pageDescription}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-status-danger"></span>
                <button className="p-2 rounded-full hover:bg-slate-light transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                    className="text-slate-DEFAULT">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </button>
              </div>
              <div className="px-3 py-1.5 bg-status-success bg-opacity-10 text-status-success rounded-full flex items-center">
                <span className="pulse-dot bg-status-success mr-2"></span>
                <span className="text-sm font-medium">System Active</span>
              </div>
            </div>
          </div>
        </header>
        
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppShell;
