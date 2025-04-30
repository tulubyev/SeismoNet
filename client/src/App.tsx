import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { useEffect, useState } from "react";

// Desktop Pages
import Dashboard from "@/pages/Dashboard";
import Stations from "@/pages/Stations";
import AddStation from "@/pages/AddStation";
import EventMap from "@/pages/EventMap";
import EventHistory from "@/pages/EventHistory";
import Analysis from "@/pages/Analysis";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";

// Mobile App
import MobileApp from "@/mobile/MobileApp";

// Device detection
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return isMobile;
}

// Button to switch between mobile and desktop views
function ViewSwitcher() {
  const [, navigate] = useLocation();
  const [currentLocation] = useLocation();
  
  const isMobileView = currentLocation.startsWith('/mobile');
  
  const handleSwitch = () => {
    if (isMobileView) {
      navigate('/');
    } else {
      navigate('/mobile');
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button 
        onClick={handleSwitch}
        className="bg-primary text-white px-3 py-2 rounded-full text-xs font-medium shadow-lg"
      >
        Switch to {isMobileView ? 'Desktop' : 'Mobile'} View
      </button>
    </div>
  );
}

function Router() {
  const isMobile = useIsMobile();
  const [location] = useLocation();
  
  // Auto-redirect to mobile view on small screens, except if already on mobile
  useEffect(() => {
    if (isMobile && !location.startsWith('/mobile') && location !== '/auth') {
      window.location.href = '/mobile';
    }
  }, [isMobile, location]);
  
  return (
    <>
      <Switch>
        {/* Auth Page - Public */}
        <Route path="/auth" component={AuthPage} />
        
        {/* Mobile App Routes */}
        <Route path="/mobile/:*" component={MobileApp} />
        
        {/* Protected Main Pages */}
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/stations" component={Stations} />
        <ProtectedRoute 
          path="/stations/new" 
          component={AddStation} 
          requiredRole={["administrator", "user"]} 
        />
        <ProtectedRoute path="/event-map" component={EventMap} />
        <ProtectedRoute path="/event-history" component={EventHistory} />
        <ProtectedRoute path="/analysis" component={Analysis} />
        <ProtectedRoute 
          path="/settings" 
          component={Settings} 
          requiredRole="administrator" 
        />
        
        {/* Protected Event Intensity Pages */}
        <ProtectedRoute path="/events/intensity" component={EventHistory} />
        <ProtectedRoute path="/events/major" component={EventHistory} />
        
        {/* Protected Dashboard Component Pages */}
        <ProtectedRoute path="/network-status" component={Dashboard} />
        <ProtectedRoute path="/live-waveforms" component={Dashboard} />
        <ProtectedRoute path="/status-detail" component={Dashboard} />
        <ProtectedRoute path="/data-exchange" component={Dashboard} />
        <ProtectedRoute path="/alerts" component={Dashboard} />
        
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
      
      {/* View Switcher */}
      <ViewSwitcher />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
