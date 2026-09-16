import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { FC, Suspense, lazy } from "react";
import AppLayout from "@/components/layout/AppLayout";

import HomePage from "@/pages/HomePage";
import Dashboard from "@/pages/Dashboard";
const Stations = lazy(() => import("@/pages/Stations"));
const AddStation = lazy(() => import("@/pages/AddStation"));
const Analysis = lazy(() => import("@/pages/Analysis"));
const Settings = lazy(() => import("@/pages/Settings"));
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
const InfrastructureObjects = lazy(() => import("@/pages/InfrastructureObjects"));
const BuildingNorms = lazy(() => import("@/pages/BuildingNorms"));
const Seismograms = lazy(() => import("@/pages/Seismograms"));
const SeismoLive = lazy(() => import("@/pages/SeismoLive"));
const Archive = lazy(() => import("@/pages/Archive"));
const DevelopersPage = lazy(() => import("@/pages/Developers"));
const SoilDatabase = lazy(() => import("@/pages/SoilDatabase"));
const SystemManagement = lazy(() => import("@/pages/SystemManagement"));
const Calculations = lazy(() => import("@/pages/Calculations"));
const SeismoNetProject = lazy(() => import("@/pages/SeismoNetProject"));
const DataAnalysis = lazy(() => import("@/pages/DataAnalysis"));
const MonitoringHub = lazy(() => import("@/pages/MonitoringHub"));
const AboutProject = lazy(() => import("@/pages/AboutProject"));
const Partners = lazy(() => import("@/pages/Partners"));
const AboutEarthquakes = lazy(() => import("@/pages/AboutEarthquakes"));
const SeismicBasics = lazy(() => import("@/pages/SeismicBasics"));
const Interesting = lazy(() => import("@/pages/Interesting"));

// Heavy pages are code-split (React.lazy) so the first load only ships the
// shell + HomePage/Dashboard; the layout stays mounted while a chunk loads.
const PageFallback = () => (
  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
    Загрузка…
  </div>
);

const withLayout = (Component: FC) => () => (
  <AppLayout>
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
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
      <ProtectedRoute path="/monitoring-hub"     component={withLayout(MonitoringHub)}     />
      <ProtectedRoute path="/data-analysis"     component={withLayout(DataAnalysis)}      />
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
