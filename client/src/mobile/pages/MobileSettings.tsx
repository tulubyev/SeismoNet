import { FC, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Save,
  Settings,
  Bell,
  CloudUpload,
  Database,
  Cpu,
  Sun,
  Moon,
  Monitor,
  Wifi,
  FileDigit,
  User,
  Mail,
  Key,
  Edit
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const MobileSettings: FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [darkMode, setDarkMode] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoUpload, setAutoUpload] = useState(true);
  const [dataQuality, setDataQuality] = useState(75);
  const [isSaving, setIsSaving] = useState(false);
  
  // Simulate save settings
  const handleSaveSettings = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };
  
  return (
    <div className="p-4 pb-16">
      <div className="mb-4">
        <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
            <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
            <TabsTrigger value="account" className="text-xs">Account</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <TabsContent value="general" className="mt-0">
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <span className="text-xs text-muted-foreground">Use dark theme for the application</span>
              </div>
              <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="gps">Location Services</Label>
                <span className="text-xs text-muted-foreground">Enable GPS for data collection</span>
              </div>
              <Switch id="gps" checked={gpsEnabled} onCheckedChange={setGpsEnabled} />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="notifications">Notifications</Label>
                <span className="text-xs text-muted-foreground">Receive alerts about important events</span>
              </div>
              <Switch id="notifications" checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Wifi className="h-4 w-4 mr-2 text-muted-foreground" />
              Network Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="auto-upload">Auto Upload</Label>
                <span className="text-xs text-muted-foreground">Automatically upload data when connected to WiFi</span>
              </div>
              <Switch id="auto-upload" checked={autoUpload} onCheckedChange={setAutoUpload} />
            </div>
            
            <Separator />
            
            <div className="flex flex-col space-y-2">
              <Label htmlFor="api-url">API Endpoint</Label>
              <Input id="api-url" value="https://seismic-api.example.com/v1" />
              <span className="text-xs text-muted-foreground">Data collection server URL</span>
            </div>
          </CardContent>
        </Card>
        
        <Button className="w-full" disabled={isSaving} onClick={handleSaveSettings}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </TabsContent>
      
      <TabsContent value="data" className="mt-0">
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <FileDigit className="h-4 w-4 mr-2 text-muted-foreground" />
              Data Collection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="quality">Data Quality ({dataQuality}%)</Label>
              </div>
              <Slider
                id="quality"
                min={25}
                max={100}
                step={5}
                value={[dataQuality]}
                onValueChange={(values) => setDataQuality(values[0])}
              />
              <span className="text-xs text-muted-foreground">
                Higher quality uses more storage and battery power
              </span>
            </div>
            
            <Separator />
            
            <div className="flex flex-col space-y-2">
              <Label htmlFor="sample-location">Default Sample Location</Label>
              <Input id="sample-location" value="Field Station Alpha" />
              <span className="text-xs text-muted-foreground">Default location for new samples</span>
            </div>
            
            <Separator />
            
            <div className="flex flex-col space-y-2">
              <Label>Storage Usage</Label>
              <div className="bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full" 
                  style={{ width: '35%' }} 
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>8.2 GB used</span>
                <span>23.5 GB available</span>
              </div>
            </div>
            
            <Button variant="outline" className="w-full" size="sm">
              <Database className="h-4 w-4 mr-2" />
              Manage Local Storage
            </Button>
          </CardContent>
        </Card>
        
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <CloudUpload className="h-4 w-4 mr-2 text-muted-foreground" />
              Sync Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="sync-wifi">Sync on WiFi Only</Label>
                <span className="text-xs text-muted-foreground">Only sync data when connected to WiFi</span>
              </div>
              <Switch id="sync-wifi" checked={true} />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="sync-charging">Sync When Charging</Label>
                <span className="text-xs text-muted-foreground">Only sync when device is charging</span>
              </div>
              <Switch id="sync-charging" checked={false} />
            </div>
            
            <Button variant="outline" className="w-full" size="sm">
              <Cpu className="h-4 w-4 mr-2" />
              Advanced Sync Options
            </Button>
          </CardContent>
        </Card>
        
        <Button className="w-full" disabled={isSaving} onClick={handleSaveSettings}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </TabsContent>
      
      <TabsContent value="account" className="mt-0">
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-2">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            </div>
            
            <div className="flex flex-col space-y-1 items-center">
              <h3 className="font-semibold">{user?.fullName || 'User'}</h3>
              <span className="text-sm text-muted-foreground">{user?.email || 'user@example.com'}</span>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full capitalize">
                {user?.role || 'User'}
              </span>
            </div>
            
            <Separator />
            
            <div className="flex flex-col space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <Input id="name" value={user?.fullName || ''} readOnly />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-0 top-0 h-full px-3"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input id="email" value={user?.email || ''} readOnly />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-0 top-0 h-full px-3"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Button variant="outline" className="w-full" size="sm">
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </CardContent>
        </Card>
        
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Bell className="h-4 w-4 mr-2 text-muted-foreground" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <span className="text-xs text-muted-foreground">Receive notifications via email</span>
              </div>
              <Switch id="email-notifications" checked={true} />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <span className="text-xs text-muted-foreground">Receive push notifications</span>
              </div>
              <Switch id="push-notifications" checked={true} />
            </div>
          </CardContent>
        </Card>
        
        <Button variant="destructive" className="w-full mb-4">
          Log Out
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          Version 1.2.3 • © 2025 Seismic Network App
        </p>
      </TabsContent>
    </div>
  );
};

export default MobileSettings;