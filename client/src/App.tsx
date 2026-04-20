import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { FC } from "react";
import AppLayout from "@/components/layout/AppLayout";

import HomePage from "@/pages/HomePage";
import Dashboard from "@/pages/Dashboard";
import Stations from "@/pages/Stations";
import AddStation from "@/pages/AddStation";
import Analysis from "@/pages/Analysis";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import InfrastructureObjects from "@/pages/InfrastructureObjects";
import BuildingNorms from "@/pages/BuildingNorms";
import Seismograms from "@/pages/Seismograms";
import SeismoLive from "@/pages/SeismoLive";
import Archive from "@/pages/Archive";
import DevelopersPage from "@/pages/Developers";
import SoilDatabase from "@/pages/SoilDatabase";
import SystemManagement from "@/pages/SystemManagement";
import Calculations from "@/pages/Calculations";
import SeismoNetProject from "@/pages/SeismoNetProject";
import DataAnalysis from "@/pages/DataAnalysis";
import AboutProject from "@/pages/AboutProject";
import Partners from "@/pages/Partners";
import AboutEarthquakes from "@/pages/AboutEarthquakes";
import SeismicBasics from "@/pages/SeismicBasics";
import Interesting from "@/pages/Interesting";

const withLayout = (Component: FC) => () => (
  <AppLayout>
    <Component />
  </AppLayout>
);

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />

      <ProtectedRoute path="/"                component={withLayout(HomePage)}              />
      <ProtectedRoute path="/monitoring"      component={withLayout(Dashboard)}             />
      <ProtectedRoute path="/stations"        component={withLayout(Stations)}              />
      <ProtectedRoute path="/stations/new"    component={withLayout(AddStation)}
        requiredRole={["administrator", "user"]} />
      <ProtectedRoute path="/analysis"        component={withLayout(Analysis)}              />
      <ProtectedRoute path="/calculations"    component={withLayout(Calculations)}          />
      <ProtectedRoute path="/infrastructure"  component={withLayout(InfrastructureObjects)} />
      <ProtectedRoute path="/developers"      component={withLayout(DevelopersPage)}        />
      <ProtectedRoute path="/soil-database"   component={withLayout(SoilDatabase)}          />
      <ProtectedRoute path="/seismograms"     component={withLayout(Seismograms)}           />
      <ProtectedRoute path="/seismo-live"     component={withLayout(SeismoLive)}            />
      <ProtectedRoute path="/building-norms"  component={withLayout(BuildingNorms)}         />
      <ProtectedRoute path="/archive"         component={withLayout(Archive)}               />
      <ProtectedRoute path="/settings"        component={withLayout(Settings)}
        requiredRole="administrator" />
      <ProtectedRoute path="/system-management"   component={withLayout(SystemManagement)}   />
      <ProtectedRoute path="/seismonet-project"  component={withLayout(SeismoNetProject)}   />
      <ProtectedRoute path="/data-analysis"      component={withLayout(DataAnalysis)}      />
      <ProtectedRoute path="/about-project"     component={withLayout(AboutProject)}      />
      <ProtectedRoute path="/partners"          component={withLayout(Partners)}          />
      <ProtectedRoute path="/about-earthquakes" component={withLayout(AboutEarthquakes)}  />
      <ProtectedRoute path="/seismic-basics"    component={withLayout(SeismicBasics)}     />
      <ProtectedRoute path="/interesting"       component={withLayout(Interesting)}       />

      <ProtectedRoute path="/network-status"   component={withLayout(Dashboard)}   />
      <ProtectedRoute path="/live-waveforms"   component={withLayout(Dashboard)}   />
      <ProtectedRoute path="/status-detail"    component={withLayout(Dashboard)}   />
      <ProtectedRoute path="/data-exchange"    component={withLayout(Dashboard)}   />
      <ProtectedRoute path="/alerts"           component={withLayout(Dashboard)}   />

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
