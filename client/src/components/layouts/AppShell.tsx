import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface AppShellProps {
  children: ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [systemActive, setSystemActive] = useState(true);

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar navigation */}
      <Sidebar expanded={sidebarExpanded} onToggle={toggleSidebar} />
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-ultralight">
        <Header systemActive={systemActive} />
        {children}
      </main>
    </div>
  );
};

export default AppShell;
