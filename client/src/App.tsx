import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Dashboard from "@/pages/Dashboard";
import Stations from "@/pages/Stations";
import AddStation from "@/pages/AddStation";
import EventMap from "@/pages/EventMap";
import EventHistory from "@/pages/EventHistory";
import Analysis from "@/pages/Analysis";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Main Pages */}
      <Route path="/" component={Dashboard} />
      <Route path="/stations" component={Stations} />
      <Route path="/stations/new" component={AddStation} />
      <Route path="/event-map" component={EventMap} />
      <Route path="/event-history" component={EventHistory} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/settings" component={Settings} />
      
      {/* Event Intensity Pages */}
      <Route path="/events/intensity" component={EventHistory} />
      <Route path="/events/major" component={EventHistory} />
      
      {/* Dashboard Component Pages */}
      <Route path="/network-status" component={Dashboard} />
      <Route path="/live-waveforms" component={Dashboard} />
      <Route path="/status-detail" component={Dashboard} />
      <Route path="/data-exchange" component={Dashboard} />
      <Route path="/alerts" component={Dashboard} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
