import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

// Pages
import Dashboard from "@/pages/Dashboard";
import Stations from "@/pages/Stations";
import AddStation from "@/pages/AddStation";
import EventMap from "@/pages/EventMap";
import EventHistory from "@/pages/EventHistory";
import Analysis from "@/pages/Analysis";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";

function Router() {
  return (
    <Switch>
      {/* Auth Page - Public */}
      <Route path="/auth" component={AuthPage} />
      
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
