import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { FC, Suspense, lazy } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Forbidden from "@/pages/forbidden";
import { usePermission } from "@/hooks/use-permission";
import type { Level, Module } from "@shared/permissions";

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
const AdminUsers = lazy(() => import("@/pages/admin/Users"));

// Heavy pages are code-split (React.lazy) so the first load only ships the
// shell + HomePage/Dashboard; the layout stays mounted while a chunk loads.
const PageFallback = () => (
  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
    Загрузка…
  </div>
);

// Layout + permission gate. The gate lives inside the layout so a 403 keeps the nav.
const page = (Component: FC, module?: Module, level: Level = "read"): FC => {
  const Page: FC = () => {
    const { can } = usePermission();
    const forbidden = module !== undefined && !can(module, level);
    return (
      <AppLayout>
        <Suspense fallback={<PageFallback />}>
          {forbidden ? <Forbidden module={module} /> : <Component />}
        </Suspense>
      </AppLayout>
    );
  };
  return Page;
};

// [path, page] — built once at module load.
const ROUTES: Array<[string, FC]> = [
  ["/", page(HomePage)],
  ["/monitoring", page(Dashboard, 'monitoring')],
  ["/monitoring-hub", page(MonitoringHub, 'monitoring')],
  ["/seismo-live", page(SeismoLive, 'monitoring')],
  ["/system-management", page(SystemManagement, 'monitoring')],
  ["/stations", page(Stations, 'stations')],
  ["/stations/new", page(AddStation, 'stations', 'write')],
  ["/infrastructure", page(InfrastructureObjects, 'objects')],
  ["/developers", page(DevelopersPage, 'objects')],
  ["/seismograms", page(Seismograms, 'seismograms')],
  ["/archive", page(Archive, 'seismograms')],
  ["/analysis", page(Analysis, 'spectral')],
  ["/data-analysis", page(DataAnalysis, 'spectral')],
  ["/calculations", page(Calculations, 'mtsm')],
  ["/soil-database", page(SoilDatabase, 'soil')],
  ["/building-norms", page(BuildingNorms, 'norms')],
  ["/settings", page(Settings, 'settings')],
  ["/admin/users", page(AdminUsers, 'users')],
  ["/seismonet-project", page(SeismoNetProject)],
  ["/about-project", page(AboutProject)],
  ["/partners", page(Partners)],
  ["/about-earthquakes", page(AboutEarthquakes)],
  ["/seismic-basics", page(SeismicBasics)],
  ["/interesting", page(Interesting)],
  ["/network-status", page(Dashboard, 'monitoring')],
  ["/live-waveforms", page(Dashboard, 'monitoring')],
  ["/status-detail", page(Dashboard, 'monitoring')],
  ["/data-exchange", page(Dashboard, 'monitoring')],
  ["/alerts", page(Dashboard, 'monitoring')],
];

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />

      {ROUTES.map(([path, C]) => (
        <ProtectedRoute key={path} path={path} component={C} />
      ))}

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
