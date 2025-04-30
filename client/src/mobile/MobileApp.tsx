import { FC, useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  LayoutGrid, 
  RadioTower, 
  Map, 
  FileDigit, 
  Settings, 
  LogOut
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import AuthPage from '@/pages/auth-page';

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load mobile components to avoid TypeScript errors
const MobileDashboard = lazy(() => import('./pages/MobileDashboard'));
const MobileStations = lazy(() => import('./pages/MobileStations'));
const MobileFieldMap = lazy(() => import('./pages/MobileFieldMap'));
const MobileDataCollection = lazy(() => import('./pages/MobileDataCollection'));
const MobileSettings = lazy(() => import('./pages/MobileSettings'));

// Loading fallback component
const LoadingComponent = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const TabBar: FC = () => {
  const [location, navigate] = useLocation();
  
  const getActiveClass = (path: string) => {
    return location === path 
      ? 'text-primary border-t-2 border-primary' 
      : 'text-gray-500';
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 grid grid-cols-5 py-1 z-50">
      <button 
        className={`flex flex-col items-center justify-center py-2 px-1 ${getActiveClass('/mobile')}`}
        onClick={() => navigate('/mobile')}
      >
        <LayoutGrid className="h-5 w-5" />
        <span className="text-xs mt-1">Dashboard</span>
      </button>
      
      <button 
        className={`flex flex-col items-center justify-center py-2 px-1 ${getActiveClass('/mobile/stations')}`}
        onClick={() => navigate('/mobile/stations')}
      >
        <RadioTower className="h-5 w-5" />
        <span className="text-xs mt-1">Stations</span>
      </button>
      
      <button 
        className={`flex flex-col items-center justify-center py-2 px-1 ${getActiveClass('/mobile/field-map')}`}
        onClick={() => navigate('/mobile/field-map')}
      >
        <Map className="h-5 w-5" />
        <span className="text-xs mt-1">Field Map</span>
      </button>
      
      <button 
        className={`flex flex-col items-center justify-center py-2 px-1 ${getActiveClass('/mobile/data-collection')}`}
        onClick={() => navigate('/mobile/data-collection')}
      >
        <FileDigit className="h-5 w-5" />
        <span className="text-xs mt-1">Collect</span>
      </button>
      
      <button 
        className={`flex flex-col items-center justify-center py-2 px-1 ${getActiveClass('/mobile/settings')}`}
        onClick={() => navigate('/mobile/settings')}
      >
        <Settings className="h-5 w-5" />
        <span className="text-xs mt-1">Settings</span>
      </button>
    </div>
  );
};

const TopBar: FC<{ title: string }> = ({ title }) => {
  const { user, logoutMutation } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  
  const handleLogout = () => {
    logoutMutation.mutate();
    setMenuOpen(false);
  };
  
  return (
    <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-40">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold flex items-center">
          <LayoutGrid className="h-5 w-5 mr-2 text-primary" />
          {title}
        </h1>
        
        <div className="relative">
          <button 
            className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {user?.fullName?.charAt(0) || 'U'}
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden z-50">
              <div className="p-3">
                <p className="font-medium">{user?.fullName || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.email || ''}</p>
                <p className="text-xs mt-1 bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 inline-block capitalize">
                  {user?.role || 'User'}
                </p>
              </div>
              
              <Separator />
              
              <div className="p-2">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full flex items-center justify-center"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MobileApp: FC = () => {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Get the current page title based on the route
  const getPageTitle = () => {
    switch (location) {
      case '/mobile': return 'Field Dashboard';
      case '/mobile/stations': return 'Field Stations';
      case '/mobile/field-map': return 'Field Map';
      case '/mobile/data-collection': return 'Data Collection';
      case '/mobile/settings': return 'Settings';
      default: return 'Field App';
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!user) {
    return <AuthPage />;
  }
  
  // Debug user authentication status
  console.log("MobileApp authenticated user:", user);
  
  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      <TopBar title={getPageTitle()} />
      
      <Suspense fallback={<LoadingComponent />}>
        <Switch>
          <Route path="/mobile">
            <MobileDashboard />
          </Route>
          <Route path="/mobile/stations">
            <MobileStations />
          </Route>
          <Route path="/mobile/field-map">
            <MobileFieldMap />
          </Route>
          <Route path="/mobile/data-collection">
            <MobileDataCollection />
          </Route>
          <Route path="/mobile/settings">
            <MobileSettings />
          </Route>
          <Route>
            <div className="p-4 text-center">
              <p className="text-gray-500">Page not found</p>
              <Button 
                variant="link" 
                onClick={() => window.location.href = '/mobile'}
              >
                Go to Dashboard
              </Button>
            </div>
          </Route>
        </Switch>
      </Suspense>
      
      <TabBar />
    </div>
  );
};

export default MobileApp;